import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - Fetch branding settings (public endpoint for client-side use)
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
          admin_name: null,
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
      admin_name: null,
    })
  } catch (error: any) {
    console.error('Error fetching branding settings:', error)
    // Return defaults on error
    return NextResponse.json({
      brand_name: 'APEX Training',
      tagline: 'Elite Personal Training Platform',
      logo_url: null,
      secondary_color: '#3b82f6',
      admin_profile_picture_url: null,
      admin_name: null,
    })
  }
}

