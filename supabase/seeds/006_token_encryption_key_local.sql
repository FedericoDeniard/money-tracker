-- Local-only convenience seed for the OAuth token encryption key.
-- Keep this value aligned with supabase/functions/.env(.example) so the
-- encrypt_secret / decrypt_secret RPCs can find it when running against the
-- local Supabase stack.
do $$
declare
  existing_id    uuid;
  local_key      text := 'local-dev-token-encryption-key-32bytes-min!';
begin
  select id
  into existing_id
  from vault.decrypted_secrets
  where name = 'TOKEN_ENCRYPTION_KEY'
  limit 1;

  if existing_id is null then
    perform vault.create_secret(
      local_key,
      'TOKEN_ENCRYPTION_KEY',
      'Local OAuth token encryption key (pgcrypto pgp_sym_encrypt)'
    );
  else
    perform vault.update_secret(
      existing_id,
      local_key,
      'TOKEN_ENCRYPTION_KEY',
      'Local OAuth token encryption key (pgcrypto pgp_sym_encrypt)'
    );
  end if;
end
$$;
