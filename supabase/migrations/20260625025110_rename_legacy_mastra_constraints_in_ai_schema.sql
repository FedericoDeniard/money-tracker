-- ============================================================================
-- Rename legacy `public_*` mastra_* constraints that survived the schema move
-- ============================================================================
-- Companion to 20260625022751_move_mastra_tables_to_ai_schema.sql.
--
-- The original mastra DDL in 20260618010249_mastra_schema_and_rls.sql
-- explicitly created two constraints with a `public_` prefix hardcoded:
--
--   * PK on public.mastra_ai_spans             →  public_mastra_ai_spans_traceid_spanid_pk
--   * UNIQUE on public.mastra_workflow_snapshot →  public_mastra_workflow_snapshot_workflow_name_run_id_key
--
-- When 20260625022751 moved those tables to the `ai` schema via
-- `ALTER TABLE ... SET SCHEMA`, Postgres moved the constraints with the
-- tables but kept the original names (constraint names are global; SET
-- SCHEMA does not rewrite them). So today `ai.mastra_ai_spans` has a PK
-- named `public_mastra_ai_spans_traceid_spanid_pk`, and
-- `ai.mastra_workflow_snapshot` has a UNIQUE constraint by the legacy name.
--
-- @mastra/pg's `PostgresStore` (with `schemaName: 'ai'`) tries to bootstrap
-- those constraints again with the schema-prefixed name:
--
--   * `ai_mastra_ai_spans_traceid_spanid_pk`           (PRIMARY KEY)
--   * `ai_mastra_workflow_snapshot_workflow_name_run_id_key` (UNIQUE)
--
-- The PRIMARY KEY case crashes with `42P16 multiple primary keys for table
-- "mastra_ai_spans" are not allowed` and the storage init fails, taking the
-- whole Mastra server down on boot.
--
-- The UNIQUE case does not crash (Postgres allows multiple UNIQUE
-- constraints on the same columns) but leaves a redundant duplicate index
-- that has to be cleaned up.
--
-- This migration normalizes the two constraint names so Mastra's init finds
-- the constraints it expects, instead of trying to add a colliding one. The
-- operations are guarded by `IF EXISTS` so the migration is a no-op on any
-- environment that already has the corrected names (e.g. a fresh `supabase
-- db reset` where a future rewrite of 20260618010249 generates the DDL
-- directly with the `ai_` prefix).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rename the PK on ai.mastra_ai_spans
-- ----------------------------------------------------------------------------
-- `ALTER TABLE ... RENAME CONSTRAINT` is metadata-only and does not rewrite
-- the index, so it's safe to run while the table is in use. The PK keeps
-- the same OID and storage; only the catalog name changes.

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_namespace n on c.connamespace = n.oid
    where n.nspname = 'ai'
      and c.conrelid = 'ai.mastra_ai_spans'::regclass
      and c.conname = 'public_mastra_ai_spans_traceid_spanid_pk'
      and c.contype = 'p'
  ) then
    alter table ai.mastra_ai_spans
      rename constraint public_mastra_ai_spans_traceid_spanid_pk
      to ai_mastra_ai_spans_traceid_spanid_pk;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 2. Drop the duplicate UNIQUE constraint on ai.mastra_workflow_snapshot
-- ----------------------------------------------------------------------------
-- The `ai_*` UNIQUE constraint was created by Mastra's storage init on a
-- previous (partially-successful) boot and is now the REPLICA IDENTITY
-- target. The `public_*` one is the original from
-- 20260618010249_mastra_schema_and_rls.sql that survived the schema move
-- and is now redundant. We keep the `ai_*` one and drop the legacy.

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_namespace n on c.connamespace = n.oid
    where n.nspname = 'ai'
      and c.conrelid = 'ai.mastra_workflow_snapshot'::regclass
      and c.conname = 'public_mastra_workflow_snapshot_workflow_name_run_id_key'
      and c.contype = 'u'
  ) then
    alter table ai.mastra_workflow_snapshot
      drop constraint public_mastra_workflow_snapshot_workflow_name_run_id_key;
  end if;
end $$;
