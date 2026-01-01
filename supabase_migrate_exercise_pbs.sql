-- Migration script to populate exercises table and update exercise_pbs
-- This should be run after supabase_add_exercises_table.sql

-- Function to format exercise name for display (capitalize first letter of each word)
CREATE OR REPLACE FUNCTION format_exercise_display_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN INITCAP(name);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate exercises table from existing exercise_pbs
INSERT INTO exercises (name, display_name)
SELECT DISTINCT
  LOWER(TRIM(exercise_name)) as name,
  format_exercise_display_name(LOWER(TRIM(exercise_name))) as display_name
FROM exercise_pbs
WHERE exercise_name IS NOT NULL AND exercise_name != ''
ON CONFLICT (name) DO NOTHING;

-- Update exercise_pbs to set exercise_id
UPDATE exercise_pbs ep
SET exercise_id = e.id
FROM exercises e
WHERE LOWER(TRIM(ep.exercise_name)) = e.name
AND ep.exercise_id IS NULL;

-- Drop the temporary function
DROP FUNCTION IF EXISTS format_exercise_display_name(TEXT);

-- Note: After migration, you may want to:
-- 1. Verify all exercise_pbs have exercise_id set
-- 2. Consider making exercise_id NOT NULL after verification
-- 3. Optionally drop exercise_name column after verifying everything works

