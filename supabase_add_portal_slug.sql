-- Add portal_slug column to branding_settings table for custom trainer URLs
-- This allows trainers to have custom URLs like /portal/john-fitness

-- Add portal_slug column (unique per trainer)
ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS portal_slug TEXT;

-- Create unique index for portal_slug (ensures no duplicate slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_branding_settings_portal_slug 
ON branding_settings(portal_slug) 
WHERE portal_slug IS NOT NULL;

-- Function to generate a slug from brand name
CREATE OR REPLACE FUNCTION generate_portal_slug(brand_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special characters
  base_slug := lower(regexp_replace(brand_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- If empty, use 'trainer' as default
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'trainer';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for duplicates and append number if needed
  WHILE EXISTS (SELECT 1 FROM branding_settings WHERE portal_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Note: portal_slug should be set when trainer creates their branding settings
-- The API will handle generating unique slugs based on brand_name

