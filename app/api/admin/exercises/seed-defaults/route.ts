import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'
import { seedDefaultExercises } from '@/lib/seed-default-exercises'

// POST - Seed default exercises for the current trainer
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Seed default exercises for this trainer
    await seedDefaultExercises(supabase, session.trainerId)

    return NextResponse.json(
      { message: 'Default exercises loaded successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error seeding default exercises:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load default exercises' },
      { status: 500 }
    )
  }
}



