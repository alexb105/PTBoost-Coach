import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: customerId, messageId } = await params
    const supabase = createServerClient()
    
    // Verify the message exists and belongs to the customer
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('customer_id')
      .eq('id', messageId)
      .eq('customer_id', customerId)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Get all replies for this message
    const { data, error } = await supabase
      .from('message_replies')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ replies: data || [] })
  } catch (error: any) {
    console.error('Error fetching replies:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch replies' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: customerId, messageId } = await params
    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Reply content is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Verify the message exists and belongs to the customer
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('customer_id')
      .eq('id', messageId)
      .eq('customer_id', customerId)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Create reply
    const { data, error } = await supabase
      .from('message_replies')
      .insert({
        message_id: messageId,
        customer_id: customerId,
        sender: 'admin',
        content: content.trim(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { reply: data, message: 'Reply sent' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating reply:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status: 500 }
    )
  }
}

