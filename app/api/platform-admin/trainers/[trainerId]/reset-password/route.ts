import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// POST - Reset trainer password
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

    // Check if trainer has an auth user
    if (!trainer.auth_user_id) {
      return NextResponse.json(
        { error: 'Trainer does not have an auth account. Please link an auth account first.' },
        { status: 400 }
      )
    }

    // Verify the auth user exists first
    const { data: existingUser, error: userCheckError } = await supabase.auth.admin.getUserById(
      trainer.auth_user_id
    )

    if (userCheckError || !existingUser) {
      console.error('Error fetching auth user:', userCheckError)
      return NextResponse.json(
        { error: 'Auth user not found. Please link an auth account first.' },
        { status: 404 }
      )
    }

    console.log('Resetting password for user:', existingUser.user.email)

    // Update the auth user's password
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
      trainer.auth_user_id,
      {
        password: password,
      }
    )

    if (authError) {
      console.error('Error resetting password:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to reset password' },
        { status: 400 }
      )
    }

    console.log('Password reset successfully for user:', existingUser.user.email)

    return NextResponse.json({
      message: 'Password reset successfully',
      email: existingUser.user.email // Return email so admin knows which email to use
    })
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}

