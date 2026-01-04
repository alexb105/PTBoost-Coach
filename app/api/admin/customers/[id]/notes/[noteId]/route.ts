import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// PUT - Update a note entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: customerId, noteId } = await params
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

    // Verify note belongs to this customer and trainer
    const { data: existingNote, error: noteError } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('id', noteId)
      .eq('customer_id', customerId)
      .eq('trainer_id', session.trainerId)
      .single()

    if (noteError || !existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Update note
    const { data, error } = await supabase
      .from('customer_notes')
      .update({
        title: title.trim(),
        content: content || null,
      })
      .eq('id', noteId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      note: data,
      message: 'Note updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating customer note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update note' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a note entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: customerId, noteId } = await params
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

    // Verify note belongs to this customer and trainer
    const { data: existingNote, error: noteError } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('id', noteId)
      .eq('customer_id', customerId)
      .eq('trainer_id', session.trainerId)
      .single()

    if (noteError || !existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Delete note
    const { error } = await supabase
      .from('customer_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Note deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting customer note:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    )
  }
}





