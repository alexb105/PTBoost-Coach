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
    
    // Fetch weight entries and progress photos for the customer
    const [weightRes, photosRes] = await Promise.all([
      supabase
        .from('weight_entries')
        .select('*')
        .eq('customer_id', id)
        .order('date', { ascending: false }),
      supabase
        .from('progress_photos')
        .select('*')
        .eq('customer_id', id)
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



