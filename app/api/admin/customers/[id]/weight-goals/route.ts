import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

async function checkAdminSession(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('admin_session')
    if (!sessionCookie) {
      return null
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    )

    // Verify session is not expired (24 hours)
    const sessionAge = Date.now() - sessionData.timestamp
    if (sessionAge > 86400000) {
      return null
    }

    return sessionData
  } catch {
    return null
  }
}

// GET - Fetch weight goals for a customer
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
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('weight_goals')
      .select('*')
      .eq('customer_id', id)
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

// POST - Create a new weight goal
export async function POST(
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
    const body = await request.json()
    const { target_weight, goal_type, start_date, end_date, notes } = body

    if (!target_weight || !goal_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'target_weight, goal_type, start_date, and end_date are required' },
        { status: 400 }
      )
    }

    if (!['weekly', 'monthly'].includes(goal_type)) {
      return NextResponse.json(
        { error: 'goal_type must be either "weekly" or "monthly"' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Delete all existing weight goals for this customer to ensure only one goal exists at a time
    const { error: deleteError } = await supabase
      .from('weight_goals')
      .delete()
      .eq('customer_id', id)

    if (deleteError) {
      throw deleteError
    }
    
    // Create the new weight goal
    const { data, error } = await supabase
      .from('weight_goals')
      .insert({
        customer_id: id,
        target_weight: parseFloat(target_weight),
        goal_type,
        start_date,
        end_date,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      weightGoal: data,
      message: 'Weight goal created successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating weight goal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create weight goal' },
      { status: 500 }
    )
  }
}

// PUT - Update a weight goal
export async function PUT(
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
    const body = await request.json()
    const { goal_id, target_weight, goal_type, start_date, end_date, notes } = body

    if (!goal_id) {
      return NextResponse.json(
        { error: 'goal_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const updateData: any = {}
    if (target_weight !== undefined) updateData.target_weight = parseFloat(target_weight)
    if (goal_type !== undefined) updateData.goal_type = goal_type
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date
    if (notes !== undefined) updateData.notes = notes || null

    const { data, error } = await supabase
      .from('weight_goals')
      .update(updateData)
      .eq('id', goal_id)
      .eq('customer_id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      weightGoal: data,
      message: 'Weight goal updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating weight goal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update weight goal' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a weight goal
export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const goal_id = searchParams.get('goal_id')

    if (!goal_id) {
      return NextResponse.json(
        { error: 'goal_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const { error } = await supabase
      .from('weight_goals')
      .delete()
      .eq('id', goal_id)
      .eq('customer_id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Weight goal deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting weight goal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete weight goal' },
      { status: 500 }
    )
  }
}




