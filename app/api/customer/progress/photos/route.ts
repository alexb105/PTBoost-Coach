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

// POST - Upload a progress photo
export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const date = formData.get('date') as string
    const type = formData.get('type') as string || null
    const notes = formData.get('notes') as string || null

    if (!file || !date) {
      return NextResponse.json(
        { error: 'File and date are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Convert file to base64 for storage
    // In production, you'd want to use Supabase Storage or another service
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64String = `data:${file.type};base64,${buffer.toString('base64')}`

    const supabase = createServerClient()
    
    // Insert progress photo
    const { data, error } = await supabase
      .from('progress_photos')
      .insert({
        customer_id: session.userId,
        url: base64String,
        date: date,
        type: type || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(
      { progressPhoto: data, message: 'Progress photo uploaded successfully' },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error uploading progress photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload progress photo' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a progress photo
export async function DELETE(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('id')

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Delete progress photo
    const { error } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId)
      .eq('customer_id', session.userId) // Ensure user can only delete their own photos

    if (error) {
      throw error
    }

    return NextResponse.json(
      { message: 'Progress photo deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting progress photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete progress photo' },
      { status: 500 }
    )
  }
}

