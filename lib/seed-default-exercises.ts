import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Seeds 10 default common exercises for a new trainer
 * @param supabase - Supabase client instance
 * @param trainerId - The trainer's ID
 */
export async function seedDefaultExercises(
  supabase: SupabaseClient,
  trainerId: string
): Promise<void> {
  const defaultExercises = [
    // Strength exercises (7)
    {
      name: 'bench press',
      display_name: 'Bench Press',
      exercise_type: 'sets',
      default_sets: 4,
      default_reps: '8-10',
      default_weight: 'Body weight',
      muscle_groups: ['Chest', 'Triceps', 'Shoulders'],
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    },
    {
      name: 'squats',
      display_name: 'Squats',
      exercise_type: 'sets',
      default_sets: 4,
      default_reps: '10-12',
      default_weight: 'Body weight',
      muscle_groups: ['Legs', 'Quadriceps', 'Glutes', 'Core'],
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      video_url: 'https://www.youtube.com/watch?v=YaXPRqUwItQ',
    },
    {
      name: 'deadlifts',
      display_name: 'Deadlifts',
      exercise_type: 'sets',
      default_sets: 4,
      default_reps: '6-8',
      default_weight: 'Body weight',
      muscle_groups: ['Back', 'Legs', 'Hamstrings', 'Glutes', 'Core'],
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      video_url: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
    },
    {
      name: 'barbell row',
      display_name: 'Barbell Row',
      exercise_type: 'sets',
      default_sets: 4,
      default_reps: '8-10',
      default_weight: 'Body weight',
      muscle_groups: ['Back', 'Biceps', 'Shoulders'],
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      video_url: 'https://www.youtube.com/watch?v=pa95m9jP5-M',
    },
    {
      name: 'overhead press',
      display_name: 'Overhead Press',
      exercise_type: 'sets',
      default_sets: 3,
      default_reps: '8-12',
      default_weight: 'Body weight',
      muscle_groups: ['Shoulders', 'Triceps', 'Core'],
      image_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
      video_url: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    },
    {
      name: 'pull ups',
      display_name: 'Pull Ups',
      exercise_type: 'sets',
      default_sets: 3,
      default_reps: '8-12',
      default_weight: 'Body weight',
      muscle_groups: ['Back', 'Biceps', 'Shoulders'],
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      video_url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    },
    {
      name: 'lunges',
      display_name: 'Lunges',
      exercise_type: 'sets',
      default_sets: 3,
      default_reps: '12 each leg',
      default_weight: 'Body weight',
      muscle_groups: ['Legs', 'Quadriceps', 'Glutes'],
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      video_url: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
    },
    // Cardio exercises (3)
    {
      name: 'running',
      display_name: 'Running',
      exercise_type: 'cardio',
      default_duration_minutes: 30,
      default_distance_km: 5.0,
      default_intensity: 'Moderate',
      muscle_groups: ['Legs', 'Cardio'],
      image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800',
      video_url: 'https://www.youtube.com/watch?v=_kGESn8ArrU',
    },
    {
      name: 'cycling',
      display_name: 'Cycling',
      exercise_type: 'cardio',
      default_duration_minutes: 45,
      default_distance_km: 15.0,
      default_intensity: 'Moderate',
      muscle_groups: ['Legs', 'Cardio'],
      image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      video_url: 'https://www.youtube.com/watch?v=Gc4aL8vY1iU',
    },
    {
      name: 'rowing',
      display_name: 'Rowing',
      exercise_type: 'cardio',
      default_duration_minutes: 30,
      default_distance_km: null,
      default_intensity: 'Moderate',
      muscle_groups: ['Back', 'Legs', 'Cardio'],
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      video_url: 'https://www.youtube.com/watch?v=Wj4nLs3vf3o',
    },
  ]

  // Prepare all exercises for batch insert
  const exercisesToInsert = defaultExercises.map(exercise => {
    const exerciseData: any = {
      name: exercise.name,
      display_name: exercise.display_name,
      exercise_type: exercise.exercise_type,
      trainer_id: trainerId,
      muscle_groups: exercise.muscle_groups,
      image_url: exercise.image_url,
      video_url: exercise.video_url,
    }

    if (exercise.exercise_type === 'sets') {
      exerciseData.default_sets = exercise.default_sets
      exerciseData.default_reps = exercise.default_reps
      exerciseData.default_weight = exercise.default_weight
    } else if (exercise.exercise_type === 'cardio') {
      exerciseData.default_duration_minutes = exercise.default_duration_minutes
      exerciseData.default_distance_km = exercise.default_distance_km
      exerciseData.default_intensity = exercise.default_intensity
    }

    return exerciseData
  })

  // Insert all exercises in a batch
  // If any already exist (unique constraint on name + trainer_id), they'll be skipped
  const { data: insertedExercises, error } = await supabase
    .from('exercises')
    .insert(exercisesToInsert)
    .select()

  if (error) {
    // If it's a unique constraint violation, try inserting one by one to skip duplicates
    if (error.code === '23505') {
      console.log(`Some exercises already exist for trainer ${trainerId}, inserting individually...`)
      let successCount = 0
      
      for (const exerciseData of exercisesToInsert) {
        const { error: insertError } = await supabase
          .from('exercises')
          .insert(exerciseData)
          .select()

        if (insertError) {
          if (insertError.code === '23505') {
            // Exercise already exists, skip it
            continue
          } else {
            console.error(`Error seeding exercise "${exerciseData.name}" for trainer ${trainerId}:`, insertError)
          }
        } else {
          successCount++
        }
      }
      
      console.log(`Seeded ${successCount} new default exercises for trainer ${trainerId} (${defaultExercises.length - successCount} already existed)`)
    } else {
      console.error(`Error seeding default exercises for trainer ${trainerId}:`, error)
    }
  } else {
    console.log(`Successfully seeded ${insertedExercises?.length || 0} default exercises for trainer ${trainerId}`)
  }
}

