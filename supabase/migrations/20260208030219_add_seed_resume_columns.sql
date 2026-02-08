-- Add 'processing' value to seed_status enum
ALTER TYPE seed_status ADD VALUE IF NOT EXISTS 'processing';

-- Add columns for chunked/resumable seed processing
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS last_processed_index INTEGER DEFAULT 0;
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS message_ids TEXT[] DEFAULT '{}';

-- Update check constraint to include 'processing'
ALTER TABLE seeds DROP CONSTRAINT IF EXISTS seeds_status_check;
ALTER TABLE seeds ADD CONSTRAINT seeds_status_check 
  CHECK (status::text = ANY (ARRAY['pending', 'processing', 'completed', 'failed']));

-- Drop the unique index that prevents multiple seeds per account
DROP INDEX IF EXISTS idx_seeds_one_pending_per_account;