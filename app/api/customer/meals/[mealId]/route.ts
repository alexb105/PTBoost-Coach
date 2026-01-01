import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Helper to get user session
async function getUserSession(request: NextRequest) {
  const sessionToken = request.cookies.get('user_session')
  
  if (!sessionToken) {
    return null
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionToken.value, 'base64').toString()
    )

    const sessionAge = Date.now() - sessionData.timestamp
    const maxAge = 86400000 // 24 hours

    if (sessionAge > maxAge) {
      return null
    }

    return sessionData
  } catch {
    return null
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { mealId } = await params
    const { name, date, time, calories, items, protein, carbs, fats } = await request.json()

    if (!name || !time || calories === undefined || calories === null) {
      return NextResponse.json(
        { error: 'Name, time, and calories are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // First verify the meal belongs to the user
    const { data: existingMeal, error: checkError } = await supabase
      .from('meals')
      .select('customer_id')
      .eq('id', mealId)
      .single()

    if (checkError || !existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }

    if (existingMeal.customer_id !== session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const mealDate = date || new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('meals')
      .update({
        name: name.trim(),
        date: mealDate,
        time: time,
        calories: parseInt(calories),
        protein: protein ? parseInt(protein) : 0,
        carbs: carbs ? parseInt(carbs) : 0,
        fats: fats ? parseInt(fats) : 0,
        items: items && Array.isArray(items) ? items.filter((item: string) => item.trim()) : [],
      })
      .eq('id', mealId)
      .eq('customer_id', session.userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { meal: data, message: 'Meal updated successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating meal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update meal' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { mealId } = await params

    const supabase = createServerClient()
    
    // First verify the meal belongs to the user
    const { data: existingMeal, error: checkError } = await supabase
      .from('meals')
      .select('customer_id')
      .eq('id', mealId)
      .single()

    if (checkError || !existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }

    if (existingMeal.customer_id !== session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('customer_id', session.userId)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Meal deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting meal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete meal' },
      { status: 500 }
    )
  }
}

