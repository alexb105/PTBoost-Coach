import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { normalizeExerciseName } from '@/lib/exercise-utils'

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

// GET - Get exercise info (video_url, image_url, display_name)
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
    const normalizedExerciseName = normalizeExerciseName(decodedExerciseName)

    const supabase = createServerClient()
    
    // Fetch exercise details from the global exercises table
    const { data: exercise, error } = await supabase
      .from('exercises')
      .select('id, display_name, image_url, video_url, description')
      .eq('name', normalizedExerciseName)
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

