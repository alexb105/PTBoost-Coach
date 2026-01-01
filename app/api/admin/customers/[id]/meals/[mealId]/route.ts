import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

async function checkAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get('admin_session')
  
  if (!sessionToken) {
    return null
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionToken.value, 'base64').toString()
    )

    const sessionAge = Date.now() - sessionData.timestamp
    const maxAge = 86400000

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
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, mealId } = await params
    const { name, date, time, calories, protein, carbs, fats, items } = await request.json()

    if (!name || !time) {
      return NextResponse.json(
        { error: 'Name and time are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('meals')
      .update({
        name: name.trim(),
        date: date || new Date().toISOString().split('T')[0],
        time: time,
        calories: calories ? parseInt(calories) : 0,
        protein: protein ? parseInt(protein) : 0,
        carbs: carbs ? parseInt(carbs) : 0,
        fats: fats ? parseInt(fats) : 0,
        items: items && Array.isArray(items) ? items.filter((item: string) => item.trim()) : [],
      })
      .eq('id', mealId)
      .eq('customer_id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { meal: data, message: 'Meal updated successfully' }
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
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, mealId } = await params

    const supabase = createServerClient()
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('customer_id', id)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Meal deleted successfully' }
    )
  } catch (error: any) {
    console.error('Error deleting meal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete meal' },
      { status: 500 }
    )
  }
}






