-- ============================================================================
-- Default `name` on transactions from `transaction_description`
-- ============================================================================
-- Purpose: ensure `public.transactions.name` is always populated on insert
--          even when the caller does not provide one. The seed file
--          (`supabase/seeds/002_transactions_test_user.sql`) does not
--          include `name` in its INSERT column list, so without this
--          default `supabase db reset` fails on the NOT NULL constraint
--          added in 20260624213913_add_transaction_name.sql.
--
-- Why a trigger instead of a DEFAULT clause:
--   Postgres DEFAULT values cannot reference other columns of the same row.
--   A BEFORE INSERT trigger can compute `name` from `transaction_description`
--   in the same statement, which is exactly the fallback the application
--   code already uses at the call site (see `gmail-webhook/index.ts:386`,
--   `seed-emails/index.ts:696`, `process-document/index.ts:138`,
--   `_shared/ai/transaction-agent.ts:266,416` — all do
--   `name: t.name || <subject-or-description>`). Centralizing the fallback
--   at the database level removes a class of bugs where a future caller
--   forgets to set `name` explicitly.
--
-- Behavior:
--   - If NEW.name is NULL, set it to NEW.transaction_description, truncated
--     to 255 characters to fit the `varchar(255)` column.
--   - If NEW.name is already set (the common path for production inserts
--     that go through the AI agent), the trigger is a no-op.
--   - UPDATE is unaffected: the trigger only fires BEFORE INSERT. Existing
--     NOT NULL guarantees on UPDATE remain valid because nothing here
--     clears the column.
--
-- `transaction_description` is itself NOT NULL on this table, so the
-- fallback always has a value to copy from.
-- ============================================================================

create or replace function public.transactions_default_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.name is null then
    new.name := left(new.transaction_description, 255);
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_default_name on public.transactions;

create trigger transactions_default_name
  before insert on public.transactions
  for each row
  execute function public.transactions_default_name();
