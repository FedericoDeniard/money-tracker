-- ============================================================================
-- Grant DML to service_role on all public tables
-- ============================================================================
-- Problem: the rls_lockdown migration (20260618014602) revoked default DML
-- privileges from `anon` and `authenticated` but never granted DML to
-- `service_role`. The `service_role` has `rolbypassrls = true` (so it skips
-- RLS policies) but is NOT a superuser and is NOT a member of `postgres`,
-- which means it still needs explicit GRANTs to read/write tables.
--
-- Without this, every Edge Function that uses SUPABASE_SERVICE_ROLE_KEY gets
-- `permission denied for table <name>` (42501) on any INSERT/SELECT/UPDATE/
-- DELETE against public tables.
--
-- Fix:
--   1. GRANT DML on every existing public table to service_role.
--   2. ALTER DEFAULT PRIVILEGES so future tables created by `postgres` in
--      `public` also grant DML to service_role automatically.
-- ============================================================================

-- 1. Grant DML on all existing tables in public schema
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',
      r.relname
    );
  END LOOP;
END
$$;

-- 2. Future tables created by postgres in public also grant DML to service_role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
