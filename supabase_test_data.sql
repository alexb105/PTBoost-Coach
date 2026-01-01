-- ============================================
-- TEST DATA FOR DUMMY USER
-- ============================================
-- This script creates a complete test user with comprehensive sample data
-- 
-- PREREQUISITES: Run these migration files FIRST (in order):
-- 1. supabase_setup.sql (creates base tables)
-- 2. supabase_add_meals_table.sql (creates meals table)
-- 3. supabase_add_progress_tables.sql (creates weight_entries and progress_photos tables)
-- 4. Any other migration files for exercises, etc.
--
-- IMPORTANT: Creating users directly in auth.users via SQL may not work due to RLS.
-- RECOMMENDED APPROACH:
-- 1. First, create the user via Supabase Dashboard or Admin API:
--    - Go to Authentication > Users > Add user
--    - Email: testuser@example.com
--    - Password: TestPassword123!
--    - Auto Confirm: Yes
-- 2. Then run this script - it will create all the test data
--
-- ALTERNATIVE: If you want to try creating the user in SQL, run this script.
-- If it fails on user creation, create the user manually and run again.
--
-- Login credentials after setup:
--    Email: testuser@example.com
--    Password: TestPassword123!
-- ============================================

DO $$
<<test_data_block>>
DECLARE
  v_customer_id UUID;
  test_email TEXT := 'testuser@example.com';
  test_password TEXT := 'TestPassword123!';
  test_name TEXT := 'Test User';
  test_phone TEXT := '+1234567890';
