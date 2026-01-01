-- Fix existing exercises that might have NULL or invalid exercise_type values
-- This should be run after supabase_add_exercise_type.sql

-- Update any NULL exercise_type values to 'sets' (the default)
UPDATE exercises
SET exercise_type = 'sets'
WHERE exercise_type IS NULL;

-- Update any invalid exercise_type values to 'sets'
UPDATE exercises
SET exercise_type = 'sets'
WHERE exercise_type NOT IN ('cardio', 'sets');

-- Verify all exercises have valid exercise_type
SELECT id, name, display_name, exercise_type 
FROM exercises 
WHERE exercise_type IS NULL OR exercise_type NOT IN ('cardio', 'sets');



