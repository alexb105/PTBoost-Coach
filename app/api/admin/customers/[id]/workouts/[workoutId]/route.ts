import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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
    const maxAge = 86400000

    if (sessionAge > maxAge) {
      return null
    }

    return sessionData
  } catch {
    return null
  }
}

// PUT - Update workout
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workoutId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, workoutId } = await params
    const { title, description, date, exercises } = await request.json()

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('workouts')
      .update({
        title,
        description: description || null,
        date,
        exercises: exercises || [],
      })
      .eq('id', workoutId)
      .eq('customer_id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { workout: data, message: 'Workout updated successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating workout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update workout' },
      { status: 500 }
    )
  }
}

// DELETE - Delete workout
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workoutId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, workoutId } = await params

    const supabase = createServerClient()
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)
      .eq('customer_id', id)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Workout deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting workout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete workout' },
      { status: 500 }
    )
  }
}

