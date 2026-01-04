-- Create meal_templates table
CREATE TABLE IF NOT EXISTS meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time TIME NOT NULL,
  calories INTEGER DEFAULT 0,
  protein INTEGER DEFAULT 0,
  carbs INTEGER DEFAULT 0,
  fats INTEGER DEFAULT 0,
  items TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for meal_templates
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage meal_templates"
ON meal_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to manage their own meal templates
CREATE POLICY "Users can manage own meal_templates"
ON meal_templates
FOR ALL
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Create index on customer_id
CREATE INDEX IF NOT EXISTS idx_meal_templates_customer ON meal_templates(customer_id);

-- Trigger to update updated_at for meal_templates
CREATE TRIGGER update_meal_templates_updated_at
    BEFORE UPDATE ON meal_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();














