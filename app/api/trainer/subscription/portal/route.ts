import { NextRequest, NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session || !session.trainerId) {
      return NextResponse.json(
        { error: 'Unauthorized - Trainer account required' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Get trainer data
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, stripe_customer_id')
      .eq('id', session.trainerId)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      )
    }

    if (!trainer.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe to a plan first.' },
        { status: 400 }
      )
    }

    // Get the app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

    // Create a billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: trainer.stripe_customer_id,
      return_url: `${appUrl}/trainer/settings`,
    })

    return NextResponse.json({
      url: portalSession.url,
    })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}

