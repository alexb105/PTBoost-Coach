import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// Helper to verify customer belongs to trainer
async function verifyCustomerAccess(supabase: any, customerId: string, trainerId: string | null) {
  if (!trainerId) return true // Legacy admin has access to all
  
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customerId)
    .eq('trainer_id', trainerId)
    .single()
  
  return !error && !!data
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
    const supabase = createServerClient()
    
    // Verify customer belongs to trainer
    const hasAccess = await verifyCustomerAccess(supabase, id, session.trainerId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('customer_id', id)
      .order('date', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ workouts: data || [] })
  } catch (error: any) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workouts' },
      { status: 500 }
    )
  }
}

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
    const { title, description, date, exercises, is_rest_day } = await request.json()

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Verify customer belongs to trainer
    const hasAccess = await verifyCustomerAccess(supabase, id, session.trainerId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        customer_id: id,
        trainer_id: session.trainerId, // Link workout to trainer
        title,
        description: description || null,
        date,
        exercises: exercises || [],
        is_rest_day: is_rest_day || false,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { workout: data, message: 'Workout created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating workout:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create workout' },
      { status: 500 }
    )
  }
}
