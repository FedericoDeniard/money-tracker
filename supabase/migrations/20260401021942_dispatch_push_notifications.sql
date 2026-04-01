-- Migration: dispatch push notifications via trigger on notifications table
-- Purpose: After a new notification is inserted, fire-and-forget call to
--          the send-push-notification edge function via pg_net.
-- Affected tables: public.notifications (trigger added)
-- New objects: public.dispatch_push_notification() function + trigger
-- Notes:
--   - Uses pg_net for async HTTP (non-blocking — does not delay the INSERT)
--   - Reads SUPABASE_URL and INTERNAL_FUNCTIONS_SECRET from vault
--   - The edge function is responsible for checking user preferences and
--     only sending push if user has is_enabled = true for that notification type
--   - Falls back to http://127.0.0.1:54321 for local dev if vault secret missing

-- function that fires the edge function call
create or replace function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url     text;
  internal_secret text;
  edge_fn_url     text;
begin
  -- read project URL from vault (set in production; fallback to local dev)
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'SUPABASE_URL'
  limit 1;

  if project_url is null then
    project_url := 'http://127.0.0.1:54321';
  end if;

  -- strip trailing slash
  project_url := rtrim(project_url, '/');
  edge_fn_url := project_url || '/functions/v1/send-push-notification';

  -- read internal secret from vault
  select decrypted_secret
  into internal_secret
  from vault.decrypted_secrets
  where name = 'INTERNAL_FUNCTIONS_SECRET'
  limit 1;

  -- skip silently if secret is not configured (e.g. very early local dev)
  if internal_secret is null then
    raise log 'dispatch_push_notification: INTERNAL_FUNCTIONS_SECRET not configured, skipping push for notification %', NEW.id;
    return NEW;
  end if;

  -- fire-and-forget async HTTP POST to the edge function
  -- pg_net returns immediately without waiting for the response
  perform net.http_post(
    url     := edge_fn_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || internal_secret
    ),
    body    := jsonb_build_object(
      'notification_id', NEW.id::text,
      'user_id',         NEW.user_id::text
    )
  );

  raise log 'dispatch_push_notification: triggered for notification %, user %', NEW.id, NEW.user_id;

  return NEW;
exception
  when others then
    -- log but never block the original INSERT
    raise log 'dispatch_push_notification: error triggering push for notification %: %', NEW.id, sqlerrm;
    return NEW;
end;
$$;

comment on function public.dispatch_push_notification() is
  'Trigger function: fires a non-blocking pg_net HTTP POST to the send-push-notification edge function after each notification INSERT.';

-- attach the trigger to the notifications table
-- fires AFTER INSERT so NEW.id is always populated
create trigger on_notification_created_dispatch_push
  after insert
  on public.notifications
  for each row
  execute function public.dispatch_push_notification();

comment on trigger on_notification_created_dispatch_push on public.notifications is
  'Fires after each notification INSERT to asynchronously dispatch a push notification via the send-push-notification edge function.';
