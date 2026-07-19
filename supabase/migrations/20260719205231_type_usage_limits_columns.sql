-- migration: type_usage_limits_columns
--
-- purpose:
--   type the two text columns of payments.usage_limits so future inserts
--   are caught at parse time (not by CHECK constraints) and so the
--   frontend can stop parsing colon-separated strings.
--
--   before this migration:
--     scope  text  -- values: 'role:tester', 'plan:lite_monthly', 'default'
--     period text  -- values: 'day', 'month'
--
--   after:
--     scope_kind payments.usage_scope_kind  -- enum: role | plan | default | team | org
--     scope_value text                      -- NULL for 'default'; the suffix otherwise
--     period     payments.usage_period       -- enum: month | day | hour
--
--   both enums are extensible (team/org/hour are forward-compat for
--   product decisions that haven't shipped yet). the primary key is
--   re-defined on the typed columns; CHECK constraints enforce the
--   "default has no value / non-default has a value" invariant.
--
-- affected functions:
--   replace: payments.resolve_usage_limit (3 where clauses updated)
--
-- affected rows:
--   8 existing rows in payments.usage_limits get backfilled from the
--   text column to the two typed columns; the text column is then
--   dropped. if a row's `scope` value doesn't match the recognised
--   prefixes, the migration falls back to 'team' (forward-compat) and
--   preserves the raw suffix as scope_value.
--
-- special considerations:
--   * the primary key is dropped before the columns are modified;
--     postgres won't let us alter a column that's part of the PK
--     directly, and the new PK uses scope_kind + scope_value instead
--     of the composite scope string.
--   * scope_value is nullable on purpose: a 'default' row has no
--     qualifier, and SQL `IS NULL` is the cleanest representation.
--   * period is cast with `using period::payments.usage_period` so the
--     conversion reads existing rows once; any row that somehow has an
--     invalid period would fail the cast and abort the migration
--     (fail-loud is better than fail-silent for a one-shot backfill).
--   * the RLS policy `usage_limits_select_authenticated` doesn't
--     reference column names, so it survives intact.

-- 1. enum types. idempotent because the names don't exist yet.
create type payments.usage_scope_kind as enum (
  'role',
  'plan',
  'default',
  'team',
  'org'
);

create type payments.usage_period as enum (
  'month',
  'day',
  'hour'
);

-- 2. drop the existing PK so we can modify the columns it covers.
alter table payments.usage_limits
  drop constraint usage_limits_pkey;

-- 3. add the new columns, nullable for the backfill window.
alter table payments.usage_limits
  add column scope_kind payments.usage_scope_kind,
  add column scope_value text;

-- 4. backfill from the existing text column.
update payments.usage_limits
set
  scope_kind = case
    when scope = 'default'   then 'default'::payments.usage_scope_kind
    when scope like 'role:%'  then 'role'::payments.usage_scope_kind
    when scope like 'plan:%'  then 'plan'::payments.usage_scope_kind
    else                         'team'::payments.usage_scope_kind
  end,
  scope_value = case
    when scope = 'default' then null
    else split_part(scope, ':', 2)
  end;

-- 5. drop the old text column.
alter table payments.usage_limits
  drop column scope;

-- 6. tighten the typed columns.
alter table payments.usage_limits
  alter column scope_kind set not null;

alter table payments.usage_limits
  add constraint usage_limits_default_no_value
    check (scope_kind <> 'default' or scope_value is null),
  add constraint usage_limits_named_has_value
    check (scope_kind = 'default' or scope_value is not null);

-- 7. drop the old CHECK constraints. must happen before the
--    period type conversion: `usage_limits_period_check` uses the
--    text comparison `period in ('day', 'month')`, and Postgres will
--    try to revalidate it against the new enum type with an implicit
--    cast that doesn't exist (`payments.usage_period = text`).
--    `usage_limits_scope_check` may have been cascade-dropped in step 5
--    (Postgres drops constraints that reference a dropped column), so
--    we use `if exists` for idempotency.
alter table payments.usage_limits
  drop constraint if exists usage_limits_scope_check,
  drop constraint if exists usage_limits_period_check;
-- usage_limits_max_count_check stays (it only references max_count).

-- 8. convert period from text to enum.
alter table payments.usage_limits
  alter column period type payments.usage_period
    using period::payments.usage_period;

-- 9. uniqueness constraint on the typed columns. used to be a PK
--    before this migration; scope_value is now nullable for 'default'
--    rows, and primary keys can't have null columns. a UNIQUE
--    constraint with `nulls not distinct` (PG 15+) is the equivalent
--    for our purposes: it prevents two 'default' rows for the same
--    (capability, period) just like the old PK did, and prevents
--    duplicate role/plan rows the same way. there is no FK pointing
--    at this table, so we don't need PK semantics (no need for an
--    index target from a child table).
alter table payments.usage_limits
  add constraint usage_limits_unique
    unique nulls not distinct (capability, scope_kind, scope_value, period);

-- 10. payments.resolve_usage_limit: replace the three where clauses
--     on payments.usage_limits. signature stays the same so the
--     database.types.ts Args block does not churn; the text parameter
--     `period_kind` is cast to the enum internally.
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
      from payments.usage_limits
     where capability = cap::payments.capability
       and scope_kind = 'role'
       and scope_value = user_role_text
       and period = period_enum;
    if lim is not null then
      return lim;
    end if;
  end if;

  -- 2. plan-specific. the user may have an active subscription; we
  --    take the first match by most-recent updated_at.
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
       and scope_kind = 'plan'
       and scope_value = plan_key_text
       and period = period_enum;
    if lim is not null then
      return lim;
    end if;
  end if;

  -- 3. default fallback. returns 0 if no row exists, which the
  --    caller treats as "reject every call".
  select max_count into lim
    from payments.usage_limits
   where capability = cap::payments.capability
     and scope_kind = 'default'
     and scope_value is null
     and period = period_enum;
  return coalesce(lim, 0);
end;
$$;

comment on function payments.resolve_usage_limit(uuid, text, text) is
  'resolve the max_count for a (capability, scope_kind, scope_value, period) lookup. SECURITY DEFINER so it can read public.user_roles and payments.subscriptions regardless of the caller''s role. resolution order: role -> plan -> default. returns 0 if no row matches any scope (fail-closed for unknown capabilities).';

grant execute on function payments.resolve_usage_limit(uuid, text, text) to authenticated;
grant execute on function payments.resolve_usage_limit(uuid, text, text) to service_role;