BEGIN

  -- ============================================
  -- 1. CREATE AUTH USER
  -- ============================================
  -- Generate a new UUID for the user
  v_customer_id := gen_random_uuid();
  
  -- Check if user already exists
  SELECT id INTO v_customer_id FROM auth.users WHERE email = test_email;
  
  -- If user doesn't exist, create them
  IF v_customer_id IS NULL THEN
    v_customer_id := gen_random_uuid();
    
    -- Insert into auth.users
    -- Note: This requires service_role permissions or use of Supabase Admin API
    -- If this fails, you may need to create the user via Supabase Dashboard or Admin API first
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      v_customer_id,
      '00000000-0000-0000-0000-000000000000',
      test_email,
      crypt(test_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW() - INTERVAL '30 days',
      NOW() - INTERVAL '30 days',
      '',
      '',
      '',
      ''
    );

    -- Insert into auth.identities for email provider
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_customer_id,
      jsonb_build_object('sub', v_customer_id::text, 'email', test_email),
      'email',
      NOW(),
      NOW() - INTERVAL '30 days',
      NOW() - INTERVAL '30 days'
    );
  END IF;

  -- ============================================
  -- 2. CREATE CUSTOMER RECORD
  -- ============================================
  INSERT INTO customers (id, email, full_name, phone, one_time_password_used, created_at)
  VALUES (
    v_customer_id,
    test_email,
    test_name,
    test_phone,
    true, -- Mark as password already set for testing
    NOW() - INTERVAL '30 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  -- ============================================
  -- 2. NUTRITION TARGETS
  -- ============================================
  INSERT INTO nutrition_targets (customer_id, calories, protein, carbs, fats, suggestions, created_at)
  VALUES (
    v_customer_id,
    2200,
    180,
    250,
    70,
    'Focus on lean proteins like chicken, fish, and eggs. Include complex carbs like brown rice and sweet potatoes. Add healthy fats from avocados and nuts. Stay hydrated with 8-10 glasses of water daily.',
    NOW() - INTERVAL '25 days'
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    calories = EXCLUDED.calories,
    protein = EXCLUDED.protein,
    carbs = EXCLUDED.carbs,
    fats = EXCLUDED.fats,
    suggestions = EXCLUDED.suggestions;

  -- ============================================
  -- 3. WORKOUTS (Last 4 weeks)
  -- ============================================
  INSERT INTO workouts (customer_id, title, description, date, exercises, completed, completed_at, exercise_completions, created_at)
  VALUES
    -- Week 1
    (
      v_customer_id,
    'Upper Body Strength',
    'Focus on chest, shoulders, and triceps',
    CURRENT_DATE - INTERVAL '21 days',
    ARRAY['Bench Press: 3x8', 'Overhead Press: 3x8', 'Tricep Dips: 3x10', 'Push-ups: 3x12'],
    true,
    CURRENT_DATE - INTERVAL '21 days' + INTERVAL '1 hour',
    '[{"exerciseIndex": 0, "completed": true, "rating": "good", "completed_at": "2024-01-01T10:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "hard", "completed_at": "2024-01-01T10:15:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "good", "completed_at": "2024-01-01T10:30:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "easy", "completed_at": "2024-01-01T10:45:00Z"}]'::jsonb,
    NOW() - INTERVAL '21 days'
  ),
  (
    v_customer_id,
    'Lower Body & Core',
    'Legs and abs workout',
    CURRENT_DATE - INTERVAL '19 days',
    ARRAY['Squats: 4x10', 'Deadlifts: 3x8', 'Lunges: 3x12 each leg', 'Plank: 3x60s'],
    true,
    CURRENT_DATE - INTERVAL '19 days' + INTERVAL '1 hour',
    '[{"exerciseIndex": 0, "completed": true, "rating": "good", "completed_at": "2024-01-03T10:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "hard", "completed_at": "2024-01-03T10:20:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "good", "completed_at": "2024-01-03T10:40:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "good", "completed_at": "2024-01-03T11:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '19 days'
  ),
  (
    v_customer_id,
    'Cardio & Conditioning',
    'HIIT workout for endurance',
    CURRENT_DATE - INTERVAL '17 days',
    ARRAY['Running: 20 min', 'Burpees: 3x10', 'Jump Squats: 3x15', 'Mountain Climbers: 3x20'],
    true,
    CURRENT_DATE - INTERVAL '17 days' + INTERVAL '45 minutes',
    '[{"exerciseIndex": 0, "completed": true, "rating": "hard", "completed_at": "2024-01-05T09:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "too_hard", "completed_at": "2024-01-05T09:20:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "good", "completed_at": "2024-01-05T09:30:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "good", "completed_at": "2024-01-05T09:40:00Z"}]'::jsonb,
    NOW() - INTERVAL '17 days'
  ),
  -- Week 2
  (
    v_customer_id,
    'Full Body Circuit',
    'Complete body workout',
    CURRENT_DATE - INTERVAL '14 days',
    ARRAY['Deadlifts: 4x8', 'Pull-ups: 3x8', 'Shoulder Press: 3x10', 'Leg Press: 3x12'],
    true,
    CURRENT_DATE - INTERVAL '14 days' + INTERVAL '1 hour 15 minutes',
    '[{"exerciseIndex": 0, "completed": true, "rating": "good", "completed_at": "2024-01-08T10:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "hard", "completed_at": "2024-01-08T10:20:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "good", "completed_at": "2024-01-08T10:35:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "easy", "completed_at": "2024-01-08T10:50:00Z"}]'::jsonb,
    NOW() - INTERVAL '14 days'
  ),
  (
    v_customer_id,
    'Upper Body Hypertrophy',
    'Volume training for muscle growth',
    CURRENT_DATE - INTERVAL '12 days',
    ARRAY['Incline Bench: 4x10', 'Barbell Rows: 4x10', 'Lateral Raises: 3x12', 'Bicep Curls: 3x12'],
    true,
    CURRENT_DATE - INTERVAL '12 days' + INTERVAL '1 hour 30 minutes',
    '[{"exerciseIndex": 0, "completed": true, "rating": "good", "completed_at": "2024-01-10T10:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "good", "completed_at": "2024-01-10T10:25:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "easy", "completed_at": "2024-01-10T10:50:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "good", "completed_at": "2024-01-10T11:10:00Z"}]'::jsonb,
    NOW() - INTERVAL '12 days'
  ),
  -- Week 3
  (
    v_customer_id,
    'Lower Body Power',
    'Explosive leg training',
    CURRENT_DATE - INTERVAL '7 days',
    ARRAY['Box Jumps: 4x8', 'Romanian Deadlifts: 4x8', 'Bulgarian Split Squats: 3x10', 'Calf Raises: 4x15'],
    true,
    CURRENT_DATE - INTERVAL '7 days' + INTERVAL '1 hour',
    '[{"exerciseIndex": 0, "completed": true, "rating": "good", "completed_at": "2024-01-15T10:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "hard", "completed_at": "2024-01-15T10:20:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "good", "completed_at": "2024-01-15T10:40:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "easy", "completed_at": "2024-01-15T11:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '7 days'
  ),
  (
    v_customer_id,
    'Push Day',
    'Chest, shoulders, triceps focus',
    CURRENT_DATE - INTERVAL '5 days',
    ARRAY['Dumbbell Press: 4x10', 'Arnold Press: 3x10', 'Tricep Extensions: 3x12', 'Cable Flyes: 3x12'],
    true,
    CURRENT_DATE - INTERVAL '5 days' + INTERVAL '1 hour 15 minutes',
    '[{"exerciseIndex": 0, "completed": true, "rating": "good", "completed_at": "2024-01-17T10:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "good", "completed_at": "2024-01-17T10:25:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "easy", "completed_at": "2024-01-17T10:45:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "good", "completed_at": "2024-01-17T11:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '5 days'
  ),
  -- Week 4 (Recent)
  (
    v_customer_id,
    'Pull Day',
    'Back and biceps',
    CURRENT_DATE - INTERVAL '3 days',
    ARRAY['Pull-ups: 4x8', 'Bent-over Rows: 4x10', 'Face Pulls: 3x12', 'Hammer Curls: 3x12'],
    true,
    CURRENT_DATE - INTERVAL '3 days' + INTERVAL '1 hour',
    '[{"exerciseIndex": 0, "completed": true, "rating": "hard", "completed_at": "2024-01-19T10:00:00Z"}, {"exerciseIndex": 1, "completed": true, "rating": "good", "completed_at": "2024-01-19T10:20:00Z"}, {"exerciseIndex": 2, "completed": true, "rating": "easy", "completed_at": "2024-01-19T10:40:00Z"}, {"exerciseIndex": 3, "completed": true, "rating": "good", "completed_at": "2024-01-19T11:00:00Z"}]'::jsonb,
    NOW() - INTERVAL '3 days'
  ),
  (
    v_customer_id,
    'Leg Day',
    'Complete lower body',
    CURRENT_DATE - INTERVAL '1 day',
    ARRAY['Back Squats: 5x5', 'Leg Press: 4x12', 'Leg Curls: 3x12', 'Walking Lunges: 3x20'],
    false,
    NULL,
    '[]'::jsonb,
    NOW() - INTERVAL '1 day'
  ),
  (
    v_customer_id,
    'Full Body',
    'Total body strength',
    CURRENT_DATE + INTERVAL '1 day',
    ARRAY['Deadlifts: 5x5', 'Bench Press: 4x8', 'Overhead Press: 3x8', 'Pull-ups: 3x8'],
    false,
    NULL,
    '[]'::jsonb,
    NOW()
  );

-- ============================================
-- 4. MESSAGES (Chat History)
-- ============================================
INSERT INTO messages (customer_id, sender, content, created_at)
VALUES
  (
    v_customer_id,
    'customer',
    'Hey! Just finished my workout. Feeling great!',
    NOW() - INTERVAL '20 days'
  ),
  (
    v_customer_id,
    'admin',
    'Awesome! Keep up the great work. How did the squats feel?',
    NOW() - INTERVAL '20 days' + INTERVAL '30 minutes'
  ),
  (
    v_customer_id,
    'customer',
    'They were challenging but I pushed through. My form felt good.',
    NOW() - INTERVAL '20 days' + INTERVAL '1 hour'
  ),
  (
    v_customer_id,
    'admin',
    'Perfect! Remember to keep your core tight and knees tracking over toes.',
    NOW() - INTERVAL '20 days' + INTERVAL '2 hours'
  ),
  (
    v_customer_id,
    'customer',
    'Thanks for the tip! I''ll focus on that next time.',
    NOW() - INTERVAL '19 days'
  ),
  (
    v_customer_id,
    'admin',
    'Great! Also, make sure you''re hitting your protein goals. I see you logged some meals - keep it up!',
    NOW() - INTERVAL '18 days'
  ),
  (
    v_customer_id,
    'customer',
    'Will do! I''ve been tracking everything. The meal suggestions are really helpful.',
    NOW() - INTERVAL '17 days'
  ),
  (
    v_customer_id,
    'admin',
    'Excellent! Consistency is key. You''re making great progress.',
    NOW() - INTERVAL '16 days'
  ),
  (
    v_customer_id,
    'customer',
    'Quick question - should I do cardio on rest days?',
    NOW() - INTERVAL '10 days'
  ),
  (
    v_customer_id,
    'admin',
    'Light cardio like walking or cycling is fine on rest days. Just keep it low intensity to aid recovery.',
    NOW() - INTERVAL '10 days' + INTERVAL '1 hour'
  ),
  (
    v_customer_id,
    'customer',
    'Got it, thanks! I''ll go for a walk today then.',
    NOW() - INTERVAL '10 days' + INTERVAL '2 hours'
  ),
  (
    v_customer_id,
    'admin',
    'Perfect! Also, I noticed you uploaded a progress photo - looking strong!',
    NOW() - INTERVAL '5 days'
  ),
  (
    v_customer_id,
    'customer',
    'Thank you! I can definitely see some changes. This program is working!',
    NOW() - INTERVAL '4 days'
  ),
  (
    v_customer_id,
    'admin',
    'That''s fantastic to hear! Keep pushing forward. You''ve got this!',
    NOW() - INTERVAL '3 days'
  ),
  (
    v_customer_id,
    'customer',
    'I weighed in today and I''m down 3 pounds this week!',
    NOW() - INTERVAL '1 day'
  ),
  (
    v_customer_id,
    'admin',
    'That''s amazing progress! Remember, weight can fluctuate, so focus on how you feel and your strength gains too.',
    NOW() - INTERVAL '1 day' + INTERVAL '2 hours'
  );

-- ============================================
-- 5. MEALS (Last 2 weeks of meal logs)
-- ============================================
INSERT INTO meals (customer_id, name, date, time, calories, protein, carbs, fats, items, created_at)
VALUES
  -- Week 1
  (
    v_customer_id,
    'Breakfast',
    CURRENT_DATE - INTERVAL '13 days',
    '08:00:00',
    450,
    35,
    45,
    15,
    ARRAY['3 eggs', '2 slices whole grain toast', '1/2 avocado', 'Black coffee'],
    NOW() - INTERVAL '13 days'
  ),
  (
    v_customer_id,
    'Lunch',
    CURRENT_DATE - INTERVAL '13 days',
    '12:30:00',
    550,
    40,
    60,
    20,
    ARRAY['Grilled chicken breast', 'Brown rice', 'Steamed broccoli', 'Olive oil'],
    NOW() - INTERVAL '13 days'
  ),
  (
    v_customer_id,
    'Dinner',
    CURRENT_DATE - INTERVAL '13 days',
    '19:00:00',
    650,
    50,
    70,
    25,
    ARRAY['Salmon fillet', 'Sweet potato', 'Asparagus', 'Mixed greens salad'],
    NOW() - INTERVAL '13 days'
  ),
  (
    v_customer_id,
    'Snack',
    CURRENT_DATE - INTERVAL '13 days',
    '15:00:00',
    200,
    15,
    25,
    8,
    ARRAY['Greek yogurt', 'Mixed berries', 'Almonds'],
    NOW() - INTERVAL '13 days'
  ),
  -- Day 2
  (
    v_customer_id,
    'Breakfast',
    CURRENT_DATE - INTERVAL '12 days',
    '07:30:00',
    400,
    30,
    50,
    12,
    ARRAY['Oatmeal', 'Protein powder', 'Banana', 'Almond butter'],
    NOW() - INTERVAL '12 days'
  ),
  (
    v_customer_id,
    'Lunch',
    CURRENT_DATE - INTERVAL '12 days',
    '13:00:00',
    600,
    45,
    65,
    22,
    ARRAY['Turkey breast', 'Quinoa', 'Roasted vegetables', 'Feta cheese'],
    NOW() - INTERVAL '12 days'
  ),
  (
    v_customer_id,
    'Dinner',
    CURRENT_DATE - INTERVAL '12 days',
    '18:30:00',
    700,
    55,
    75,
    28,
    ARRAY['Lean beef', 'Whole wheat pasta', 'Marinara sauce', 'Side salad'],
    NOW() - INTERVAL '12 days'
  ),
  -- Day 3
  (
    v_customer_id,
    'Breakfast',
    CURRENT_DATE - INTERVAL '11 days',
    '08:15:00',
    350,
    25,
    40,
    10,
    ARRAY['Scrambled eggs', 'Spinach', 'Whole grain toast', 'Green tea'],
    NOW() - INTERVAL '11 days'
  ),
  (
    v_customer_id,
    'Lunch',
    CURRENT_DATE - INTERVAL '11 days',
    '12:00:00',
    500,
    35,
    55,
    18,
    ARRAY['Tuna salad', 'Mixed greens', 'Whole grain crackers', 'Olive oil dressing'],
    NOW() - INTERVAL '11 days'
  ),
  (
    v_customer_id,
    'Dinner',
    CURRENT_DATE - INTERVAL '11 days',
    '19:15:00',
    680,
    52,
    72,
    26,
    ARRAY['Chicken thighs', 'Wild rice', 'Green beans', 'Garlic butter'],
    NOW() - INTERVAL '11 days'
  ),
  -- Recent days
  (
    v_customer_id,
    'Breakfast',
    CURRENT_DATE - INTERVAL '3 days',
    '08:00:00',
    420,
    32,
    48,
    14,
    ARRAY['Protein pancakes', 'Maple syrup', 'Blueberries', 'Coffee'],
    NOW() - INTERVAL '3 days'
  ),
  (
    v_customer_id,
    'Lunch',
    CURRENT_DATE - INTERVAL '3 days',
    '12:45:00',
    580,
    42,
    62,
    21,
    ARRAY['Grilled chicken wrap', 'Whole wheat tortilla', 'Lettuce', 'Tomato', 'Hummus'],
    NOW() - INTERVAL '3 days'
  ),
  (
    v_customer_id,
    'Dinner',
    CURRENT_DATE - INTERVAL '3 days',
    '19:30:00',
    720,
    58,
    78,
    30,
    ARRAY['Pork tenderloin', 'Mashed potatoes', 'Roasted carrots', 'Gravy'],
    NOW() - INTERVAL '3 days'
  ),
  (
    v_customer_id,
    'Snack',
    CURRENT_DATE - INTERVAL '3 days',
    '16:00:00',
    180,
    12,
    22,
    7,
    ARRAY['Apple', 'Peanut butter', 'String cheese'],
    NOW() - INTERVAL '3 days'
  ),
  -- Yesterday
  (
    v_customer_id,
    'Breakfast',
    CURRENT_DATE - INTERVAL '1 day',
    '07:45:00',
    380,
    28,
    42,
    12,
    ARRAY['Greek yogurt bowl', 'Granola', 'Strawberries', 'Honey'],
    NOW() - INTERVAL '1 day'
  ),
  (
    v_customer_id,
    'Lunch',
    CURRENT_DATE - INTERVAL '1 day',
    '13:15:00',
    620,
    48,
    68,
    24,
    ARRAY['Beef stir fry', 'Brown rice', 'Mixed vegetables', 'Soy sauce'],
    NOW() - INTERVAL '1 day'
  ),
  (
    v_customer_id,
    'Dinner',
    CURRENT_DATE - INTERVAL '1 day',
    '20:00:00',
    650,
    50,
    70,
    25,
    ARRAY['Baked cod', 'Roasted potatoes', 'Brussels sprouts', 'Lemon butter'],
    NOW() - INTERVAL '1 day'
  ),
  -- Today
  (
    v_customer_id,
    'Breakfast',
    CURRENT_DATE,
    '08:30:00',
    410,
    30,
    46,
    13,
    ARRAY['Egg white omelet', 'Vegetables', 'Whole grain toast', 'Orange juice'],
    NOW()
  ),
  (
    v_customer_id,
    'Lunch',
    CURRENT_DATE,
    '12:30:00',
    540,
    38,
    58,
    19,
    ARRAY['Chicken Caesar salad', 'Croutons', 'Parmesan cheese', 'Caesar dressing'],
    NOW()
  );

-- ============================================
-- 6. WEIGHT ENTRIES (Weekly weigh-ins)
-- ============================================
INSERT INTO weight_entries (customer_id, weight, date, notes, created_at)
VALUES
  (
    v_customer_id,
    185.5,
    CURRENT_DATE - INTERVAL '28 days',
    'Starting weight',
    NOW() - INTERVAL '28 days'
  ),
  (
    v_customer_id,
    184.2,
    CURRENT_DATE - INTERVAL '21 days',
    'Week 1 check-in',
    NOW() - INTERVAL '21 days'
  ),
  (
    v_customer_id,
    183.8,
    CURRENT_DATE - INTERVAL '14 days',
    'Week 2 check-in',
    NOW() - INTERVAL '14 days'
  ),
  (
    v_customer_id,
    182.5,
    CURRENT_DATE - INTERVAL '7 days',
    'Week 3 check-in - feeling strong!',
    NOW() - INTERVAL '7 days'
  ),
  (
    v_customer_id,
    181.2,
    CURRENT_DATE,
    'Week 4 check-in - down 4.3 lbs total!',
    NOW()
  )
ON CONFLICT (customer_id, date) DO UPDATE SET
  weight = EXCLUDED.weight,
  notes = EXCLUDED.notes;

-- ============================================
-- 7. PROGRESS PHOTOS
-- ============================================
INSERT INTO progress_photos (customer_id, url, date, type, notes, created_at)
VALUES
  (
    v_customer_id,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    CURRENT_DATE - INTERVAL '28 days',
    'front',
    'Starting photo - Day 1',
    NOW() - INTERVAL '28 days'
  ),
  (
    v_customer_id,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    CURRENT_DATE - INTERVAL '28 days',
    'side',
    'Starting photo - Day 1',
    NOW() - INTERVAL '28 days'
  ),
  (
    v_customer_id,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    CURRENT_DATE - INTERVAL '14 days',
    'front',
    'Week 2 progress - seeing changes!',
    NOW() - INTERVAL '14 days'
  ),
  (
    v_customer_id,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    CURRENT_DATE - INTERVAL '14 days',
    'side',
    'Week 2 progress',
    NOW() - INTERVAL '14 days'
  ),
  (
    v_customer_id,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    CURRENT_DATE,
    'front',
    'Week 4 progress - major improvements!',
    NOW()
  ),
  (
    v_customer_id,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    CURRENT_DATE,
    'side',
    'Week 4 progress',
    NOW()
  ),
  (
    v_customer_id,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    CURRENT_DATE,
    'back',
    'Week 4 progress - back view',
    NOW()
  );

END $$;

-- ============================================
-- ALTERNATIVE: If direct auth.users insert fails
-- ============================================
-- If the above script fails when creating the auth user, you have two options:
--
-- OPTION 1: Create user via Supabase Dashboard
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add user" > "Create new user"
-- 3. Email: testuser@example.com
-- 4. Password: TestPassword123!
-- 5. Auto Confirm User: Yes
-- 6. Then run this script again (it will skip user creation if user exists)
--
-- OPTION 2: Use Supabase Admin API (via your app or Postman)
-- POST to: https://YOUR_PROJECT.supabase.co/auth/v1/admin/users
-- Headers: 
--   Authorization: Bearer YOUR_SERVICE_ROLE_KEY
--   Content-Type: application/json
-- Body:
-- {
--   "email": "testuser@example.com",
--   "password": "TestPassword123!",
--   "email_confirm": true
-- }
-- Then run this script again

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the data was inserted correctly:

-- SELECT COUNT(*) as workout_count FROM workouts WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'testuser@example.com');
-- SELECT COUNT(*) as message_count FROM messages WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'testuser@example.com');
-- SELECT COUNT(*) as meal_count FROM meals WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'testuser@example.com');
-- SELECT COUNT(*) as weight_count FROM weight_entries WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'testuser@example.com');
-- SELECT COUNT(*) as photo_count FROM progress_photos WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'testuser@example.com');
-- SELECT * FROM nutrition_targets WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'testuser@example.com');
-- SELECT * FROM customers WHERE email = 'testuser@example.com';

