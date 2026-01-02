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
    const { data, error } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error: any) {
    console.error('Error fetching meal templates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch meal templates' },
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
    const { name, time, calories, protein, carbs, fats, items } = await request.json()

    if (!name || !time) {
      return NextResponse.json(
        { error: 'Name and time are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('meal_templates')
      .insert({
        customer_id: id,
        name: name.trim(),
        time: time,
        calories: calories ? parseInt(calories) : 0,
        protein: protein ? parseInt(protein) : 0,
        carbs: carbs ? parseInt(carbs) : 0,
        fats: fats ? parseInt(fats) : 0,
        items: items && Array.isArray(items) ? items.filter((item: string) => item.trim()) : [],
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { template: data, message: 'Meal template saved successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating meal template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create meal template' },
      { status: 500 }
    )
  }
}







