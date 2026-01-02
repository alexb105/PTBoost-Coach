import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

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
    
    // Check for any new messages from customer since lastSeen
    let query = supabase
      .from('messages')
      .select('id')
      .eq('customer_id', id)
      .eq('sender', 'customer')
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
