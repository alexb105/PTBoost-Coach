import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// GET - Get all notes for a customer
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

    const { id: customerId } = await params
    const supabase = createServerClient()
    
    // Verify customer belongs to this trainer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('trainer_id')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (customer.trainer_id !== session.trainerId) {
      return NextResponse.json(
        { error: 'Unauthorized - Customer does not belong to this trainer' },
        { status: 403 }
      )
    }

    // Get all notes for this customer
    const { data: notes, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_id', customerId)
      .eq('trainer_id', session.trainerId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      notes: notes || []
    })
  } catch (error: any) {
    console.error('Error fetching customer notes:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST - Create a new note entry
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

    const { id: customerId } = await params
    const { title, content } = await request.json()

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Verify customer belongs to this trainer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('trainer_id')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (customer.trainer_id !== session.trainerId) {
      return NextResponse.json(
        { error: 'Unauthorized - Customer does not belong to this trainer' },
        { status: 403 }
      )
    }

    // Create new note
    const { data, error } = await supabase
      .from('customer_notes')
      .insert({
        customer_id: customerId,
        trainer_id: session.trainerId,
        title: title.trim(),
        content: content || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      note: data,
      message: 'Note created successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: 500 }
    )
  }
}
