-- ============================================
-- LOAD 30 EXERCISES FOR ADMIN
-- ============================================
-- This script loads 30 exercises into the exercises table:
-- - 15 set-based exercises (strength training)
-- - 15 cardio exercises
--
-- Run this script after the exercises table has been created
-- ============================================

-- Insert 15 set-based exercises
INSERT INTO exercises (name, display_name, exercise_type, default_sets, default_reps, default_weight, created_at, updated_at)
VALUES
  -- Upper Body
  ('bench press', 'Bench Press', 'sets', 4, '8-10', 'Body weight', NOW(), NOW()),
  ('overhead press', 'Overhead Press', 'sets', 3, '8-12', 'Body weight', NOW(), NOW()),
  ('barbell row', 'Barbell Row', 'sets', 4, '8-10', 'Body weight', NOW(), NOW()),
  ('pull ups', 'Pull Ups', 'sets', 3, '8-12', 'Body weight', NOW(), NOW()),
  ('dumbbell press', 'Dumbbell Press', 'sets', 4, '10-12', 'Body weight', NOW(), NOW()),
  
  -- Lower Body
  ('squats', 'Squats', 'sets', 4, '10-12', 'Body weight', NOW(), NOW()),
  ('deadlifts', 'Deadlifts', 'sets', 4, '6-8', 'Body weight', NOW(), NOW()),
  ('lunges', 'Lunges', 'sets', 3, '12 each leg', 'Body weight', NOW(), NOW()),
  ('leg press', 'Leg Press', 'sets', 4, '12-15', 'Body weight', NOW(), NOW()),
  ('romanian deadlifts', 'Romanian Deadlifts', 'sets', 3, '10-12', 'Body weight', NOW(), NOW()),
  
  -- Arms & Accessories
  ('bicep curls', 'Bicep Curls', 'sets', 3, '12-15', 'Body weight', NOW(), NOW()),
  ('tricep extensions', 'Tricep Extensions', 'sets', 3, '12-15', 'Body weight', NOW(), NOW()),
  ('lateral raises', 'Lateral Raises', 'sets', 3, '12-15', 'Body weight', NOW(), NOW()),
  ('face pulls', 'Face Pulls', 'sets', 3, '12-15', 'Body weight', NOW(), NOW()),
  ('hammer curls', 'Hammer Curls', 'sets', 3, '12-15', 'Body weight', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  exercise_type = EXCLUDED.exercise_type,
  default_sets = EXCLUDED.default_sets,
  default_reps = EXCLUDED.default_reps,
  default_weight = EXCLUDED.default_weight,
  updated_at = NOW();

-- Insert 15 cardio exercises
INSERT INTO exercises (name, display_name, exercise_type, default_duration_minutes, default_distance_km, default_intensity, created_at, updated_at)
VALUES
  -- Running
  ('running', 'Running', 'cardio', 30, 5.0, 'Moderate', NOW(), NOW()),
  ('sprint intervals', 'Sprint Intervals', 'cardio', 20, NULL, 'High', NOW(), NOW()),
  ('jogging', 'Jogging', 'cardio', 30, 4.0, 'Low', NOW(), NOW()),
  
  -- Cycling
  ('cycling', 'Cycling', 'cardio', 45, 15.0, 'Moderate', NOW(), NOW()),
  ('indoor cycling', 'Indoor Cycling', 'cardio', 30, NULL, 'Moderate', NOW(), NOW()),
  ('bike intervals', 'Bike Intervals', 'cardio', 25, NULL, 'High', NOW(), NOW()),
  
  -- Rowing
  ('rowing', 'Rowing', 'cardio', 30, NULL, 'Moderate', NOW(), NOW()),
  ('row intervals', 'Row Intervals', 'cardio', 20, NULL, 'High', NOW(), NOW()),
  
  -- Other Cardio
  ('walking', 'Walking', 'cardio', 45, 4.5, 'Low', NOW(), NOW()),
  ('elliptical', 'Elliptical', 'cardio', 30, NULL, 'Moderate', NOW(), NOW()),
  ('stair climber', 'Stair Climber', 'cardio', 20, NULL, 'High', NOW(), NOW()),
  ('swimming', 'Swimming', 'cardio', 30, NULL, 'Moderate', NOW(), NOW()),
  ('jump rope', 'Jump Rope', 'cardio', 15, NULL, 'High', NOW(), NOW()),
  ('burpees', 'Burpees', 'cardio', 10, NULL, 'High', NOW(), NOW()),
  ('mountain climbers', 'Mountain Climbers', 'cardio', 10, NULL, 'High', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  exercise_type = EXCLUDED.exercise_type,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  default_distance_km = EXCLUDED.default_distance_km,
  default_intensity = EXCLUDED.default_intensity,
  updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the exercises were inserted correctly:

-- SELECT COUNT(*) as total_exercises FROM exercises;
-- SELECT COUNT(*) as set_exercises FROM exercises WHERE exercise_type = 'sets';
-- SELECT COUNT(*) as cardio_exercises FROM exercises WHERE exercise_type = 'cardio';
-- SELECT * FROM exercises ORDER BY exercise_type, display_name;

