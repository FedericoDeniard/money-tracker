-- =====================================================================
-- Custom reports for grouping transactions
-- =====================================================================
-- Adds a per-user reporting system on top of the existing `transactions`
-- table. Reports are containers that group related transactions for
-- review, export, or analysis (Expensify-style).
--
-- Pattern follows `tags` (denormalized `user_id`, `(select auth.uid())`
-- initPlan RLS, explicit `to authenticated`, explicit GRANT, comment on
-- every column).
--
-- Key design choices:
--   * 1:N relation — each transaction belongs to at most one report via
--     a nullable FK (`report_id`). "Move between reports" is a simple
--     UPDATE; the FK + ownership trigger prevent cross-user assignment.
--   * `on delete set null` — deleting a report unlinks its transactions
--     instead of cascading. Matches the soft-delete philosophy used for
--     `transactions.discarded`.
--   * `status` is a text column with CHECK (active / archived) rather
--     than a Postgres ENUM type, matching the project's style for status
--     columns (cf. `transactions.discarded`).
--   * Server-side aggregation via `get_report_summaries(text)` RPC —
--     returns one row per (report × currency) pair so the UI can show
--     per-currency totals without an N+1 pattern. Mirrors the
--     `get_subscription_candidates` approach.
--
-- Realtime note: the existing `transactions_broadcast_trigger` does not
-- include `report_id` yet. Out of scope for this migration; TanStack
-- invalidation on mutations covers v1.
-- =====================================================================

-- ----- reports -----
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  date_range_start date,
  date_range_end date,
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- end must be on or after start when both are present
  check (date_range_end is null or date_range_start is null
         or date_range_end >= date_range_start)
);

create index if not exists reports_user_id_idx
  on public.reports (user_id);
create index if not exists reports_user_status_idx
  on public.reports (user_id, status);

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own"
  on public.reports
  for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
  on public.reports
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- required after the default-privileges lockdown in
-- `20260618014602_rls_lockdown.sql:259-263`.
grant select, insert, update, delete on public.reports to authenticated;

-- reuse the generic `update_updated_at_column` function if present;
-- otherwise create it. kept idempotent so the migration is safe to re-run.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.update_updated_at_column();

comment on table public.reports is
  'Per-user report containers. Each report holds transactions via transactions.report_id (1:N).';
comment on column public.reports.user_id is
  'Denormalized owner for cheap RLS.';
comment on column public.reports.title is
  'Display name, 1-120 chars, required.';
comment on column public.reports.description is
  'Optional long description, max 2000 chars.';
comment on column public.reports.date_range_start is
  'Optional inclusive start date describing the period the report covers. Independent of actual transaction dates.';
comment on column public.reports.date_range_end is
  'Optional inclusive end date. Must be >= date_range_start when both are set.';
comment on column public.reports.status is
  'Either ''active'' (visible in main list) or ''archived'' (hidden but preserved).';
comment on column public.reports.archived_at is
  'Timestamp of the most recent archive. Stamped when status flips to archived; cleared on restore.';

-- ----- transactions.report_id -----
-- Soft-delete preservation: deleting a report must NOT cascade. The
-- CHECK constraint `discarded` and the user's transactional history
-- must survive the report container being deleted.
alter table public.transactions
  add column if not exists report_id uuid
    references public.reports(id) on delete set null;

create index if not exists transactions_report_id_idx
  on public.transactions (report_id);

-- ----- ownership trigger -----
-- Defense in depth: the FK only guarantees the report exists, not that
-- the report belongs to `auth.uid()`. A malicious client could craft a
-- direct REST request that sets report_id to another user's report. The
-- existing UPDATE policy on transactions only checks the transaction's
-- own user_id, so this trigger is the layer that closes the gap.
--
-- Note: `security definer` so it can read reports.user_id regardless of
-- the caller's RLS visibility (the caller already SELECTs only their own
-- reports, but we want to be explicit and not depend on caller RLS here).
create or replace function public.assert_report_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if new.report_id is null then
    return new;
  end if;

  select user_id into v_owner
    from public.reports
    where id = new.report_id;

  if v_owner is null or v_owner <> new.user_id then
    raise exception 'report % is not owned by user', new.report_id
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists transactions_report_owner_check on public.transactions;
create trigger transactions_report_owner_check
  before insert or update of report_id on public.transactions
  for each row execute function public.assert_report_owner();

comment on function public.assert_report_owner() is
  'Trigger helper: ensures transactions.report_id (when present) belongs to the same user as the transaction. Defense in depth on top of FK.';

-- ----- get_report_summaries rpc -----
-- Returns one row per (report × currency) pair for the caller's reports
-- matching `p_status`. The service layer groups by report id in JS so
-- the UI can render per-currency summary cards without an N+1.
--
-- Aggregation excludes soft-deleted transactions (`discarded = false`).
-- Income / expense are split by `transaction_type`; multi-locale
-- (`income` / `ingreso` and `expense` / `egreso`) handled in the same
-- CASE expression used elsewhere in the codebase.
create or replace function public.get_report_summaries(p_status text)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  date_range_start date,
  date_range_end date,
  status text,
  archived_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  currency text,
  transaction_count bigint,
  total_income numeric,
  total_expenses numeric
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    r.id, r.user_id, r.title, r.description,
    r.date_range_start, r.date_range_end, r.status, r.archived_at,
    r.created_at, r.updated_at,
    t.currency,
    count(t.id) as transaction_count,
    coalesce(sum(case when t.transaction_type in ('income','ingreso') then t.amount end), 0) as total_income,
    coalesce(sum(case when t.transaction_type in ('expense','egreso') then t.amount end), 0) as total_expenses
  from public.reports r
  left join public.transactions t
    on t.report_id = r.id and t.discarded = false
  where r.user_id = (select auth.uid())
    and r.status = p_status
  group by r.id, t.currency
  order by r.created_at desc, t.currency;
$$;

grant execute on function public.get_report_summaries(text) to authenticated;

comment on function public.get_report_summaries(text) is
  'One row per (report × currency) for the caller. Stable; relies on transactions.report_id index.';
