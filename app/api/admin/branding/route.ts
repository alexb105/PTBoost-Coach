import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Check admin session helper
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
    const maxAge = 86400000 // 24 hours

    if (sessionAge > maxAge) {
      return null
    }

    return sessionData
  } catch {
    return null
  }
}

// GET - Fetch branding settings
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          brand_name: 'APEX Training',
          tagline: 'Elite Personal Training Platform',
          logo_url: null,
          secondary_color: '#3b82f6',
          admin_profile_picture_url: null,
        })
      }
      throw error
    }

    return NextResponse.json(data || {
      brand_name: 'APEX Training',
      tagline: 'Elite Personal Training Platform',
      logo_url: null,
      secondary_color: '#3b82f6',
      admin_profile_picture_url: null,
    })
  } catch (error: any) {
    console.error('Error fetching branding settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch branding settings' },
      { status: 500 }
    )
  }
}

// PUT - Update branding settings
export async function PUT(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { brand_name, tagline, logo_url, secondary_color, admin_profile_picture_url } = await request.json()

    if (!brand_name) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('branding_settings')
      .select('id')
      .limit(1)
      .single()

    let result
    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .from('branding_settings')
        .update({
          brand_name,
          tagline: tagline || null,
          logo_url: logo_url || null,
          secondary_color: secondary_color || '#3b82f6',
          admin_profile_picture_url: admin_profile_picture_url || null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('branding_settings')
        .insert({
          brand_name,
          tagline: tagline || null,
          logo_url: logo_url || null,
          secondary_color: secondary_color || '#3b82f6',
          admin_profile_picture_url: admin_profile_picture_url || null,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      ...result,
      message: 'Branding settings updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating branding settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update branding settings' },
      { status: 500 }
    )
  }
}

