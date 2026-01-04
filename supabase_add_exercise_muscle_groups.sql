-- Add muscle_groups column to exercises table
-- Using TEXT array to allow multiple muscle groups per exercise
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS muscle_groups TEXT[] DEFAULT '{}';

-- Create index for better query performance when filtering by muscle groups
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN (muscle_groups);

-- Add comment for documentation
COMMENT ON COLUMN exercises.muscle_groups IS 'Array of muscle groups targeted by this exercise (e.g., Chest, Back, Shoulders, Arms, Legs, Core)';









