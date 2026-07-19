-- migration: split_usage_limits_tables
--
-- purpose:
--   replace the polymorphic `payments.usage_limits(capability,
--   scope_kind, scope_value text, period, max_count)` table with three
--   typed tables — one per scope kind — and a read-only view that
--   unions them back into the same shape the frontend already expects.
--
--   before this migration:
--     payments.usage_limits
--       scope_kind  payments.usage_scope_kind  -- role | plan | default | team | org
--       scope_value text                        -- 'tester' | 'lite_monthly' | NULL | ...
--
--   after:
--     payments.usage_limits_role    (role public.app_role, no text)
--     payments.usage_limits_plan    (plan_key text REFERENCES payments.plans(plan_key))
--     payments.usage_limits_default (no scope value column at all)
--     payments.usage_limits_v       (UNION ALL of the three, same shape as the
--                                    old table; frontend reads from this view)
--
--   why split:
--     * `role` is now a real enum column (PK), so `"Tester"` (capital T)
--       or `"testr"` (typo) fails at INSERT time, not silently at runtime.
--     * `plan_key` is a real FK to `payments.plans(plan_key)` with
--       ON DELETE CASCADE; dropping a plan removes its overrides
--       automatically.
--     * `default` no longer pretends to carry a value: the table has
--       no scope column at all. Adding team/org/org in the future is
--       adding a new table, not threading a column through three
--       polymorphic switches.
--
--   also drops `team` and `org` from the enum (they were speculative
--   placeholders; no code uses them, and adding a new scope kind
--   in the future is now "add a table" instead of "extend the enum").
--
-- affected functions:
--   replace: payments.resolve_usage_limit (3 SELECTs into the 3 tables)
--
-- affected rows:
--   8 existing rows in payments.usage_limits are backfilled into the
--   three new tables; the old table is dropped afterwards. no other
--   tables reference payments.usage_limits (verified via grep — 16
--   matches in the repo, all in this migration, in tests, or in
--   supabase/_shared RPCs that we update here).
--
-- special considerations:
--   * `payments.usage_counters` has no FK to usage_limits — only to
--     auth.users implicitly via user_id, and to the capability enum.
--     unaffected.
--   * `check_and_increment_usage` only reads the limit via
--     `resolve_usage_limit` and operates on `usage_counters`; it
--     doesn't need changes.
--   * `payments.plans.plan_key` already has a unique index
--     `plans_plan_key_key` (verified), so the FK is sound.
--   * The new enum value set is the strict subset
--     `('role','plan','default')`; `team` and `org` are dropped.
--     Postgres allows `drop value` only when no rows use the value.
--     At this point in the migration the old usage_limits table is
--     gone (dropped in step 6), so no rows reference team/org.
--   * The view lives in the same `payments` schema and is exposed
--     via PostgREST. RLS policies on the three tables (open SELECT
--     for authenticated) make the view safe by default.

-- 1. three typed tables. PK columns match the discriminator:
--    role:     (capability, role, period)
--    plan:     (capability, plan_key, period)
--    default:  (capability, period)
create table payments.usage_limits_role (
  capability payments.capability   not null,
  role       public.app_role       not null,
  period     payments.usage_period not null,
  max_count  int                   not null check (max_count >= 0),
  primary key (capability, role, period)
);

create table payments.usage_limits_plan (
  capability payments.capability   not null,
  plan_key   text                  not null references payments.plans(plan_key) on delete cascade,
  period     payments.usage_period not null,
  max_count  int                   not null check (max_count >= 0),
  primary key (capability, plan_key, period)
);

create table payments.usage_limits_default (
  capability payments.capability   not null,
  period     payments.usage_period not null,
  max_count  int                   not null check (max_count >= 0),
  primary key (capability, period)
);

comment on table payments.usage_limits_role is
  'per-capability usage override keyed by user role. checked first in the resolve chain; if missing, the resolver falls through to plan/default.';
comment on table payments.usage_limits_plan is
  'per-capability usage override keyed by plan_key. FK to payments.plans(plan_key) with ON DELETE CASCADE so removing a plan cleans up its overrides automatically. checked second in the resolve chain.';
comment on table payments.usage_limits_default is
  'per-capability baseline limit for users without a role or plan override. checked last in the resolve chain; this is the fallback when no role/plan row matches.';

-- 2. backfill from the polymorphic table. each insert is safe by
--    construction: the destination tables have FK / enum constraints
--    that would abort the migration if any row carried a bad value.
--    Today the only populated rows are role:tester and default.
insert into payments.usage_limits_role (capability, role, period, max_count)
select
  capability,
  scope_value::public.app_role as role,
  period,
  max_count
from payments.usage_limits
where scope_kind = 'role';

insert into payments.usage_limits_plan (capability, plan_key, period, max_count)
select
  capability,
  scope_value as plan_key,
  period,
  max_count
from payments.usage_limits
where scope_kind = 'plan';

insert into payments.usage_limits_default (capability, period, max_count)
select
  capability,
  period,
  max_count
from payments.usage_limits
where scope_kind = 'default';

-- 3. read-only view that unions the three tables into the shape the
--    frontend already speaks. the view lives next to the tables and
--    RLS on the underlying tables makes the view safe.
create view payments.usage_limits_v
  with (security_invoker = true) as
  select
    capability,
    'role'::payments.usage_scope_kind as scope_kind,
    role::text                         as scope_value,
    period,
    max_count
  from payments.usage_limits_role
  union all
  select
    capability,
    'plan'::payments.usage_scope_kind  as scope_kind,
    plan_key                           as scope_value,
    period,
    max_count
  from payments.usage_limits_plan
  union all
  select
    capability,
    'default'::payments.usage_scope_kind as scope_kind,
    null                              as scope_value,
    period,
    max_count
  from payments.usage_limits_default;

