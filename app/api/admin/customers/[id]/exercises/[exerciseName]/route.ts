import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractAndNormalizeExerciseName, normalizeExerciseName } from '@/lib/exercise-utils'
import { checkAdminSession } from '@/lib/admin-auth'

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

    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Verify customer belongs to this trainer
    const { data: customer } = await supabase
      .from('customers')
      .select('trainer_id')
      .eq('id', customerId)
      .single()

    if (!customer || customer.trainer_id !== session.trainerId) {
      return NextResponse.json(
        { error: 'Customer not found or access denied' },
        { status: 404 }
      )
    }
    
    // Find the exercise in trainer's exercises
    const { data: exercise } = await supabase
      .from('exercises')
      .select('id, display_name')
      .eq('name', normalizedExerciseName)
      .eq('trainer_id', session.trainerId)
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
      duration_minutes?: string
      distance_km?: string
      intensity?: string
      completed_at?: string
    }> = []

    // Extract workout history with exercise values
    const workoutHistory: Array<{
      workout_id: string
      workout_date: string
      workout_title?: string
      exercise_type?: "cardio" | "sets"
      sets?: string
      reps?: string
      weight?: string
      seconds?: string
      type?: "reps" | "seconds"
      duration_minutes?: string
      distance_km?: string
      intensity?: string
      notes?: string
      completed_at?: string
      bestSet?: {
        reps?: string
        weight?: string
        seconds?: string
        duration_minutes?: string
        distance_km?: string
        intensity?: string
      }
    }> = []

    // Helper to parse exercise string
    const parseExerciseString = (exerciseStr: string) => {
      if (!exerciseStr || !exerciseStr.trim()) {
        return { exercise_type: "sets" as const, sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }
      }

      // Check for new cardio format: "[CARDIO] Exercise Name | 30min | 5km | Moderate - Notes"
      if (exerciseStr.startsWith("[CARDIO]")) {
        const cardioStr = exerciseStr.replace("[CARDIO]", "").trim()
        
        // Split by " - " to separate notes
        const parts = cardioStr.split(" - ")
        const notes = parts.length > 1 ? parts[1].trim() : ""
        const mainPart = parts[0].trim()
        
        // Split by " | " to get name and cardio details
        const segments = mainPart.split(" | ")
        
        let duration_minutes = ""
        let distance_km = ""
        let intensity = ""
        
        // Parse cardio details from remaining segments
        for (let i = 1; i < segments.length; i++) {
          const segment = segments[i].trim()
          if (segment.endsWith("min")) {
            duration_minutes = segment.replace("min", "").trim()
          } else if (segment.endsWith("km")) {
            distance_km = segment.replace("km", "").trim()
          } else {
            // Assume it's intensity
            intensity = segment
          }
        }
        
        return {
          exercise_type: "cardio" as const,
          sets: "",
          reps: "",
          type: "reps" as const,
          weight: "",
          duration_minutes,
          distance_km,
          intensity,
          notes,
        }
      }

      // Check if this is the old cardio exercise format (contains "Duration:", "Distance:", or "Intensity:")
      const isCardioFormat = exerciseStr.includes("Duration:") || exerciseStr.includes("Distance:") || exerciseStr.includes("Intensity:")
      
      if (isCardioFormat) {
        // Cardio format: "Exercise Name - Duration: 30min, Distance: 5.0km, Intensity: Moderate - Notes"
        const parts = exerciseStr.split(" - ")
        let notes = ""
        let mainPart = parts[0].trim()
        let cardioData = ""
        
        // Check if last part looks like notes (doesn't contain cardio keywords)
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1]
          if (!lastPart.includes("Duration:") && !lastPart.includes("Distance:") && !lastPart.includes("Intensity:")) {
            notes = lastPart.trim()
            // Everything between first and last is cardio data
            cardioData = parts.slice(1, -1).join(" - ").trim()
          } else {
            // No notes, all middle parts are cardio data
            cardioData = parts.slice(1).join(" - ").trim()
          }
        }
        
        // Extract cardio values
        let duration_minutes = ""
        let distance_km = ""
        let intensity = ""
        
        const durationMatch = cardioData.match(/Duration:\s*(\d+)\s*min/i)
        if (durationMatch) {
          duration_minutes = durationMatch[1]
        }
        
        const distanceMatch = cardioData.match(/Distance:\s*([\d.]+)\s*km/i)
        if (distanceMatch) {
          distance_km = distanceMatch[1]
        }
        
        const intensityMatch = cardioData.match(/Intensity:\s*([^,]+)/i)
        if (intensityMatch) {
          intensity = intensityMatch[1].trim()
        }
        
        return {
          exercise_type: "cardio" as const,
          sets: "",
          reps: "",
          type: "reps" as const,
          weight: "",
          duration_minutes,
          distance_km,
          intensity,
          notes,
        }
      }

      // Sets-based format: "Exercise Name 3x8 @ 50kg - Notes"
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
      
      return { exercise_type: "sets" as const, sets, reps, type, weight, notes }
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
            exercise_type: parsedExercise.exercise_type,
            sets: parsedExercise.sets,
            reps: parsedExercise.reps,
            weight: parsedExercise.weight,
            seconds: parsedExercise.type === "seconds" ? parsedExercise.reps : undefined,
            type: parsedExercise.type,
            duration_minutes: parsedExercise.duration_minutes,
            distance_km: parsedExercise.distance_km,
            intensity: parsedExercise.intensity,
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
              duration_minutes: completion.bestSet.duration_minutes,
              distance_km: completion.bestSet.distance_km,
              intensity: completion.bestSet.intensity,
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

