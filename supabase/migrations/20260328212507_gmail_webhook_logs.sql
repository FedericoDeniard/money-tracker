-- Migration: create token_deactivation_log table
-- Purpose: Persistent audit log of every time a Gmail OAuth token is deactivated,
--          capturing the reason and stage so disconnection bugs can be diagnosed
--          after the fact (edge function logs expire, this table doesn't).
-- Affected tables: token_deactivation_log (new)
-- Notes: Only the service role (used by edge functions) can insert/read rows.
--        The anon and authenticated roles have no access — this table contains
--        internal diagnostic data, not user-facing data.

create table public.token_deactivation_log (
  id          uuid        primary key default gen_random_uuid(),
  token_id    uuid        not null,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  gmail_email text,
  -- reason: the raw string explaining why the token was deactivated.
  -- Examples:
  --   "missing_refresh_token"
  --   "missing_google_oauth_config"
  --   "refresh_failed:{\"error\":\"invalid_grant\",...}"
  --   "unauthorized_after_refresh"
  reason      text        not null,
  -- stage: which part of the code triggered the deactivation.
  -- Examples:
  --   "gmail_webhook"
  --   "renew_watch_preflight"
  --   "renew_watch"
  --   "process_history_preflight"
  stage       text        not null,
  created_at  timestamptz not null default now()
);

-- Index to make lookups by email fast (most common query pattern for debugging)
create index token_deactivation_log_gmail_email_idx
  on public.token_deactivation_log (gmail_email, created_at desc);

-- Index by user_id for per-user queries
create index token_deactivation_log_user_id_idx
  on public.token_deactivation_log (user_id, created_at desc);

-- Enable RLS — this table must not be exposed to end users
alter table public.token_deactivation_log enable row level security;

-- Deny all access to anonymous users
create policy "anon cannot select token_deactivation_log"
  on public.token_deactivation_log
  for select
  to anon
  using (false);

create policy "anon cannot insert token_deactivation_log"
  on public.token_deactivation_log
  for insert
  to anon
  with check (false);

-- Deny all access to authenticated users (this is internal/service-only data)
create policy "authenticated cannot select token_deactivation_log"
  on public.token_deactivation_log
  for select
  to authenticated
  using (false);

create policy "authenticated cannot insert token_deactivation_log"
  on public.token_deactivation_log
  for insert
  to authenticated
  with check (false);

-- The service role bypasses RLS entirely, so edge functions using the
-- service role key can insert and read rows without any explicit policy.
