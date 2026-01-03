import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase'
import { stripe, getPlanFromPriceId, TIER_DETAILS } from '@/lib/stripe'
import { sendAdminNotificationEmail } from '@/lib/emailjs'

// Disable body parsing, we need the raw body for signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper function to send admin notification emails using EmailJS
async function sendAdminNotification({
  subject,
  message,
  trainerEmail,
}: {
  subject: string
  message: string
  trainerEmail: string
}) {
  // Use ADMIN_NOTIFICATION_EMAIL if set, otherwise fall back to ADMIN_EMAIL
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL

  if (!adminEmail) {
    console.warn('ADMIN_NOTIFICATION_EMAIL or ADMIN_EMAIL not set, skipping email notification')
    return
  }

  await sendAdminNotificationEmail({
    to_email: adminEmail,
    subject,
    message,
    trainer_email: trainerEmail,
  })
}

// GET endpoint to verify webhook is accessible
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received at:', new Date().toISOString())
  
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('📝 Webhook details:', {
    hasBody: !!body,
    bodyLength: body?.length,
    hasSignature: !!signature,
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
  })

  if (!signature) {
    console.error('❌ No Stripe signature found')
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('✅ Webhook signature verified successfully')
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  try {
    console.log(`🎯 Processing Stripe webhook: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('📦 Checkout session completed:', {
          mode: session.mode,
          subscription: session.subscription,
          metadata: session.metadata,
          customer: session.customer,
        })
        
        if (session.mode === 'subscription' && session.subscription) {
          const trainerId = session.metadata?.trainer_id
          const tier = session.metadata?.tier as 'basic' | 'pro' | 'enterprise'

          console.log('🔍 Processing subscription checkout:', { trainerId, tier })

          if (trainerId && tier) {
            const tierDetails = TIER_DETAILS[tier]
            
            // Update trainer subscription
            const { data: updatedTrainer, error } = await supabase
              .from('trainers')
              .update({
                subscription_tier: tier,
                subscription_status: 'active',
                stripe_subscription_id: session.subscription as string,
                stripe_customer_id: session.customer as string,
                max_clients: tierDetails.maxClients,
                updated_at: new Date().toISOString(),
              })
              .eq('id', trainerId)
              .select()

            if (error) {
              console.error('❌ Error updating trainer subscription:', error)
            } else {
              console.log('✅ Trainer subscription updated successfully:', updatedTrainer)
              
              // Get trainer email for notification
              const { data: trainer } = await supabase
                .from('trainers')
                .select('email')
                .eq('id', trainerId)
                .single()

              if (trainer) {
                await sendAdminNotification({
                  subject: `🎉 New Subscription: ${tier.toUpperCase()} Plan`,
                  message: `A trainer has subscribed to the ${tier} plan.`,
                  trainerEmail: trainer.email,
                })
              }
            }
          } else {
            console.error('❌ Missing trainerId or tier in checkout metadata:', session.metadata)
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('📋 Subscription event:', {
          type: event.type,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: subscription.current_period_end,
        })
        
        // Find trainer by stripe_customer_id
        const { data: trainer, error: trainerError } = await supabase
          .from('trainers')
          .select('id, email, subscription_tier')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (trainerError || !trainer) {
          console.error('Trainer not found for customer:', subscription.customer)
          break
        }

        // Determine subscription tier from price_id
        const priceId = subscription.items.data[0]?.price.id
        const tier = getPlanFromPriceId(priceId)
        
        if (!tier) {
          console.error('Unknown price ID:', priceId)
          break
        }

        const tierDetails = TIER_DETAILS[tier]
        
        // Determine status - keep active if subscription is active, even if set to cancel at period end
        // This ensures the trainer keeps their paid tier until the period ends
        let status: 'active' | 'cancelled' | 'expired' | 'trial' = 'active'
        if (subscription.status === 'canceled') {
          // Only mark as cancelled when actually cancelled (not cancel_at_period_end)
          status = 'cancelled'
        } else if (subscription.status === 'trialing') {
          status = 'trial'
        } else if (['past_due', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
          status = 'expired'
        } else if (subscription.status === 'active' && subscription.cancel_at_period_end) {
          // Subscription is set to cancel at period end - keep active status
          // They paid for this period, so they keep access
          status = 'active'
          console.log('⏳ Subscription will cancel at period end, keeping active until:', 
            new Date(subscription.current_period_end * 1000).toISOString())
        }

        // Update trainer subscription - keep their current tier until period ends
        const { error: updateError } = await supabase
          .from('trainers')
          .update({
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            subscription_expires_at: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            max_clients: tierDetails.maxClients,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainer.id)

        if (updateError) {
          console.error('Error updating trainer subscription:', updateError)
        } else {
          // Notify admin of changes
          if (event.type === 'customer.subscription.updated') {
            if (subscription.cancel_at_period_end) {
              // Notify admin of scheduled cancellation
              await sendAdminNotification({
                subject: '⏳ Subscription Scheduled to Cancel',
                message: `A trainer has scheduled their ${tier} subscription to cancel at the end of the billing period (${new Date(subscription.current_period_end * 1000).toLocaleDateString()}).`,
                trainerEmail: trainer.email,
              })
            } else if (trainer.subscription_tier !== tier) {
              // Notify admin of plan change
              await sendAdminNotification({
                subject: `📊 Subscription Changed: ${trainer.subscription_tier} → ${tier}`,
                message: `A trainer has changed their plan from ${trainer.subscription_tier} to ${tier}.`,
                trainerEmail: trainer.email,
              })
            }
          }
        }

        break
      }

      case 'customer.subscription.deleted': {
        // This event fires when the subscription actually ends
        // (either immediately cancelled or at period end after cancel_at_period_end)
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('🚫 Subscription deleted:', {
          subscriptionId: subscription.id,
          customer: subscription.customer,
        })
        
        // Find trainer by stripe_customer_id
        const { data: trainer, error: trainerError } = await supabase
          .from('trainers')
          .select('id, email, subscription_tier')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (trainerError || !trainer) {
          console.error('Trainer not found for customer:', subscription.customer)
          break
        }

        const previousTier = trainer.subscription_tier
        
        // Now the subscription has actually ended - downgrade to free tier
        const { error: updateError } = await supabase
          .from('trainers')
          .update({
            subscription_tier: 'free',
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
            subscription_expires_at: null,
            max_clients: TIER_DETAILS.free.maxClients,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainer.id)

        if (updateError) {
          console.error('Error updating trainer subscription:', updateError)
        } else {
          console.log(`✅ Trainer ${trainer.email} downgraded from ${previousTier} to free`)
          
          // Notify admin
          await sendAdminNotification({
            subject: '❌ Subscription Ended',
            message: `A trainer's ${previousTier} subscription has ended. They have been downgraded to the free plan.`,
            trainerEmail: trainer.email,
          })
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.billing_reason === 'subscription_cycle') {
          // Find trainer by stripe_customer_id
          const { data: trainer } = await supabase
            .from('trainers')
            .select('id, email')
            .eq('stripe_customer_id', invoice.customer as string)
            .single()

          if (trainer) {
            console.log(`Payment succeeded for trainer: ${trainer.email}`)
            
            // Update subscription status to active
            await supabase
              .from('trainers')
              .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', trainer.id)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Find trainer by stripe_customer_id
        const { data: trainer } = await supabase
          .from('trainers')
          .select('id, email')
          .eq('stripe_customer_id', invoice.customer as string)
          .single()

        if (trainer) {
          // Notify admin of payment failure
          await sendAdminNotification({
            subject: '⚠️ Payment Failed',
            message: `Payment failed for a trainer's subscription. They may lose access if not resolved.`,
            trainerEmail: trainer.email,
          })
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

