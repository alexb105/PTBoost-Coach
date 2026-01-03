-- Create branding_settings table
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL DEFAULT 'coachapro',
  tagline TEXT DEFAULT 'Elite Personal Training Platform',
  logo_url TEXT,
  secondary_color TEXT DEFAULT '#3b82f6', -- Default blue color in hex
  admin_profile_picture_url TEXT, -- Admin profile picture for chat messages
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for branding_settings
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (admin access via API)
-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage branding settings" ON branding_settings;

CREATE POLICY "Service role can manage branding settings"
ON branding_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Insert default branding settings if none exist
INSERT INTO branding_settings (brand_name, tagline, secondary_color)
VALUES ('coachapro', 'Elite Personal Training Platform', '#3b82f6')
ON CONFLICT DO NOTHING;

-- Trigger to update updated_at
-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS update_branding_settings_updated_at ON branding_settings;

CREATE TRIGGER update_branding_settings_updated_at
    BEFORE UPDATE ON branding_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

