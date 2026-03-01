-- Notifications system (MVP)
-- - Catalog tables: notification_categories, notification_types
-- - User checklist/preferences: user_notification_preferences
-- - User notifications inbox: notifications

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'notification_importance'
  ) THEN
    CREATE TYPE public.notification_importance AS ENUM (
      'low',
      'normal',
      'high',
      'critical'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.notification_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_i18n_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.notification_categories(id) ON DELETE RESTRICT,
  key text NOT NULL UNIQUE,
  label_i18n_key text NOT NULL,
  description_i18n_key text NOT NULL,
  title_i18n_key text NOT NULL,
  body_i18n_key text NOT NULL,
  default_importance public.notification_importance NOT NULL DEFAULT 'normal',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type_id uuid NOT NULL REFERENCES public.notification_types(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  is_muted boolean NOT NULL DEFAULT false,
  muted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_notification_preferences_unique UNIQUE (user_id, notification_type_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type_id uuid NOT NULL REFERENCES public.notification_types(id) ON DELETE RESTRICT,
  title_i18n_key text NOT NULL,
  body_i18n_key text NOT NULL,
  i18n_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  is_muted boolean NOT NULL DEFAULT false,
  importance public.notification_importance NOT NULL DEFAULT 'normal',
  action_path text,
  icon_key text,
  avatar_url text,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
  ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_archived
  ON public.notifications(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_notifications_user_muted
  ON public.notifications(user_id, is_muted);
CREATE INDEX IF NOT EXISTS idx_notifications_user_importance
  ON public.notifications(user_id, importance);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON public.notifications(user_id, notification_type_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_lookup
  ON public.user_notification_preferences(user_id, notification_type_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_state
  ON public.user_notification_preferences(user_id, is_enabled, is_muted);

CREATE TRIGGER update_notification_categories_updated_at
  BEFORE UPDATE ON public.notification_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_types_updated_at
  BEFORE UPDATE ON public.notification_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_categories_select_authenticated"
  ON public.notification_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "notification_types_select_authenticated"
  ON public.notification_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_notification_preferences_select_own"
  ON public.user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_notification_preferences_insert_own"
  ON public.user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notification_preferences_update_own"
  ON public.user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notification_preferences_delete_own"
  ON public.user_notification_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END$$;

INSERT INTO public.notification_categories (key, label_i18n_key, is_active)
VALUES ('system', 'notifications.categories.system', true)
ON CONFLICT (key) DO UPDATE
SET
  label_i18n_key = EXCLUDED.label_i18n_key,
  is_active = EXCLUDED.is_active,
  updated_at = now();

WITH system_category AS (
  SELECT id FROM public.notification_categories WHERE key = 'system'
)
INSERT INTO public.notification_types (
  category_id,
  key,
  label_i18n_key,
  description_i18n_key,
  title_i18n_key,
  body_i18n_key,
  default_importance,
  is_active
)
SELECT
  system_category.id,
  type_data.key,
  type_data.label_i18n_key,
  type_data.description_i18n_key,
  type_data.title_i18n_key,
  type_data.body_i18n_key,
  type_data.default_importance::public.notification_importance,
  true
FROM system_category
CROSS JOIN (
  VALUES
    (
      'seed_completed_with_transactions',
      'notifications.types.seed_completed_with_transactions.label',
      'notifications.types.seed_completed_with_transactions.description',
      'notifications.templates.seed_completed_with_transactions.title',
      'notifications.templates.seed_completed_with_transactions.body',
      'normal'
    ),
    (
      'seed_completed_no_new',
      'notifications.types.seed_completed_no_new.label',
      'notifications.types.seed_completed_no_new.description',
      'notifications.templates.seed_completed_no_new.title',
      'notifications.templates.seed_completed_no_new.body',
      'low'
    ),
    (
      'seed_failed',
      'notifications.types.seed_failed.label',
      'notifications.types.seed_failed.description',
      'notifications.templates.seed_failed.title',
      'notifications.templates.seed_failed.body',
      'high'
    ),
    (
      'gmail_reconnect_required',
      'notifications.types.gmail_reconnect_required.label',
      'notifications.types.gmail_reconnect_required.description',
      'notifications.templates.gmail_reconnect_required.title',
      'notifications.templates.gmail_reconnect_required.body',
      'high'
    ),
    (
      'gmail_watch_expiring',
      'notifications.types.gmail_watch_expiring.label',
      'notifications.types.gmail_watch_expiring.description',
      'notifications.templates.gmail_watch_expiring.title',
      'notifications.templates.gmail_watch_expiring.body',
      'normal'
    ),
    (
      'gmail_watch_renew_failed',
      'notifications.types.gmail_watch_renew_failed.label',
      'notifications.types.gmail_watch_renew_failed.description',
      'notifications.templates.gmail_watch_renew_failed.title',
      'notifications.templates.gmail_watch_renew_failed.body',
      'high'
    ),
    (
      'gmail_sync_error',
      'notifications.types.gmail_sync_error.label',
      'notifications.types.gmail_sync_error.description',
      'notifications.templates.gmail_sync_error.title',
      'notifications.templates.gmail_sync_error.body',
      'high'
    )
) AS type_data(
  key,
  label_i18n_key,
  description_i18n_key,
  title_i18n_key,
  body_i18n_key,
  default_importance
)
ON CONFLICT (key) DO UPDATE
SET
  category_id = EXCLUDED.category_id,
  label_i18n_key = EXCLUDED.label_i18n_key,
  description_i18n_key = EXCLUDED.description_i18n_key,
  title_i18n_key = EXCLUDED.title_i18n_key,
  body_i18n_key = EXCLUDED.body_i18n_key,
  default_importance = EXCLUDED.default_importance,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Baseline preferences for existing users and existing types.
INSERT INTO public.user_notification_preferences (user_id, notification_type_id, is_enabled, is_muted)
SELECT
  users.id,
  notification_types.id,
  true,
  false
FROM public.users users
CROSS JOIN public.notification_types notification_types
ON CONFLICT (user_id, notification_type_id) DO NOTHING;
