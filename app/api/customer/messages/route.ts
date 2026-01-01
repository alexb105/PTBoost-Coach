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

    const { searchParams } = new URL(request.url)
    const beforeDate = searchParams.get('before') // ISO date string for pagination
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const supabase = createServerClient()
    
    // Build query - fetch messages ordered by newest first
    let query = supabase
      .from('messages')
      .select('*')
      .eq('customer_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there are more
    
    // If beforeDate is provided, fetch messages before that date
    if (beforeDate) {
      query = query.lt('created_at', beforeDate)
    }
    
    const { data: messages, error } = await query

    if (error) {
      throw error
    }

    // Check if there are more messages (we fetched limit + 1)
    const hasMore = messages && messages.length > limit
    const messagesToReturn = hasMore ? messages.slice(0, limit) : (messages || [])

    // Fetch likes and replies for all messages
    if (messagesToReturn && messagesToReturn.length > 0) {
      const messageIds = messagesToReturn.map(m => m.id)
      
      // Fetch likes
      const { data: likes } = await supabase
        .from('message_likes')
        .select('*')
        .in('message_id', messageIds)
      
      // Fetch replies
      const { data: replies } = await supabase
        .from('message_replies')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true })
      
      // Attach likes and replies to messages
      const messagesWithExtras = messagesToReturn.map(message => ({
        ...message,
        likes: likes?.filter(like => like.message_id === message.id) || [],
        replies: replies?.filter(reply => reply.message_id === message.id) || [],
        likeCount: likes?.filter(like => like.message_id === message.id).length || 0,
        replyCount: replies?.filter(reply => reply.message_id === message.id).length || 0,
        isLiked: likes?.some(like => 
          like.message_id === message.id && 
          like.customer_id === session.userId && 
          like.liked_by === 'customer'
        ) || false,
      }))
      
      // Reverse to show oldest first (for display), but keep newest first for translation priority
      const reversedMessages = [...messagesWithExtras].reverse()
      
      return NextResponse.json({ 
        messages: reversedMessages,
        hasMore: hasMore 
      })
    }

    return NextResponse.json({ messages: [] })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        customer_id: session.userId,
        sender: 'customer',
        content: content.trim(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: data, success: 'Message sent successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}






