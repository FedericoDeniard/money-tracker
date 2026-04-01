-- Migration: new_transaction notification type + trigger on transactions
-- Purpose: Send an in-app + push notification when a new transaction is inserted,
--          but only when there is no seed in progress for that user (to avoid
--          spamming during bulk imports — the seed completion notification covers that case).
-- Affected tables: public.notification_types (insert), public.transactions (trigger added)
-- New objects:
--   public.notify_new_transaction() — trigger function
--   on_transaction_created_notify   — trigger on public.transactions

-- ── 1. Register the notification type ────────────────────────────────────────

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
  'new_transaction',
  'notifications.types.new_transaction.label',
  'notifications.types.new_transaction.description',
  'notifications.templates.new_transaction.title',
  'notifications.templates.new_transaction.body',
  'normal',
  true
from public.notification_categories
where key = 'system';

-- ── 2. Trigger function ───────────────────────────────────────────────────────
-- Fires after each INSERT on public.transactions.
-- Skips if there is an active seed (pending or processing) for that user —
-- the seed completion notification handles the bulk-import case.

create or replace function public.notify_new_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_id        uuid;
  v_title_key      text;
  v_body_key       text;
  v_seed_in_progress boolean;
begin
  -- check whether there is a seed currently running for this user
  select exists (
    select 1
    from public.seeds
    where user_id = NEW.user_id
      and status in ('pending', 'processing')
  ) into v_seed_in_progress;

  -- skip notification during bulk seed imports
  if v_seed_in_progress then
    return NEW;
  end if;

  -- look up the notification type
  select id, title_i18n_key, body_i18n_key
  into v_type_id, v_title_key, v_body_key
  from public.notification_types
  where key = 'new_transaction'
    and is_active = true
  limit 1;

  -- skip if notification type is not configured
  if v_type_id is null then
    return NEW;
  end if;

  -- check user preference (default: enabled)
  -- if the user has explicitly disabled new_transaction notifications, skip
  if exists (
    select 1
    from public.user_notification_preferences
    where user_id = NEW.user_id
      and notification_type_id = v_type_id
      and is_enabled = false
  ) then
    return NEW;
  end if;

  -- insert the notification — this will cascade to the push trigger
  insert into public.notifications (
    user_id,
    notification_type_id,
    title_i18n_key,
    body_i18n_key,
    i18n_params,
    action_path,
    importance
  ) values (
    NEW.user_id,
    v_type_id,
    v_title_key,
    v_body_key,
    jsonb_build_object(
      'merchant',    NEW.merchant,
      'amount',      NEW.amount,
      'currency',    NEW.currency,
      'type',        NEW.transaction_type
    ),
    '/transactions',
    'normal'
  );

  return NEW;
exception
  when others then
    -- never block the transaction INSERT
    raise log 'notify_new_transaction: error for transaction % user %: %',
      NEW.id, NEW.user_id, sqlerrm;
    return NEW;
end;
$$;

comment on function public.notify_new_transaction() is
  'Trigger: inserts a new_transaction notification after each transaction INSERT, '
  'unless a seed is currently in progress for that user.';

-- ── 3. Attach trigger ─────────────────────────────────────────────────────────

create trigger on_transaction_created_notify
  after insert
  on public.transactions
  for each row
  execute function public.notify_new_transaction();

comment on trigger on_transaction_created_notify on public.transactions is
  'Fires after each transaction INSERT to create a new_transaction notification '
  '(skipped when a seed is in progress for the user).';
