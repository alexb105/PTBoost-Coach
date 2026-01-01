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
    const supabase = createServerClient()
    
    // Fetch weight entries, progress photos, and weight goals for the customer
    const [weightRes, photosRes, goalsRes] = await Promise.all([
      supabase
        .from('weight_entries')
        .select('*')
        .eq('customer_id', id)
        .order('date', { ascending: false }),
      supabase
        .from('progress_photos')
        .select('*')
        .eq('customer_id', id)
        .order('date', { ascending: false }),
      supabase
        .from('weight_goals')
        .select('*')
        .eq('customer_id', id)
        .order('start_date', { ascending: false })
    ])

    if (weightRes.error) {
      throw weightRes.error
    }

    if (photosRes.error) {
      throw photosRes.error
    }

    if (goalsRes.error) {
      throw goalsRes.error
    }

    return NextResponse.json({
      weightEntries: weightRes.data || [],
      progressPhotos: photosRes.data || [],
      weightGoals: goalsRes.data || []
    })
  } catch (error: any) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}

// POST - Create a new weight entry
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
    const body = await request.json()
    const { weight, date, notes } = body

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
        customer_id: id,
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

// PUT - Update a weight entry
export async function PUT(
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
    const body = await request.json()
    const { entry_id, weight, date, notes } = body

    if (!entry_id) {
      return NextResponse.json(
        { error: 'entry_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const updateData: any = {}
    if (weight !== undefined) updateData.weight = parseFloat(weight)
    if (date !== undefined) updateData.date = date
    if (notes !== undefined) updateData.notes = notes || null

    const { data, error } = await supabase
      .from('weight_entries')
      .update(updateData)
      .eq('id', entry_id)
      .eq('customer_id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      weightEntry: data,
      message: 'Weight entry updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating weight entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update weight entry' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a weight entry
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
    const { searchParams } = new URL(request.url)
    const entry_id = searchParams.get('entry_id')

    if (!entry_id) {
      return NextResponse.json(
        { error: 'entry_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const { error } = await supabase
      .from('weight_entries')
      .delete()
      .eq('id', entry_id)
      .eq('customer_id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Weight entry deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting weight entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete weight entry' },
      { status: 500 }
    )
  }
}



