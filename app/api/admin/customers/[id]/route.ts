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
    const supabase = createServerClient()
    
    // Build query with trainer_id filter for multi-tenant isolation
    let query = supabase
      .from('customers')
      .select('*')
      .eq('id', id)
    
    // Filter by trainer_id if available
    if (session.trainerId) {
      query = query.eq('trainer_id', session.trainerId)
    }
    
    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ customer: data })
  } catch (error: any) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

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
    const supabase = createServerClient()
    
    // First, verify the customer exists and belongs to the trainer
    let query = supabase
      .from('customers')
      .select('id, trainer_id')
      .eq('id', id)
    
    // Filter by trainer_id if available
    if (session.trainerId) {
      query = query.eq('trainer_id', session.trainerId)
    }
    
    const { data: customer, error: customerError } = await query.single()

    if (customerError) {
      if (customerError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }
      throw customerError
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Delete the customer (this will cascade delete related data if foreign keys are set up)
    // Note: We also need to delete the auth user if it exists
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting customer:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete customer' },
        { status: 500 }
      )
    }

    // Optionally delete the auth user (if you want to clean up auth.users as well)
    // This requires the customer.id to match auth.users.id
    try {
      await supabase.auth.admin.deleteUser(id)
    } catch (authError) {
      // Log but don't fail - the customer record is already deleted
      console.warn('Could not delete auth user (may not exist):', authError)
    }

    return NextResponse.json({ 
      message: 'Customer deleted successfully' 
    })
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
