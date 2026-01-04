import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkAdminSession } from '@/lib/admin-auth'

// GET - Fetch branding settings (trainer-specific)
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // For legacy admin (platform admin), return defaults or global settings
    // For trainers, return trainer-specific settings
    if (!session.trainerId) {
      // Legacy admin - return defaults
      return NextResponse.json({
        brand_name: 'coachapro',
        tagline: 'Elite Personal Training Platform',
        logo_url: null,
        admin_profile_picture_url: null,
        admin_name: null,
      })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('trainer_id', session.trainerId)
      .limit(1)
      .single()

    if (error) {
      // If no settings exist for this trainer, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          brand_name: 'coachapro',
          tagline: 'Elite Personal Training Platform',
          logo_url: null,
          admin_profile_picture_url: null,
          admin_name: null,
        })
      }
      throw error
    }

    return NextResponse.json(data || {
      brand_name: 'coachapro',
      tagline: 'Elite Personal Training Platform',
      logo_url: null,
      admin_profile_picture_url: null,
      admin_name: null,
    })
  } catch (error: any) {
    console.error('Error fetching branding settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch branding settings' },
      { status: 500 }
    )
  }
}

// PUT - Update branding settings (trainer-specific)
export async function PUT(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Legacy admin cannot update branding (they don't have a trainer_id)
    if (!session.trainerId) {
      return NextResponse.json(
        { error: 'Branding settings are only available for trainers' },
        { status: 403 }
      )
    }

    const { brand_name, tagline, logo_url, admin_profile_picture_url, admin_name, portal_slug } = await request.json()

    if (!brand_name) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Validate portal_slug uniqueness if provided
    if (portal_slug) {
      const { data: existingSlug } = await supabase
        .from('branding_settings')
        .select('trainer_id')
        .eq('portal_slug', portal_slug)
        .neq('trainer_id', session.trainerId)
        .limit(1)
        .maybeSingle()

      if (existingSlug) {
        return NextResponse.json(
          { error: 'This portal URL is already taken. Please choose a different one.' },
          { status: 400 }
        )
      }
    }

    // Check if settings exist for this trainer
    const { data: existing } = await supabase
      .from('branding_settings')
      .select('id')
      .eq('trainer_id', session.trainerId)
      .limit(1)
      .maybeSingle()

    let result
    if (existing) {
      // Update existing trainer-specific settings
      const { data, error } = await supabase
        .from('branding_settings')
        .update({
          brand_name,
          tagline: tagline || null,
          logo_url: logo_url || null,
          admin_profile_picture_url: admin_profile_picture_url || null,
          admin_name: admin_name || null,
          portal_slug: portal_slug || null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new trainer-specific settings
      const { data, error } = await supabase
        .from('branding_settings')
        .insert({
          trainer_id: session.trainerId,
          brand_name,
          tagline: tagline || null,
          logo_url: logo_url || null,
          admin_profile_picture_url: admin_profile_picture_url || null,
          admin_name: admin_name || null,
          portal_slug: portal_slug || null,
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

