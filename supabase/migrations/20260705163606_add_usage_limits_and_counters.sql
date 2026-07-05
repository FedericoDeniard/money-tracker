-- migration: add_usage_limits_and_counters
--
-- purpose:
--   add a usage-cap layer on top of the capability gate. the capability
--   gate (payments.user_capabilities / requireCapability) answers
--   "is this user allowed to use this feature at all?". usage caps
--   answer "how many times per period?". the two together:
--
--     capability gate → 403 when not allowed at all
--     usage cap      → 429 when allowed but rate-limited
--
--   so a tester can use ai_assistant (capability gate passes via
--   role bypass) but only 200 times per calendar month (usage cap
--   enforces the per-period budget).
--
-- model:
--   payments.usage_limits  — configuration table, one row per
--     (capability, scope, period). scope is one of:
--       'role:<role>'       (e.g. 'role:tester')
--       'plan:<plan_key>'   (e.g. 'plan:lite_monthly')
--       'default'           (fallback for everyone not matched above)
--     resolution order: role → plan → default. first match wins.
--     an absent row for a (capability, scope, period) means "no
--     override; fall through to the next scope". an absent default
--     means "unlimited" (returning 0 from resolve → requireCapability
--     sees 0 and accepts; this is a deliberate fail-open for unknown
--     capabilities, see "failure modes" below).
--
--   payments.usage_counters — counter table, one row per
--     (user_id, capability, period_start). period_start is computed
--     from `period` (date_trunc('month', now()) for 'month',
--     date_trunc('day', now()) for 'day'). one row per (user, cap,
--     period_start) means counter implicitly resets each period
--     boundary — no cron, no manual reset.
--
-- functions:
--   payments.resolve_usage_limit(target_user_id uuid, cap text, period_kind text)
--     returns int. SECURITY DEFINER so it can read user_roles and
--     subscriptions regardless of the caller's role. stable — same
--     inputs, same answer within a request.
--
--   payments.check_and_increment_usage(target_user_id uuid, cap text, period_kind text)
--     returns table(allowed boolean, remaining int, limit_value int).
--     SECURITY DEFINER, volatility = volatile (it inserts/updates).
--     atomic upsert + check + rollback-on-overflow. concurrent
--     requests can both pass the increment, but only one passes the
--     check; the other decrements and returns allowed=false. the
--     counter never permanently exceeds the limit.
--
--   both functions live in `payments` (mirrors the user_capabilities
--   rpc from 20260705150533). consumers must call them with
--   `supabase.schema('payments').rpc(...)` so postgrest sends the
--   Accept-Profile / Content-Profile headers that let postgrest
--   resolve the schema.
--
-- failure modes:
--   * rpc error (db down, etc.) → consumer logs and fail-opens
--     (allows the call). rationale: a usage-counter bug should not
--     block paying users. counters are an optimization, not a
--     security boundary.
--   * counter not initialized (no row for the user's period yet) →
--     upsert creates it on first call. count starts at 1.
--   * no matching limit row at any scope → resolve returns 0 →
--     check returns limit=0 → every call is rejected with 429. this
--     is intentional: an "uncounted" capability is a deployment
--     mistake, not a license to spam.
--   * admin role → caller short-circuits the check entirely in the
--     application layer (not in the rpc). the rpc does not know
--     about the role bypass; that policy lives in
--     packages/mastra-server/src/lib/capabilities.ts where
--     ROLE_BYPASS = {admin, tester} was already wired for the
--     capability gate. tester does NOT bypass the usage cap; only
--     admin does.
--
-- affected tables:
--   new: payments.usage_limits
--   new: payments.usage_counters
--   new functions: payments.resolve_usage_limit, payments.check_and_increment_usage
--   new grants: SELECT to authenticated; full to service_role
--
-- affected rows: six seed rows in payments.usage_limits.

-- ============================================================================
-- 1) usage_limits: the configuration table
-- ============================================================================
create table payments.usage_limits (
  capability text not null,
  scope      text not null,
  period     text not null,
  max_count  int  not null,
  primary key (capability, scope, period),
  constraint usage_limits_capability_check
    check (capability in (
      'gmail_sync',
      'ai_assistant',
      'push_notifications',
      'advanced_reports',
      'process_documents'
    )),
  constraint usage_limits_scope_check
    check (
      scope like 'role:%' or
      scope like 'plan:%' or
      scope = 'default'
    ),
  constraint usage_limits_period_check
    check (period in ('day', 'month')),
  constraint usage_limits_max_count_check
    check (max_count >= 0)
);

