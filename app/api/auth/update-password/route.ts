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

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      session.userId,
      { password: newPassword }
    )

    if (updateError) {
      throw updateError
    }

    // Mark one-time password as used
    const { error: customerError } = await supabase
      .from('customers')
      .update({ one_time_password_used: true })
      .eq('id', session.userId)

    if (customerError) {
      console.error('Error updating customer record:', customerError)
      // Don't fail the request if this fails
    }

    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Password update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update password' },
      { status: 500 }
    )
  }
}

