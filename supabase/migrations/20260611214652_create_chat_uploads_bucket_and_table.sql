-- ============================================================================
-- Chat uploads: private storage bucket + metadata table
-- ============================================================================
-- Purpose: persist images attached to assistant messages (screenshots / photo
-- uploads from the prompt input "+" menu). Files are uploaded on message
-- send and stored in a private Supabase Storage bucket; a row in
-- public.chat_attachments records metadata and the storage path. Access is
-- scoped per-user via RLS and storage path conventions
-- ({user_id}/{thread_id}/{uuid}.{ext}).
--
-- Notes:
-- - thread_id is text (uuid-shaped) to match mastra_threads.id which is
--   text in Mastra's PostgresStore schema. We intentionally do NOT add a
--   foreign key because mastra_threads is created lazily by the Mastra
--   server on first interaction; we don't want this migration to fail
--   on a fresh database.
-- - bucket is private (public = false); clients must use signed URLs.
-- - file_size_limit matches process-document Edge Function (5MB).
-- ============================================================================

-- ----- storage bucket -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-uploads',
  'chat-uploads',
  false,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do nothing;

-- ----- metadata table -----
create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_attachments_user_id_idx
  on public.chat_attachments (user_id);

create index if not exists chat_attachments_thread_id_idx
  on public.chat_attachments (thread_id);

-- ----- RLS: chat_attachments -----
alter table public.chat_attachments enable row level security;

-- authenticated users can read their own attachment rows
drop policy if exists "Users can read their own chat attachments" on public.chat_attachments;
create policy "Users can read their own chat attachments"
  on public.chat_attachments
  for select
  to authenticated
  using (user_id = auth.uid());

-- authenticated users can insert rows that belong to themselves
drop policy if exists "Users can insert their own chat attachments" on public.chat_attachments;
create policy "Users can insert their own chat attachments"
  on public.chat_attachments
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- authenticated users can delete their own attachment rows
drop policy if exists "Users can delete their own chat attachments" on public.chat_attachments;
create policy "Users can delete their own chat attachments"
  on public.chat_attachments
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ----- storage policies -----
-- path convention enforced by clients: {user_id}/{thread_id}/{uuid}.{ext}
-- the first folder segment must equal auth.uid() to scope access per-user.

drop policy if exists "Users can upload to their own chat folder" on storage.objects;
create policy "Users can upload to their own chat folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read their own chat uploads" on storage.objects;
create policy "Users can read their own chat uploads"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'chat-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own chat uploads" on storage.objects;
create policy "Users can delete their own chat uploads"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
