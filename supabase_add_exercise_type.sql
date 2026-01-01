-- Add exercise_type column to exercises table
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS exercise_type TEXT CHECK (exercise_type IN ('cardio', 'sets')) DEFAULT 'sets';

-- Add default values columns for each exercise type
-- For set-based exercises
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS default_sets INTEGER,
ADD COLUMN IF NOT EXISTS default_reps TEXT,
ADD COLUMN IF NOT EXISTS default_weight TEXT;

-- For cardio exercises
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS default_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS default_distance_km DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS default_intensity TEXT;

-- Create index on exercise_type for better query performance
CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(exercise_type);

