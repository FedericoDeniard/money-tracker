-- ============================================================================
-- Move all 35 `mastra_*` tables from `public` to a dedicated `ai` schema
-- ============================================================================
-- Companion to 20260618010249_mastra_schema_and_rls.sql (which created the
-- tables in `public`) and 20260618020446_enable_mastra_threads_realtime.sql.
--
-- The mastra_* tables are entirely owned by @mastra/pg's PostgresStore and
-- pollute the `public` schema's API surface (PostgREST exposes them as
-- `/mastra_threads`, `/mastra_messages`, etc.). They have nothing to do with
-- the project's own domain tables, so they belong in a dedicated schema.
--
-- We use the schema name `ai` (instead of `mastra`) so future AI-related
-- stores (vector store, eval store, etc.) can land in the same schema
-- without needing a second rename.
--
-- The migration preserves all data: `ALTER TABLE ... SET SCHEMA` is a
-- metadata-only operation that moves the table + its indexes + constraints
-- + triggers atomically. There is no row-by-row copy. Foreign keys pointing
-- INTO these tables would block the move, but the only cross-table reference
-- is `public.chat_attachments.thread_id` (text, no FK — confirmed), so the
-- move is unconstrained.
--
-- Strategy:
--   1. Create the `ai` schema with the right GRANTs.
--   2. Drop the existing RLS policies on the 5 user-facing tables. Their
--      bodies reference `public.mastra_threads`; once the table moves, the
--      subquery would resolve to nothing and lock out the frontend.
--   3. Drop the event trigger `mastra_auto_enable_rls` so the move is not
--      blocked by the function still holding a metadata lock on the tables
--      being relocated.
--   4. `ALTER TABLE public.mastra_<x> SET SCHEMA ai;` for all 35 tables.
--   5. Recreate the 5 user-facing policies with `ai.mastra_*` references.
--   6. Recreate the explicit `authenticated` grants on the 5 user-facing
--      tables (the move drops them — Postgres does not preserve grants
--      across schema moves; see Postgres docs on `ALTER TABLE ... SET SCHEMA`).
--   7. Recreate the event trigger with the `ai.mastra_%` pattern.
--   8. Move the Realtime publication entry from `public.mastra_threads` to
--      `ai.mastra_threads` and re-apply `REPLICA IDENTITY FULL`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. New schema
-- ----------------------------------------------------------------------------

create schema if not exists ai;

grant usage on schema ai to authenticated, anon, service_role;


-- ----------------------------------------------------------------------------
-- 2. Drop the existing RLS policies on the 5 user-facing tables
-- ----------------------------------------------------------------------------
-- The policies are dropped by exact name (the names are stable per
-- 20260618010249_mastra_schema_and_rls.sql). If a policy is missing, the
-- `drop policy` would error and abort the migration, so we guard each
-- drop with an existence check.

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'mastra_threads',
        'mastra_messages',
        'mastra_resources',
        'mastra_observational_memory',
        'mastra_notifications'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 3. Drop the event trigger so the schema move is not blocked
-- ----------------------------------------------------------------------------

drop event trigger if exists mastra_auto_enable_rls;

drop function if exists public.mastra_auto_enable_rls();


-- ----------------------------------------------------------------------------
-- 4. Move all 35 mastra_* tables from public to ai
-- ----------------------------------------------------------------------------
-- `ALTER TABLE ... SET SCHEMA` is metadata-only (no row copy). The trigger
-- `trigger_set_timestamps` lives in `public` and is referenced via its
-- fully qualified name (`public.trigger_set_timestamps()`), so it keeps
-- working after the move without any change.

