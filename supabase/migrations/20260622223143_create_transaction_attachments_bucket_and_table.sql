-- ============================================================================
-- Transaction attachments: private storage bucket + metadata table
-- ============================================================================
-- Purpose: persist receipts/tickets (images and PDFs) extracted from Gmail
-- emails by the gmail-webhook Edge Function, as well as files uploaded
-- directly through the process-document Edge Function. Files are stored in a
-- private Supabase Storage bucket; a row in public.transaction_attachments
-- records metadata, the storage path and the link to the transaction it was
-- extracted from.
--
-- Notes:
-- - transaction_id references public.transactions and cascades on delete, so
--   removing a transaction also removes its attachment rows. Storage objects
--   are NOT auto-removed by the cascade; cleanup must be handled at the
--   application layer (or by a future trigger) to avoid orphaned files.
-- - user_id is denormalized from transactions for cheaper RLS checks (avoids
--   a join to transactions in every policy) and to scope storage access.
-- - bucket is private (public = false); clients must use signed URLs.
-- - file_size_limit matches the attachment-extractor Edge Function (5MB).
-- - Follows the conventions established in
--   20260611214652_create_chat_uploads_bucket_and_table.sql and
--   20260618014602_rls_lockdown.sql (explicit GRANTs, `(select auth.uid())`
--   initPlan form, per-user storage folder scoping).
-- ============================================================================

-- ----- storage bucket -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transaction-attachments',
  'transaction-attachments',
  false,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
on conflict (id) do nothing;

-- ----- metadata table -----
create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

create index if not exists transaction_attachments_transaction_id_idx
  on public.transaction_attachments (transaction_id);

create index if not exists transaction_attachments_user_id_idx
  on public.transaction_attachments (user_id);

-- ----- RLS: transaction_attachments -----
alter table public.transaction_attachments enable row level security;

-- authenticated users can read their own attachment rows
drop policy if exists "Users can read their own transaction attachments" on public.transaction_attachments;
create policy "Users can read their own transaction attachments"
  on public.transaction_attachments
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- authenticated users can insert rows that belong to themselves
drop policy if exists "Users can insert their own transaction attachments" on public.transaction_attachments;
create policy "Users can insert their own transaction attachments"
  on public.transaction_attachments
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- authenticated users can delete their own attachment rows
drop policy if exists "Users can delete their own transaction attachments" on public.transaction_attachments;
create policy "Users can delete their own transaction attachments"
  on public.transaction_attachments
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ----- storage policies -----
-- path convention enforced by writers: {user_id}/{transaction_id}/{uuid}.{ext}
-- the first folder segment must equal auth.uid() to scope access per-user.

drop policy if exists "Users can upload to their own transaction-attachments folder" on storage.objects;
create policy "Users can upload to their own transaction-attachments folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'transaction-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read their own transaction-attachments" on storage.objects;
create policy "Users can read their own transaction-attachments"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'transaction-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own transaction-attachments" on storage.objects;
create policy "Users can delete their own transaction-attachments"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'transaction-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----- grants -----
-- Explicit GRANT to authenticated, consistent with 20260618014602_rls_lockdown.sql.
-- service_role (used by Edge Functions) retains full access via superuser.
grant select, insert, update, delete on public.transaction_attachments to authenticated;

-- ----- comments -----
comment on table public.transaction_attachments is 'Receipts/tickets (images and PDFs) extracted from Gmail emails or uploaded directly, linked to the transaction they were analyzed for.';
comment on column public.transaction_attachments.transaction_id is 'Transaction this attachment was extracted from. Cascades on delete.';
comment on column public.transaction_attachments.user_id is 'Owner of the attachment. Denormalized from transactions for cheaper RLS and storage scoping.';
comment on column public.transaction_attachments.storage_path is 'Path in the transaction-attachments bucket: {user_id}/{transaction_id}/{uuid}.{ext}';
