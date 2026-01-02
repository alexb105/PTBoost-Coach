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

    const { 
      name, 
      display_name, 
      exercise_type,
      default_sets,
      default_reps,
      default_weight,
      default_duration_minutes,
      default_distance_km,
      default_intensity,
      image_url,
      video_url,
      description,
      muscle_groups
    } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Exercise name is required' },
        { status: 400 }
      )
    }

    // Ensure exercise_type is valid, default to 'sets' if missing or invalid
    // Normalize by trimming and lowercasing to handle any edge cases
    const normalizedType = exercise_type ? String(exercise_type).trim().toLowerCase() : 'sets'
    const validExerciseType = ['cardio', 'sets'].includes(normalizedType) ? normalizedType : 'sets'

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

    // Build insert object - explicitly set exercise_type to ensure it's never null/undefined
    const insertData: any = {
      name: normalizedName,
      display_name: displayName,
      exercise_type: validExerciseType,
    }

    // Add media URLs if provided
    if (image_url && image_url.trim()) {
      insertData.image_url = image_url.trim()
    }
    if (video_url && video_url.trim()) {
      insertData.video_url = video_url.trim()
    }
    if (description !== undefined) {
      insertData.description = description && description.trim() ? description.trim() : null
    }
    
    // Add muscle groups if provided
    if (muscle_groups !== undefined) {
      // Ensure it's an array and filter out empty strings
      const groups = Array.isArray(muscle_groups) 
        ? muscle_groups.filter(g => g && g.trim())
        : []
      insertData.muscle_groups = groups.length > 0 ? groups : []
    }

    console.log('Inserting exercise with data:', JSON.stringify(insertData, null, 2))

    // Add type-specific defaults
    if (validExerciseType === 'sets') {
      if (default_sets !== undefined && default_sets !== null && default_sets !== '') {
        insertData.default_sets = parseInt(default_sets)
      }
      if (default_reps !== undefined && default_reps !== null && default_reps !== '') {
        insertData.default_reps = default_reps
      }
      if (default_weight !== undefined && default_weight !== null && default_weight !== '') {
        insertData.default_weight = default_weight
      }
    } else if (validExerciseType === 'cardio') {
      if (default_duration_minutes !== undefined && default_duration_minutes !== null && default_duration_minutes !== '') {
        insertData.default_duration_minutes = parseInt(default_duration_minutes)
      }
      if (default_distance_km !== undefined && default_distance_km !== null && default_distance_km !== '') {
        insertData.default_distance_km = parseFloat(default_distance_km)
      }
      if (default_intensity !== undefined && default_intensity !== null && default_intensity !== '') {
        insertData.default_intensity = default_intensity
      }
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Attempted insert data:', JSON.stringify(insertData, null, 2))
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