alter table public.mastra_threads                       set schema ai;
alter table public.mastra_messages                      set schema ai;
alter table public.mastra_resources                     set schema ai;
alter table public.mastra_observational_memory           set schema ai;
alter table public.mastra_notifications                 set schema ai;
alter table public.mastra_ai_spans                      set schema ai;
alter table public.mastra_scorers                       set schema ai;
alter table public.mastra_scorer_definitions            set schema ai;
alter table public.mastra_scorer_definition_versions    set schema ai;
alter table public.mastra_prompt_blocks                 set schema ai;
alter table public.mastra_prompt_block_versions         set schema ai;
alter table public.mastra_agents                        set schema ai;
alter table public.mastra_agent_versions                set schema ai;
alter table public.mastra_mcp_clients                   set schema ai;
alter table public.mastra_mcp_client_versions           set schema ai;
alter table public.mastra_mcp_servers                   set schema ai;
alter table public.mastra_mcp_server_versions           set schema ai;
alter table public.mastra_workspaces                    set schema ai;
alter table public.mastra_workspace_versions            set schema ai;
alter table public.mastra_skills                        set schema ai;
alter table public.mastra_skill_versions                set schema ai;
alter table public.mastra_skill_blobs                   set schema ai;
alter table public.mastra_tool_provider_connections     set schema ai;
alter table public.mastra_workflow_snapshot             set schema ai;
alter table public.mastra_datasets                      set schema ai;
alter table public.mastra_dataset_items                 set schema ai;
alter table public.mastra_dataset_versions              set schema ai;
alter table public.mastra_experiments                   set schema ai;
alter table public.mastra_experiment_results            set schema ai;
alter table public.mastra_background_tasks              set schema ai;
alter table public.mastra_favorites                     set schema ai;
alter table public.mastra_channel_installations         set schema ai;
alter table public.mastra_channel_config                set schema ai;
alter table public.mastra_schedules                     set schema ai;
alter table public.mastra_schedule_triggers             set schema ai;


-- ----------------------------------------------------------------------------
-- 5. Recreate the 5 user-facing RLS policies with `ai.mastra_*` references
-- ----------------------------------------------------------------------------
-- Identical logic to 20260618010249_mastra_schema_and_rls.sql but pointing at
-- `ai.mastra_threads` etc. Uses `(select auth.uid())` for initPlan
-- optimization per the project's RLS standard (see 20260618014602_rls_lockdown.sql).

-- ai.mastra_threads: scoped by resourceId == auth.uid()
drop policy if exists "Users can read their own threads"            on ai.mastra_threads;
create policy "Users can read their own threads"
  on ai.mastra_threads for select to authenticated
  using (("resourceId") = (select auth.uid())::text);

drop policy if exists "Users can create their own threads"          on ai.mastra_threads;
create policy "Users can create their own threads"
  on ai.mastra_threads for insert to authenticated
  with check (("resourceId") = (select auth.uid())::text);

drop policy if exists "Users can update their own threads"          on ai.mastra_threads;
create policy "Users can update their own threads"
  on ai.mastra_threads for update to authenticated
  using (("resourceId") = (select auth.uid())::text)
  with check (("resourceId") = (select auth.uid())::text);

drop policy if exists "Users can delete their own threads"          on ai.mastra_threads;
create policy "Users can delete their own threads"
  on ai.mastra_threads for delete to authenticated
  using (("resourceId") = (select auth.uid())::text);

-- ai.mastra_messages: scoped via the parent thread's resourceId
drop policy if exists "Users can read messages from their own threads"     on ai.mastra_messages;
create policy "Users can read messages from their own threads"
  on ai.mastra_messages for select to authenticated
  using (thread_id in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text));

drop policy if exists "Users can insert messages into their own threads"   on ai.mastra_messages;
create policy "Users can insert messages into their own threads"
  on ai.mastra_messages for insert to authenticated
  with check (thread_id in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text));

drop policy if exists "Users can update messages in their own threads"     on ai.mastra_messages;
create policy "Users can update messages in their own threads"
  on ai.mastra_messages for update to authenticated
  using (thread_id in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text))
  with check (thread_id in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text));

drop policy if exists "Users can delete messages in their own threads"     on ai.mastra_messages;
create policy "Users can delete messages in their own threads"
  on ai.mastra_messages for delete to authenticated
  using (thread_id in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text));

-- ai.mastra_resources: id IS the resource id
drop policy if exists "Users can read their own working memory"     on ai.mastra_resources;
create policy "Users can read their own working memory"
  on ai.mastra_resources for select to authenticated
  using (id = (select auth.uid())::text);

drop policy if exists "Users can write their own working memory"    on ai.mastra_resources;
create policy "Users can write their own working memory"
  on ai.mastra_resources for insert to authenticated
  with check (id = (select auth.uid())::text);

drop policy if exists "Users can update their own working memory"   on ai.mastra_resources;
create policy "Users can update their own working memory"
  on ai.mastra_resources for update to authenticated
  using (id = (select auth.uid())::text)
  with check (id = (select auth.uid())::text);