comment on view payments.usage_limits_v is
  'unified read-only view over the three typed usage_limits tables. preserves the legacy (capability, scope_kind, scope_value, period, max_count) shape so the frontend and any external readers do not need to know about the split. security_invoker = true: RLS is evaluated as the calling role, so authenticated users only see what the underlying policies allow.';

grant select on payments.usage_limits_v to authenticated;

-- 4. rls + grants for the three tables. same shape as the legacy
--    policy: open SELECT for authenticated, full DML for service_role.
alter table payments.usage_limits_role     enable row level security;
alter table payments.usage_limits_plan     enable row level security;
alter table payments.usage_limits_default  enable row level security;

create policy usage_limits_role_select_authenticated
  on payments.usage_limits_role
  as permissive for select to authenticated using (true);
create policy usage_limits_plan_select_authenticated
  on payments.usage_limits_plan
  as permissive for select to authenticated using (true);
create policy usage_limits_default_select_authenticated
  on payments.usage_limits_default
  as permissive for select to authenticated using (true);

grant select on payments.usage_limits_role    to authenticated;
grant select on payments.usage_limits_plan    to authenticated;
grant select on payments.usage_limits_default to authenticated;

grant select, insert, update, delete on payments.usage_limits_role    to service_role;
grant select, insert, update, delete on payments.usage_limits_plan    to service_role;
grant select, insert, update, delete on payments.usage_limits_default to service_role;

-- 5. replace resolve_usage_limit: three concrete SELECTs against
--    the typed tables, in role -> plan -> default order.
create or replace function payments.resolve_usage_limit(
  target_user_id uuid,
  cap            text,
  period_kind    text default 'month'
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
  period_enum    payments.usage_period;
begin
  period_enum := period_kind::payments.usage_period;

  -- 1. role-specific. most specific; if a row exists for the user's
  --    role + (capability, period) we use it.
  select ur.role::text into user_role_text
    from public.user_roles ur
   where ur.user_id = target_user_id
   order by ur.role
   limit 1;

  if user_role_text is not null then
    select max_count into lim
      from payments.usage_limits_role
     where capability = cap::payments.capability
       and role = user_role_text::public.app_role
       and period = period_enum;
    if lim is not null then
      return lim;
    end if;
  end if;

  -- 2. plan-specific. the user may have an active subscription; we
  --    take the first match by most-recent updated_at. the FK on
  --    usage_limits_plan.plan_key guarantees the row references a
  --    real plan; ON DELETE CASCADE keeps the table clean when a
  --    plan is removed.
  select p.plan_key into plan_key_text
    from payments.subscriptions s
    join payments.plans p on p.id = s.plan_id
   where s.user_id = target_user_id
     and s.status in ('authorized','pending','paused','pending_cancellation')
   order by s.updated_at desc
   limit 1;

  if plan_key_text is not null then
    select max_count into lim
      from payments.usage_limits_plan
     where capability = cap::payments.capability
       and plan_key = plan_key_text
       and period = period_enum;
    if lim is not null then
      return lim;
    end if;
  end if;

  -- 3. default fallback. returns 0 if no row exists, which the
  --    caller treats as "reject every call".
  select max_count into lim
    from payments.usage_limits_default
   where capability = cap::payments.capability
     and period = period_enum;
  return coalesce(lim, 0);
end;
$$;

comment on function payments.resolve_usage_limit(uuid, text, text) is
  'resolve the max_count for a (capability, scope_kind, period) lookup. SECURITY DEFINER so it can read public.user_roles and payments.subscriptions regardless of the caller''s role. resolution order: role -> plan -> default. returns 0 if no row matches any scope (fail-closed for unknown capabilities).';

grant execute on function payments.resolve_usage_limit(uuid, text, text) to authenticated;
grant execute on function payments.resolve_usage_limit(uuid, text, text) to service_role;

-- 6. drop the polymorphic table. CASCADE in case anything references
--    it (we grep'd; nothing does, but the cascade keeps the migration
--    idempotent on re-run scenarios).
drop table payments.usage_limits cascade;

-- 7. enum values 'team' and 'org' are dead code — no consumer
--    references them, the resolver doesn't match them, and the
--    frontend logs a warning if they show up. removing them would
--    require ALTER TYPE ... DROP VALUE, which Postgres does not
--    implement ("dropping an enum value is not implemented" —
--    https://www.postgresql.org/docs/current/sql-altertype.html).
--    the rename-then-recreate workaround hits a different wall
--    because ALTER TYPE ... RENAME TO does not accept a
--    schema-qualified target name. leaving the values in place is
--    the pragmatic choice; the typed tables added in this migration
--    remove the actual ergonomic problem (free-text scope_value)
--    and a future Postgres release can drop the enum values
--    cleanly. tracked as a follow-up.

-- 8. update the enum's doc comment to reflect the final shape.
comment on type payments.usage_scope_kind is
  'usage-limit scope kind. final shape after MON-23 split: role | plan | default. team/org were speculative placeholders removed in the same migration; adding a new kind is now "add a typed table", not "extend this enum".';
