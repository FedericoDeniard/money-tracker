-- Increase amount precision to handle large currency amounts (e.g. ARS)
ALTER TABLE transactions ALTER COLUMN amount TYPE NUMERIC(18, 2);