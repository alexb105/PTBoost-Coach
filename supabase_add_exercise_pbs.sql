-- Create exercise_pbs table to track personal bests for each exercise
CREATE TABLE IF NOT EXISTS exercise_pbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  reps TEXT,
  weight TEXT,
  seconds TEXT,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  workout_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, exercise_name)
);

-- Enable RLS for exercise_pbs
ALTER TABLE exercise_pbs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage exercise_pbs"
ON exercise_pbs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read their own exercise_pbs
CREATE POLICY "Users can read own exercise_pbs"
ON exercise_pbs
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Create policy for authenticated users to insert their own exercise_pbs
CREATE POLICY "Users can insert own exercise_pbs"
ON exercise_pbs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

-- Create policy for authenticated users to update their own exercise_pbs
CREATE POLICY "Users can update own exercise_pbs"
ON exercise_pbs
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exercise_pbs_customer ON exercise_pbs(customer_id);
CREATE INDEX IF NOT EXISTS idx_exercise_pbs_exercise_name ON exercise_pbs(exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercise_pbs_customer_exercise ON exercise_pbs(customer_id, exercise_name);

-- Trigger to update updated_at for exercise_pbs
CREATE TRIGGER update_exercise_pbs_updated_at
    BEFORE UPDATE ON exercise_pbs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

