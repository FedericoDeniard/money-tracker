-- Create ENUM type for seed status
CREATE TYPE seed_status AS ENUM ('pending', 'completed', 'failed');

-- Drop the partial unique index temporarily
DROP INDEX IF EXISTS idx_seeds_one_pending_per_account;

-- Alter the seeds table to use the new ENUM type
ALTER TABLE seeds 
  ALTER COLUMN status TYPE seed_status 
  USING status::seed_status;

-- Update the default value to use the ENUM
ALTER TABLE seeds 
  ALTER COLUMN status SET DEFAULT 'pending'::seed_status;

-- Recreate the partial unique index
CREATE UNIQUE INDEX idx_seeds_one_pending_per_account 
  ON seeds(user_oauth_token_id) 
  WHERE status = 'pending'::seed_status;
