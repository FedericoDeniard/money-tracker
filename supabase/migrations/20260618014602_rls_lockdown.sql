-- ============================================================================
-- RLS lockdown: per-user policies, explicit GRANTs, future-proof defaults
-- ============================================================================
-- Companion to 20260618010249_mastra_schema_and_rls.sql. The previous migration
-- locked down the 35 mastra_* tables. This one closes the remaining holes in
-- the project's own tables:
--
--   1. Security: revoke the `anon` SELECT on public.transactions that was
--      granted back in 20260118042626_enable_realtime_and_rls_for_transactions.sql
--      (line 10). Unauthenticated visitors no longer hit the table at all.
--
--   2. Explicit GRANTs to `authenticated` on every per-user table that the
--      frontend reads. With `auto_expose_new_tables = false` (see
--      supabase/config.toml) new tables no longer receive auto-grants, so each
--      table that needs frontend access must declare its GRANT here. This
--      keeps migrations self-contained and portable to the post-2026-10-30
--      Supabase default.
--
--   3. Rewrite policies that incorrectly use `roles = {public}` (which in
--      Postgres includes both `anon` and `authenticated`) to use the explicit
--      `TO authenticated`. The semantic is the same because `auth.uid()` is
--      NULL for `anon` and therefore filters out, but `TO authenticated` is
--      what the code intends and matches the rest of the policies.
--
--   4. Standardize all per-user policies to use `(select auth.uid())` for
--      initPlan optimization. Postgres caches the result of the SELECT per
--      statement instead of calling the function on every row, which can be
--      a 2-3x speedup on tables that scan many rows.
--
--   5. Drop duplicate SELECT policies introduced over the course of the
--      project: `gmail_watches_select_own` and `user_oauth_tokens_select_own`
--      are exact duplicates of the human-named `Users can read...` policies
--      with the same USING expression. Keeping both is just noise.
--
--   6. `ALTER DEFAULT PRIVILEGES` so any future table created by `postgres`
--      in `public` does NOT receive auto-grants to `anon` or `authenticated`.
--      This is the same recommendation as the Supabase changelog #45329.
--      Tables that need API access must declare their GRANT in the migration
--      that creates them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Security: close the `anon` hole on transactions
-- ----------------------------------------------------------------------------

REVOKE SELECT ON public.transactions FROM anon;


-- ----------------------------------------------------------------------------
-- 2. Explicit GRANTs to `authenticated`
-- ----------------------------------------------------------------------------
-- Full CRUD for per-user tables the frontend reads AND writes.
-- SELECT-only for tables the frontend reads but the server writes.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_attachments             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discarded_emails            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_watches              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seeds                      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notification_preferences TO authenticated;

-- Read-only for tables the server manages and the frontend just observes.

GRANT SELECT ON public.pubsub_subscriptions     TO authenticated;
GRANT SELECT ON public.user_oauth_tokens        TO authenticated;
GRANT SELECT ON public.users                    TO authenticated;
GRANT SELECT ON public.notification_categories  TO authenticated;
GRANT SELECT ON public.notification_types       TO authenticated;


-- ----------------------------------------------------------------------------
-- 3A. Rewrite policies that use `roles = {public}` -> `TO authenticated`
-- ----------------------------------------------------------------------------
-- `ALTER POLICY` cannot change the role list, so these need DROP + CREATE.
-- The USING / WITH CHECK expressions are also updated to use
-- `(select auth.uid())` for initPlan optimization.

