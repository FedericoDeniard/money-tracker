-- ============================================================================
-- RLS policies for Mastra storage tables (idempotent)
-- ============================================================================
-- Mastra's PostgresStore creates these tables on first interaction:
--   - mastra_threads   (conversation threads)
--   - mastra_messages  (messages within threads)
--   - mastra_resources (working memory per user/resource)
--   - mastra_workflow_snapshot, mastra_evals, mastra_traces, mastra_scorers,
--     mastra_notifications (not user-scoped, left untouched here)
--
-- This migration is idempotent: it only applies RLS/policies to tables that
-- already exist. Mastra creates its tables on the server's first run, so
-- subsequent db resets will pick up these policies automatically.
--
-- Scope: resourceId = auth.uid()::text for user-scoped tables.
-- ============================================================================

-- mastra_threads
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mastra_threads') THEN
    ALTER TABLE mastra_threads ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can read their own threads" ON mastra_threads;
    CREATE POLICY "Users can read their own threads"
      ON mastra_threads FOR SELECT TO authenticated
      USING (resourceid = auth.uid()::text);

    DROP POLICY IF EXISTS "Users can create their own threads" ON mastra_threads;
    CREATE POLICY "Users can create their own threads"
      ON mastra_threads FOR INSERT TO authenticated
      WITH CHECK (resourceid = auth.uid()::text);

    DROP POLICY IF EXISTS "Users can update their own threads" ON mastra_threads;
    CREATE POLICY "Users can update their own threads"
      ON mastra_threads FOR UPDATE TO authenticated
      USING (resourceid = auth.uid()::text)
      WITH CHECK (resourceid = auth.uid()::text);

    DROP POLICY IF EXISTS "Users can delete their own threads" ON mastra_threads;
    CREATE POLICY "Users can delete their own threads"
      ON mastra_threads FOR DELETE TO authenticated
      USING (resourceid = auth.uid()::text);
  END IF;
END $$;

-- mastra_messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mastra_messages') THEN
    ALTER TABLE mastra_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can read messages from their own threads" ON mastra_messages;
    CREATE POLICY "Users can read messages from their own threads"
      ON mastra_messages FOR SELECT TO authenticated
      USING (
        thread_id IN (
          SELECT id FROM mastra_threads WHERE resourceid = auth.uid()::text
        )
      );

    DROP POLICY IF EXISTS "Users can insert messages into their own threads" ON mastra_messages;
    CREATE POLICY "Users can insert messages into their own threads"
      ON mastra_messages FOR INSERT TO authenticated
      WITH CHECK (
        thread_id IN (
          SELECT id FROM mastra_threads WHERE resourceid = auth.uid()::text
        )
      );

    DROP POLICY IF EXISTS "Users can update messages in their own threads" ON mastra_messages;
    CREATE POLICY "Users can update messages in their own threads"
      ON mastra_messages FOR UPDATE TO authenticated
      USING (
        thread_id IN (
          SELECT id FROM mastra_threads WHERE resourceid = auth.uid()::text
        )
      );

    DROP POLICY IF EXISTS "Users can delete messages in their own threads" ON mastra_messages;
    CREATE POLICY "Users can delete messages in their own threads"
      ON mastra_messages FOR DELETE TO authenticated
      USING (
        thread_id IN (
          SELECT id FROM mastra_threads WHERE resourceid = auth.uid()::text
        )
      );
  END IF;
END $$;

-- mastra_resources
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mastra_resources') THEN
    ALTER TABLE mastra_resources ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can read their own working memory" ON mastra_resources;
    CREATE POLICY "Users can read their own working memory"
      ON mastra_resources FOR SELECT TO authenticated
      USING (id = auth.uid()::text);

    DROP POLICY IF EXISTS "Users can write their own working memory" ON mastra_resources;
    CREATE POLICY "Users can write their own working memory"
      ON mastra_resources FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid()::text);

    DROP POLICY IF EXISTS "Users can update their own working memory" ON mastra_resources;
    CREATE POLICY "Users can update their own working memory"
      ON mastra_resources FOR UPDATE TO authenticated
      USING (id = auth.uid()::text)
      WITH CHECK (id = auth.uid()::text);

    DROP POLICY IF EXISTS "Users can delete their own working memory" ON mastra_resources;
    CREATE POLICY "Users can delete their own working memory"
      ON mastra_resources FOR DELETE TO authenticated
      USING (id = auth.uid()::text);
  END IF;
END $$;
