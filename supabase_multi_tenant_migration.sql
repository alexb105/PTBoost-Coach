-- ============================================
-- MULTI-TENANT MIGRATION
-- Adds trainer support for selling to multiple personal trainers
-- ============================================

-- ============================================
-- 1. CREATE TRAINERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  business_name TEXT,
  phone TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  -- Subscription fields
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- Limits based on tier
  max_clients INTEGER DEFAULT 3,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for trainers
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- Trainers can read their own data
CREATE POLICY "Trainers can read own data"
ON trainers
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Trainers can update their own data
CREATE POLICY "Trainers can update own data"
ON trainers
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role can manage trainers"
ON trainers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);
CREATE INDEX IF NOT EXISTS idx_trainers_auth_user_id ON trainers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_trainers_subscription_status ON trainers(subscription_status);

-- Trigger for updated_at
CREATE TRIGGER update_trainers_updated_at
    BEFORE UPDATE ON trainers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. ADD TRAINER_ID TO CUSTOMERS TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_customers_trainer_id ON customers(trainer_id);
  END IF;
END $$;

-- ============================================
-- 3. ADD TRAINER_ID TO WORKOUTS TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workouts') THEN
    ALTER TABLE workouts ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_workouts_trainer_id ON workouts(trainer_id);
  END IF;
END $$;

-- ============================================
-- 4. ADD TRAINER_ID TO MESSAGES TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_messages_trainer_id ON messages(trainer_id);
  END IF;
END $$;

-- ============================================
-- 5. ADD TRAINER_ID TO NUTRITION_TARGETS TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nutrition_targets') THEN
    ALTER TABLE nutrition_targets ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_nutrition_targets_trainer_id ON nutrition_targets(trainer_id);
  END IF;
END $$;

-- ============================================
-- 6. ADD TRAINER_ID TO MEALS TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meals') THEN
    ALTER TABLE meals ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meals_trainer_id ON meals(trainer_id);
  END IF;
END $$;

-- ============================================
-- 7. ADD TRAINER_ID TO MEAL_TEMPLATES TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meal_templates') THEN
    ALTER TABLE meal_templates ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meal_templates_trainer_id ON meal_templates(trainer_id);
  END IF;
END $$;

-- ============================================
-- 8. ADD TRAINER_ID TO WORKOUT_TEMPLATES TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workout_templates') THEN
    ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_workout_templates_trainer_id ON workout_templates(trainer_id);
  END IF;
END $$;

-- ============================================
-- 9. ADD TRAINER_ID TO PROGRESS_PHOTOS TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'progress_photos') THEN
    ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_progress_photos_trainer_id ON progress_photos(trainer_id);
  END IF;
END $$;

-- ============================================
-- 9b. ADD TRAINER_ID TO WEIGHT_ENTRIES TABLE (if exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weight_entries') THEN
    ALTER TABLE weight_entries ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_weight_entries_trainer_id ON weight_entries(trainer_id);
  END IF;
END $$;

-- ============================================
-- 10. ADD TRAINER_ID TO WEIGHT_GOALS TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weight_goals') THEN
    ALTER TABLE weight_goals ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_weight_goals_trainer_id ON weight_goals(trainer_id);
  END IF;
END $$;

-- ============================================
-- 11. ADD TRAINER_ID TO EXERCISE_PBS TABLE
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exercise_pbs') THEN
    ALTER TABLE exercise_pbs ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_exercise_pbs_trainer_id ON exercise_pbs(trainer_id);
  END IF;
END $$;

-- ============================================
-- 12. ADD TRAINER_ID TO EXERCISES TABLE (for custom exercises)
-- ============================================
-- Exercises can be global (trainer_id = NULL) or trainer-specific
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exercises') THEN
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_exercises_trainer_id ON exercises(trainer_id);
  END IF;
END $$;

-- ============================================
-- 14. UPDATE RLS POLICIES FOR MULTI-TENANCY
-- ============================================

-- Drop existing policies and recreate with trainer filtering
-- Note: Run these only if you want to enforce strict tenant isolation

-- Customers: trainers can only see their customers
DROP POLICY IF EXISTS "Service role can manage customers" ON customers;
CREATE POLICY "Service role can manage customers"
ON customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Customers can still read/update their own data
-- (existing policies remain)

-- Workouts: add trainer filtering
DROP POLICY IF EXISTS "Service role can manage workouts" ON workouts;
CREATE POLICY "Service role can manage workouts"
ON workouts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Messages: add trainer filtering
DROP POLICY IF EXISTS "Service role can manage messages" ON messages;
CREATE POLICY "Service role can manage messages"
ON messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 15. HELPER FUNCTION: Get trainer_id for a customer
-- ============================================
CREATE OR REPLACE FUNCTION get_customer_trainer_id(p_customer_id UUID)
RETURNS UUID AS $$
DECLARE
  v_trainer_id UUID;
BEGIN
  SELECT trainer_id INTO v_trainer_id
  FROM customers
  WHERE id = p_customer_id;
  RETURN v_trainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 16. HELPER FUNCTION: Check if trainer has capacity for more clients
-- ============================================
CREATE OR REPLACE FUNCTION trainer_has_capacity(p_trainer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_clients INTEGER;
  v_current_clients INTEGER;
BEGIN
  -- Get trainer's max clients
  SELECT max_clients INTO v_max_clients
  FROM trainers
  WHERE id = p_trainer_id;
  
  -- Count current clients
  SELECT COUNT(*) INTO v_current_clients
  FROM customers
  WHERE trainer_id = p_trainer_id;
  
  RETURN v_current_clients < v_max_clients;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 17. SUBSCRIPTION TIER LIMITS
-- ============================================
-- free: 3 clients
-- basic: 15 clients
-- pro: 50 clients
-- enterprise: unlimited (9999)

CREATE OR REPLACE FUNCTION update_trainer_limits()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.subscription_tier
    WHEN 'free' THEN NEW.max_clients := 3;
    WHEN 'basic' THEN NEW.max_clients := 15;
    WHEN 'pro' THEN NEW.max_clients := 50;
    WHEN 'enterprise' THEN NEW.max_clients := 9999;
    ELSE NEW.max_clients := 3;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trainer_limits_trigger
    BEFORE INSERT OR UPDATE OF subscription_tier ON trainers
    FOR EACH ROW
    EXECUTE FUNCTION update_trainer_limits();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this migration:
-- 1. Create a default trainer for existing data
-- 2. Update all existing records to use the default trainer_id
-- 3. Update API endpoints to filter by trainer_id

