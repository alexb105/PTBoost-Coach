import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
  typescript: true,
})

// Price IDs for each subscription tier
// You'll need to create these products in your Stripe Dashboard
// and replace these with your actual price IDs
export const STRIPE_PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC || 'price_basic',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
}

// Reverse mapping from price ID to tier
export const getPlanFromPriceId = (priceId: string): 'basic' | 'pro' | 'enterprise' | null => {
  for (const [tier, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) {
      return tier as 'basic' | 'pro' | 'enterprise'
    }
  }
  return null
}

// Subscription tier details for Stripe metadata
export const TIER_DETAILS = {
  free: {
    name: 'Free',
    maxClients: 3,
    maxExercises: 0,
  },
  basic: {
    name: 'Basic',
    maxClients: 15,
    maxExercises: 20,
  },
  pro: {
    name: 'Pro',
    maxClients: 50,
    maxExercises: 50,
  },
  enterprise: {
    name: 'Enterprise',
    maxClients: 9999,
    maxExercises: 9999,
  },
} as const

