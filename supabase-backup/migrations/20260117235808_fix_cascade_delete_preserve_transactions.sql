-- Add is_active column to user_oauth_tokens for soft delete
-- This allows us to preserve transaction history and reactivate accounts

-- Add is_active column (default true for existing records)
ALTER TABLE user_oauth_tokens 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add index for filtering active tokens
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_is_active ON user_oauth_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_gmail_active ON user_oauth_tokens(user_id, gmail_email, is_active);

-- Change foreign key constraint from ON DELETE CASCADE to ON DELETE RESTRICT
-- This prevents accidental deletion of tokens that have associated transactions
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_user_oauth_token_id_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_user_oauth_token_id_fkey 
FOREIGN KEY (user_oauth_token_id) 
REFERENCES user_oauth_tokens(id) 
ON DELETE RESTRICT;

-- Add comments explaining the behavior
COMMENT ON COLUMN user_oauth_tokens.is_active IS 'Soft delete flag: false when user disconnects, true when active. Allows reactivation and preserves transaction history.';
COMMENT ON CONSTRAINT transactions_user_oauth_token_id_fkey ON transactions IS 
'RESTRICT prevents deletion of tokens with transactions. Use soft delete (is_active=false) instead.';

