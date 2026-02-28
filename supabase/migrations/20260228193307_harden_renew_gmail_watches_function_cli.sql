-- Harden renew_gmail_watches() to surface real failures in pg_cron
create or replace function public.renew_gmail_watches()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  edge_function_url text := 'https://nswqfbakcbfaxuoguqhe.supabase.co/functions/v1/renew-watches';
  request_id bigint;
begin
  request_id := net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('action', 'renew_all')
  );

  raise log 'Gmail watches renewal triggered at %, request_id=%, url=%', now(), request_id, edge_function_url;
exception
  when others then
    raise log 'Error triggering Gmail watches renewal: %', sqlerrm;
    raise exception 'renew_gmail_watches failed: %', sqlerrm;
end;
$$;
