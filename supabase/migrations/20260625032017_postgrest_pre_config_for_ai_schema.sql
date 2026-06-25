-- ============================================================================
-- PostgREST `db-pre-config` hook to expose the `ai` schema
-- ============================================================================
-- Companion to 20260625031518_expose_ai_schema_to_postgrest.sql.
--
-- Why a second migration:
--   20260625031518 set `pgrst.db_schemas` directly on the `authenticator`
--   role via `ALTER ROLE ... SET`. That works, but it relies on
--   `NOTIFY pgrst, 'reload config'` causing the running PostgREST process
--   to pick up the new role setting. In practice the change is only
--   honoured by NEW connections: the connection pool's already-open
--   sessions keep the old `pgrst.db_schemas` cached for up to
--   `db-pool-max-lifetime` (30 minutes by default), and on some hosted
--   Supabase configurations the `NOTIFY` does not always reach the
--   PostgREST process. The result is that the deployed PostgREST keeps
--   returning 404 for `ai.mastra_*` tables even though the role-level
--   setting is correct on the database side.
--
-- The modern PostgREST approach is the `db-pre-config` hook (PostgREST
-- >= 12, see https://docs.postgrest.org/en/v12/references/configuration.html#in-database-configuration).
-- A user-defined function runs on every NEW connection and calls
-- `set_config('pgrst.db_schemas', ...)` for that session, so the
-- setting is in effect from the very first request of every connection
-- in the pool — no reload required, no `db-pool-max-lifetime` wait, no
-- dashboard toggle. It is the same pattern the PostgREST docs recommend
-- for production multi-tenant setups.
--
-- The Supabase troubleshooting guide explicitly endorses this approach
-- and notes that the older `ALTER ROLE authenticator SET
-- pgrst.db_schemas` "is no longer recommended as it requires
-- SUPERUSER" and breaks the dashboard's schema UI.
--
-- What this migration does:
--   1. Creates a hidden `postgrest` schema (not in `db.schemas`, so it
--      is never exposed via the API).
--   2. Creates `postgrest.pre_config()` that sets `pgrst.db_schemas`
--      for the current connection via `set_config`. `is_local => false`
--      makes the setting session-scoped, exactly what we want — the
--      pre_config function runs at the start of every new connection
--      and leaves the rest of the session free to do its work.
--   3. Tells PostgREST to call the function on every new connection by
--      setting `pgrst.db_pre_config` on the `authenticator` role
--      (in-database equivalent of the env var `PGRST_DB_PRE_CONFIG`).
--   4. Issues a `NOTIFY pgrst, 'reload config'` for the running
--      PostgREST process to pick up the new `db_pre_config` value
--      without waiting for the next connection in the pool to cycle.
--   5. Resets the legacy `pgrst.db_schemas` role setting so the
--      dashboard's "Exposed schemas" UI can take over again and the
--      two mechanisms (old direct set, new pre_config hook) do not
--      fight each other.
-- ============================================================================

-- 1. Hidden schema for the config function
create schema if not exists postgrest;

grant usage on schema postgrest to authenticator;


-- 2. The pre_config function
--    `set_config(..., false)` is session-scoped, which is what PostgREST
--    expects from pre_config. The function is `security definer` so
--    `authenticator` (the PostgREST connection role) can execute it
--    without owning the underlying `set_config` call.
create or replace function postgrest.pre_config()
returns void
language sql
security definer
set search_path = ''
as $$
  select set_config('pgrst.db_schemas', 'public, graphql_public, ai', false);
$$;

grant execute on function postgrest.pre_config() to authenticator;


-- 3. Wire the pre_config function into PostgREST's startup hook.
--    `pgrst.db_pre_config` is itself reloadable (PostgREST docs, table of
--    parameters), so the running PostgREST process picks up the change
--    on the next `NOTIFY pgrst, 'reload config'` (step 4).
alter role authenticator set pgrst.db_pre_config = 'postgrest.pre_config';


-- 4. Tell the running PostgREST process to reload its config so the
--    new `db_pre_config` value is honoured by the next connection
--    opened in the pool. Existing pooled connections also pick it up
--    when they cycle (max 30 min by default per `db-pool-max-lifetime`).
notify pgrst, 'reload config';


-- 5. Reset the legacy role-level `pgrst.db_schemas` setting applied by
--    20260625031518. The `db_pre_config` hook above is now the single
--    source of truth, and the dashboard's "Exposed schemas" UI takes
--    back ownership of the setting (so a future toggle in the dashboard
--    does not silently break the pre_config hook).
alter role authenticator reset pgrst.db_schemas;
