import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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

export async function PUT(request: NextRequest) {
  try {
    const session = await getUserSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { full_name, phone } = await request.json()

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('customers')
      .update({
        full_name: full_name?.trim() || null,
        phone: phone?.trim() || null,
      })
      .eq('id', session.userId)
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






