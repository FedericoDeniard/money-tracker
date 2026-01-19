-- First, we need to remove duplicate transactions
-- Keep only the oldest transaction for each source_message_id
DELETE FROM transactions a
USING transactions b
WHERE a.source_message_id = b.source_message_id
  AND a.source_message_id IS NOT NULL
  AND a.created_at > b.created_at;

-- Now add the UNIQUE constraint
ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_message_id_key 
  UNIQUE (source_message_id);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT transactions_source_message_id_key ON transactions IS 
  'Ensures each email (source_message_id) can only create one transaction, preventing duplicates from seed jobs';
