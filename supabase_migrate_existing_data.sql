-- ============================================
-- MIGRATE EXISTING DATA TO DEFAULT TRAINER
-- Run this AFTER running supabase_multi_tenant_migration.sql
-- ============================================

-- First, create a default trainer for existing data
-- You should replace these values with your actual admin info
DO $$
DECLARE
  v_trainer_id UUID;
  v_admin_email TEXT := 'admin@example.com'; -- Replace with your ADMIN_EMAIL
  v_auth_user_id UUID;
BEGIN
  -- Check if a trainer already exists with this email
  SELECT id INTO v_trainer_id FROM trainers WHERE email = v_admin_email;
  
  IF v_trainer_id IS NULL THEN
    -- Create the default trainer
    INSERT INTO trainers (
      email,
      full_name,
      business_name,
      subscription_tier,
      subscription_status,
      max_clients
    ) VALUES (
      v_admin_email,
      'Default Trainer',
      'coachapro',
      'enterprise',  -- Give existing admin full access
      'active',
      9999
    )
    RETURNING id INTO v_trainer_id;
    
    RAISE NOTICE 'Created default trainer with id: %', v_trainer_id;
  ELSE
    RAISE NOTICE 'Trainer already exists with id: %', v_trainer_id;
  END IF;

  -- Update all customers without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
    UPDATE customers 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated customers with default trainer_id';
  END IF;

  -- Update all workouts without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workouts') THEN
    UPDATE workouts 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated workouts with default trainer_id';
  END IF;

  -- Update all messages without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
    UPDATE messages 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated messages with default trainer_id';
  END IF;

  -- Update all nutrition_targets without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nutrition_targets') THEN
    UPDATE nutrition_targets 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated nutrition_targets with default trainer_id';
  END IF;

  -- Update all meals without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meals') THEN
    UPDATE meals 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated meals with default trainer_id';
  END IF;

  -- Update all meal_templates without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meal_templates') THEN
    UPDATE meal_templates 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated meal_templates with default trainer_id';
  END IF;

  -- Update all workout_templates without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workout_templates') THEN
    UPDATE workout_templates 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated workout_templates with default trainer_id';
  END IF;

  -- Update all progress_photos without a trainer_id (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'progress_photos') THEN
    UPDATE progress_photos 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated progress_photos with default trainer_id';
  END IF;

  -- Update all weight_entries without a trainer_id (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weight_entries') THEN
    UPDATE weight_entries 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated weight_entries with default trainer_id';
  END IF;

  -- Update all weight_goals without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weight_goals') THEN
    UPDATE weight_goals 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated weight_goals with default trainer_id';
  END IF;

  -- Update all exercise_pbs without a trainer_id
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exercise_pbs') THEN
    UPDATE exercise_pbs 
    SET trainer_id = v_trainer_id 
    WHERE trainer_id IS NULL;
    RAISE NOTICE 'Updated exercise_pbs with default trainer_id';
  END IF;

  RAISE NOTICE 'Migration complete! All existing data now belongs to trainer: %', v_trainer_id;
END $$;

-- Verify the migration
SELECT 
  'trainers' as table_name, 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE id IS NOT NULL) as with_id
FROM trainers
UNION ALL
SELECT 
  'customers' as table_name, 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE trainer_id IS NOT NULL) as with_trainer_id
FROM customers
UNION ALL
SELECT 
  'workouts' as table_name, 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE trainer_id IS NOT NULL) as with_trainer_id
FROM workouts
UNION ALL
SELECT 
  'workout_templates' as table_name, 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE trainer_id IS NOT NULL) as with_trainer_id
FROM workout_templates;

