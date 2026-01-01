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
    const date = request.nextUrl.searchParams.get('date')
    const targetDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('customer_id', id)
      .eq('date', targetDate)
      .order('time', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ meals: data || [] })
  } catch (error: any) {
    console.error('Error fetching meals:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch meals' },
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
    const { name, date, time, calories, protein, carbs, fats, items } = await request.json()

    if (!name || !time) {
      return NextResponse.json(
        { error: 'Name and time are required' },
        { status: 400 }
      )
    }

    const mealDate = date || new Date().toISOString().split('T')[0]

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('meals')
      .insert({
        customer_id: id,
        name: name.trim(),
        date: mealDate,
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
      { meal: data, message: 'Meal added successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating meal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create meal' },
      { status: 500 }
    )
  }
}

