import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { normalizeExerciseName } from '@/lib/exercise-utils'
import { checkAdminSession } from '@/lib/admin-auth'

// GET - Get trainer's own exercises only (no global exercises)
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Trainers must have a trainerId
    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Only get exercises for this specific trainer
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('trainer_id', session.trainerId)
      .order('display_name', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(
      { exercises: exercises || [] },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exercises' },
      { status: 500 }
    )
  }
}

// POST - Create a new exercise (trainer-specific)
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { 
      name, 
      display_name, 
      exercise_type,
      default_sets,
      default_reps,
      default_weight,
      default_duration_minutes,
      default_distance_km,
      default_intensity,
      image_url,
      video_url,
      description,
      muscle_groups
    } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Exercise name is required' },
        { status: 400 }
      )
    }

    // Check if trainer can add more exercises
    if (session.trainerId) {
      const { canAddExercise } = await import('@/lib/admin-auth')
      const { canAdd, reason } = await canAddExercise(session)
      
      if (!canAdd) {
        return NextResponse.json(
          { error: reason || 'Exercise limit reached' },
          { status: 403 }
        )
      }
    }

    // Ensure exercise_type is valid, default to 'sets' if missing or invalid
    const normalizedType = exercise_type ? String(exercise_type).trim().toLowerCase() : 'sets'
    const validExerciseType = ['cardio', 'sets'].includes(normalizedType) ? normalizedType : 'sets'

    const supabase = createServerClient()
    
    // Normalize the name for storage
    const normalizedName = normalizeExerciseName(name)
    const displayName = display_name || name.trim()

    // Check if exercise already exists for this trainer only
    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', normalizedName)
      .eq('trainer_id', session.trainerId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Exercise with this name already exists' },
        { status: 409 }
      )
    }

    // Ensure trainer_id is set (required for all exercises)
    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    // Build insert object
    const insertData: any = {
      name: normalizedName,
      display_name: displayName,
      exercise_type: validExerciseType,
      trainer_id: session.trainerId, // All exercises are trainer-specific
    }

    // Add media URLs if provided
    if (image_url && image_url.trim()) {
      insertData.image_url = image_url.trim()
    }
    if (video_url && video_url.trim()) {
      insertData.video_url = video_url.trim()
    }
    if (description !== undefined) {
      insertData.description = description && description.trim() ? description.trim() : null
    }
    
    // Add muscle groups if provided
    if (muscle_groups !== undefined) {
      const groups = Array.isArray(muscle_groups) 
        ? muscle_groups.filter(g => g && g.trim())
        : []
      insertData.muscle_groups = groups.length > 0 ? groups : []
    }

    // Add type-specific defaults
    if (validExerciseType === 'sets') {
      if (default_sets !== undefined && default_sets !== null && default_sets !== '') {
        insertData.default_sets = parseInt(default_sets)
      }
      if (default_reps !== undefined && default_reps !== null && default_reps !== '') {
        insertData.default_reps = default_reps
      }
      if (default_weight !== undefined && default_weight !== null && default_weight !== '') {
        insertData.default_weight = default_weight
      }
    } else if (validExerciseType === 'cardio') {
      if (default_duration_minutes !== undefined && default_duration_minutes !== null && default_duration_minutes !== '') {
        insertData.default_duration_minutes = parseInt(default_duration_minutes)
      }
      if (default_distance_km !== undefined && default_distance_km !== null && default_distance_km !== '') {
        insertData.default_distance_km = parseFloat(default_distance_km)
      }
      if (default_intensity !== undefined && default_intensity !== null && default_intensity !== '') {
        insertData.default_intensity = default_intensity
      }
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Insert data:', JSON.stringify(insertData, null, 2))
      throw error
    }

    // Log for debugging
    console.log(`Exercise created with trainer_id: ${data.trainer_id} for trainer: ${session.trainerId}`)

    return NextResponse.json(
      { exercise: data, message: 'Exercise created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create exercise' },
      { status: 500 }
    )
  }
}
