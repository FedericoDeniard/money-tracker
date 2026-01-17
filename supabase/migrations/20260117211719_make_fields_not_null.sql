-- Fill null values with defaults before making columns NOT NULL

-- Fill null categories with 'other'
UPDATE transactions 
SET category = 'other' 
WHERE category IS NULL;

-- Fill null merchants with 'Unknown'
UPDATE transactions 
SET merchant = 'Unknown' 
WHERE merchant IS NULL;

-- Fill null currencies with 'USD'
UPDATE transactions 
SET currency = 'USD' 
WHERE currency IS NULL;

-- Fill null descriptions with 'No description'
UPDATE transactions 
SET transaction_description = 'No description' 
WHERE transaction_description IS NULL;

-- Fill null transaction_dates with created_at date
UPDATE transactions 
SET transaction_date = DATE(created_at) 
WHERE transaction_date IS NULL;

-- Now make columns NOT NULL
ALTER TABLE transactions 
ALTER COLUMN category SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN merchant SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN currency SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN transaction_description SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN transaction_date SET NOT NULL;

-- Drop ai_extracted_at column if it exists
ALTER TABLE transactions 
DROP COLUMN IF EXISTS ai_extracted_at;

-- amount, transaction_type, and user_id should already be NOT NULL from original table