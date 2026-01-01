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
    const { full_name, phone, email } = await request.json()

    const supabase = createServerClient()
    
    const updateData: any = {}
    if (full_name !== undefined) updateData.full_name = full_name?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      customer: data,
      message: 'Customer details updated successfully' 
    })
  } catch (error: any) {
    console.error('Error updating customer details:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update customer details' },
      { status: 500 }
    )
  }
}



