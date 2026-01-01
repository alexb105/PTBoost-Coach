-- Create meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL,
  calories INTEGER DEFAULT 0,
  protein INTEGER DEFAULT 0,
  carbs INTEGER DEFAULT 0,
  fats INTEGER DEFAULT 0,
  items TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for meals
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage meals"
ON meals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to manage their own meals
CREATE POLICY "Users can manage own meals"
ON meals
FOR ALL
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Create index on customer_id and date
CREATE INDEX IF NOT EXISTS idx_meals_customer_date ON meals(customer_id, date DESC);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date DESC);

-- Trigger to update updated_at for meals
CREATE TRIGGER update_meals_updated_at
    BEFORE UPDATE ON meals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

