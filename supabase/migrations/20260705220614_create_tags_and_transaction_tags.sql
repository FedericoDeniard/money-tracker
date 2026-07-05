-- =====================================================================
-- Custom tags for transactions
-- =====================================================================
-- Adds a per-user tag system on top of the existing `transactions` table
-- (which keeps its fixed `category` field, see MON-15).
--
-- Two tables:
--   public.tags             — per-user tag definitions (name + color)
--   public.transaction_tags — many-to-many junction table
--
-- Pattern follows `transaction_attachments` (denormalized `user_id`,
-- `(select auth.uid())` initPlan RLS, explicit `to authenticated`, explicit
-- GRANT, comment on every column).
--
-- Color is constrained to a fixed 8-color palette matching the chart
-- palette already used in `CategoryPieChart.tsx` / `CategoryTreeMapChart.tsx`.
--
-- Junction row insert/update paths use delete-then-insert to replace the
-- tag set on a transaction (the agent's updateTransactionTool will do this
-- when `tagIds` is provided; this is cheaper than trying to diff).
--
-- Soft-delete note: `deleteTransactionTool` flips `discarded = true`
-- instead of removing the row, so junction rows intentionally survive
-- (matches `transaction_attachments` behavior).
-- =====================================================================

-- ----- tags -----
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null check (color in (
    'slate', 'emerald', 'indigo', 'coral', 'amber', 'cerulean', 'lavender', 'rose'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tags_user_name_unique_idx
  on public.tags (user_id, lower(name));

create index if not exists tags_user_id_idx
  on public.tags (user_id);

alter table public.tags enable row level security;

drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own"
  on public.tags
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own"
  on public.tags
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own"
  on public.tags
  for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own"
  on public.tags
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- required after the default-privileges lockdown in
-- `20260618014602_rls_lockdown.sql:259-263`.
grant select, insert, update, delete on public.tags to authenticated;

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

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.update_updated_at_column();

comment on table public.tags is
  'Per-user custom tags. Complementary to transactions.category (which stays fixed and AI-assigned).';
comment on column public.tags.user_id is
  'Denormalized owner for cheap RLS.';
comment on column public.tags.color is
  'Fixed 8-color palette matching CategoryPieChart/CategoryTreeMapChart.';
comment on column public.tags.name is
  'Display name. Unique per user (case-insensitive) via tags_user_name_unique_idx.';

-- ----- transaction_tags -----
create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

create index if not exists transaction_tags_transaction_id_idx
  on public.transaction_tags (transaction_id);
create index if not exists transaction_tags_tag_id_idx
  on public.transaction_tags (tag_id);
create index if not exists transaction_tags_user_id_idx
  on public.transaction_tags (user_id);

alter table public.transaction_tags enable row level security;

drop policy if exists "transaction_tags_select_own" on public.transaction_tags;
create policy "transaction_tags_select_own"
  on public.transaction_tags
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "transaction_tags_insert_own" on public.transaction_tags;
create policy "transaction_tags_insert_own"
  on public.transaction_tags
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

-- no UPDATE policy: junction rows are immutable. To change tags on a
-- transaction, the application deletes and re-inserts.
drop policy if exists "transaction_tags_delete_own" on public.transaction_tags;
create policy "transaction_tags_delete_own"
  on public.transaction_tags
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

grant select, insert, delete on public.transaction_tags to authenticated;

comment on table public.transaction_tags is
  'Many-to-many between transactions and tags. cascade from either side cleans up automatically.';
comment on column public.transaction_tags.user_id is
  'Denormalized owner for cheap RLS. Mirrors transaction_attachments pattern.';