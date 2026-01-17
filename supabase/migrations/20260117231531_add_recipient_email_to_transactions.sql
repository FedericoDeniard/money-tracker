-- Drop old RLS policies first (they depend on user_id)
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Add user_oauth_token_id column to transactions table
-- This field references which Gmail account of the user received the email
ALTER TABLE transactions 
ADD COLUMN user_oauth_token_id UUID REFERENCES user_oauth_tokens(id) ON DELETE CASCADE;

-- Drop the old user_id column since we can get it from user_oauth_tokens
ALTER TABLE transactions
DROP COLUMN user_id;

-- Add index for better query performance
CREATE INDEX idx_transactions_user_oauth_token_id ON transactions(user_oauth_token_id);

-- Create new RLS policies that use user_oauth_token_id instead of user_id
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
        )
    );

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
        )
    );

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
        )
    );

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM user_oauth_tokens WHERE id = transactions.user_oauth_token_id
        )
    );

-- Add comments to explain the fields
COMMENT ON COLUMN transactions.user_oauth_token_id IS 'References the Gmail account (user_oauth_tokens) that received this transaction email';
COMMENT ON COLUMN transactions.source_email IS 'The email address of the sender (merchant, bank, etc.)';
