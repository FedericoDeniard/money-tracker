-- Add user_id field to transactions table for manual transactions
ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update existing transactions to set user_id from their oauth token
UPDATE transactions
SET user_id = user_oauth_tokens.user_id
FROM user_oauth_tokens
WHERE transactions.user_oauth_token_id = user_oauth_tokens.id;

-- Make user_id NOT NULL for new transactions
ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;

-- Drop old RLS policies
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON transactions;

-- Create new RLS policies based on user_id
CREATE POLICY "transactions_select_own" ON transactions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" ON transactions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own" ON transactions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete_own" ON transactions
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Update index
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);