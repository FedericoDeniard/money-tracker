-- Migration: gmail_watch_renewed notification type
-- Purpose: Register the new notification type emitted by renew-watches when a
--          Gmail watch is successfully renewed automatically.
-- Affected tables: public.notification_types (insert)

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
  'gmail_watch_renewed',
  'notifications.types.gmail_watch_renewed.label',
  'notifications.types.gmail_watch_renewed.description',
  'notifications.templates.gmail_watch_renewed.title',
  'notifications.templates.gmail_watch_renewed.body',
  'low',
  true
from public.notification_categories
where key = 'system';
