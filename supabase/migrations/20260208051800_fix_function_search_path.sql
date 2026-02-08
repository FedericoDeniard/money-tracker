-- Fix function_search_path_mutable warnings
-- Sets search_path to '' for all public functions to prevent search_path injection attacks
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- 1. update_updated_at_column (trigger function)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql
set search_path = '';

-- 2. handle_new_user (trigger function, security definer)
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.users (id, email, name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
    );
    return new;
end;
$$ language plpgsql security definer
set search_path = '';

-- 3. encrypt_text (security definer)
create or replace function public.encrypt_text(text_to_encrypt text, encryption_key text)
returns bytea as $$
begin
  return pgp_sym_encrypt(text_to_encrypt, encryption_key);
end;
$$ language plpgsql security definer
set search_path = 'extensions';

-- 4. decrypt_text (security definer)
create or replace function public.decrypt_text(encrypted_data bytea, encryption_key text)
returns text as $$
begin
  return pgp_sym_decrypt(encrypted_data, encryption_key);
end;
$$ language plpgsql security definer
set search_path = 'extensions';

-- 5. get_active_gmail_emails (security definer)
create or replace function public.get_active_gmail_emails()
returns table (gmail_email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select distinct uot.gmail_email::text
  from public.user_oauth_tokens uot
  where uot.user_id = auth.uid()
    and uot.is_active = true
  order by 1;
end;
$$;

-- 6. renew_gmail_watches (security definer)
-- Updated to call Supabase Edge Function instead of old Railway backend
create or replace function public.renew_gmail_watches()
returns void
language plpgsql
security definer
set search_path = 'net'
as $$
declare
  edge_function_url text := 'https://nswqfbakcbfaxuoguqhe.supabase.co/functions/v1/renew-watches';
begin
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('action', 'renew_all')
  );
  
  raise log 'Gmail watches renewal triggered at %', now();
exception
  when others then
    raise log 'Error triggering Gmail watches renewal: %', sqlerrm;
end;
$$;
