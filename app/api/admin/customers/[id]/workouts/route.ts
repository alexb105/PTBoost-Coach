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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('customer_id', id)
      .order('date', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ workouts: data || [] })
  } catch (error: any) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workouts' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { title, description, date, exercises, is_rest_day } = await request.json()

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        customer_id: id,
        title,
        description: description || null,
        date,
        exercises: exercises || [],
        is_rest_day: is_rest_day || false,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { workout: data, message: 'Workout created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating workout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create workout' },
      { status: 500 }
    )
  }
}

