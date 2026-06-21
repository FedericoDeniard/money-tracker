-- ============================================================================
-- Enable Supabase Realtime on public.mastra_threads
-- ============================================================================
-- Companion to 20260618010249_mastra_schema_and_rls.sql. The realtime
-- subscription in packages/frontend/src/hooks/useChatThreads.ts
-- (useMastraThreadTitleRealtime) listens for UPDATE events on
-- mastra_threads so the sidebar can refresh the title that Mastra's
-- generateTitle writes asynchronously after the first user message.
--
-- Two prerequisites were missing for that subscription to ever fire:
--
--   1. The table was not added to the `supabase_realtime` publication,
--      so postgres_changes events were never emitted. The publication
--      only contains `notifications`, `seeds`, and `transactions` (the
--      latter two from older migrations that called
--      `ALTER PUBLICATION supabase_realtime ADD TABLE ...`).
--
--   2. REPLICA IDENTITY was `DEFAULT` (just the PK), so UPDATE events
--      only carry the primary key in the OLD tuple. The hook compares
--      `new.title` against `old.title` to decide whether to invalidate
--      the threads query; with only the PK in OLD, `old.title` was
--      always null and the inequality check never fired even if the
--      event had arrived.
--
-- REPLICA IDENTITY FULL is the right setting for a table whose UPDATE
-- payloads are consumed by clients that need to see the pre-image of
-- non-PK columns. The cost is a slightly larger WAL footprint (every
-- UPDATE now writes the old row image to the WAL) but for a low-volume
-- chat-threads table it is negligible.
--
-- Idempotent: `ALTER PUBLICATION ... ADD TABLE` errors if the table is
-- already a member, so we guard with a DO block that checks first.
-- `ALTER TABLE ... REPLICA IDENTITY FULL` is idempotent by design.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mastra_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mastra_threads;
  END IF;
END $$;

ALTER TABLE public.mastra_threads REPLICA IDENTITY FULL;
