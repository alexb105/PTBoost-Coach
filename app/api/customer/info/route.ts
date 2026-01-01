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

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    // Get customer information
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, email, full_name, phone, created_at')
      .eq('id', session.userId)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ customer: customer || null })
  } catch (error: any) {
    console.error('Error fetching customer info:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer info' },
      { status: 500 }
    )
  }
}

