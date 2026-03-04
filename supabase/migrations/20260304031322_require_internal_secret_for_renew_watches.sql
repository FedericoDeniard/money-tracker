-- Require INTERNAL_FUNCTIONS_SECRET when pg_cron triggers renew-watches edge function
create or replace function public.renew_gmail_watches()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  edge_function_url text := 'https://nswqfbakcbfaxuoguqhe.supabase.co/functions/v1/renew-watches';
  internal_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into internal_secret
  from vault.decrypted_secrets
  where name = 'INTERNAL_FUNCTIONS_SECRET'
  limit 1;

  if internal_secret is null then
    raise exception 'INTERNAL_FUNCTIONS_SECRET is not configured in vault';
  end if;

  request_id := net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || internal_secret
    ),
    body := jsonb_build_object('action', 'renew_all')
  );

  raise log 'Gmail watches renewal triggered at %, request_id=%, url=%', now(), request_id, edge_function_url;
exception
  when others then
    raise log 'Error triggering Gmail watches renewal: %', sqlerrm;
    raise exception 'renew_gmail_watches failed: %', sqlerrm;
end;
$$;
