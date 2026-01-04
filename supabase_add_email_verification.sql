-- ============================================
-- ADD EMAIL VERIFICATION TO TRAINERS TABLE
-- ============================================

-- Add email verification columns
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster verification lookups
CREATE INDEX IF NOT EXISTS idx_trainers_verification_code ON trainers(verification_code) WHERE verification_code IS NOT NULL;

-- Update existing trainers to be verified (grandfather in existing users)
UPDATE trainers SET email_verified = TRUE WHERE email_verified IS NULL;





