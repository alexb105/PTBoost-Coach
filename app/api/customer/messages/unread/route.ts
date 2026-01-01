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
    
    // Count unread messages from admin
    let messageQuery = supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('customer_id', session.userId)
      .eq('sender', 'admin') // Only count admin messages as unread

    if (lastSeenTimestamp) {
      messageQuery = messageQuery.gt('created_at', lastSeenTimestamp)
    }

    const { count: messageCount, error: messageError } = await messageQuery

    if (messageError) {
      throw messageError
    }

    // Count unread likes on customer's messages (likes from admin after lastSeen)
    let likeCount = 0
    if (lastSeenTimestamp) {
      // Get customer's messages
      const { data: customerMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('customer_id', session.userId)
        .eq('sender', 'customer')

      if (customerMessages && customerMessages.length > 0) {
        const messageIds = customerMessages.map(m => m.id)
        
        // Count likes from admin on customer's messages after lastSeen
        const { count: likesCount, error: likesError } = await supabase
          .from('message_likes')
          .select('id', { count: 'exact' })
          .in('message_id', messageIds)
          .eq('liked_by', 'admin')
          .gt('created_at', lastSeenTimestamp)

        if (!likesError) {
          likeCount = likesCount || 0
        }
      }
    }

    // Count unread replies to customer's messages (replies from admin after lastSeen)
    let replyCount = 0
    if (lastSeenTimestamp) {
      // Get customer's messages
      const { data: customerMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('customer_id', session.userId)
        .eq('sender', 'customer')

      if (customerMessages && customerMessages.length > 0) {
        const messageIds = customerMessages.map(m => m.id)
        
        // Count replies from admin to customer's messages after lastSeen
        const { count: repliesCount, error: repliesError } = await supabase
          .from('message_replies')
          .select('id', { count: 'exact' })
          .in('message_id', messageIds)
          .eq('sender', 'admin')
          .gt('created_at', lastSeenTimestamp)

        if (!repliesError) {
          replyCount = repliesCount || 0
        }
      }
    }

    const totalUnread = (messageCount || 0) + likeCount + replyCount

    return NextResponse.json({ unreadCount: totalUnread })
  } catch (error: any) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread count' },
      { status: 500 }
    )
  }
}






