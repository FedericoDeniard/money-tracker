-- migration: fix_usage_limit_capability_cast
--
-- purpose:
--   the resolve_usage_limit and check_and_increment_usage functions in
--   supabase/migrations/20260705163606_add_usage_limits_and_counters.sql
--   take `cap text` as their argument and compare it directly against
--   the `payments.capability` enum column:
--
--     where capability = cap
--
--   postgres doesn't auto-cast text to a custom enum, so this fails
--   with `operator does not exist: payments.capability = text` as soon
--   as any caller reaches the counter. process-documents was the only
--   consumer and never hit it in practice because the test user
--   didn't have the capability granted (no process_documents in
--   default_capabilities). export-report-pdf is in default and
--   immediately surfaced the bug.
--
--   the fix is `cap::payments.capability` everywhere `cap` is compared
--   to the enum. the comparison-side column has a known enum type
--   (capability on the table), so the cast is unambiguous.
--
-- affected functions:
--   replace: payments.resolve_usage_limit
--   replace: payments.check_and_increment_usage
--
-- affected rows: none. this is a function-body fix only.
--
-- special considerations:
--   * the same `cap text` parameter shape is kept — clients (the
--     supabase-js .rpc() call site, the edge functions) don't change.
--   * cast inside SECURITY DEFINER runs as the function owner (postgres)
--     which is allowed to cast to any enum, so no extra grants needed.
--   * idempotent: the migration is a function replacement with no
--     DDL state; running it twice on the same database leaves the
--     second run a no-op.
--   * note: the `create or replace function` rewrites BOTH functions
--     in this migration because check_and_increment_usage contains its
--     own `where capability = cap` in the increment-rollback update;
--     fixing only the resolver would leave the rollback broken.

-- ============================================================================
-- 1. resolve_usage_limit: cast `cap` to enum in the three WHERE
--    clauses that look up the role-specific, plan-specific, and
--    default counters.
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
     where capability = cap::payments.capability
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
     where capability = cap::payments.capability
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
   where capability = cap::payments.capability
     and scope = 'default'
     and period = resolve_usage_limit.period_kind;
  return coalesce(lim, 0);
end;
$$;

-- ============================================================================
-- 2. check_and_increment_usage: the increment-rollback UPDATE has
--    `and capability = cap` too. cast there for symmetry.
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
  -- is the running total. the column type is payments.capability; the
  -- `cap` parameter is text and gets cast on insert.
  insert into payments.usage_counters (user_id, capability, period_start, count)
  values (target_user_id, cap::payments.capability, period_start_ts, 1)
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
       and capability = cap::payments.capability
       and period_start = period_start_ts;
    return query select false, 0, lim;
  else
    return query select true, lim - current_count, lim;
  end if;
end;
$$;

-- permissions + comments are unchanged from the original migration
-- (the supabase-cli / `bun docker:db:reset` path reapplies them via
-- the `grant execute` statements at the bottom of the original file).
-- explicitly re-grant here so this migration is self-contained.
grant execute on function payments.resolve_usage_limit(uuid, text, text) to authenticated;
grant execute on function payments.resolve_usage_limit(uuid, text, text) to service_role;
grant execute on function payments.check_and_increment_usage(uuid, text, text) to authenticated;
grant execute on function payments.check_and_increment_usage(uuid, text, text) to service_role;

comment on function payments.resolve_usage_limit(uuid, text, text) is
  'resolve the max_count for a (capability, scope, period) lookup. SECURITY DEFINER so it can read public.user_roles and payments.subscriptions regardless of the caller''s role. resolution order: role → plan → default. returns 0 if no row matches any scope (fail-closed for unknown capabilities).';
comment on function payments.check_and_increment_usage(uuid, text, text) is
  'atomic check-and-increment for a usage counter. SECURITY DEFINER; runs as the function owner so it can read user_roles, subscriptions, and update the counter regardless of the caller''s role. returns (allowed, remaining, limit_value) where allowed=false means the caller is over the limit for this period. caller should fail-open on rpc error.';
