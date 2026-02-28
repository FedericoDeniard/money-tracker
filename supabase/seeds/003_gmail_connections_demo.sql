-- Seed type: gmail connections demo
-- Creates one active and one expired/disconnected Gmail connection for user@test.com.

with test_user as (
  select id
  from auth.users
  where email = 'user@test.com'
  limit 1
)
insert into public.user_oauth_tokens (
  user_id,
  gmail_email,
  access_token,
  refresh_token,
  token_type,
  scope,
  expires_at,
  is_active,
  created_at,
  updated_at
)
select
  u.id,
  v.gmail_email,
  v.access_token,
  v.refresh_token,
  'Bearer',
  'https://www.googleapis.com/auth/gmail.readonly',
  v.expires_at,
  v.is_active,
  now(),
  now()
from test_user u
cross join (
  values
    (
      'connected.demo@gmail.com'::varchar,
      'seed-active-token'::text,
      'seed-active-refresh'::text,
      now() + interval '30 days',
      true
    ),
    (
      'expired.demo@gmail.com'::varchar,
      'seed-expired-token'::text,
      'seed-expired-refresh'::text,
      now() - interval '7 days',
      false
    )
) as v(gmail_email, access_token, refresh_token, expires_at, is_active)
on conflict (user_id, gmail_email) do update
set
  access_token = excluded.access_token,
  refresh_token = excluded.refresh_token,
  token_type = excluded.token_type,
  scope = excluded.scope,
  expires_at = excluded.expires_at,
  is_active = excluded.is_active,
  updated_at = now();

-- Ensure watch exists for connected demo account.
with test_user as (
  select id
  from auth.users
  where email = 'user@test.com'
  limit 1
)
insert into public.gmail_watches (
  user_id,
  gmail_email,
  topic_name,
  watch_id,
  expiration,
  history_id,
  is_active,
  updated_at
)
select
  u.id,
  'connected.demo@gmail.com',
  'projects/dev/topics/gmail-notifications',
  null,
  now() + interval '3 days',
  null,
  true,
  now()
from test_user u
on conflict (user_id, gmail_email) do update
set
  topic_name = excluded.topic_name,
  watch_id = excluded.watch_id,
  expiration = excluded.expiration,
  history_id = excluded.history_id,
  is_active = excluded.is_active,
  updated_at = now();

-- Ensure expired/disconnected account has no active watch.
with test_user as (
  select id
  from auth.users
  where email = 'user@test.com'
  limit 1
)
delete from public.gmail_watches w
using test_user u
where w.user_id = u.id
  and w.gmail_email = 'expired.demo@gmail.com';
