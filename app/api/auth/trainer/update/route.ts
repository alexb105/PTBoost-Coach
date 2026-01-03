import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// PUT - Update trainer profile
export async function PUT(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Cannot update profile for legacy admin' },
        { status: 400 }
      )
    }

    const { fullName, businessName, phone, logoUrl, primaryColor } = await request.json()

    const supabase = createServerClient()
    
    const updateData: any = {}
    if (fullName !== undefined) updateData.full_name = fullName
    if (businessName !== undefined) updateData.business_name = businessName
    if (phone !== undefined) updateData.phone = phone
    if (logoUrl !== undefined) updateData.logo_url = logoUrl
    if (primaryColor !== undefined) updateData.primary_color = primaryColor

    const { data, error } = await supabase
      .from('trainers')
      .update(updateData)
      .eq('id', session.trainerId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      trainer: data,
      message: 'Profile updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating trainer profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}






