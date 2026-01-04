-- ============================================
-- FIX EXERCISE UNIQUE CONSTRAINT FOR MULTI-TENANCY
-- ============================================
-- This script updates the exercises table to allow the same exercise name
-- for different trainers by changing the unique constraint from (name) to (name, trainer_id)
-- ============================================

-- Drop the existing unique constraint on name
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_key;

-- Create a new unique constraint on (name, trainer_id)
-- This allows the same exercise name for different trainers
CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_trainer_id_unique 
ON exercises(name, trainer_id) 
WHERE trainer_id IS NOT NULL;

-- For exercises with trainer_id = NULL (if any legacy ones exist), 
-- we can't have duplicates, so create a separate unique constraint
-- But since we're moving away from global exercises, this might not be needed
-- However, to be safe, we'll add a partial unique index for NULL trainer_id
CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_null_trainer_unique 
ON exercises(name) 
WHERE trainer_id IS NULL;

-- Note: The original UNIQUE constraint on name column will be removed by the DROP CONSTRAINT above
-- The new indexes handle uniqueness per trainer_id








