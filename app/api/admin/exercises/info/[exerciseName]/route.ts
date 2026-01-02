import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { normalizeExerciseName } from '@/lib/exercise-utils'
import { checkAdminSession } from '@/lib/admin-auth'

// GET - Get exercise info (video_url, image_url, display_name)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseName: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { exerciseName } = await params
    const decodedExerciseName = decodeURIComponent(exerciseName)
    const normalizedExerciseName = normalizeExerciseName(decodedExerciseName)

    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Fetch exercise details from trainer's exercises
    const { data: exercise, error } = await supabase
      .from('exercises')
      .select('id, display_name, image_url, video_url, description')
      .eq('name', normalizedExerciseName)
      .eq('trainer_id', session.trainerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Exercise not found
        return NextResponse.json(
          { error: 'Exercise not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      exercise: {
        id: exercise.id,
        display_name: exercise.display_name,
        image_url: exercise.image_url,
        video_url: exercise.video_url,
        description: exercise.description,
      }
    })
  } catch (error: any) {
    console.error('Error fetching exercise info:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exercise info' },
      { status: 500 }
    )
  }
}

