-- Add is_rest_day field to workouts table
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_is_rest_day ON workouts(is_rest_day);
CREATE INDEX IF NOT EXISTS idx_workouts_customer_rest_day ON workouts(customer_id, is_rest_day);







