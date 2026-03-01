-- Seed type: notifications demo
-- Creates deterministic demo notifications for user@test.com.

WITH test_user AS (
  SELECT id
  FROM auth.users
  WHERE email = 'user@test.com'
  LIMIT 1
),
cleanup AS (
  DELETE FROM public.notifications n
  USING test_user u
  WHERE n.user_id = u.id
    AND n.dedupe_key LIKE 'seed-demo-notification-%'
),
seed_rows AS (
  SELECT
    u.id AS user_id,
    nt.id AS notification_type_id,
    nt.key AS type_key,
    nt.title_i18n_key,
    nt.body_i18n_key,
    nt.default_importance
  FROM test_user u
  JOIN public.notification_types nt ON nt.is_active = true
)
INSERT INTO public.notifications (
  user_id,
  notification_type_id,
  title_i18n_key,
  body_i18n_key,
  i18n_params,
  metadata,
  read_at,
  is_archived,
  is_muted,
  importance,
  action_path,
  icon_key,
  avatar_url,
  dedupe_key,
  created_at
)
SELECT
  r.user_id,
  r.notification_type_id,
  r.title_i18n_key,
  r.body_i18n_key,
  CASE r.type_key
    WHEN 'seed_completed_with_transactions' THEN
      jsonb_build_object('count', 12, 'totalEmails', 80)
    WHEN 'seed_completed_no_new' THEN
      jsonb_build_object('totalEmails', 35)
    WHEN 'seed_failed' THEN
      jsonb_build_object('reason', 'Error de prueba local')
    WHEN 'gmail_reconnect_required' THEN
      jsonb_build_object('email', 'expired.demo@gmail.com')
    WHEN 'gmail_watch_expiring' THEN
      jsonb_build_object('email', 'connected.demo@gmail.com')
    WHEN 'gmail_watch_renew_failed' THEN
      jsonb_build_object('email', 'connected.demo@gmail.com')
    WHEN 'gmail_sync_error' THEN
      jsonb_build_object('email', 'connected.demo@gmail.com', 'reason', 'History API timeout')
    ELSE '{}'::jsonb
  END AS i18n_params,
  jsonb_build_object(
    'seeded', true,
    'source', 'local-demo',
    'type_key', r.type_key
  ) AS metadata,
  CASE
    WHEN r.type_key IN ('seed_completed_no_new', 'gmail_watch_expiring') THEN now() - interval '10 minutes'
    ELSE NULL
  END AS read_at,
  CASE WHEN r.type_key = 'seed_completed_no_new' THEN true ELSE false END AS is_archived,
  CASE WHEN r.type_key = 'gmail_watch_expiring' THEN true ELSE false END AS is_muted,
  CASE
    WHEN r.type_key IN ('seed_failed', 'gmail_reconnect_required', 'gmail_watch_renew_failed', 'gmail_sync_error') THEN 'high'::public.notification_importance
    WHEN r.type_key = 'seed_completed_no_new' THEN 'low'::public.notification_importance
    ELSE COALESCE(r.default_importance, 'normal'::public.notification_importance)
  END AS importance,
  CASE
    WHEN r.type_key LIKE 'seed_%' THEN '/transactions'
    ELSE '/settings'
  END AS action_path,
  CASE
    WHEN r.type_key LIKE 'seed_%' THEN 'mail'
    WHEN r.type_key = 'gmail_sync_error' THEN 'alert'
    ELSE 'gmail'
  END AS icon_key,
  NULL::text AS avatar_url,
  format('seed-demo-notification-%s', r.type_key) AS dedupe_key,
  now() - (
    CASE r.type_key
      WHEN 'seed_completed_with_transactions' THEN interval '2 minutes'
      WHEN 'seed_completed_no_new' THEN interval '20 minutes'
      WHEN 'seed_failed' THEN interval '35 minutes'
      WHEN 'gmail_reconnect_required' THEN interval '1 hour'
      WHEN 'gmail_watch_expiring' THEN interval '3 hours'
      WHEN 'gmail_watch_renew_failed' THEN interval '8 hours'
      WHEN 'gmail_sync_error' THEN interval '1 day'
      ELSE interval '5 minutes'
    END
  ) AS created_at
FROM seed_rows r;
