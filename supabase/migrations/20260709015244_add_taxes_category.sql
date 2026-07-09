-- Add 'taxes' to the transactions.category allowed values.
-- Existing CHECK constraint is dropped and recreated with the new list, mirroring
-- 20260117210957_update_category_constraint_add_salary.sql.
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_category_check;

ALTER TABLE transactions
ADD CONSTRAINT transactions_category_check
CHECK (category IN (
  'salary',         -- salary, wages, paycheck, work income
  'entertainment',  -- entertainment, games, streaming
  'investment',     -- stocks, crypto, real estate
  'food',           -- restaurants, groceries
  'transport',      -- uber, gas, public transport
  'services',       -- internet, phone, subscriptions
  'health',         -- medical, pharmacy, gym
  'education',      -- courses, books, tools
  'housing',        -- rent, furniture, repairs
  'clothing',       -- clothing purchases
  'taxes',          -- tax payments, fiscal obligations, government fees
  'other'           -- everything else
));
