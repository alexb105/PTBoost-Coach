import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractAndNormalizeExerciseName, extractExerciseName, normalizeExerciseName } from '@/lib/exercise-utils'

async function checkAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get('admin_session')
  
  if (!sessionToken) {
    return null
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionToken.value, 'base64').toString()
    )

    const sessionAge = Date.now() - sessionData.timestamp
    const maxAge = 86400000 // 24 hours

    if (sessionAge > maxAge) {
      return null
    }

    return sessionData
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workoutId: string; exerciseIndex: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: customerId, workoutId, exerciseIndex } = await params
    const exerciseIndexNum = parseInt(exerciseIndex, 10)
    const { rating, bestSet } = await request.json()

    if (!rating || !['easy', 'good', 'hard', 'too_hard'].includes(rating)) {
      return NextResponse.json(
        { error: 'Valid rating is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // First, verify the workout belongs to the customer and get exercise name
    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('customer_id, exercise_completions, exercises, date')
      .eq('id', workoutId)
      .eq('customer_id', customerId)
      .single()

    if (fetchError || !workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }

    // Extract exercise name from the exercise string
    let normalizedExerciseName = ''
    let displayExerciseName = ''
    if (workout.exercises && workout.exercises[exerciseIndexNum]) {
      normalizedExerciseName = extractAndNormalizeExerciseName(workout.exercises[exerciseIndexNum])
      displayExerciseName = extractExerciseName(workout.exercises[exerciseIndexNum])
    }

    // Get existing exercise completions or initialize empty array
    const completions: Array<{
      exerciseIndex: number
      completed: boolean
      rating?: string
      completed_at?: string
      bestSet?: {
        reps?: string
        weight?: string
        seconds?: string
        duration_minutes?: string
        distance_km?: string
        intensity?: string
      }
    }> = workout.exercise_completions || []

    // Update or add completion for this exercise
    const existingIndex = completions.findIndex(ec => ec.exerciseIndex === exerciseIndexNum)
    const newCompletion: {
      exerciseIndex: number
      completed: boolean
      rating: string
      completed_at: string
      bestSet?: { 
        reps?: string
        weight?: string
        seconds?: string
        duration_minutes?: string
        distance_km?: string
        intensity?: string
      }
    } = {
      exerciseIndex: exerciseIndexNum,
      completed: true,
      rating,
      completed_at: new Date().toISOString(),
    }

    // Add best set if provided (check for both sets-based and cardio fields)
    if (bestSet && (
      bestSet.reps || 
      bestSet.weight || 
      bestSet.seconds || 
      bestSet.duration_minutes || 
      bestSet.distance_km || 
      bestSet.intensity
    )) {
      newCompletion.bestSet = bestSet
    }

    if (existingIndex >= 0) {
      completions[existingIndex] = newCompletion
    } else {
      completions.push(newCompletion)
    }

    // Update workout with new exercise completions
    const { data, error } = await supabase
      .from('workouts')
      .update({
        exercise_completions: completions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workoutId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // If bestSet was provided and exercise name is available, update/create PB record
    // Wrap in try-catch so PB errors don't fail the exercise completion
    if (bestSet && (bestSet.reps || bestSet.weight || bestSet.seconds) && normalizedExerciseName) {
      try {
        // Get or create exercise in global exercises table
        let exerciseId: string | null = null
        
        // Try to find existing exercise
        const { data: existingExercise, error: findError } = await supabase
          .from('exercises')
          .select('id')
          .eq('name', normalizedExerciseName)
          .single()

        if (existingExercise && !findError) {
          exerciseId = existingExercise.id
        } else if (findError?.code === 'PGRST116') {
          // Exercise doesn't exist, create it
          const { data: newExercise, error: exerciseError } = await supabase
            .from('exercises')
            .insert({
              name: normalizedExerciseName,
              display_name: displayExerciseName || normalizedExerciseName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            })
            .select('id')
            .single()

          if (exerciseError) {
            console.error('Error creating exercise:', exerciseError)
            // Continue without exercise_id if creation fails
          } else if (newExercise) {
            exerciseId = newExercise.id
          }
        }

        // Check if PB already exists (by exercise_id if available, otherwise by exercise_name for backward compatibility)
        let existingPb = null
        
        // First try by exercise_id if available
        if (exerciseId) {
          const { data: pb, error: pbError } = await supabase
            .from('exercise_pbs')
            .select('id')
            .eq('customer_id', customerId)
            .eq('exercise_id', exerciseId)
            .maybeSingle()
          
          if (pb && !pbError) {
            existingPb = pb
          }
        }
        
        // Fallback to exercise_name lookup if exercise_id didn't work
        if (!existingPb) {
          const { data: pb, error: pbError } = await supabase
            .from('exercise_pbs')
            .select('id')
            .eq('customer_id', customerId)
            .eq('exercise_name', normalizedExerciseName)
            .maybeSingle()
          
          if (pb && !pbError) {
            existingPb = pb
          }
        }

        // Determine if this is a new PB by comparing values
        let isNewPB = true
        if (existingPb) {
          // Fetch current PB to compare
          const { data: currentPb } = await supabase
            .from('exercise_pbs')
            .select('*')
            .eq('id', existingPb.id)
            .single()

          if (currentPb) {
            // Compare values - this is simplified, you might want more sophisticated comparison
            if (bestSet.reps && currentPb.reps) {
              const newReps = parseInt(bestSet.reps)
              const currentReps = parseInt(currentPb.reps)
              if (newReps <= currentReps && bestSet.weight && currentPb.weight) {
                // Compare weights if reps are same or less
                const newWeight = parseFloat(bestSet.weight.replace(/[^0-9.]/g, ''))
                const currentWeight = parseFloat(currentPb.weight.replace(/[^0-9.]/g, ''))
                isNewPB = newWeight > currentWeight || (newWeight === currentWeight && newReps > currentReps)
              } else {
                isNewPB = newReps > currentReps
              }
            } else if (bestSet.weight && currentPb.weight) {
              const newWeight = parseFloat(bestSet.weight.replace(/[^0-9.]/g, ''))
              const currentWeight = parseFloat(currentPb.weight.replace(/[^0-9.]/g, ''))
              isNewPB = newWeight > currentWeight
            }
          }
        }

        // Update or create PB record
        const pbData: any = {
          customer_id: customerId,
          workout_id: workoutId,
          workout_date: workout.date,
        }

        if (exerciseId) {
          pbData.exercise_id = exerciseId
        } else {
          pbData.exercise_name = normalizedExerciseName
        }

        // Add best set values
        if (bestSet.reps) pbData.reps = bestSet.reps
        if (bestSet.weight) pbData.weight = bestSet.weight
        if (bestSet.seconds) pbData.seconds = bestSet.seconds
        if (bestSet.duration_minutes) pbData.duration_minutes = bestSet.duration_minutes
        if (bestSet.distance_km) pbData.distance_km = bestSet.distance_km
        if (bestSet.intensity) pbData.intensity = bestSet.intensity

        if (existingPb && isNewPB) {
          // Update existing PB
          await supabase
            .from('exercise_pbs')
            .update(pbData)
            .eq('id', existingPb.id)
        } else if (!existingPb || isNewPB) {
          // Create new PB
          await supabase
            .from('exercise_pbs')
            .insert(pbData)
        }
      } catch (pbError) {
        console.error('Error updating PB:', pbError)
        // Don't fail the exercise completion if PB update fails
      }
    }

    return NextResponse.json(
      { workout: data, message: 'Exercise marked as complete' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error completing exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete exercise' },
      { status: 500 }
    )
  }
}

