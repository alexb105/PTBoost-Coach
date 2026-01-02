-- Create weight_goals table
CREATE TABLE IF NOT EXISTS weight_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  target_weight DECIMAL(5, 2) NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, goal_type, start_date)
);

-- Enable RLS for weight_goals
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage weight_goals"
ON weight_goals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to view their own weight goals
CREATE POLICY "Users can view own weight_goals"
ON weight_goals
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Create index on customer_id and dates
CREATE INDEX IF NOT EXISTS idx_weight_goals_customer_dates ON weight_goals(customer_id, start_date DESC, end_date DESC);

-- Trigger to update updated_at for weight_goals
CREATE TRIGGER update_weight_goals_updated_at
    BEFORE UPDATE ON weight_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();







