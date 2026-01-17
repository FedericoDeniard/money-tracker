-- Fill null values with defaults before making columns NOT NULL

-- Fill null amounts with 0
UPDATE transactions 
SET amount = 0 
WHERE amount IS NULL;

-- Fill null transaction_types with 'expense'
UPDATE transactions 
SET transaction_type = 'expense' 
WHERE transaction_type IS NULL;

-- Now make columns NOT NULL
ALTER TABLE transactions 
ALTER COLUMN amount SET NOT NULL;

ALTER TABLE transactions 
ALTER COLUMN transaction_type SET NOT NULL;