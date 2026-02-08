-- Drop the old constraint and create a new one with salary category
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_category_check;

-- Create updated check constraint with salary category
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
  'other'           -- everything else
));