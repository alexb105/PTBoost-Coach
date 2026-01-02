import { NextRequest, NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase'
import { stripe, STRIPE_PRICE_IDS, TIER_DETAILS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session || !session.trainerId) {
      return NextResponse.json(
        { error: 'Unauthorized - Trainer account required' },
        { status: 401 }
      )
    }

    const { tier } = await request.json()

    // Validate tier
    if (!tier || !['basic', 'pro', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }

    const priceId = STRIPE_PRICE_IDS[tier]
    // Check if priceId is valid (must exist and start with 'price_' to be a real Stripe price ID)
    if (!priceId || !priceId.startsWith('price_')) {
      return NextResponse.json(
        { error: 'Stripe price not configured for this tier' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get trainer data
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, email, full_name, stripe_customer_id')
      .eq('id', session.trainerId)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    let customerId = trainer.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: trainer.email,
        name: trainer.full_name || undefined,
        metadata: {
          trainer_id: trainer.id,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('trainers')
        .update({ stripe_customer_id: customerId })
        .eq('id', trainer.id)
    }

    // Get the app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/trainer/settings?subscription=success`,
      cancel_url: `${appUrl}/trainer/plans?subscription=cancelled`,
      metadata: {
        trainer_id: trainer.id,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          trainer_id: trainer.id,
          tier: tier,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

