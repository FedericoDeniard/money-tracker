-- ============================================================================
-- Expose the `ai` schema to PostgREST on hosted Supabase
-- ============================================================================
-- Companion to 20260625022751_move_mastra_tables_to_ai_schema.sql.
--
-- The mastra_* tables now live in the `ai` schema, but PostgREST on a
-- hosted Supabase project does not expose arbitrary schemas by default. It
-- only exposes the schemas listed in the `pgrst.db_schemas` setting on the
-- `authenticator` role. Without `ai` in that list, calls like
-- `supabase.schema('ai').from('mastra_threads').select()` return 404 with
-- `PGRST205 Could not find the table 'public.mastra_threads' in the
-- schema cache`, even though the table exists in `ai`.
--
-- The official way to expose a schema on hosted Supabase is via the
-- dashboard (Settings > API > "Exposed schemas"). But it can also be done
-- directly in SQL by setting `pgrst.db_schemas` on the `authenticator`
-- role. See the Supabase troubleshooting guide:
-- https://supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema
--
-- `NOTIFY pgrst, 'reload config'` is sent afterwards so the running
-- PostgREST process picks up the new setting without waiting for its
-- next config refresh cycle. (See PostgREST docs on config reload.)
--
-- This migration is idempotent: re-running it sets the same value.
-- ============================================================================

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, ai';

notify pgrst, 'reload config';
