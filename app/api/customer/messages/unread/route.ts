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

    const lastSeen = request.nextUrl.searchParams.get('lastSeen')
    const lastSeenTimestamp = lastSeen ? new Date(lastSeen).toISOString() : null

    const supabase = createServerClient()
    
    let query = supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('customer_id', session.userId)
      .eq('sender', 'admin') // Only count admin messages as unread

    if (lastSeenTimestamp) {
      query = query.gt('created_at', lastSeenTimestamp)
    }

    const { count, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ unreadCount: count || 0 })
  } catch (error: any) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread count' },
      { status: 500 }
    )
  }
}



