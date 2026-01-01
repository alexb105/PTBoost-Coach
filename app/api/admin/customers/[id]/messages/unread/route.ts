import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

async function checkAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get('admin_session')
  
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const lastSeen = request.nextUrl.searchParams.get('lastSeen')
    const lastSeenTimestamp = lastSeen ? new Date(lastSeen).toISOString() : null

    const supabase = createServerClient()
    
    // Count unread messages from customer
    let messageQuery = supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('customer_id', id)
      .eq('sender', 'customer') // Only count customer messages as unread for admin

    if (lastSeenTimestamp) {
      messageQuery = messageQuery.gt('created_at', lastSeenTimestamp)
    }

    const { count: messageCount, error: messageError } = await messageQuery

    if (messageError) {
      throw messageError
    }

    // Count unread likes on admin's messages (likes from customer after lastSeen)
    let likeCount = 0
    if (lastSeenTimestamp) {
      // Get admin's messages for this customer
      const { data: adminMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('customer_id', id)
        .eq('sender', 'admin')

      if (adminMessages && adminMessages.length > 0) {
        const messageIds = adminMessages.map(m => m.id)
        
        // Count likes from customer on admin's messages after lastSeen
        const { count: likesCount, error: likesError } = await supabase
          .from('message_likes')
          .select('id', { count: 'exact' })
          .in('message_id', messageIds)
          .eq('liked_by', 'customer')
          .gt('created_at', lastSeenTimestamp)

        if (!likesError) {
          likeCount = likesCount || 0
        }
      }
    }

    // Count unread replies to admin's messages (replies from customer after lastSeen)
    let replyCount = 0
    if (lastSeenTimestamp) {
      // Get admin's messages for this customer
      const { data: adminMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('customer_id', id)
        .eq('sender', 'admin')

      if (adminMessages && adminMessages.length > 0) {
        const messageIds = adminMessages.map(m => m.id)
        
        // Count replies from customer to admin's messages after lastSeen
        const { count: repliesCount, error: repliesError } = await supabase
          .from('message_replies')
          .select('id', { count: 'exact' })
          .in('message_id', messageIds)
          .eq('sender', 'customer')
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






