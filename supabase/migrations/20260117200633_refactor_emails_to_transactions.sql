-- Step 1: Add transaction fields to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10) CHECK (transaction_type IN ('income', 'expense')),
ADD COLUMN IF NOT EXISTS transaction_description TEXT,
ADD COLUMN IF NOT EXISTS transaction_date DATE,
ADD COLUMN IF NOT EXISTS merchant VARCHAR(255),
ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3, 2) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_extracted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Rename emails table to transactions
ALTER TABLE emails RENAME TO transactions;

-- Step 3: Remove email-specific fields we no longer need
ALTER TABLE transactions 
DROP COLUMN IF EXISTS subject,
DROP COLUMN IF EXISTS body_text,
DROP COLUMN IF EXISTS processed,
DROP COLUMN IF EXISTS processing_error;

-- Step 4: Rename columns for clarity
ALTER TABLE transactions 
RENAME COLUMN gmail_message_id TO source_message_id;

ALTER TABLE transactions 
RENAME COLUMN gmail_email TO source_email;

-- Step 5: Update created_at
ALTER TABLE transactions 
DROP COLUMN IF EXISTS created_at,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 6: Drop old indexes and create new ones
DROP INDEX IF EXISTS idx_emails_user_id;
DROP INDEX IF EXISTS idx_emails_gmail_message_id;
DROP INDEX IF EXISTS idx_emails_date;
DROP INDEX IF EXISTS idx_emails_processed;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source_message_id ON transactions(source_message_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Step 7: Update RLS policies
DROP POLICY IF EXISTS "Users can view own emails" ON transactions;
DROP POLICY IF EXISTS "Users can insert own emails" ON transactions;
DROP POLICY IF EXISTS "Users can update own emails" ON transactions;
DROP POLICY IF EXISTS "Users can delete own emails" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);