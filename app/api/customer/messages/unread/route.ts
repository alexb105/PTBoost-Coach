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
    const maxAge = 86400000

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
    
    // Check for any new messages from admin since lastSeen
    let query = supabase
      .from('messages')
      .select('id')
      .eq('customer_id', session.userId)
      .eq('sender', 'admin')
      .limit(1)

    if (lastSeenTimestamp) {
      query = query.gt('created_at', lastSeenTimestamp)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ hasUnread: data && data.length > 0 })
  } catch (error: any) {
    console.error('Error checking for updates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check for updates' },
      { status: 500 }
    )
  }
}
