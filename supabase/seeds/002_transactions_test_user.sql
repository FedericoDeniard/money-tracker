-- Seed type: transactions
-- Creates 132 deterministic sample transactions for user@test.com.

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
