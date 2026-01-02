import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

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

    // Check if already liked by admin
    const { data: existingLike } = await supabase
      .from('message_likes')
      .select('id')
      .eq('message_id', messageId)
      .eq('customer_id', customerId)
      .eq('liked_by', 'admin')
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
        customer_id: customerId,
        liked_by: 'admin',
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
    
    // Remove like
    const { error } = await supabase
      .from('message_likes')
      .delete()
      .eq('message_id', messageId)
      .eq('customer_id', customerId)
      .eq('liked_by', 'admin')

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

