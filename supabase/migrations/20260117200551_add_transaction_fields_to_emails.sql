-- Add AI-extracted transaction fields to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10) CHECK (transaction_type IN ('income', 'expense')),
ADD COLUMN IF NOT EXISTS transaction_description TEXT,
ADD COLUMN IF NOT EXISTS transaction_date DATE,
ADD COLUMN IF NOT EXISTS merchant VARCHAR(255),
ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3, 2) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_extracted_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for positive amount
ALTER TABLE emails 
ADD CONSTRAINT positive_amount CHECK (amount IS NULL OR amount > 0);

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_emails_amount ON emails(amount);
CREATE INDEX IF NOT EXISTS idx_emails_transaction_type ON emails(transaction_type);
CREATE INDEX IF NOT EXISTS idx_emails_transaction_date ON emails(transaction_date);
CREATE INDEX IF NOT EXISTS idx_emails_merchant ON emails(merchant);
CREATE INDEX IF NOT EXISTS idx_emails_ai_extracted_at ON emails(ai_extracted_at);

-- Update processed flag to indicate AI processing
UPDATE emails SET processed = true WHERE amount IS NOT NULL;