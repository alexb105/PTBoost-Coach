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

// PUT - Update an exercise
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { exerciseId } = await params
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

    // Check if another exercise with this name exists
    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', normalizedName)
      .neq('id', exerciseId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Exercise with this name already exists' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('exercises')
      .update({
        name: normalizedName,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exerciseId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { exercise: data, message: 'Exercise updated successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update exercise' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an exercise
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { exerciseId } = await params

    const supabase = createServerClient()
    
    // Check if exercise is used in any PBs
    const { data: pbs, error: checkError } = await supabase
      .from('exercise_pbs')
      .select('id')
      .eq('exercise_id', exerciseId)
      .limit(1)

    if (checkError) {
      throw checkError
    }

    if (pbs && pbs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete exercise that has personal best records. Delete all related PBs first.' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Exercise deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting exercise:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete exercise' },
      { status: 500 }
    )
  }
}

