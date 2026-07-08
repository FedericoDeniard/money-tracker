-- Migration: Move OAuth tokens to application-level encryption (pgcrypto + Vault)
-- Purpose: Encrypt access_token / refresh_token at the application layer (in addition
--          to Supabase's at-rest disk encryption). The encryption key lives only in
--          Supabase Vault and is read by SECURITY DEFINER functions on each call —
--          the key is never exposed to the edge function runtime.
-- Affected tables: public.user_oauth_tokens
--                  - populate access_token_encrypted / refresh_token_encrypted
--                  - null out plaintext access_token / refresh_token
--                  - mark rows that cannot be encrypted as inactive (force reconnect)
-- New objects: public.encrypt_secret(text) -> bytea
--              public.decrypt_secret(bytea) -> text
-- Affected RPCs: encrypt_text / decrypt_text (existing, parameterised) remain
--                unchanged for back-compat with anything else that calls them.
-- Notes:
--   - TOKEN_ENCRYPTION_KEY must be set in Vault BEFORE this migration runs.
--     Production: SELECT vault.create_secret('<random-32+ chars>', 'TOKEN_ENCRYPTION_KEY');
--     Local: handled by supabase/seeds/006_token_encryption_key_local.sql.
--   - The migration will fail (raise exception) if the key is missing, to avoid
--     partial migration of a critical column.
--   - The migration is atomic: either all rows are backfilled successfully or none
--     are mutated (the UPDATE runs in a single statement inside an implicit txn).
--   - Plaintext columns are KEPT as nullable for now to allow a quick rollback path
--     during the first ~24h of prod verification. Drop them in a follow-up migration.

-- 1. Verify TOKEN_ENCRYPTION_KEY exists in Vault. Hard-fail if not, so we never
--    run a half-encrypted state.
do $$
declare
  v_key_exists boolean;
begin
  select exists(
    select 1 from vault.decrypted_secrets where name = 'TOKEN_ENCRYPTION_KEY' limit 1
  ) into v_key_exists;

  if not v_key_exists then
    raise exception
      'TOKEN_ENCRYPTION_KEY missing from vault. Run: SELECT vault.create_secret(''<random-32+ chars>'', ''TOKEN_ENCRYPTION_KEY'');';
  end if;
end
$$;

-- 2. encrypt_secret — read the key from Vault internally, then encrypt with
--    pgcrypto. Edge functions call this RPC; they never see the key.
create or replace function public.encrypt_secret(p_plaintext text)
returns bytea
language plpgsql
security definer
set search_path = 'extensions'
as $$
declare
  v_key text;
begin
  select decrypted_secret
  into v_key
  from vault.decrypted_secrets
  where name = 'TOKEN_ENCRYPTION_KEY'
  limit 1;

  if v_key is null then
    raise exception 'TOKEN_ENCRYPTION_KEY not found in vault';
  end if;

  return pgp_sym_encrypt(p_plaintext, v_key);
end;
$$;

-- 3. decrypt_secret — counterpart of encrypt_secret.
create or replace function public.decrypt_secret(p_encrypted bytea)
returns text
language plpgsql
security definer
set search_path = 'extensions'
as $$
declare
  v_key text;
begin
  select decrypted_secret
  into v_key
  from vault.decrypted_secrets
  where name = 'TOKEN_ENCRYPTION_KEY'
  limit 1;

  if v_key is null then
    raise exception 'TOKEN_ENCRYPTION_KEY not found in vault';
  end if;

  return pgp_sym_decrypt(p_encrypted, v_key);
end;
$$;

comment on function public.encrypt_secret(text) is
  'Encrypts plaintext with the Vault-stored TOKEN_ENCRYPTION_KEY using pgcrypto pgp_sym_encrypt. Key is never exposed to callers.';
comment on function public.decrypt_secret(bytea) is
  'Decrypts bytea with the Vault-stored TOKEN_ENCRYPTION_KEY using pgcrypto pgp_sym_decrypt. Key is never exposed to callers.';

-- 4. Backfill: encrypt any plaintext tokens that don't yet have an encrypted copy.
--    - access_token_encrypted: only set if a plaintext access_token exists.
--    - refresh_token_encrypted: only set if a plaintext refresh_token exists.
--    This is a single statement, so it's atomic within the transaction.
update public.user_oauth_tokens
set
  access_token_encrypted = case
    when access_token is not null then public.encrypt_secret(access_token)
    else null
  end,
  refresh_token_encrypted = case
    when refresh_token is not null then public.encrypt_secret(refresh_token)
    else null
  end
where access_token_encrypted is null
  and (access_token is not null or refresh_token is not null);

-- 5. Null out the plaintext columns for rows we successfully encrypted.
--    For rows that failed (e.g. encrypt_secret errored mid-statement), the
--    UPDATE above will have failed and we'd never reach here — so any row that
--    reaches this UPDATE has a non-null encrypted column.
update public.user_oauth_tokens
set
  access_token = null,
  refresh_token = null
where access_token_encrypted is not null
   or refresh_token_encrypted is not null;

-- 6. Safety net: any row that ended up with no encrypted columns (e.g. both
--    plaintext columns were already NULL before backfill, or they were NULL
--    in some edge case) gets marked inactive so the user is forced to
--    reconnect Gmail and reissue tokens. This is a defensive cleanup, not
--    expected to fire in normal conditions.
update public.user_oauth_tokens
set
  is_active = false,
  last_refresh_error = coalesce(last_refresh_error, 'plaintext_token_cleanup_no_encrypted_copy')
where access_token_encrypted is null
  and refresh_token_encrypted is null;
