-- Add completed and completed_at fields to workouts table
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_completed ON workouts(completed);
CREATE INDEX IF NOT EXISTS idx_workouts_customer_completed ON workouts(customer_id, completed);

