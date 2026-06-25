-- Migration: add_transaction_name
-- Purpose: introduce a short `name` column on transactions (used as the
--          card title in the UI) and make `transaction_description` a
--          separate, editable "what" field instead of an auto-extracted
--          headline. Existing rows are backfilled with the previous
--          `transaction_description` value so the visible title in the
--          UI does not regress.
-- Affected tables: public.transactions
-- Special considerations:
--   * The column is added NULLable, then backfilled, then set NOT NULL.
--     This three-step pattern keeps the migration safe to run while
--     inserts from older edge functions (that do not yet set `name`)
--     can still succeed against the NULLable window. The NOT NULL
--     constraint must be applied only after the backfill is complete.
--   * The realtime broadcast trigger (`20260331214025_transactions_broadcast_trigger.sql`)
--     sends the full row, so the new column flows to clients with no
--     trigger change.
--   * `get_subscription_transactions` returns `SETOF public.transactions`,
--     so its return type updates automatically.
--   * Regenerate the TypeScript types after applying:
--     `bun docker:db:types`.

-- Step 1: add the column as nullable so the migration is safe to apply
-- even if older edge function versions are still inserting rows without
-- a `name` value.
alter table public.transactions
  add column if not exists name varchar(255);

-- Step 2: backfill existing rows from the current `transaction_description`.
-- For manually created transactions, this used to be a copy of `merchant`
-- (`utils/transactionForm.ts`), so the new `name` will equal the old card
-- title — the user-visible result is unchanged.
update public.transactions
  set name = transaction_description
  where name is null;

-- Step 3: enforce NOT NULL. Safe now because the backfill above populated
-- every row.
alter table public.transactions
  alter column name set not null;
