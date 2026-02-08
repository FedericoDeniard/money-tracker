-- Add category column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create check constraint for allowed categories
ALTER TABLE transactions 
ADD CONSTRAINT transactions_category_check 
CHECK (category IN (
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

-- Create index for category
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);