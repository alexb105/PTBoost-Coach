import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { normalizeExerciseName } from '@/lib/exercise-utils'
import { checkAdminSession } from '@/lib/admin-auth'

// PUT - Update an exercise
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { exerciseId } = await params
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

    // Ensure exercise_type is valid, default to 'sets' if missing or invalid
    // Normalize by trimming and lowercasing to handle any edge cases
    const normalizedType = exercise_type ? String(exercise_type).trim().toLowerCase() : 'sets'
    const validExerciseType = ['cardio', 'sets'].includes(normalizedType) ? normalizedType : 'sets'

    const supabase = createServerClient()
    
    // Normalize the name for storage
    const normalizedName = normalizeExerciseName(name)
    const displayName = display_name || name.trim()

    // Ensure trainer_id is set
    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    // Verify the exercise belongs to this trainer
    const { data: exerciseCheck } = await supabase
      .from('exercises')
      .select('trainer_id')
      .eq('id', exerciseId)
      .single()

    if (!exerciseCheck || exerciseCheck.trainer_id !== session.trainerId) {
      return NextResponse.json(
        { error: 'Exercise not found or access denied' },
        { status: 404 }
      )
    }

    // Check if another exercise with this name exists for this trainer
    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', normalizedName)
      .eq('trainer_id', session.trainerId)
      .neq('id', exerciseId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Exercise with this name already exists' },
        { status: 409 }
      )
    }

    // Build update object - explicitly set exercise_type to ensure it's never null/undefined
    const updateData: any = {
      name: normalizedName,
      display_name: displayName,
      exercise_type: validExerciseType,
      updated_at: new Date().toISOString(),
    }

    // Add media URLs if provided
    if (image_url !== undefined) {
      updateData.image_url = image_url && image_url.trim() ? image_url.trim() : null
    }
    if (video_url !== undefined) {
      updateData.video_url = video_url && video_url.trim() ? video_url.trim() : null
    }
    if (description !== undefined) {
      updateData.description = description && description.trim() ? description.trim() : null
    }
    
    // Add muscle groups if provided
    if (muscle_groups !== undefined) {
      // Ensure it's an array and filter out empty strings
      const groups = Array.isArray(muscle_groups) 
        ? muscle_groups.filter(g => g && g.trim())
        : []
      updateData.muscle_groups = groups.length > 0 ? groups : []
    }

    console.log('Updating exercise with data:', JSON.stringify(updateData, null, 2))

    // Add type-specific defaults
    if (validExerciseType === 'sets') {
      // Clear cardio fields
      updateData.default_duration_minutes = null
      updateData.default_distance_km = null
      updateData.default_intensity = null
      
      // Set set-based fields
      if (default_sets !== undefined && default_sets !== null && default_sets !== '') {
        updateData.default_sets = parseInt(default_sets)
      } else {
        updateData.default_sets = null
      }
      if (default_reps !== undefined && default_reps !== null && default_reps !== '') {
        updateData.default_reps = default_reps
      } else {
        updateData.default_reps = null
      }
      if (default_weight !== undefined && default_weight !== null && default_weight !== '') {
        updateData.default_weight = default_weight
      } else {
        updateData.default_weight = null
      }
    } else if (validExerciseType === 'cardio') {
      // Clear set-based fields
      updateData.default_sets = null
      updateData.default_reps = null
      updateData.default_weight = null
      
      // Set cardio fields
      if (default_duration_minutes !== undefined && default_duration_minutes !== null && default_duration_minutes !== '') {
        updateData.default_duration_minutes = parseInt(default_duration_minutes)
      } else {
        updateData.default_duration_minutes = null
      }
      if (default_distance_km !== undefined && default_distance_km !== null && default_distance_km !== '') {
        updateData.default_distance_km = parseFloat(default_distance_km)
      } else {
        updateData.default_distance_km = null
      }
      if (default_intensity !== undefined && default_intensity !== null && default_intensity !== '') {
        updateData.default_intensity = default_intensity
      } else {
        updateData.default_intensity = null
      }
    }

    const { data, error } = await supabase
      .from('exercises')
      .update(updateData)
      .eq('id', exerciseId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Attempted update data:', JSON.stringify(updateData, null, 2))
      throw error
    }

    return NextResponse.json(
      { exercise: data, message: 'Exercise updated successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update exercise' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an exercise
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { exerciseId } = await params

    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Verify the exercise belongs to this trainer and get exercise name
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('name, trainer_id')
      .eq('id', exerciseId)
      .single()

    if (exerciseError || !exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      )
    }

    if (exercise.trainer_id !== session.trainerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (exerciseError) {
      throw exerciseError
    }

    // Delete PBs that reference this exercise by exercise_name (backward compatibility)
    // PBs with exercise_id will be deleted automatically via CASCADE
    if (exercise?.name) {
      const { error: pbDeleteError } = await supabase
        .from('exercise_pbs')
        .delete()
        .eq('exercise_name', exercise.name)

      if (pbDeleteError) {
        console.error('Error deleting PBs by exercise_name:', pbDeleteError)
        // Continue with exercise deletion even if PB cleanup fails
      }
    }

    // Delete the exercise - database cascade will automatically delete related PBs
    // that use exercise_id due to ON DELETE CASCADE on exercise_pbs.exercise_id foreign key
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Exercise deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete exercise' },
      { status: 500 }
    )
  }
}

