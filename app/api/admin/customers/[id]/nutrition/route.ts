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
      .from('nutrition_targets')
      .select('*')
      .eq('customer_id', id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error
    }

    return NextResponse.json({ target: data || null })
  } catch (error: any) {
    console.error('Error fetching nutrition target:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch nutrition target' },
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
    const { calories, protein, carbs, fats, suggestions } = await request.json()

    if (!calories || !protein || !carbs || !fats) {
      return NextResponse.json(
        { error: 'All nutrition values are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Check if target exists
    const { data: existing } = await supabase
      .from('nutrition_targets')
      .select('id')
      .eq('customer_id', id)
      .single()

    let data, error

    if (existing) {
      // Update existing
      const result = await supabase
        .from('nutrition_targets')
        .update({
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fats: parseInt(fats),
          suggestions: suggestions || null,
        })
        .eq('customer_id', id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Create new
      const result = await supabase
        .from('nutrition_targets')
        .insert({
          customer_id: id,
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fats: parseInt(fats),
          suggestions: suggestions || null,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      throw error
    }

    return NextResponse.json(
      { target: data, message: 'Nutrition target saved successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error saving nutrition target:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save nutrition target' },
      { status: 500 }
    )
  }
}

