-- Check the current constraint definition
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'exercises_exercise_type_check';

-- Check current exercise_type values in the table
SELECT DISTINCT exercise_type, COUNT(*) 
FROM exercises 
GROUP BY exercise_type;











