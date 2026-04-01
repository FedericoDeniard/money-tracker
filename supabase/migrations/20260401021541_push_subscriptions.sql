-- Migration: create push_subscriptions table
-- Purpose: Store browser Web Push subscriptions (endpoint + encryption keys)
--          so the server can send push notifications to users' devices.
-- Affected tables: public.push_subscriptions (new)
-- Notes:
--   - One row per browser/device subscription (unique on endpoint)
--   - A user can have multiple subscriptions (multiple devices/browsers)
--   - Rows are deleted when the user unsubscribes or when the push service
--     returns 404/410 (expired subscription)
--   - RLS ensures users can only access their own subscriptions
--   - Edge functions use the service_role key (bypasses RLS) to read all
--     subscriptions for a user when sending push notifications

-- create the push_subscriptions table
create table public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  -- the push service endpoint URL (unique per browser/device)
  endpoint   text        not null,
  -- ECDH public key (base64url) used to encrypt the push message payload
  p256dh     text        not null,
  -- auth secret (base64url) used in HKDF key derivation for encryption
  auth       text        not null,
  created_at timestamptz not null default now(),

  -- one endpoint can only belong to one subscription row
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

comment on table public.push_subscriptions is
  'Stores browser Web Push subscriptions (endpoint + VAPID encryption keys) for sending push notifications to user devices.';

comment on column public.push_subscriptions.endpoint is
  'The push service endpoint URL provided by the browser. Unique per device/browser.';

comment on column public.push_subscriptions.p256dh is
  'The ECDH P-256 public key (base64url) from the PushSubscription, used to encrypt the push payload.';

comment on column public.push_subscriptions.auth is
  'The authentication secret (base64url) from the PushSubscription, used in HKDF key derivation.';

-- index for fast lookups by user_id (most common access pattern)
create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- enable row level security — all access goes through policies below
alter table public.push_subscriptions enable row level security;

-- policy: authenticated users can select only their own subscriptions
create policy "authenticated users can select own push subscriptions"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: authenticated users can insert their own subscriptions
-- (user_id must match the authenticated user — prevents inserting for others)
create policy "authenticated users can insert own push subscriptions"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: authenticated users can delete only their own subscriptions
-- (used when the user explicitly unsubscribes)
create policy "authenticated users can delete own push subscriptions"
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- anon users have no access
create policy "anon users cannot select push subscriptions"
  on public.push_subscriptions
  for select
  to anon
  using (false);
