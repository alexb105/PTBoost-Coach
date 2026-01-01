-- Create global exercises table (shared across all clients)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- Normalized name (lowercase, trimmed)
  display_name TEXT NOT NULL, -- Display name (properly formatted)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage exercises"
ON exercises
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read exercises
CREATE POLICY "Users can read exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

-- Trigger to update updated_at for exercises
CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate exercise_pbs to use exercise_id instead of exercise_name
-- First, add exercise_id column
ALTER TABLE exercise_pbs
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE;

-- Create index on exercise_id
CREATE INDEX IF NOT EXISTS idx_exercise_pbs_exercise_id ON exercise_pbs(exercise_id);

-- Function to get or create exercise by normalized name
CREATE OR REPLACE FUNCTION get_or_create_exercise(exercise_name TEXT, display_name TEXT)
RETURNS UUID AS $$
DECLARE
  exercise_uuid UUID;
  normalized_name TEXT;
BEGIN
  normalized_name := LOWER(TRIM(exercise_name));
  
  -- Try to find existing exercise
  SELECT id INTO exercise_uuid
  FROM exercises
  WHERE name = normalized_name
  LIMIT 1;
  
  -- If not found, create it
  IF exercise_uuid IS NULL THEN
    INSERT INTO exercises (name, display_name)
    VALUES (normalized_name, display_name)
    RETURNING id INTO exercise_uuid;
  END IF;
  
  RETURN exercise_uuid;
END;
$$ LANGUAGE plpgsql;

