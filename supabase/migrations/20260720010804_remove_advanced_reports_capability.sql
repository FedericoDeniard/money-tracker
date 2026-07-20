-- migration: remove_advanced_reports_capability
--
-- purpose:
--   remove 'advanced_reports' from the payments.capability enum. this
--   capability was a placeholder — no code ever checks for it, no route
--   is gated by it, and no usage limit is configured for it. keeping it
--   in the enum offers no value and adds confusion.
--
--   postgres does not support `alter type ... drop value`. the standard
--   workaround is:
--     1. delete any rows that reference the value
--     2. drop objects with a direct type dependency
--     3. create a new enum without the value
--     4. alter every column using the old type to use the new type
--     5. drop the old type
--     6. rename the new type to the original name
--     7. recreate dropped objects
--
-- affected types:
--   recreate: payments.capability (drops advanced_reports)
--
-- affected tables:
--   payments.plan_capabilities        — delete rows, alter column
--   payments.default_capabilities     — alter column
--   payments.usage_limits_role        — alter column
--   payments.usage_limits_plan        — alter column
--   payments.usage_limits_default     -- alter column
--   payments.usage_counters           -- alter column
--
-- affected views (dropped & recreated):
--   payments.user_capabilities_v      — depends on the column type
--   payments.usage_limits_v           -- depends on the column type
--
-- affected functions (dropped & recreated):
--   payments.user_capabilities(uuid)  — returns payments.capability[]

-- 0. delete rows referencing the value being removed.
--    the only rows come from supabase/seeds/006_payments_demo.sql
--    section 4, which grants advanced_reports to the lite_monthly
--    plan. no production subscription ever used this capability.
delete from payments.plan_capabilities
 where capability = 'advanced_reports';

-- 1. drop objects with a direct type or column dependency.
--    the function returns payments.capability[] (hard dependency on
--    the type). the views reference the column type of underlying
--    tables (blocks alter column). the index references the column
--    directly (also blocks alter column).
drop index if exists payments.idx_plan_capabilities_capability;
drop view if exists payments.usage_limits_v;
drop view if exists payments.user_capabilities_v;
drop function if exists payments.user_capabilities(target_user_id uuid);

-- 2. create the replacement enum (same values, minus advanced_reports).
create type payments.capability_new as enum (
  'gmail_sync',
  'ai_assistant',
  'push_notifications',
  'process_documents',
  'report_pdf_export'
);

-- 3. alter every column that uses the old type.
--    the `using` clause casts through text, which is safe because
--    both enum → text → other enum are supported casts and no row
--    references the dropped value at this point.
alter table payments.plan_capabilities
  alter column capability type payments.capability_new
  using capability::text::payments.capability_new;

alter table payments.default_capabilities
  alter column capability type payments.capability_new
  using capability::text::payments.capability_new;

alter table payments.usage_limits_role
  alter column capability type payments.capability_new
  using capability::text::payments.capability_new;

alter table payments.usage_limits_plan
  alter column capability type payments.capability_new
  using capability::text::payments.capability_new;

alter table payments.usage_limits_default
  alter column capability type payments.capability_new
  using capability::text::payments.capability_new;

alter table payments.usage_counters
  alter column capability type payments.capability_new
  using capability::text::payments.capability_new;

-- 4. drop the old type. no remaining objects reference it.
drop type payments.capability;

-- 5. rename the new type so every reference to payments.capability
--    (casts, function signatures, type guards) resolves to the
--    updated enum without code changes.
alter type payments.capability_new rename to capability;

-- 6. recreate the index on the updated column.
create index idx_plan_capabilities_capability
  on payments.plan_capabilities using btree (capability);

-- 7. recreate payments.usage_limits_v, mirroring
--    20260719215657_split_usage_limits_tables.sql.
create or replace view payments.usage_limits_v as
  select capability,
         'role'::payments.usage_scope_kind as scope_kind,
         role::text as scope_value,
         period,
         max_count
    from payments.usage_limits_role
  union all
  select capability,
         'plan'::payments.usage_scope_kind as scope_kind,
         plan_key as scope_value,
         period,
         max_count
    from payments.usage_limits_plan
  union all
  select capability,
         'default'::payments.usage_scope_kind as scope_kind,
         null::text as scope_value,
         period,
         max_count
    from payments.usage_limits_default;

-- 8. recreate payments.user_capabilities_v, mirroring
--    20260705143044_add_default_capabilities_and_view.sql.
create or replace view payments.user_capabilities_v as
with active_grants as (
  select distinct s.user_id, pc.capability
  from payments.subscriptions s
  join payments.plan_capabilities pc on pc.plan_id = s.plan_id
  where s.status in (
    'authorized',
    'pending',
    'paused',
    'pending_cancellation'
  )
),
default_grants as (
  select cast(null as uuid) as user_id, capability
  from payments.default_capabilities
)
select user_id, capability from active_grants
union
select user_id, capability from default_grants;

-- restore grants that were dropped with the view (see
-- 20260705143044_add_default_capabilities_and_view.sql and
-- 20260705150533_add_user_capabilities_rpc.sql).
grant select on payments.user_capabilities_v to supabase_auth_admin;
grant select on payments.user_capabilities_v to service_role;
-- note: authenticated was granted in the original migration but
-- revoked in 20260705150533_add_user_capabilities_rpc.sql when
-- the SECURITY DEFINER rpc became the canonical public API.

-- restore grants on usage_limits_v (originally set in
-- 20260719215657_split_usage_limits_tables.sql).
grant select on payments.usage_limits_v to authenticated;
grant select on payments.usage_limits_v to supabase_auth_admin;
grant select on payments.usage_limits_v to service_role;

-- 9. recreate the function, mirroring
--    20260719222550_add_role_grants_to_user_capabilities.sql.
--    the return type payments.capability[] now references the
--    updated enum.
create or replace function payments.user_capabilities(target_user_id uuid)
returns payments.capability[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caps payments.capability[];
begin
  if auth.uid() is not null and target_user_id <> auth.uid() then
    raise exception
      'forbidden: cannot query capabilities for another user'
      using errcode = '42501';
  end if;

  select coalesce(
    array_agg(distinct capability),
    '{}'::payments.capability[]
  )
    into caps
  from (
    select capability
      from payments.user_capabilities_v
     where user_id = target_user_id
        or user_id is null
    union
    select r.capability
      from payments.usage_limits_role r
      join public.user_roles ur on ur.role = r.role
     where ur.user_id = target_user_id
  ) merged;

  return caps;
end;
$$;
