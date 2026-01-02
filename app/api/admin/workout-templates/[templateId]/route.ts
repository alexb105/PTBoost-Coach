import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// PUT - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { templateId } = await params
    const { title, description, exercises } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('workout_templates')
      .update({
        title,
        description: description || null,
        exercises: exercises || [],
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { template: data, message: 'Template updated successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { templateId } = await params

    const supabase = createServerClient()
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Template deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}
