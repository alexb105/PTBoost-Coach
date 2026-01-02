import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// GET - Fetch all templates for the trainer
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    // Build query with trainer_id filter
    let query = supabase
      .from('workout_templates')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Filter by trainer_id for multi-tenant isolation
    if (session.trainerId) {
      query = query.eq('trainer_id', session.trainerId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      .insert({
        title,
        description: description || null,
        exercises: exercises || [],
        trainer_id: session.trainerId, // Link template to trainer
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { template: data, message: 'Template created successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    )
  }
}
