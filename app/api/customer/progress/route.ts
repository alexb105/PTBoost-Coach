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

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    
    // Fetch weight entries and progress photos
    const [weightRes, photosRes] = await Promise.all([
      supabase
        .from('weight_entries')
        .select('*')
        .eq('customer_id', session.userId)
        .order('date', { ascending: false }),
      supabase
        .from('progress_photos')
        .select('*')
        .eq('customer_id', session.userId)
        .order('date', { ascending: false })
    ])

    if (weightRes.error) {
      throw weightRes.error
    }

    if (photosRes.error) {
      throw photosRes.error
    }

    return NextResponse.json({
      weightEntries: weightRes.data || [],
      progressPhotos: photosRes.data || []
    })
  } catch (error: any) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { weight, date, notes } = await request.json()

    if (!weight || !date) {
      return NextResponse.json(
        { error: 'Weight and date are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Use upsert to handle duplicate dates - update if exists, insert if new
    const { data, error } = await supabase
      .from('weight_entries')
      .upsert({
        customer_id: session.userId,
        weight: parseFloat(weight),
        date: date,
        notes: notes || null,
      }, {
        onConflict: 'customer_id,date'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { weightEntry: data, message: 'Weight entry added successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating weight entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create weight entry' },
      { status: 500 }
    )
  }
}

