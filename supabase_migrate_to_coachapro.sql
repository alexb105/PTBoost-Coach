-- ============================================
-- Migration: Update branding from APEX Training/PT Boost to coachapro
-- This migration updates all existing branding settings to use the new app name
-- ============================================

-- Update the default value for brand_name column in branding_settings
ALTER TABLE branding_settings 
ALTER COLUMN brand_name SET DEFAULT 'coachapro';

-- Update all existing records in branding_settings that have "APEX Training" to "coachapro"
UPDATE branding_settings
SET brand_name = 'coachapro',
    updated_at = NOW()
WHERE brand_name = 'APEX Training';

-- Update all existing records in branding_settings that have "PT Boost" to "coachapro"
UPDATE branding_settings
SET brand_name = 'coachapro',
    updated_at = NOW()
WHERE brand_name = 'PT Boost';

-- Update any records with variations (case-insensitive check)
UPDATE branding_settings
SET brand_name = 'coachapro',
    updated_at = NOW()
WHERE LOWER(brand_name) IN ('apex training', 'pt boost', 'ptboost');

-- If there are any records with NULL brand_name (legacy records), set default
UPDATE branding_settings
SET brand_name = 'coachapro',
    updated_at = NOW()
WHERE brand_name IS NULL;

-- Update trainers table business_name if it matches old app names
-- Only update if it's exactly the old app name (not custom business names)
-- Note: This only updates business_name, not updated_at (in case that column doesn't exist)
UPDATE trainers
SET business_name = 'coachapro'
WHERE business_name IN ('APEX Training', 'PT Boost', 'PTBoost', 'ptboost');

-- Update trainers table business_name with case-insensitive check
UPDATE trainers
SET business_name = 'coachapro'
WHERE LOWER(business_name) IN ('apex training', 'pt boost', 'ptboost');

-- Verify the migration (optional - can be removed after verification)
-- SELECT 'branding_settings' as table_name, brand_name, COUNT(*) as count 
-- FROM branding_settings 
-- GROUP BY brand_name
-- UNION ALL
-- SELECT 'trainers' as table_name, business_name, COUNT(*) as count 
-- FROM trainers 
-- WHERE business_name IN ('coachapro', 'APEX Training', 'PT Boost')
-- GROUP BY business_name;

