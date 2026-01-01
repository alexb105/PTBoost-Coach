-- Add exercise_completions field to workouts table
-- This will store an array of exercise completion data as JSONB
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS exercise_completions JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_exercise_completions ON workouts USING GIN (exercise_completions);

