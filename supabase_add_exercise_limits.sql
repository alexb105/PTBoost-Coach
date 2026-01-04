-- ============================================
-- ADD EXERCISE LIMITS TO TRAINERS TABLE
-- ============================================

-- Add max_exercises column to trainers table
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS max_exercises INTEGER DEFAULT 0;

-- Update existing trainers based on their current tier
UPDATE trainers SET max_exercises = CASE
  WHEN subscription_tier = 'free' THEN 0
  WHEN subscription_tier = 'basic' THEN 20
  WHEN subscription_tier = 'pro' THEN 50
  WHEN subscription_tier = 'enterprise' THEN 9999
  ELSE 0
END;

-- Update the trigger function to also set max_exercises
CREATE OR REPLACE FUNCTION update_trainer_limits()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.subscription_tier
    WHEN 'free' THEN 
      NEW.max_clients := 3;
      NEW.max_exercises := 0;
    WHEN 'basic' THEN 
      NEW.max_clients := 15;
      NEW.max_exercises := 20;
    WHEN 'pro' THEN 
      NEW.max_clients := 50;
      NEW.max_exercises := 50;
    WHEN 'enterprise' THEN 
      NEW.max_clients := 9999;
      NEW.max_exercises := 9999;
    ELSE 
      NEW.max_clients := 3;
      NEW.max_exercises := 0;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;








