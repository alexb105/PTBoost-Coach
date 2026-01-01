import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractAndNormalizeExerciseName, normalizeExerciseName } from '@/lib/exercise-utils'

// Helper to check admin session
async function checkAdminSession(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')
  
  if (!adminSession) {
    return null
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(adminSession.value, 'base64').toString()
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

// GET - Get customer's PB for a specific exercise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exerciseName: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: customerId, exerciseName } = await params
    const decodedExerciseName = decodeURIComponent(exerciseName)
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
        .eq('customer_id', customerId)
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
        .eq('customer_id', customerId)
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
      .select('id, date, title, exercise_completions, exercises')
      .eq('customer_id', customerId)
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

    // Extract workout history with exercise values
    const workoutHistory: Array<{
      workout_id: string
      workout_date: string
      workout_title?: string
      sets?: string
      reps?: string
      weight?: string
      seconds?: string
      type?: "reps" | "seconds"
      notes?: string
      completed_at?: string
      bestSet?: {
        reps?: string
        weight?: string
        seconds?: string
      }
    }> = []

    // Helper to parse exercise string
    const parseExerciseString = (exerciseStr: string) => {
      if (!exerciseStr || !exerciseStr.trim()) {
        return { sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }
      }

      const parts = exerciseStr.split(" - ")
      const notes = parts.length > 1 ? parts[1].trim() : ""
      let mainPart = parts[0].trim()
      
      const weightMatch = mainPart.match(/@\s*([^-]+?)(?:\s*-\s*|$)/)
      let weight = ""
      if (weightMatch) {
        weight = weightMatch[1].trim()
        mainPart = mainPart.replace(/@\s*[^-]+?(\s*-\s*|$)/, "").trim()
      }
      
      const setsRepsMatch = mainPart.match(/(\d+)x([\d-]+)(s)?/)
      let sets = ""
      let reps = ""
      let type: "reps" | "seconds" = "reps"
      if (setsRepsMatch) {
        sets = setsRepsMatch[1]
        reps = setsRepsMatch[2]
        type = setsRepsMatch[3] === "s" ? "seconds" : "reps"
      }
      
      return { sets, reps, type, weight, notes }
    }

    if (workouts) {
      workouts.forEach(workout => {
        // Find the exercise index in the exercises array (using normalized names for matching)
        const exerciseIndex = workout.exercises?.findIndex(ex => {
          const extractedName = extractAndNormalizeExerciseName(ex)
          return extractedName === normalizedExerciseName
        })

        if (exerciseIndex !== undefined && exerciseIndex >= 0) {
          const exerciseStr = workout.exercises[exerciseIndex]
          const parsedExercise = parseExerciseString(exerciseStr)
          
          // Get completion data if available
          let completion = null
          if (workout.exercise_completions && Array.isArray(workout.exercise_completions)) {
            completion = workout.exercise_completions.find(
              (ec: any) => ec.exerciseIndex === exerciseIndex
            )
          }

          // Add to workout history
          workoutHistory.push({
            workout_id: workout.id,
            workout_date: workout.date,
            workout_title: (workout as any).title,
            sets: parsedExercise.sets,
            reps: parsedExercise.reps,
            weight: parsedExercise.weight,
            seconds: parsedExercise.type === "seconds" ? parsedExercise.reps : undefined,
            type: parsedExercise.type,
            notes: parsedExercise.notes,
            completed_at: completion?.completed_at,
            bestSet: completion?.bestSet,
          })

          // Also add to PB history if there's a best set
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
      workoutHistory: workoutHistory.sort((a, b) => {
        const dateA = new Date(a.workout_date).getTime()
        const dateB = new Date(b.workout_date).getTime()
        return dateB - dateA // Most recent first
      }),
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching customer exercise PB:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exercise PB' },
      { status: 500 }
    )
  }
}

