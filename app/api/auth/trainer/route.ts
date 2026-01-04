import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { createTrainerSessionToken, setTrainerSessionCookie } from '@/lib/trainer-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create Supabase auth client
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Authenticate user
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (authError) {
      console.error('Trainer login auth error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!authData.user) {
      console.error('Trainer login: No user returned from auth')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get trainer record using service role
    const supabase = createServerClient()
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (trainerError) {
      console.error('Trainer lookup error:', trainerError)
      console.error('Auth user ID:', authData.user.id)
      console.error('Email:', email)
      
      // Try to find trainer by email as fallback
      const { data: trainerByEmail } = await supabase
        .from('trainers')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single()
      
      if (trainerByEmail) {
        console.error('Trainer found by email but auth_user_id mismatch:', {
          trainerId: trainerByEmail.id,
          trainerAuthUserId: trainerByEmail.auth_user_id,
          actualAuthUserId: authData.user.id
        })
      }
      
      return NextResponse.json(
        { error: 'No trainer account found. Please register as a trainer.' },
        { status: 401 }
      )
    }

    if (!trainer) {
      console.error('Trainer not found for auth_user_id:', authData.user.id)
      return NextResponse.json(
        { error: 'No trainer account found. Please register as a trainer.' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!trainer.email_verified) {
      return NextResponse.json(
        { 
          error: 'Please verify your email address before logging in.',
          requiresVerification: true,
          email: trainer.email,
        },
        { status: 403 }
      )
    }

    // Check subscription status
    if (trainer.subscription_status === 'expired') {
      return NextResponse.json(
        { error: 'Your subscription has expired. Please renew to continue.' },
        { status: 403 }
      )
    }

    // Create session token with rememberMe flag
    const sessionToken = createTrainerSessionToken(trainer.id, email, !!rememberMe)

    // Create response with session cookie
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Login successful',
        trainer: {
          id: trainer.id,
          email: trainer.email,
          fullName: trainer.full_name,
          businessName: trainer.business_name,
          subscriptionTier: trainer.subscription_tier,
          subscriptionStatus: trainer.subscription_status,
          maxClients: trainer.max_clients,
          maxExercises: trainer.max_exercises || 0,
        }
      },
      { status: 200 }
    )

    return setTrainerSessionCookie(response, sessionToken, !!rememberMe)
  } catch (error) {
    console.error('Trainer login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

