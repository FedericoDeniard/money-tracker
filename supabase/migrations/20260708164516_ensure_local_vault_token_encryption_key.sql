-- Migration: Ensure TOKEN_ENCRYPTION_KEY exists in Vault for local dev.
-- Purpose: The 20260708164517_add_oauth_token_encryption migration hard-fails
--          if TOKEN_ENCRYPTION_KEY is not in Vault. In production, the key is
--          set manually via SELECT vault.create_secret(...) before deploying.
--          Locally, the only way to populate the key was via a seed, but seeds
--          run AFTER migrations, so the migration always failed on a fresh
--          `db reset` or `supabase start`. This migration closes that gap by
--          creating the local dev key before the encryption migration runs.
--
-- Idempotency: only creates the secret if it doesn't already exist. In any
--              environment where the key was set manually (production), this
--              is a no-op.
--
-- Production safety note:
--   - In production the key should be set BEFORE deploying, so this branch
--     never executes and the encrypt_secret/decrypt_secret functions use the
--     real key.
--   - If a new production env forgets to set the key, this migration will
--     create the local dev key instead of failing. encrypt_secret will still
--     work, but with a known key committed to the repo. Treat the manual
--     key creation as the primary mechanism — this migration is the safety
--     net, not the source of truth for production keys.
--
-- The dev key value matches supabase/seeds/006_token_encryption_key_local.sql
-- so local encryption/decryption stays consistent.

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'TOKEN_ENCRYPTION_KEY' limit 1
  ) then
    perform vault.create_secret(
      'local-dev-token-encryption-key-32bytes-min!',
      'TOKEN_ENCRYPTION_KEY',
      'Local dev OAuth token encryption key (pgcrypto pgp_sym_encrypt)'
    );
  end if;
end
$$;