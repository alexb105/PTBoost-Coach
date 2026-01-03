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

// GET - Get customer's trainer_id
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
    
    // Get customer's trainer_id
    const { data: customer, error } = await supabase
      .from('customers')
      .select('trainer_id')
      .eq('id', session.userId)
      .single()

    if (error) {
      throw error
    }

    if (!customer || !customer.trainer_id) {
      return NextResponse.json(
        { error: 'Trainer not found for customer' },
        { status: 404 }
      )
    }

    return NextResponse.json({ trainer_id: customer.trainer_id })
  } catch (error: any) {
    console.error('Error fetching customer trainer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trainer info' },
      { status: 500 }
    )
  }
}



