import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

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

    const supabase = createServerClient()
    
    // First, verify the workout belongs to the customer
    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('customer_id, exercise_completions')
      .eq('id', workoutId)
      .eq('customer_id', customerId)
      .single()

    if (fetchError || !workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
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

    // Remove completion for this exercise
    const filteredCompletions = completions.filter(ec => ec.exerciseIndex !== exerciseIndexNum)

    // Update workout with updated exercise completions
    const { data, error } = await supabase
      .from('workouts')
      .update({
        exercise_completions: filteredCompletions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workoutId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { workout: data, message: 'Exercise marked as incomplete' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error uncompleting exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to uncomplete exercise' },
      { status: 500 }
    )
  }
}

