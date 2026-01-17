-- Remove confidence column from transactions table
ALTER TABLE transactions 
DROP COLUMN IF EXISTS extraction_confidence;

-- Remove index for confidence column if it exists
DROP INDEX IF EXISTS idx_transactions_extraction_confidence;