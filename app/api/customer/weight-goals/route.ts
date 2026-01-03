import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

async function getUserSession(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return null
    }

    return {
      userId: session.user.id,
      email: session.user.email
    }
  } catch {
    return null
  }
}

// GET - Fetch weight goals for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('weight_goals')
      .select('*')
      .eq('customer_id', session.userId)
      .order('start_date', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      weightGoals: data || []
    })
  } catch (error: any) {
    console.error('Error fetching weight goals:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch weight goals' },
      { status: 500 }
    )
  }
}










