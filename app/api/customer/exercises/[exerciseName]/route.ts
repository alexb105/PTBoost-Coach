import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractAndNormalizeExerciseName, normalizeExerciseName } from '@/lib/exercise-utils'

// Helper to get user session
async function getUserSession(request: NextRequest) {
  const sessionToken = request.cookies.get('user_session')
  
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

// GET - Get PB for a specific exercise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseName: string }> }
) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { exerciseName } = await params
    const decodedExerciseName = decodeURIComponent(exerciseName)
    // Normalize the exercise name for consistent matching
    const normalizedExerciseName = normalizeExerciseName(decodedExerciseName)

    const supabase = createServerClient()
    
    // First, try to find the exercise in the global exercises table
    const { data: exercise } = await supabase
      .from('exercises')
      .select('id, display_name')
      .eq('name', normalizedExerciseName)
      .single()

    // Get the PB for this exercise (prefer exercise_id if available, fallback to exercise_name)
    let pb = null
    let pbError = null
    
    if (exercise) {
      // Use exercise_id if available
      const { data, error } = await supabase
        .from('exercise_pbs')
        .select('*')
        .eq('customer_id', session.userId)
        .eq('exercise_id', exercise.id)
        .single()
      pb = data
      pbError = error
    }
    
    // Fallback to exercise_name lookup if exercise_id didn't work
    if (!pb && (!exercise || pbError?.code === 'PGRST116')) {
      const { data, error } = await supabase
        .from('exercise_pbs')
        .select('*')
        .eq('customer_id', session.userId)
        .eq('exercise_name', normalizedExerciseName)
        .single()
      pb = data
      pbError = error
    }

    if (pbError && pbError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw pbError
    }

    // Get all PB history for this exercise (from workout completions)
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('id, date, exercise_completions, exercises')
      .eq('customer_id', session.userId)
      .order('date', { ascending: false })

    if (workoutsError) {
      throw workoutsError
    }

    // Extract all PB entries from workout completions for this exercise
    const pbHistory: Array<{
      workout_id: string
      workout_date: string
      reps?: string
      weight?: string
      seconds?: string
      completed_at?: string
    }> = []

    if (workouts) {
      workouts.forEach(workout => {
        if (!workout.exercise_completions || !Array.isArray(workout.exercise_completions)) return
        
        // Find the exercise index in the exercises array (using normalized names for matching)
        const exerciseIndex = workout.exercises?.findIndex(ex => {
          const extractedName = extractAndNormalizeExerciseName(ex)
          return extractedName === normalizedExerciseName
        })

        if (exerciseIndex !== undefined && exerciseIndex >= 0) {
          const completion = workout.exercise_completions.find(
            (ec: any) => ec.exerciseIndex === exerciseIndex && ec.bestSet
          )
          
          if (completion && completion.bestSet) {
            pbHistory.push({
              workout_id: workout.id,
              workout_date: workout.date,
              reps: completion.bestSet.reps,
              weight: completion.bestSet.weight,
              seconds: completion.bestSet.seconds,
              completed_at: completion.completed_at,
            })
          }
        }
      })
    }

    return NextResponse.json({
      pb: pb || null,
      history: pbHistory.sort((a, b) => {
        const dateA = new Date(a.completed_at || a.workout_date).getTime()
        const dateB = new Date(b.completed_at || b.workout_date).getTime()
        return dateB - dateA // Most recent first
      }),
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching exercise PB:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exercise PB' },
      { status: 500 }
    )
  }
}

