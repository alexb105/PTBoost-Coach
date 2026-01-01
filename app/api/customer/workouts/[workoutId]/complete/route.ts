import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { workoutId } = await params
    const supabase = createServerClient()
    
    // First, verify the workout belongs to the user
    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('customer_id')
      .eq('id', workoutId)
      .single()

    if (fetchError || !workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      )
    }

    if (workout.customer_id !== session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update workout to mark as completed
    const { data, error } = await supabase
      .from('workouts')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', workoutId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { workout: data, message: 'Workout marked as complete' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error completing workout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete workout' },
      { status: 500 }
    )
  }
}

