-- Add admin_name field to branding_settings table
ALTER TABLE branding_settings
ADD COLUMN IF NOT EXISTS admin_name TEXT;

COMMENT ON COLUMN branding_settings.admin_name IS 'Admin name displayed in chat interface for clients';

