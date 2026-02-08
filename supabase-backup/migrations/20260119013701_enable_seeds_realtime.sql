-- Enable Realtime for seeds table to allow real-time notifications
-- when seed jobs complete or fail

-- Enable realtime for the seeds table
ALTER PUBLICATION supabase_realtime ADD TABLE seeds;

-- Add comment explaining the realtime feature
COMMENT ON TABLE seeds IS 'Tracks email import (seed) jobs. Realtime enabled to notify users when imports complete or fail.';
