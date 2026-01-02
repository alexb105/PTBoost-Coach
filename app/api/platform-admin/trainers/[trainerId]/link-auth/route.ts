import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// POST - Create auth user and link to existing trainer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 401 }
      )
    }

    const { trainerId } = await params
    const { password } = await request.json()

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Get trainer record
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('*')
      .eq('id', trainerId)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      )
    }

    // Check if auth user already exists
    if (trainer.auth_user_id) {
      return NextResponse.json(
        { error: 'Trainer already has an auth user linked' },
        { status: 400 }
      )
    }

    // Create auth user (normalize email to lowercase)
    const normalizedEmail = trainer.email.toLowerCase().trim()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'trainer',
        full_name: trainer.full_name,
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create auth user' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create auth user' },
        { status: 500 }
      )
    }

    // Link auth user to trainer
    const { data: updatedTrainer, error: updateError } = await supabase
      .from('trainers')
      .update({ auth_user_id: authData.user.id })
      .eq('id', trainerId)
      .select()
      .single()

    if (updateError) {
      // Try to clean up the auth user if linking fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to link auth user to trainer' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      trainer: updatedTrainer,
      message: 'Auth user created and linked successfully'
    })
  } catch (error: any) {
    console.error('Error linking auth user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to link auth user' },
      { status: 500 }
    )
  }
}

