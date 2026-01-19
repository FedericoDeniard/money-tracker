-- Add result columns to seeds table
ALTER TABLE seeds
  ADD COLUMN total_emails INTEGER,
  ADD COLUMN transactions_found INTEGER,
  ADD COLUMN total_skipped INTEGER,
  ADD COLUMN emails_processed_by_ai INTEGER;

-- Add comments for the new columns
COMMENT ON COLUMN seeds.total_emails IS 'Total number of emails retrieved from Gmail';
COMMENT ON COLUMN seeds.transactions_found IS 'Number of new transactions found and inserted';
COMMENT ON COLUMN seeds.total_skipped IS 'Number of emails skipped (already processed or not in INBOX)';
COMMENT ON COLUMN seeds.emails_processed_by_ai IS 'Number of emails sent to AI for analysis';
