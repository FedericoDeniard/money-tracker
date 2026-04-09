-- Migration: system notification type
-- Purpose: Register a generic notification type for manual/custom system messages.
-- Affected tables: public.notification_types (insert/upsert),
--                  public.user_notification_preferences (seed defaults)

insert into public.notification_types (
  category_id,
  key,
  label_i18n_key,
  description_i18n_key,
  title_i18n_key,
  body_i18n_key,
  default_importance,
  is_active
)
select
  id,
  'system',
  'notifications.types.system.label',
  'notifications.types.system.description',
  'notifications.templates.system.title',
  'notifications.templates.system.body',
  'normal',
  true
from public.notification_categories
where key = 'system'
on conflict (key) do update
set
  category_id = excluded.category_id,
  label_i18n_key = excluded.label_i18n_key,
  description_i18n_key = excluded.description_i18n_key,
  title_i18n_key = excluded.title_i18n_key,
  body_i18n_key = excluded.body_i18n_key,
  default_importance = excluded.default_importance,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.user_notification_preferences (
  user_id,
  notification_type_id,
  is_enabled,
  is_muted
)
select
  u.id,
  nt.id,
  true,
  false
from public.users u
join public.notification_types nt on nt.key = 'system'
on conflict (user_id, notification_type_id) do nothing;
