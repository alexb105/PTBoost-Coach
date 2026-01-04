import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendMessageNotificationEmail } from '@/lib/emailjs'

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

    // Send email notification to trainer (must await for serverless)
    try {
      await sendTrainerNotification(supabase, session.userId, content.trim())
    } catch (err) {
      console.error('Failed to send trainer notification:', err)
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

// Helper function to send notification to trainer
async function sendTrainerNotification(supabase: ReturnType<typeof createServerClient>, customerId: string, messageContent: string) {
  console.log('📧 Starting trainer notification for customer:', customerId)
  
  try {
    // Get customer info including trainer_id
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('full_name, trainer_id')
      .eq('id', customerId)
      .single()

    if (customerError) {
      console.error('❌ Error fetching customer:', customerError)
      return
    }

    console.log('📧 Customer data:', { fullName: customer?.full_name, trainerId: customer?.trainer_id })

    if (!customer?.trainer_id) {
      console.log('⚠️ No trainer_id found for customer, skipping notification')
      return
    }

    // Get trainer info
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('email, full_name')
      .eq('id', customer.trainer_id)
      .single()

    if (trainerError) {
      console.error('❌ Error fetching trainer:', trainerError)
      return
    }

    console.log('📧 Trainer data:', { email: trainer?.email, fullName: trainer?.full_name })

    if (!trainer?.email) {
      console.log('⚠️ Trainer email not found, skipping notification')
      return
    }

    // Get branding settings for portal URL
    const { data: branding } = await supabase
      .from('branding_settings')
      .select('portal_slug')
      .eq('trainer_id', customer.trainer_id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coachapro.com'
    // Trainer chat URL goes to the trainer dashboard
    const chatUrl = `${appUrl}/trainer`

    await sendMessageNotificationEmail({
      to_email: trainer.email,
      to_name: trainer.full_name || 'Trainer',
      sender_name: customer.full_name || 'A client',
      sender_role: 'Your Client',
      message_preview: messageContent,
      chat_url: chatUrl,
    })
  } catch (error) {
    console.error('Error sending trainer notification:', error)
  }
}






