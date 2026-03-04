-- Local-only convenience seed for internal edge-function auth.
-- Keep this value aligned with supabase/functions/.env(.example).
do $$
declare
  existing_id uuid;
  local_secret text := 'local-dev-internal-secret';
begin
  select id
  into existing_id
  from vault.decrypted_secrets
  where name = 'INTERNAL_FUNCTIONS_SECRET'
  limit 1;

  if existing_id is null then
    perform vault.create_secret(
      local_secret,
      'INTERNAL_FUNCTIONS_SECRET',
      'Local internal token for renew-watches edge function'
    );
  else
    perform vault.update_secret(
      existing_id,
      local_secret,
      'INTERNAL_FUNCTIONS_SECRET',
      'Local internal token for renew-watches edge function'
    );
  end if;
end
$$;