comment on table payments.usage_limits is
  'per-(capability, scope, period) usage caps. scope is role:<role>, plan:<plan_key>, or default. resolution order: role → plan → default. an absent default row means callers are rejected (count 0) for that capability and period — intentional fail-closed for unknown capabilities.';
comment on column payments.usage_limits.scope is
  'role:<role> | plan:<plan_key> | default';
comment on column payments.usage_limits.max_count is
  'maximum number of calls per period_start for a caller matching this scope. 0 = reject every call (fail-closed default for unknown capabilities).';

alter table payments.usage_limits enable row level security;

create policy "usage_limits_select_authenticated"
  on payments.usage_limits
  as permissive
  for select
  to authenticated
  using (true);

-- service_role / supabase_auth_admin / hook all read via the rls-bypass
-- semantics of those roles. no explicit policy needed.

-- ============================================================================
-- 2) usage_counters: the per-(user, capability, period_start) counter
-- ============================================================================
create table payments.usage_counters (
  user_id      uuid        not null,
  capability   text        not null,
  period_start timestamptz not null,
  count        int         not null default 0,
  primary key (user_id, capability, period_start),
  constraint usage_counters_capability_check
    check (capability in (
      'gmail_sync',
      'ai_assistant',
      'push_notifications',
      'advanced_reports',
      'process_documents'
    )),
  constraint usage_counters_count_check
    check (count >= 0)
);

comment on table payments.usage_counters is
  'per-user usage counter; one row per (user_id, capability, period_start). period_start is the truncated period start (e.g. date_trunc(''month'', now()) for ''month''). implicit reset each period boundary — no cron.';
comment on column payments.usage_counters.period_start is
  'the start of the period this counter applies to. one row per (user, capability, period_start) means the counter implicitly resets each period.';

create index usage_counters_user_cap_period_idx
  on payments.usage_counters (user_id, capability, period_start desc);

alter table payments.usage_counters enable row level security;

create policy "usage_counters_select_own"
  on payments.usage_counters
  as permissive
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: only the SECURITY DEFINER rpc (which runs as
-- postgres) and service_role. no authenticated policy, so an
-- authenticated client cannot tamper with its own counter.
create policy "usage_counters_modify_service_role"
  on payments.usage_counters
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- 3) grants
-- ============================================================================
grant select on payments.usage_limits to authenticated;
grant select on payments.usage_counters to authenticated;
grant select, insert, update, delete on payments.usage_limits to service_role;
grant select, insert, update, delete on payments.usage_counters to service_role;

-- ============================================================================
-- 4) resolve_usage_limit: SECURITY DEFINER
-- ============================================================================
create or replace function payments.resolve_usage_limit(
  target_user_id uuid,
  cap            text,
  period_kind     text default 'month'
) returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lim            int;
  user_role_text text;
  plan_key_text  text;
begin
  -- 1. role-specific. most specific; if a row exists for the user's
  --    role + (capability, period) we use it.
  select ur.role::text into user_role_text
    from public.user_roles ur
   where ur.user_id = target_user_id
   order by ur.role
   limit 1;

  if user_role_text is not null then
    select max_count into lim
      from payments.usage_limits
     where capability = cap
       and scope = 'role:' || user_role_text
       and period = resolve_usage_limit.period_kind;
    if lim is not null then
      return lim;
    end if;
  end if;

  -- 2. plan-specific. the user may have an active subscription; we
  --    take the first match by most-recent updated_at. the cap is
  --    applied even if the user has a (free-default 0) + a paid plan
  --    that doesn't override this cap — a missing row means "no
  --    override; fall through".
  select p.plan_key into plan_key_text
    from payments.subscriptions s
    join payments.plans p on p.id = s.plan_id
   where s.user_id = target_user_id
     and s.status in ('authorized','pending','paused','pending_cancellation')
   order by s.updated_at desc
   limit 1;

  if plan_key_text is not null then
    select max_count into lim
      from payments.usage_limits
     where capability = cap
       and scope = 'plan:' || plan_key_text
       and period = resolve_usage_limit.period_kind;
    if lim is not null then
      return lim;
    end if;
  end if;

  -- 3. default fallback. returns 0 if no row exists, which the
  --    caller treats as "reject every call" — fail-closed for unknown
  --    capabilities. intentional: see header comment.
  select max_count into lim
    from payments.usage_limits
   where capability = cap
     and scope = 'default'
     and period = resolve_usage_limit.period_kind;
  return coalesce(lim, 0);
end;
$$;

