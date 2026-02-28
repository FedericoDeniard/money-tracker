-- Seed type: auth users
-- Creates a reusable local test user for development login flows.

-- 1) Create user if missing
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Test User"}'::jsonb,
    false,
    now(),
    now(),
    null,
    null
  WHERE NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = 'test@gmail.com'
  );

-- 2) Keep credentials and metadata deterministic on every run
UPDATE auth.users
SET
  encrypted_password = crypt('password123', gen_salt('bf')),
  raw_user_meta_data = '{"name":"Test User"}'::jsonb,
  updated_at = now()
WHERE email = 'test@gmail.com';

-- 3) Ensure identity exists
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.email,
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'test@gmail.com'
AND NOT EXISTS (
  SELECT 1
  FROM auth.identities i
  WHERE i.provider = 'email'
    AND i.provider_id = u.email
);
