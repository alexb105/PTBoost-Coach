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

    // Use service role to fetch workouts for the authenticated user
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('customer_id', session.userId)
      .order('date', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ workouts: data || [] })
  } catch (error: any) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workouts' },
      { status: 500 }
    )
  }
}

