-- Create weight_entries table
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  weight DECIMAL(5, 2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, date)
);

-- Enable RLS for weight_entries
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage weight_entries"
ON weight_entries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to manage their own weight entries
CREATE POLICY "Users can manage own weight_entries"
ON weight_entries
FOR ALL
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Create index on customer_id and date
CREATE INDEX IF NOT EXISTS idx_weight_entries_customer_date ON weight_entries(customer_id, date DESC);

-- Create progress_photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('front', 'side', 'back', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for progress_photos
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
CREATE POLICY "Service role can manage progress_photos"
ON progress_photos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users to manage their own progress photos
CREATE POLICY "Users can manage own progress_photos"
ON progress_photos
FOR ALL
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Create index on customer_id and date
CREATE INDEX IF NOT EXISTS idx_progress_photos_customer_date ON progress_photos(customer_id, date DESC);

-- Trigger to update updated_at for weight_entries
CREATE TRIGGER update_weight_entries_updated_at
    BEFORE UPDATE ON weight_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for progress_photos
CREATE TRIGGER update_progress_photos_updated_at
    BEFORE UPDATE ON progress_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();









