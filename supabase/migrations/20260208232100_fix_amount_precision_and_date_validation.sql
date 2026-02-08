-- Fix amount precision to handle larger currency values
ALTER TABLE transactions ALTER COLUMN amount TYPE NUMERIC(20, 2);

-- Add constraint to prevent future overflow issues
ALTER TABLE transactions ADD CONSTRAINT check_amount_range 
  CHECK (amount >= -99999999999999.99 AND amount <= 99999999999999.99);
