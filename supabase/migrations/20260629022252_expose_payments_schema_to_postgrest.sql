-- ============================================================================
-- Migration: expose_payments_schema_to_postgrest
-- Purpose:   Add `payments` to the list of schemas exposed by PostgREST.
-- ============================================================================
-- Companion to 20260628224000_create_subscriptions_schema.sql, which moved
-- the billing tables to the `payments` schema.
--
-- Mechanism: redefines postgrest.pre_config() (created by
-- 20260625032017_postgrest_pre_config_for_ai_schema.sql) to include
-- `payments` in `pgrst.db_schemas`. The pre_config hook is wired into the
-- `authenticator` role via `pgrst.db_pre_config=postgrest.pre_config`
-- (also set by 20260625032017) and runs on every new PostgREST connection.
-- The dashboard's "Exposed schemas" UI is the single source of truth that
-- the pre_config hook mirrors; we do NOT touch the legacy role-level
-- `pgrst.db_schemas` setting (20260625032017 resets it explicitly).
-- ============================================================================

create or replace function postgrest.pre_config()
returns void
language sql
security definer
set search_path = ''
as $$
  select set_config('pgrst.db_schemas', 'public, graphql_public, ai, payments', false);
$$;

grant execute on function postgrest.pre_config() to authenticator;

-- reload running postgREST so the next connection in the pool picks up
-- the new pre_config value. existing pooled connections refresh on cycle
-- (max 30 min by default per db-pool-max-lifetime).
notify pgrst, 'reload config';

