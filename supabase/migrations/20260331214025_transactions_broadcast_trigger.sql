-- =============================================================================
-- Migration: transactions_broadcast_trigger
-- Purpose:   Replace postgres_changes realtime with scalable broadcast via
--            database trigger. Each INSERT/UPDATE/DELETE on the transactions
--            table broadcasts to a per-user private channel
--            `transactions:<user_id>`, so only the owning user's client
--            receives the event.
-- Affected:  transactions (trigger), realtime.messages (RLS policy)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Trigger function: broadcasts transaction changes to the per-user channel.
--    SECURITY DEFINER is required so the function can call realtime.broadcast_changes.
--    The channel topic is scoped to the owning user: `transactions:<user_id>`.
-- ---------------------------------------------------------------------------
create or replace function public.transactions_broadcast_changes()
returns trigger
security definer
language plpgsql
as $$
begin
  perform realtime.broadcast_changes(
    -- channel topic: per-user scope so messages are only delivered to the owner
    'transactions:' || coalesce(new.user_id, old.user_id)::text,
    -- operation name (INSERT / UPDATE / DELETE)
    tg_op,
    -- event name exposed to the client
    tg_op,
    -- table metadata
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Trigger: fires after every INSERT, UPDATE, or DELETE on transactions.
--    Drop first to make the migration idempotent.
-- ---------------------------------------------------------------------------
drop trigger if exists transactions_broadcast_trigger on public.transactions;

create trigger transactions_broadcast_trigger
  after insert or update or delete
  on public.transactions
  for each row
  execute function public.transactions_broadcast_changes();

-- ---------------------------------------------------------------------------
-- 3. RLS policy on realtime.messages so authenticated users can only receive
--    broadcast messages on their own `transactions:<uid>` channel.
--    SELECT allows clients to receive messages; INSERT is not needed here
--    (the trigger function uses SECURITY DEFINER to write).
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated users can receive own transaction broadcasts" on realtime.messages;

create policy "authenticated users can receive own transaction broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    -- allow access only to channels matching `transactions:<auth.uid()>`
    realtime.topic() = 'transactions:' || auth.uid()::text
  );
