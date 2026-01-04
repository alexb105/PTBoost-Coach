-- Create customer_notes table for organizing trainer notes with titles
-- This replaces the single trainer_notes field with multiple organized entries

-- Create the customer_notes table
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_trainer_id ON customer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all notes
CREATE POLICY "Service role can manage customer notes"
ON customer_notes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Trainers can only access notes for their own customers
-- This will be enforced via API, but we add RLS as a safety measure
-- Note: This requires the trainer_id to match, which is set by the API

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_customer_notes_updated_at
    BEFORE UPDATE ON customer_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing trainer_notes to customer_notes table (if any exist)
-- This is optional - you can run this to migrate existing single notes to the new format
DO $$
DECLARE
  customer_record RECORD;
BEGIN
  FOR customer_record IN 
    SELECT id, trainer_id, trainer_notes 
    FROM customers 
    WHERE trainer_notes IS NOT NULL AND trainer_notes != ''
  LOOP
    INSERT INTO customer_notes (customer_id, trainer_id, title, content, created_at, updated_at)
    VALUES (
      customer_record.id,
      customer_record.trainer_id,
      'General Notes',
      customer_record.trainer_notes,
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Note: The trainer_notes column can be kept for backward compatibility or dropped later
-- To drop it later, run: ALTER TABLE customers DROP COLUMN IF EXISTS trainer_notes;





