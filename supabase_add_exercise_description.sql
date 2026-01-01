-- Add description column to exercises table
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN exercises.description IS 'Detailed description of the exercise, shown in the exercise info modal';