-- ---- discarded_emails --------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own discarded emails"  ON public.discarded_emails;
CREATE POLICY "Users can view their own discarded emails"
  ON public.discarded_emails FOR SELECT TO authenticated
  USING (user_oauth_token_id IN (SELECT id FROM public.user_oauth_tokens WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can insert their own discarded emails" ON public.discarded_emails;
CREATE POLICY "Users can insert their own discarded emails"
  ON public.discarded_emails FOR INSERT TO authenticated
  WITH CHECK (user_oauth_token_id IN (SELECT id FROM public.user_oauth_tokens WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can delete their own discarded emails" ON public.discarded_emails;
CREATE POLICY "Users can delete their own discarded emails"
  ON public.discarded_emails FOR DELETE TO authenticated
  USING (user_oauth_token_id IN (SELECT id FROM public.user_oauth_tokens WHERE user_id = (select auth.uid())));

-- ---- seeds -------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own seeds"   ON public.seeds;
CREATE POLICY "Users can view their own seeds"
  ON public.seeds FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own seeds" ON public.seeds;
CREATE POLICY "Users can insert their own seeds"
  ON public.seeds FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own seeds" ON public.seeds;
CREATE POLICY "Users can update their own seeds"
  ON public.seeds FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own seeds" ON public.seeds;
CREATE POLICY "Users can delete their own seeds"
  ON public.seeds FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));


-- ----------------------------------------------------------------------------
-- 3B. Drop duplicate SELECT policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "gmail_watches_select_own"     ON public.gmail_watches;
DROP POLICY IF EXISTS "user_oauth_tokens_select_own"  ON public.user_oauth_tokens;


-- ----------------------------------------------------------------------------
-- 3C. Standardize all per-user policies to `(select auth.uid())`
-- ----------------------------------------------------------------------------
-- Idempotent: ALTER POLICY replaces the USING and WITH CHECK expressions
-- in place. Skips policies that already use the initPlan form or that are
-- unconditional / deny-by-design.

-- ---- chat_attachments --------------------------------------------------------

ALTER POLICY "Users can read their own chat attachments"   ON public.chat_attachments
  USING (user_id = (select auth.uid()));

ALTER POLICY "Users can insert their own chat attachments" ON public.chat_attachments
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "Users can delete their own chat attachments" ON public.chat_attachments
  USING (user_id = (select auth.uid()));

-- ---- gmail_watches -----------------------------------------------------------

ALTER POLICY "Users can read their own watches" ON public.gmail_watches
  USING (user_id = (select auth.uid()));

ALTER POLICY "gmail_watches_insert_own" ON public.gmail_watches
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "gmail_watches_update_own" ON public.gmail_watches
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "gmail_watches_delete_own" ON public.gmail_watches
  USING (user_id = (select auth.uid()));

-- ---- notifications -----------------------------------------------------------

ALTER POLICY "notifications_select_own" ON public.notifications
  USING (user_id = (select auth.uid()));

ALTER POLICY "notifications_insert_own" ON public.notifications
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "notifications_update_own" ON public.notifications
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "notifications_delete_own" ON public.notifications
  USING (user_id = (select auth.uid()));

-- ---- pubsub_subscriptions ----------------------------------------------------

ALTER POLICY "Users can read their own subscriptions" ON public.pubsub_subscriptions
  USING ((select auth.uid()) = user_id);

-- ---- push_subscriptions ------------------------------------------------------

ALTER POLICY "authenticated users can select own push subscriptions" ON public.push_subscriptions
  USING (user_id = (select auth.uid()));

ALTER POLICY "authenticated users can insert own push subscriptions" ON public.push_subscriptions
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "authenticated users can delete own push subscriptions" ON public.push_subscriptions
  USING (user_id = (select auth.uid()));

-- The "anon users cannot select push subscriptions" policy has qual=false and
-- intentionally stays as-is.

-- ---- transactions -----------------------------------------------------------

ALTER POLICY "transactions_select_own" ON public.transactions
  USING ((select auth.uid()) = user_id);

ALTER POLICY "transactions_insert_own" ON public.transactions
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "transactions_update_own" ON public.transactions
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "transactions_delete_own" ON public.transactions
  USING ((select auth.uid()) = user_id);

-- ---- user_notification_preferences ------------------------------------------

ALTER POLICY "user_notification_preferences_select_own" ON public.user_notification_preferences
  USING (user_id = (select auth.uid()));

ALTER POLICY "user_notification_preferences_insert_own" ON public.user_notification_preferences
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "user_notification_preferences_update_own" ON public.user_notification_preferences
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "user_notification_preferences_delete_own" ON public.user_notification_preferences
  USING (user_id = (select auth.uid()));

-- ---- user_oauth_tokens -------------------------------------------------------

ALTER POLICY "Users can read their own token metadata" ON public.user_oauth_tokens
  USING ((select auth.uid()) = user_id);

ALTER POLICY "user_oauth_tokens_insert_own" ON public.user_oauth_tokens
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "user_oauth_tokens_update_own" ON public.user_oauth_tokens
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "user_oauth_tokens_delete_own" ON public.user_oauth_tokens
  USING (user_id = (select auth.uid()));

-- The "Block user * to tokens" deny policies (qual=false / with_check=false)
-- stay as-is: they are defense in depth, not duplicates.

-- ---- users -------------------------------------------------------------------

ALTER POLICY "Users can read their own data" ON public.users
  USING ((select auth.uid()) = id);


-- ----------------------------------------------------------------------------
-- 4. Future-proof: revoke default privileges for new tables
-- ----------------------------------------------------------------------------
-- From now on, any table created by the `postgres` role in `public` does NOT
-- receive auto-grants to `anon` or `authenticated`. Tables that need API
-- access must declare their GRANTs explicitly in the migration that creates
-- them. Mirrors the recommendation in the Supabase changelog
-- (https://supabase.com/changelog/45329).

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Clean up auto-expose leftovers on existing tables
-- ----------------------------------------------------------------------------
-- Supabase's local stack auto-grants every role full access to new tables in
-- `public` regardless of `auto_expose_new_tables` (the CLI v2.106.x we run
-- does not honor that key and always defaults to the legacy behavior). This
-- block revokes `anon` from every table in `public` so per-user RLS policies
-- are the only thing standing between an unauthenticated visitor and the
-- data. The policies already in place (per-user scoped) take over from here.
-- `service_role` keeps its full access for backend tasks.

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
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname);
  END LOOP;
END $$;
