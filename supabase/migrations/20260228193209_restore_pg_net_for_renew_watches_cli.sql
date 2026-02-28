-- Ensure pg_net is available for renew_gmail_watches()
create extension if not exists pg_net;

do $$
begin
  if to_regnamespace('net') is null then
    raise exception 'pg_net installation did not create schema net';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'net'
      and p.proname = 'http_post'
  ) then
    raise exception 'pg_net is installed but net.http_post is missing';
  end if;
end $$;
