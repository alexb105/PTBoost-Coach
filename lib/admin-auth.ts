import { NextRequest } from 'next/server'
import { createServerClient } from './supabase'

export interface AdminSession {
  // Legacy admin session fields
  email: string
  timestamp: number
  role: 'admin' | 'trainer'
  
  // Trainer-specific fields (null for legacy admin)
  trainerId: string | null
  trainerData: {
    id: string
    email: string
    fullName: string | null
    businessName: string | null
    subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise'
    subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'trial'
    maxClients: number
    maxExercises: number
  } | null
}

/**
 * Check for admin session (supports both legacy admin and new trainer sessions)
 * Returns session data or null if not authenticated
 */
export async function checkAdminSession(request: NextRequest): Promise<AdminSession | null> {
  // First, try trainer session
  const trainerSession = request.cookies.get('trainer_session')?.value
  
  if (trainerSession) {
    try {
      const sessionData = JSON.parse(Buffer.from(trainerSession, 'base64').toString())
      
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
      
      if (error) {
        console.error('Error fetching trainer in checkAdminSession:', error)
        return null
      }
      
      if (!trainer) {
        console.error('Trainer not found for ID:', sessionData.trainerId)
        return null
      }
      
      // Check if email is verified
      if (!trainer.email_verified) {
        console.warn('Trainer email not verified:', trainer.email)
        return null
      }
      
      // Check subscription status
      if (trainer.subscription_status === 'expired') {
        return null
      }
      
      return {
        email: trainer.email,
        timestamp: sessionData.timestamp,
        role: 'trainer',
        trainerId: trainer.id,
        trainerData: {
          id: trainer.id,
          email: trainer.email,
          fullName: trainer.full_name,
          businessName: trainer.business_name,
          subscriptionTier: trainer.subscription_tier,
          subscriptionStatus: trainer.subscription_status,
          maxClients: trainer.max_clients,
          maxExercises: trainer.max_exercises || 0,
        }
      }
    } catch (error) {
      console.error('Error parsing trainer session:', error)
    }
  }
  
  // Fall back to legacy admin session
  const adminSession = request.cookies.get('admin_session')?.value
  if (adminSession) {
    try {
      const sessionData = JSON.parse(Buffer.from(adminSession, 'base64').toString())
      
      // Check if session is expired (24 hours)
      if (Date.now() - sessionData.timestamp > 86400000) {
        return null
      }
      
      // Platform admin sessions (from admin_session cookie) should always be admin role
      // Don't convert to trainer even if email matches - platform admin needs full access
      return {
        email: sessionData.email,
        timestamp: sessionData.timestamp,
        role: 'admin',
        trainerId: null,
        trainerData: null,
      }
    } catch (error) {
      console.error('Error parsing admin session:', error)
    }
  }
  
  return null
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
 * Get the count of custom exercises for a trainer
 */
export async function getTrainerExerciseCount(trainerId: string): Promise<number> {
  const supabase = createServerClient()
  
  // Count only exercises where trainer_id matches the trainer
  // This excludes global exercises (trainer_id = NULL)
  // Using .not() with 'is' filter for null check
  const { count, error } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)

  if (error) {
    console.error('Error getting exercise count:', error)
    console.error('Trainer ID:', trainerId)
    return 0
  }

  // The .eq() filter already excludes NULL values
  return count || 0
}

/**
 * Check if trainer can add more clients based on their subscription
 */
export async function canAddClient(session: AdminSession): Promise<{ canAdd: boolean; reason?: string }> {
  if (!session.trainerId || !session.trainerData) {
    // Legacy admin can add unlimited clients
    return { canAdd: true }
  }
  
  const currentCount = await getTrainerClientCount(session.trainerId)
  
  if (currentCount >= session.trainerData.maxClients) {
    return {
      canAdd: false,
      reason: `You have reached your client limit (${session.trainerData.maxClients}). Upgrade your subscription to add more clients.`
    }
  }
  
  return { canAdd: true }
}

/**
 * Check if trainer can add more exercises based on their subscription
 */
export async function canAddExercise(session: AdminSession): Promise<{ canAdd: boolean; reason?: string }> {
  if (!session.trainerId || !session.trainerData) {
    // Legacy admin can add unlimited exercises
    return { canAdd: true }
  }
  
  const currentCount = await getTrainerExerciseCount(session.trainerId)
  const maxExercises = session.trainerData.maxExercises || 0
  
  if (maxExercises === 9999) {
    // Unlimited
    return { canAdd: true }
  }
  
  if (currentCount >= maxExercises) {
    return {
      canAdd: false,
      reason: `You have reached your exercise limit (${maxExercises}). Upgrade your subscription to add more exercises.`
    }
  }
  
  return { canAdd: true }
}

