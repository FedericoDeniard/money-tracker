-- Seed type: transactions
-- Creates 132 deterministic sample transactions + recurring subscription-like charges (including an inactive historical case) for user@test.com.

WITH test_user AS (
  SELECT id
  FROM auth.users
  WHERE email = 'user@test.com'
  LIMIT 1
),
deleted AS (
  DELETE FROM public.transactions t
  USING test_user u
  WHERE t.user_id = u.id
    AND t.source_message_id LIKE 'seed-test-transaction-%'
),
seed_rows AS (
  SELECT
    u.id AS user_id,
    g.n AS seq,
    (now() - make_interval(days => (132 - g.n))) AS occurred_at,
    (current_date - ((132 - g.n) % 60)) AS tx_date,
    (ARRAY[
      'salary',
      'food',
      'transport',
      'services',
      'health',
      'education',
      'housing',
      'clothing',
      'entertainment',
      'investment',
      'other'
    ])[((g.n - 1) % 11) + 1] AS category
  FROM test_user u
  CROSS JOIN generate_series(1, 132) AS g(n)
)
INSERT INTO public.transactions (
  id,
  user_id,
  source_email,
  source_message_id,
  date,
  amount,
  currency,
  transaction_type,
  transaction_description,
  transaction_date,
  merchant,
  category
)
SELECT
  gen_random_uuid(),
  r.user_id,
  CASE r.category
    WHEN 'salary' THEN 'payroll@company.com'
    WHEN 'food' THEN 'receipts@supermarket.com'
    WHEN 'transport' THEN 'trip@rideshare.com'
    WHEN 'services' THEN 'billing@streaming.com'
    WHEN 'health' THEN 'billing@clinic.com'
    WHEN 'education' THEN 'payments@academy.com'
    WHEN 'housing' THEN 'noreply@landlord.com'
    WHEN 'clothing' THEN 'orders@fashion.com'
    WHEN 'entertainment' THEN 'tickets@cinema.com'
    WHEN 'investment' THEN 'reports@broker.com'
    ELSE 'noreply@merchant.com'
  END,
  format('seed-test-transaction-%s', lpad(r.seq::text, 3, '0')),
  r.occurred_at,
  CASE
    WHEN r.category = 'salary' THEN round((2200 + ((r.seq % 6) * 175))::numeric, 2)
    WHEN r.category = 'investment' AND r.seq % 3 = 0 THEN round((300 + ((r.seq % 7) * 45))::numeric, 2)
    ELSE round((8 + ((r.seq % 19) * 7.35))::numeric, 2)
  END,
  'USD',
  CASE
    WHEN r.category IN ('salary', 'investment') AND r.seq % 3 = 0 THEN 'income'
    WHEN r.category = 'salary' THEN 'income'
    ELSE 'expense'
  END,
  format('Seed transaction %s (%s)', lpad(r.seq::text, 3, '0'), r.category),
  r.tx_date,
  CASE r.category
    WHEN 'salary' THEN 'ACME Corp'
    WHEN 'food' THEN 'SuperMart'
    WHEN 'transport' THEN 'CityRide'
    WHEN 'services' THEN 'StreamFlix'
    WHEN 'health' THEN 'Health Center'
    WHEN 'education' THEN 'LearnHub'
    WHEN 'housing' THEN 'HomeRent'
    WHEN 'clothing' THEN 'StyleShop'
    WHEN 'entertainment' THEN 'MoviePlex'
    WHEN 'investment' THEN 'BrokerNow'
    ELSE 'Generic Store'
  END,
  r.category
FROM seed_rows r;

-- Add deterministic recurring charges to exercise subscription detection
WITH test_user AS (
  SELECT id
  FROM auth.users
  WHERE email = 'user@test.com'
  LIMIT 1
),
deleted AS (
  DELETE FROM public.transactions t
  USING test_user u
  WHERE t.user_id = u.id
    AND t.source_message_id LIKE 'seed-test-subscription-%'
),
monthly_seed AS (
  SELECT
    u.id AS user_id,
    gs.n AS seq,
    (date_trunc('month', now())::date - make_interval(months => (11 - gs.n))::interval)::date AS tx_date
  FROM test_user u
  CROSS JOIN generate_series(0, 11) AS gs(n)
),
yearly_seed AS (
  SELECT
    u.id AS user_id,
    gs.n AS seq,
    (date_trunc('month', now())::date - make_interval(years => (2 - gs.n))::interval)::date AS tx_date
  FROM test_user u
  CROSS JOIN generate_series(0, 2) AS gs(n)
),
inactive_seed AS (
  SELECT
    u.id AS user_id,
    gs.n AS seq,
    (date '2025-09-05' + make_interval(months => gs.n))::date AS tx_date
  FROM test_user u
  CROSS JOIN generate_series(0, 2) AS gs(n)
)
INSERT INTO public.transactions (
  id,
  user_id,
  source_email,
  source_message_id,
  date,
  amount,
  currency,
  transaction_type,
  transaction_description,
  transaction_date,
  merchant,
  category
)
SELECT
  gen_random_uuid(),
  m.user_id,
  'billing@streamflix.com',
  format('seed-test-subscription-streamflix-%s', lpad(m.seq::text, 2, '0')),
  (m.tx_date + interval '09:30:00'),
  19.99,
  'USD',
  'expense',
  'StreamFlix monthly subscription',
  m.tx_date,
  'StreamFlix',
  'services'
FROM monthly_seed m
UNION ALL
SELECT
  gen_random_uuid(),
  m.user_id,
  'payments@musicbox.com',
  format('seed-test-subscription-musicbox-%s', lpad(m.seq::text, 2, '0')),
  (m.tx_date + interval '11:00:00'),
  9.99,
  'USD',
  'expense',
  'MusicBox premium plan',
  m.tx_date,
  'MusicBox',
  'services'
FROM monthly_seed m
UNION ALL
SELECT
  gen_random_uuid(),
  y.user_id,
  'billing@cloudsafe.com',
  format('seed-test-subscription-cloudsafe-%s', lpad(y.seq::text, 2, '0')),
  (y.tx_date + interval '08:00:00'),
  99.00,
  'USD',
  'expense',
  'CloudSafe annual plan',
  y.tx_date,
  'CloudSafe',
  'services'
FROM yearly_seed y
UNION ALL
SELECT
  gen_random_uuid(),
  i.user_id,
  'billing@oldflix.com',
  format('seed-test-subscription-oldflix-%s', to_char(i.tx_date, 'YYYY-MM')),
  (i.tx_date + interval '10:15:00'),
  14.99,
  'USD',
  'expense',
  'OldFlix legacy monthly plan',
  i.tx_date,
  'OldFlix',
  'services'
FROM inactive_seed i;
