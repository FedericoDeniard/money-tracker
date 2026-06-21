-- Migration: drop duplicate RLS policies on transactions that pre-date the user_id column.
-- affected tables: public.transactions
-- background:
--   when the transactions.user_id column was added (see 20260208201949_add_user_id_to_transactions.sql),
--   the new transactions_*_own policies replaced the old "transactions_*_own" policies, but the
--   earlier "Users can ..." policies (created in 20260117231531 and 20260118042626) were never
--   dropped. both families are now active.
--   the old "Users can ..." policies run a subquery against public.user_oauth_tokens, but that
--   table only grants SELECT to the postgres role. when the authenticated role evaluates those
--   subqueries, postgREST returns "permission denied for table user_oauth_tokens" and the chat
--   tool (listTransactionsTool) fails for any user that resolves through the old policies.
--   dropping the legacy policies leaves transactions_*_own as the sole source of access control,
--   matching the intent of the user_id refactor.

-- safety: drop only if they exist so the migration is idempotent across re-runs.
drop policy if exists "Users can view own transactions" on public.transactions;
drop policy if exists "Users can view their own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can insert their own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can update their own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;
drop policy if exists "Users can delete their own transactions" on public.transactions;
