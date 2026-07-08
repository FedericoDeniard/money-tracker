-- Migration: Drop plaintext OAuth token columns
-- Purpose: Remove the legacy `access_token` / `refresh_token` text columns.
--          After MON-18, all OAuth tokens live in `*_encrypted` (bytea,
--          encrypted with the Vault-managed TOKEN_ENCRYPTION_KEY via
--          `encrypt_secret` / `decrypt_secret` SECURITY DEFINER RPCs).
-- Affected tables: public.user_oauth_tokens
--   - DROP COLUMN access_token
--   - DROP COLUMN refresh_token
-- Notes:
--   - The `encrypt_text` / `decrypt_text` (parameterised) functions from the
--     earlier 20260117141500 migration are kept for backwards-compat with
--     anything that may still reference them; they are not used by the
--     auth-callback / gmail-* edge functions.
--   - This migration is a hard data-irreversible change: once the plaintext
--     columns are gone, no recovery path exists via plain SQL. Verify that
--     all rows have `*_encrypted` populated AND `is_active = false` is the
--     only allowed state for rows where `*_encrypted` is NULL before
--     applying (the safety precheck below handles this and raises if any
--     row would lose token access).

-- Safety precheck: every row must have BOTH encrypted columns NULL OR both
-- plaintext+encrypted columns NULL (i.e. nothing depends on the plaintext
-- being readable). Concretely: no row should be is_active=true with NULL
-- encrypted columns.
do $$
declare
  v_unsafe_count integer;
begin
  select count(*) into v_unsafe_count
  from public.user_oauth_tokens
  where is_active = true
    and access_token_encrypted is null
    and refresh_token_encrypted is null;

  if v_unsafe_count > 0 then
    raise exception
      'Refusing to drop plaintext columns: % active rows have NULL encrypted columns. Deactivate them first (last_refresh_error = ''token_unrecoverable_post_migration'').',
      v_unsafe_count;
  end if;
end
$$;

-- Drop the deprecated plaintext columns.
-- All consumers (edge functions, mastra-server) now read *_encrypted and
-- decrypt in memory via decryptSecret() / decryptTokenRow().
alter table public.user_oauth_tokens
  drop column access_token,
  drop column refresh_token;