drop policy if exists "Users can delete their own working memory"   on ai.mastra_resources;
create policy "Users can delete their own working memory"
  on ai.mastra_resources for delete to authenticated
  using (id = (select auth.uid())::text);

-- ai.mastra_observational_memory: scoped via resourceId or via the parent thread
drop policy if exists "Users can read their own observational memory"   on ai.mastra_observational_memory;
create policy "Users can read their own observational memory"
  on ai.mastra_observational_memory for select to authenticated
  using (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  );

drop policy if exists "Users can write their own observational memory"  on ai.mastra_observational_memory;
create policy "Users can write their own observational memory"
  on ai.mastra_observational_memory for insert to authenticated
  with check (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  );

drop policy if exists "Users can update their own observational memory"  on ai.mastra_observational_memory;
create policy "Users can update their own observational memory"
  on ai.mastra_observational_memory for update to authenticated
  using (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  )
  with check (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  );

drop policy if exists "Users can delete their own observational memory"  on ai.mastra_observational_memory;
create policy "Users can delete their own observational memory"
  on ai.mastra_observational_memory for delete to authenticated
  using (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  );

-- ai.mastra_notifications: scoped via resourceId or via the parent thread
drop policy if exists "Users can read their own notifications"   on ai.mastra_notifications;
create policy "Users can read their own notifications"
  on ai.mastra_notifications for select to authenticated
  using (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  );

drop policy if exists "Users can update their own notifications" on ai.mastra_notifications;
create policy "Users can update their own notifications"
  on ai.mastra_notifications for update to authenticated
  using (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  )
  with check (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  );

drop policy if exists "Users can delete their own notifications" on ai.mastra_notifications;
create policy "Users can delete their own notifications"
  on ai.mastra_notifications for delete to authenticated
  using (
    ("resourceId") = (select auth.uid())::text
    or "threadId" in (select id from ai.mastra_threads where ("resourceId") = (select auth.uid())::text)
  );


-- ----------------------------------------------------------------------------
-- 6. Recreate the explicit `authenticated` grants on the 5 user-facing tables
-- ----------------------------------------------------------------------------
-- Postgres drops grants on a table when it moves to a new schema (the
-- privilege is bound to the relation's OID, and SET SCHEMA gives it a new
-- OID in the new namespace). Re-issuing the grants here makes the move a
-- no-op from the frontend's point of view.

grant select, insert, update, delete on ai.mastra_threads             to authenticated;
grant select, insert, update, delete on ai.mastra_messages            to authenticated;
grant select, insert, update, delete on ai.mastra_resources           to authenticated;
grant select, insert, update, delete on ai.mastra_observational_memory to authenticated;
grant select, update, delete          on ai.mastra_notifications       to authenticated;


-- ----------------------------------------------------------------------------
-- 7. Recreate the event trigger with the new schema-qualified pattern
-- ----------------------------------------------------------------------------
-- Mirrors the trigger function from 20260618010249_mastra_schema_and_rls.sql
-- but checks for `ai.mastra_%` so future CREATE TABLE statements that land
-- in the new schema are auto-RLS-locked.

create or replace function ai.auto_enable_rls()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog, public, ai
as $$
declare
  cmd record;
  qualified_name text;
begin
  for cmd in select * from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE'
  loop
    qualified_name := cmd.object_identity;
    if qualified_name like 'ai.mastra_%' then
      execute format('alter table %s enable row level security', qualified_name);
    end if;
  end loop;
end;
$$;

create event trigger mastra_auto_enable_rls
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function ai.auto_enable_rls();


-- ----------------------------------------------------------------------------
-- 8. Realtime publication: move the entry from public.mastra_threads to ai.mastra_threads
-- ----------------------------------------------------------------------------
-- The publication membership is bound to the table's OID, so a SET SCHEMA
-- leaves the publication pointing at the old (now gone) relation. We need
-- to drop the stale entry and re-add the table under its new qualified name.
-- `REPLICA IDENTITY FULL` is preserved across the move (it is a per-table
-- attribute, not a publication attribute), but we re-apply it defensively
-- to match the original migration's contract.

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mastra_threads'
  ) then
    alter publication supabase_realtime drop table public.mastra_threads;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'ai'
      and tablename = 'mastra_threads'
  ) then
    alter publication supabase_realtime add table ai.mastra_threads;
  end if;
end $$;

alter table ai.mastra_threads replica identity full;
