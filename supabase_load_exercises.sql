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
INSERT INTO exercises (name, display_name, exercise_type, default_sets, default_reps, default_weight, muscle_groups, image_url, video_url, created_at, updated_at)
VALUES
  -- Upper Body
  ('bench press', 'Bench Press', 'sets', 4, '8-10', 'Body weight', ARRAY['Chest', 'Triceps', 'Shoulders'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=rT7DgCr-3pg', NOW(), NOW()),
  ('overhead press', 'Overhead Press', 'sets', 3, '8-12', 'Body weight', ARRAY['Shoulders', 'Triceps', 'Core'], 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800', 'https://www.youtube.com/watch?v=2yjwXTZQDDI', NOW(), NOW()),
  ('barbell row', 'Barbell Row', 'sets', 4, '8-10', 'Body weight', ARRAY['Back', 'Biceps', 'Shoulders'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=pa95m9jP5-M', NOW(), NOW()),
  ('pull ups', 'Pull Ups', 'sets', 3, '8-12', 'Body weight', ARRAY['Back', 'Biceps', 'Shoulders'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=eGo4IYlbE5g', NOW(), NOW()),
  ('dumbbell press', 'Dumbbell Press', 'sets', 4, '10-12', 'Body weight', ARRAY['Chest', 'Shoulders', 'Triceps'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=VmB1G1K7v94', NOW(), NOW()),
  
  -- Lower Body
  ('squats', 'Squats', 'sets', 4, '10-12', 'Body weight', ARRAY['Legs', 'Quadriceps', 'Glutes', 'Core'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=YaXPRqUwItQ', NOW(), NOW()),
  ('deadlifts', 'Deadlifts', 'sets', 4, '6-8', 'Body weight', ARRAY['Back', 'Legs', 'Hamstrings', 'Glutes', 'Core'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=op9kVnSso6Q', NOW(), NOW()),
  ('lunges', 'Lunges', 'sets', 3, '12 each leg', 'Body weight', ARRAY['Legs', 'Quadriceps', 'Glutes'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', NOW(), NOW()),
  ('leg press', 'Leg Press', 'sets', 4, '12-15', 'Body weight', ARRAY['Legs', 'Quadriceps', 'Glutes'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', NOW(), NOW()),
  ('romanian deadlifts', 'Romanian Deadlifts', 'sets', 3, '10-12', 'Body weight', ARRAY['Legs', 'Hamstrings', 'Glutes', 'Back'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=JCXUYuzwNrM', NOW(), NOW()),
  
  -- Arms & Accessories
  ('bicep curls', 'Bicep Curls', 'sets', 3, '12-15', 'Body weight', ARRAY['Biceps'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo', NOW(), NOW()),
  ('tricep extensions', 'Tricep Extensions', 'sets', 3, '12-15', 'Body weight', ARRAY['Triceps'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=nRiJVODpdN4', NOW(), NOW()),
  ('lateral raises', 'Lateral Raises', 'sets', 3, '12-15', 'Body weight', ARRAY['Shoulders'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=3VcKaXpzqRo', NOW(), NOW()),
  ('face pulls', 'Face Pulls', 'sets', 3, '12-15', 'Body weight', ARRAY['Shoulders', 'Back'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=rep-qVOkqgk', NOW(), NOW()),
  ('hammer curls', 'Hammer Curls', 'sets', 3, '12-15', 'Body weight', ARRAY['Biceps', 'Forearms'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=zC3nLlEvin4', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  exercise_type = EXCLUDED.exercise_type,
  default_sets = EXCLUDED.default_sets,
  default_reps = EXCLUDED.default_reps,
  default_weight = EXCLUDED.default_weight,
  muscle_groups = EXCLUDED.muscle_groups,
  image_url = EXCLUDED.image_url,
  video_url = EXCLUDED.video_url,
  updated_at = NOW();

-- Insert 15 cardio exercises
INSERT INTO exercises (name, display_name, exercise_type, default_duration_minutes, default_distance_km, default_intensity, muscle_groups, image_url, video_url, created_at, updated_at)
VALUES
  -- Running
  ('running', 'Running', 'cardio', 30, 5.0, 'Moderate', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800', 'https://www.youtube.com/watch?v=_kGESn8ArrU', NOW(), NOW()),
  ('sprint intervals', 'Sprint Intervals', 'cardio', 20, NULL, 'High', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800', 'https://www.youtube.com/watch?v=GZbfZ033f74', NOW(), NOW()),
  ('jogging', 'Jogging', 'cardio', 30, 4.0, 'Low', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800', 'https://www.youtube.com/watch?v=_kGESn8ArrU', NOW(), NOW()),
  
  -- Cycling
  ('cycling', 'Cycling', 'cardio', 45, 15.0, 'Moderate', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://www.youtube.com/watch?v=Gc4aL8vY1iU', NOW(), NOW()),
  ('indoor cycling', 'Indoor Cycling', 'cardio', 30, NULL, 'Moderate', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://www.youtube.com/watch?v=Gc4aL8vY1iU', NOW(), NOW()),
  ('bike intervals', 'Bike Intervals', 'cardio', 25, NULL, 'High', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://www.youtube.com/watch?v=Gc4aL8vY1iU', NOW(), NOW()),
  
  -- Rowing
  ('rowing', 'Rowing', 'cardio', 30, NULL, 'Moderate', ARRAY['Back', 'Legs', 'Cardio'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=Wj4nLs3vf3o', NOW(), NOW()),
  ('row intervals', 'Row Intervals', 'cardio', 20, NULL, 'High', ARRAY['Back', 'Legs', 'Cardio'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=Wj4nLs3vf3o', NOW(), NOW()),
  
  -- Other Cardio
  ('walking', 'Walking', 'cardio', 45, 4.5, 'Low', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800', 'https://www.youtube.com/watch?v=GZbfZ033f74', NOW(), NOW()),
  ('elliptical', 'Elliptical', 'cardio', 30, NULL, 'Moderate', ARRAY['Legs', 'Cardio'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=GZbfZ033f74', NOW(), NOW()),
  ('stair climber', 'Stair Climber', 'cardio', 20, NULL, 'High', ARRAY['Legs', 'Glutes', 'Cardio'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=GZbfZ033f74', NOW(), NOW()),
  ('swimming', 'Swimming', 'cardio', 30, NULL, 'Moderate', ARRAY['Full Body', 'Cardio'], 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800', 'https://www.youtube.com/watch?v=GZbfZ033f74', NOW(), NOW()),
  ('jump rope', 'Jump Rope', 'cardio', 15, NULL, 'High', ARRAY['Legs', 'Calves', 'Cardio'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=1BZM2vReeUc', NOW(), NOW()),
  ('burpees', 'Burpees', 'cardio', 10, NULL, 'High', ARRAY['Full Body', 'Cardio', 'Core'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=auBLPXOcFYM', NOW(), NOW()),
  ('mountain climbers', 'Mountain Climbers', 'cardio', 10, NULL, 'High', ARRAY['Core', 'Cardio', 'Shoulders'], 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', 'https://www.youtube.com/watch?v=nmwgirgXLYM', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  exercise_type = EXCLUDED.exercise_type,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  default_distance_km = EXCLUDED.default_distance_km,
  default_intensity = EXCLUDED.default_intensity,
  muscle_groups = EXCLUDED.muscle_groups,
  image_url = EXCLUDED.image_url,
  video_url = EXCLUDED.video_url,
  updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the exercises were inserted correctly:

-- SELECT COUNT(*) as total_exercises FROM exercises;
-- SELECT COUNT(*) as set_exercises FROM exercises WHERE exercise_type = 'sets';
-- SELECT COUNT(*) as cardio_exercises FROM exercises WHERE exercise_type = 'cardio';
-- SELECT * FROM exercises ORDER BY exercise_type, display_name;

