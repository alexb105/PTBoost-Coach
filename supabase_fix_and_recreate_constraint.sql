-- Step 1: First, let's see what values currently exist
SELECT DISTINCT exercise_type, COUNT(*) as count
FROM exercises 
GROUP BY exercise_type;

-- Step 2: Drop the existing constraint (if it exists)
ALTER TABLE exercises 
DROP CONSTRAINT IF EXISTS exercises_exercise_type_check;

-- Step 3: Fix all existing rows - set invalid or NULL values to 'sets'
UPDATE exercises
SET exercise_type = 'sets'
WHERE exercise_type IS NULL 
   OR exercise_type NOT IN ('cardio', 'sets')
   OR exercise_type = 'set_based';  -- Fix any old 'set_based' values

-- Step 4: Verify all rows now have valid values
SELECT DISTINCT exercise_type, COUNT(*) as count
FROM exercises 
GROUP BY exercise_type;

-- Step 5: Now recreate the constraint with the correct values
ALTER TABLE exercises
ADD CONSTRAINT exercises_exercise_type_check 
CHECK (exercise_type IN ('cardio', 'sets'));

-- Step 6: Final verification - all exercises should have valid exercise_type
SELECT id, name, display_name, exercise_type 
FROM exercises 
ORDER BY exercise_type, display_name;



