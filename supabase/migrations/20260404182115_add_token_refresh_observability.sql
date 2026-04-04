-- Migration: add refresh observability columns to user_oauth_tokens
-- Purpose: Track the last successful refresh timestamp and the last refresh error
--          so we can detect stale tokens and diagnose failures without relying on
--          edge function logs (which expire after 24 hours).
-- Affected tables: user_oauth_tokens

alter table public.user_oauth_tokens
  add column if not exists last_refresh_at   timestamptz,
  add column if not exists last_refresh_error text;

comment on column public.user_oauth_tokens.last_refresh_at is
  'Timestamp of the last successful OAuth access token refresh. Null if the token has never been refreshed proactively.';

comment on column public.user_oauth_tokens.last_refresh_error is
  'Last refresh error reason (e.g. "refresh_failed:{...}"). Set to null on success. Mirrors the reason stored in token_deactivation_log for quick querying without joining.';

-- Index to quickly find tokens that have not been refreshed recently.
create index if not exists idx_user_oauth_tokens_last_refresh_at
  on public.user_oauth_tokens (last_refresh_at)
  where is_active = true;
