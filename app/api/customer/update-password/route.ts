import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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

export async function PUT(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { newPassword, currentPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Get customer email to update password in auth.users
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('email')
      .eq('id', session.userId)
      .single()

    if (customerError || !customer) {
      throw new Error('Customer not found')
    }

    // Update password in auth.users using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      session.userId,
      { password: newPassword }
    )

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ 
      message: 'Password updated successfully' 
    })
  } catch (error: any) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update password' },
      { status: 500 }
    )
  }
}



