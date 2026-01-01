-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  one_time_password_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage customers"
ON customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read their own data
CREATE POLICY "Users can read own customer data"
ON customers
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy for authenticated users to update their own data
CREATE POLICY "Users can update own customer data"
ON customers
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  exercises TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for workouts
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage workouts"
ON workouts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read their own workouts
CREATE POLICY "Users can read own workouts"
ON workouts
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Create index on customer_id and date
CREATE INDEX IF NOT EXISTS idx_workouts_customer_date ON workouts(customer_id, date DESC);

-- Trigger to update updated_at for workouts
CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON workouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('admin', 'customer')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage messages"
ON messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read their own messages
CREATE POLICY "Users can read own messages"
ON messages
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Create policy for authenticated users to send messages
CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id AND sender = 'customer');

-- Create index on customer_id and created_at
CREATE INDEX IF NOT EXISTS idx_messages_customer_created ON messages(customer_id, created_at DESC);

-- Create nutrition_targets table
CREATE TABLE IF NOT EXISTS nutrition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL,
  protein INTEGER NOT NULL,
  carbs INTEGER NOT NULL,
  fats INTEGER NOT NULL,
  suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for nutrition_targets
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage nutrition targets"
ON nutrition_targets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to read their own nutrition targets
CREATE POLICY "Users can read own nutrition targets"
ON nutrition_targets
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Create index on customer_id
CREATE INDEX IF NOT EXISTS idx_nutrition_targets_customer ON nutrition_targets(customer_id);

-- Trigger to update updated_at for nutrition_targets
CREATE TRIGGER update_nutrition_targets_updated_at
    BEFORE UPDATE ON nutrition_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create workout_templates table
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  exercises TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for workout_templates
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage workout templates"
ON workout_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index on title for faster lookups
CREATE INDEX IF NOT EXISTS idx_workout_templates_title ON workout_templates(title);

-- Trigger to update updated_at for workout_templates
CREATE TRIGGER update_workout_templates_updated_at
    BEFORE UPDATE ON workout_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

