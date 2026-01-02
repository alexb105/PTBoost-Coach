import { NextRequest, NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
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
      .select('id, subscription_tier, subscription_status, subscription_expires_at, stripe_customer_id, stripe_subscription_id')
      .eq('id', session.trainerId)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      )
    }

    // If there's a Stripe subscription, get the latest details
    let stripeSubscription = null
    if (trainer.stripe_subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(trainer.stripe_subscription_id)
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error)
      }
    }

    return NextResponse.json({
      subscription: {
        tier: trainer.subscription_tier,
        status: trainer.subscription_status,
        expiresAt: trainer.subscription_expires_at,
        hasStripeSubscription: !!trainer.stripe_subscription_id,
        currentPeriodEnd: stripeSubscription?.current_period_end 
          ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
      }
    })
  } catch (error: any) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}

