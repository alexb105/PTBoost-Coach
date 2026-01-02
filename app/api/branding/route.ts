import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - Fetch branding settings (public endpoint for client-side use)
// Supports trainer_id query parameter to fetch trainer-specific branding
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const trainerId = searchParams.get('trainer_id')

    // Default branding settings
    const defaults = {
      brand_name: 'APEX Training',
      tagline: 'Elite Personal Training Platform',
      logo_url: null,
      secondary_color: '#3b82f6',
      admin_profile_picture_url: null,
      admin_name: null,
    }

    // If trainer_id is provided, fetch trainer-specific branding
    if (trainerId) {
      // Fetch branding settings
      const { data: brandingData, error: brandingError } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('trainer_id', trainerId)
        .limit(1)
        .maybeSingle()

      if (brandingError && brandingError.code !== 'PGRST116') {
        // If error is not "no rows", throw it
        throw brandingError
      }

      // Fetch trainer's first name
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('full_name')
        .eq('id', trainerId)
        .single()

      // Get first name from full_name (take first word)
      let firstName = null
      if (trainerData?.full_name) {
        firstName = trainerData.full_name.split(' ')[0] || null
      }

      // If branding settings exist, merge with trainer first name
      if (brandingData) {
        return NextResponse.json({
          ...brandingData,
          trainer_first_name: firstName,
        })
      }

      // If no branding settings but trainer exists, return defaults with first name
      if (!trainerError) {
        return NextResponse.json({
          ...defaults,
          trainer_first_name: firstName,
        })
      }
    }

    // Return defaults if no trainer_id provided or no settings found
    return NextResponse.json(defaults)
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

