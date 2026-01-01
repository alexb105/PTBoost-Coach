-- Migration to normalize existing exercise names in exercise_pbs table
-- This ensures exercises with the same name (case-insensitive) use the same PB record

-- First, create a function to normalize exercise names
CREATE OR REPLACE FUNCTION normalize_exercise_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(name));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all existing exercise names to normalized versions
UPDATE exercise_pbs
SET exercise_name = normalize_exercise_name(exercise_name);

-- Handle potential duplicates after normalization
-- If there are duplicates (same customer_id, same normalized exercise_name),
-- keep the most recent one and delete the older ones
WITH ranked_pbs AS (
  SELECT 
    id,
    customer_id,
    exercise_name,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id, exercise_name 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM exercise_pbs
)
DELETE FROM exercise_pbs
WHERE id IN (
  SELECT id FROM ranked_pbs WHERE rn > 1
);

-- Drop the temporary function
DROP FUNCTION IF EXISTS normalize_exercise_name(TEXT);

