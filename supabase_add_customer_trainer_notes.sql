-- Add trainer_notes column to customers table
-- This allows trainers to store private notes about their clients

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS trainer_notes TEXT;

-- Add comment to document the field
COMMENT ON COLUMN customers.trainer_notes IS 'Private notes about the client, visible only to the trainer';





