-- ============================================================================
-- Migration: grant_dml_to_service_role_on_payments
-- Purpose:   grant DML on payments.* tables and sequences to service_role.
-- ============================================================================
-- Companion to 20260628224000_create_subscriptions_schema.sql.
--
-- Problem: that migration enables RLS on payments.subscriptions and
-- payments.subscription_events, and grants SELECT to authenticated (so
-- users can read their own rows). It does NOT grant anything to
-- service_role, which is what the edge function uses via
-- SUPABASE_SERVICE_ROLE_KEY. service_role has rolbypassrls=true so it
-- skips RLS, but it still needs explicit table-level GRANTs because
-- it is neither superuser nor a member of postgres.
--
-- Without this, every INSERT into payments.subscription_events from the
-- edge function fails with `permission denied for table subscription_events`
-- (42501), and inserts that use bigserial columns additionally fail with
-- `permission denied for sequence <name>` (42501) because sequences have
-- their own grant.
--
-- Fix mirrors 20260622230744_grant_dml_to_service_role.sql: explicit GRANTs
-- on existing payments tables + their owned sequences + ALTER DEFAULT
-- PRIVILEGES so future tables in payments inherit the same.
-- ============================================================================

-- 1. grant DML on every existing payments table to service_role
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'payments' AND c.relkind = 'r'
    LOOP
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payments.%I TO service_role',
            r.relname
        );
    END LOOP;
END
$$;

-- 2. grant usage on sequences owned by payments tables (needed for bigserial / serial inserts)
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT s.relname
          FROM pg_class s
          JOIN pg_class t ON t.relnamespace = s.relnamespace
          JOIN pg_namespace n ON n.oid = s.relnamespace
         WHERE n.nspname = 'payments'
           AND s.relkind = 'S'
           AND t.relkind = 'r'
    LOOP
        EXECUTE format(
            'GRANT USAGE, SELECT ON SEQUENCE payments.%I TO service_role',
            r.relname
        );
    END LOOP;
END
$$;

-- 3. future tables created by postgres in payments also grant DML to service_role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA payments
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

-- 4. future sequences created by postgres in payments also grant usage to service_role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA payments
    GRANT USAGE, SELECT ON SEQUENCES TO service_role;
