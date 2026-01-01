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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { messageId } = await params
    const supabase = createServerClient()
    
    // Verify the message exists and belongs to the user
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('customer_id')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (message.customer_id !== session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('message_likes')
      .select('id')
      .eq('message_id', messageId)
      .eq('customer_id', session.userId)
      .eq('liked_by', 'customer')
      .single()

    if (existingLike) {
      return NextResponse.json(
        { error: 'Message already liked' },
        { status: 400 }
      )
    }

    // Add like
    const { data, error } = await supabase
      .from('message_likes')
      .insert({
        message_id: messageId,
        customer_id: session.userId,
        liked_by: 'customer',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { like: data, message: 'Message liked' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error liking message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to like message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { messageId } = await params
    const supabase = createServerClient()
    
    // Remove like
    const { error } = await supabase
      .from('message_likes')
      .delete()
      .eq('message_id', messageId)
      .eq('customer_id', session.userId)
      .eq('liked_by', 'customer')

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Message unliked' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error unliking message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to unlike message' },
      { status: 500 }
    )
  }
}

