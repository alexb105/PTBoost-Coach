import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { normalizeExerciseName } from '@/lib/exercise-utils'

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

// GET - Get all exercises
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('*')
      .order('display_name', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(
      { exercises: exercises || [] },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch exercises' },
      { status: 500 }
    )
  }
}

// POST - Create a new exercise
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, display_name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Exercise name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Normalize the name for storage
    const normalizedName = normalizeExerciseName(name)
    const displayName = display_name || name.trim()

    // Check if exercise already exists
    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', normalizedName)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Exercise with this name already exists' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: normalizedName,
        display_name: displayName,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { exercise: data, message: 'Exercise created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create exercise' },
      { status: 500 }
    )
  }
}