comment on function payments.resolve_usage_limit(uuid, text, text) is
  'resolve the max_count for a (capability, scope, period) lookup. SECURITY DEFINER so it can read public.user_roles and payments.subscriptions regardless of the caller''s role. resolution order: role → plan → default. returns 0 if no row matches any scope (fail-closed for unknown capabilities).';

grant execute on function payments.resolve_usage_limit(uuid, text, text) to authenticated;
grant execute on function payments.resolve_usage_limit(uuid, text, text) to service_role;

-- ============================================================================
-- 5) check_and_increment_usage: SECURITY DEFINER, volatile (writes)
-- ============================================================================
create or replace function payments.check_and_increment_usage(
  target_user_id uuid,
  cap            text,
  period_kind     text default 'month'
) returns table(allowed boolean, remaining int, limit_value int)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  lim              int;
  current_count    int;
  period_start_ts  timestamptz;
begin
  lim := payments.resolve_usage_limit(target_user_id, cap, period_kind);

  period_start_ts := case
    when period_kind = 'day'   then date_trunc('day',   now())
    when period_kind = 'month' then date_trunc('month', now())
    else date_trunc('hour', now())
  end;

  -- atomic upsert. the primary key (user_id, capability, period_start)
  -- means at most one row per (user, cap, period) — the count column
  -- is the running total.
  insert into payments.usage_counters (user_id, capability, period_start, count)
  values (target_user_id, cap, period_start_ts, 1)
  on conflict (user_id, capability, period_start)
  do update set count = payments.usage_counters.count + 1
  returning count into current_count;

  if current_count > lim then
    -- over the limit; roll the increment back so the counter stays
    -- accurate. two concurrent requests can both pass the increment
    -- (race window of one statement), but the post-update check
    -- guarantees only one returns allowed=true; the other decrements
    -- and returns allowed=false. the counter never permanently
    -- exceeds the limit.
    update payments.usage_counters
       set count = count - 1
     where user_id = target_user_id
       and capability = cap
       and period_start = period_start_ts;
    return query select false, 0, lim;
  else
    return query select true, lim - current_count, lim;
  end if;
end;
$$;

comment on function payments.check_and_increment_usage(uuid, text, text) is
  'atomic check-and-increment for a usage counter. SECURITY DEFINER; runs as the function owner so it can read user_roles, subscriptions, and update the counter regardless of the caller''s role. returns (allowed, remaining, limit_value) where allowed=false means the caller is over the limit for this period. caller should fail-open on rpc error.';

grant execute on function payments.check_and_increment_usage(uuid, text, text) to authenticated;
grant execute on function payments.check_and_increment_usage(uuid, text, text) to service_role;

-- ============================================================================
-- 6) USAGE on the payments schema for authenticator
-- ============================================================================
-- postgrest discovers rpcs only for the schema it scans per request
-- (the first in pgrst.db_schemas, or whichever is selected via the
-- Accept-Profile / Content-Profile headers). the functions above
-- must therefore be reachable via the payments profile. add the
-- missing schema USAGE grant for the authenticator role (which
-- postgrest connects as) — the original 20260628224000_create_subscriptions_schema.sql
-- granted authenticated, anon, service_role but missed authenticator.
-- see 20260705150533 for the related fix on user_capabilities.
grant usage on schema payments to authenticator;

-- ============================================================================
-- 7) seed: the minimum-viable matrix from the ticket
-- ============================================================================
-- the matrix matches the product decision in MON-12: testers get
-- generous caps on every paid feature (so the QA team can iterate
-- without hitting a wall), everyone else gets a small starter
-- allowance. there are no per-plan overrides yet; the plan-specific
-- branch in resolve_usage_limit will fall through to default until
-- a `plan:<key>` row is inserted. plan overrides (e.g.
-- `lite_monthly` getting 1000 messages) are a follow-up: a single
-- INSERT per (capability, plan, period) row is enough.
insert into payments.usage_limits (capability, scope, period, max_count) values
  -- ai_assistant
  ('ai_assistant',     'role:tester',   'month',  200),
  ('ai_assistant',     'default',       'month',   50),
  -- process_documents
  ('process_documents', 'role:tester',   'month',   50),
  ('process_documents', 'default',       'month',    5),
  -- gmail_sync (per-email counter; call site is a follow-up — see
  -- docs/access-control.md "Usage limits" section)
  ('gmail_sync',       'role:tester',   'month', 1000),
  ('gmail_sync',       'default',       'month',  100)
on conflict (capability, scope, period) do nothing;