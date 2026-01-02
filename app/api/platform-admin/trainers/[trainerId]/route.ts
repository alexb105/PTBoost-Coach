import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// PUT - Update trainer subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 401 }
      )
    }

    const { trainerId } = await params
    const { subscription_tier, subscription_status, max_clients } = await request.json()

    const supabase = createServerClient()
    
    const updateData: any = {}
    if (subscription_tier !== undefined) updateData.subscription_tier = subscription_tier
    if (subscription_status !== undefined) updateData.subscription_status = subscription_status
    if (max_clients !== undefined) updateData.max_clients = max_clients

    const { data, error } = await supabase
      .from('trainers')
      .update(updateData)
      .eq('id', trainerId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      trainer: data,
      message: 'Trainer updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating trainer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update trainer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete trainer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Platform admin access required' },
        { status: 401 }
      )
    }

    const { trainerId } = await params
    const supabase = createServerClient()
    
    // First, get the trainer to check if they have an auth_user_id
    const { data: trainer, error: fetchError } = await supabase
      .from('trainers')
      .select('auth_user_id')
      .eq('id', trainerId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      )
    }

    // Delete the trainer (cascading deletes will handle related data)
    const { error: deleteError } = await supabase
      .from('trainers')
      .delete()
      .eq('id', trainerId)

    if (deleteError) {
      throw deleteError
    }

    // If trainer had an auth user, delete it (this should cascade automatically via ON DELETE CASCADE,
    // but we'll handle it explicitly to be safe)
    if (trainer.auth_user_id) {
      // Note: Deleting auth.users requires admin privileges
      // The ON DELETE CASCADE on trainers.auth_user_id should handle this automatically
      // but we can also explicitly delete if needed using admin API
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        trainer.auth_user_id
      )
      
      if (authDeleteError) {
        // Log but don't fail - the trainer is already deleted
        console.warn('Failed to delete auth user:', authDeleteError)
      }
    }

    return NextResponse.json({
      message: 'Trainer deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting trainer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete trainer' },
      { status: 500 }
    )
  }
}

