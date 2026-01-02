import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { createTrainerSessionToken, setTrainerSessionCookie } from '@/lib/trainer-auth'
import { seedDefaultExercises } from '@/lib/seed-default-exercises'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, businessName } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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

    // Create auth user (normalize email to lowercase)
    const normalizedEmail = email.toLowerCase().trim()
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          role: 'trainer',
          full_name: fullName,
        }
      }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Create trainer record using service role
    const supabase = createServerClient()
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .insert({
        auth_user_id: authData.user.id,
        email: email.toLowerCase(),
        full_name: fullName || null,
        business_name: businessName || null,
        subscription_tier: 'free',
        subscription_status: 'active',
        max_clients: 3,
      })
      .select()
      .single()

    if (trainerError) {
      console.error('Trainer creation error:', trainerError)
      // Try to clean up the auth user if trainer creation fails
      await supabaseAuth.auth.admin?.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create trainer profile' },
        { status: 500 }
      )
    }

    // Seed default exercises for the new trainer
    try {
      await seedDefaultExercises(supabase, trainer.id)
    } catch (seedError) {
      console.error('Error seeding default exercises:', seedError)
      // Don't fail registration if exercise seeding fails - trainer can add exercises manually
    }

    // Create session token
    const sessionToken = createTrainerSessionToken(trainer.id, email)

    // Create response with session cookie
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Account created successfully',
        trainer: {
          id: trainer.id,
          email: trainer.email,
          fullName: trainer.full_name,
          businessName: trainer.business_name,
          subscriptionTier: trainer.subscription_tier,
        }
      },
      { status: 201 }
    )

    return setTrainerSessionCookie(response, sessionToken)
  } catch (error) {
    console.error('Trainer registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

