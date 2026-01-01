-- Step 1: Drop the existing constraint FIRST (before fixing data)
ALTER TABLE exercises 
DROP CONSTRAINT IF EXISTS exercises_exercise_type_check;

-- Step 2: Fix all existing rows - set invalid or NULL values to 'sets'
UPDATE exercises
SET exercise_type = 'sets'
WHERE exercise_type IS NULL 
   OR exercise_type NOT IN ('cardio', 'sets')
   OR exercise_type = 'set_based';  -- Fix any old 'set_based' values

-- Step 3: Now recreate the constraint with the correct values
ALTER TABLE exercises
ADD CONSTRAINT exercises_exercise_type_check 
CHECK (exercise_type IN ('cardio', 'sets'));

-- Step 4: Verify the constraint works
SELECT id, name, display_name, exercise_type 
FROM exercises 
ORDER BY exercise_type, display_name;

