-- Add trainer_id column to branding_settings table to make branding trainer-specific
-- This ensures each trainer has their own branding settings

-- Add trainer_id column (nullable for backward compatibility, but should be NOT NULL for new records)
ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branding_settings_trainer_id ON branding_settings(trainer_id);

-- Update RLS policies to allow trainers to manage their own branding
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Trainers can manage own branding" ON branding_settings;

-- Create policy for trainers to read their own branding
CREATE POLICY "Trainers can read own branding"
ON branding_settings
FOR SELECT
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE auth_user_id = auth.uid()
  )
);

-- Create policy for trainers to insert their own branding
CREATE POLICY "Trainers can insert own branding"
ON branding_settings
FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id IN (
    SELECT id FROM trainers WHERE auth_user_id = auth.uid()
  )
);

-- Create policy for trainers to update their own branding
CREATE POLICY "Trainers can update own branding"
ON branding_settings
FOR UPDATE
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT id FROM trainers WHERE auth_user_id = auth.uid()
  )
);

-- Create policy for trainers to delete their own branding
CREATE POLICY "Trainers can delete own branding"
ON branding_settings
FOR DELETE
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM trainers WHERE auth_user_id = auth.uid()
  )
);

-- Note: The existing service_role policy will still allow full access via API
-- which is needed for the server-side API routes

