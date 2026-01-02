import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from './supabase'

export interface TrainerSession {
  trainerId: string
  authUserId: string
  email: string
  fullName: string | null
  businessName: string | null
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise'
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'trial'
  maxClients: number
}

/**
 * Check if the request has a valid trainer session
 * Returns the trainer session data or null if not authenticated
 */
export async function checkTrainerSession(request: NextRequest): Promise<TrainerSession | null> {
  try {
    const sessionCookie = request.cookies.get('trainer_session')?.value

    if (!sessionCookie) {
      return null
    }

    // Decode the session token
    const sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString())
    
    // Check if session is expired (24 hours)
    if (Date.now() - sessionData.timestamp > 86400000) {
      return null
    }

    // Verify trainer exists and get current data
    const supabase = createServerClient()
    const { data: trainer, error } = await supabase
      .from('trainers')
      .select('*')
      .eq('id', sessionData.trainerId)
      .single()

    if (error || !trainer) {
      return null
    }

    // Check subscription status
    if (trainer.subscription_status === 'expired') {
      return null
    }

    // Check if email is verified
    if (!trainer.email_verified) {
      return null
    }

    return {
      trainerId: trainer.id,
      authUserId: trainer.auth_user_id,
      email: trainer.email,
      fullName: trainer.full_name,
      businessName: trainer.business_name,
      subscriptionTier: trainer.subscription_tier,
      subscriptionStatus: trainer.subscription_status,
      maxClients: trainer.max_clients,
    }
  } catch (error) {
    console.error('Error checking trainer session:', error)
    return null
  }
}

/**
 * Create a session token for a trainer
 */
export function createTrainerSessionToken(trainerId: string, email: string): string {
  return Buffer.from(
    JSON.stringify({
      trainerId,
      email,
      timestamp: Date.now(),
      role: 'trainer'
    })
  ).toString('base64')
}

/**
 * Set the trainer session cookie on a response
 */
export function setTrainerSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('trainer_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400, // 24 hours
    path: '/',
  })
  return response
}

/**
 * Clear the trainer session cookie
 */
export function clearTrainerSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete('trainer_session')
  return response
}

/**
 * Get the count of clients for a trainer
 */
export async function getTrainerClientCount(trainerId: string): Promise<number> {
  const supabase = createServerClient()
  const { count, error } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)

  if (error) {
    console.error('Error getting client count:', error)
    return 0
  }

  return count || 0
}

/**
 * Check if trainer can add more clients based on their subscription
 */
export async function canTrainerAddClient(trainerId: string, maxClients: number): Promise<boolean> {
  const currentCount = await getTrainerClientCount(trainerId)
  return currentCount < maxClients
}

/**
 * Subscription tier features
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    maxClients: 3,
    maxExercises: 0,
    price: 0,
    features: [
      'Up to 3 clients',
      'No custom exercises',
    ],
  },
  basic: {
    name: 'Basic',
    maxClients: 15,
    maxExercises: 20,
    price: 20,
    features: [
      'Up to 15 clients',
      'Up to 20 custom exercises',
    ],
  },
  pro: {
    name: 'Pro',
    maxClients: 50,
    maxExercises: 50,
    price: 55,
    features: [
      'Up to 50 clients',
      'Up to 50 custom exercises',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    maxClients: 9999,
    maxExercises: 9999,
    price: 139,
    features: [
      'Unlimited clients',
      'Unlimited custom exercises',
    ],
  },
} as const

