import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - Fetch branding settings by portal slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params
    // Decode the slug in case it was URL encoded
    const slug = decodeURIComponent(rawSlug)
    console.log(`Portal API: Received slug: ${rawSlug}, decoded: ${slug}`)
    const supabase = createServerClient()

    // Find branding settings by portal_slug
    const { data: brandingData, error: brandingError } = await supabase
      .from('branding_settings')
      .select('*, trainer_id')
      .eq('portal_slug', slug)
      .limit(1)
      .maybeSingle()

    if (brandingError) {
      // Log the error for debugging
      console.error('Error querying branding_settings:', brandingError)
      
      // If column doesn't exist, return helpful error
      if (brandingError.code === '42703' || brandingError.message?.includes('portal_slug')) {
        return NextResponse.json(
          { error: 'Portal slug feature not configured. Please run the database migration.' },
          { status: 500 }
        )
      }
      
      if (brandingError.code !== 'PGRST116') {
        throw brandingError
      }
    }

    if (!brandingData) {
      console.log(`No branding found for slug: ${slug}`)
      return NextResponse.json(
        { error: 'Portal not found. Please check that the slug is correct and has been set in branding settings.' },
        { status: 404 }
      )
    }

    // Get trainer's first name
    let trainerFirstName = null
    if (brandingData.trainer_id) {
      const { data: trainerData } = await supabase
        .from('trainers')
        .select('full_name')
        .eq('id', brandingData.trainer_id)
        .single()

      if (trainerData?.full_name) {
        trainerFirstName = trainerData.full_name.split(' ')[0] || null
      }
    }

    return NextResponse.json({
      brand_name: brandingData.brand_name,
      tagline: brandingData.tagline,
      logo_url: brandingData.logo_url,
      admin_profile_picture_url: brandingData.admin_profile_picture_url,
      trainer_id: brandingData.trainer_id,
      trainer_first_name: trainerFirstName,
    })
  } catch (error: any) {
    console.error('Error fetching portal branding:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch portal',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

