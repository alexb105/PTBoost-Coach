import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { seedDefaultExercises } from '@/lib/seed-default-exercises'
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email-verification'

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

    // Use service role to create auth user directly (bypasses Supabase email confirmation)
    const supabase = createServerClient()
    const normalizedEmail = email.toLowerCase().trim()
    
    // Check if email already exists
    const { data: existingTrainer } = await supabase
      .from('trainers')
      .select('id')
      .eq('email', normalizedEmail)
      .single()
    
    if (existingTrainer) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user using admin API (this won't trigger Supabase's email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Auto-confirm email in Supabase (we handle our own verification)
      user_metadata: {
        role: 'trainer',
        full_name: fullName,
      }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Generate verification code
    const verificationCode = generateVerificationCode()
    const codeExpiresAt = new Date()
    codeExpiresAt.setHours(codeExpiresAt.getHours() + 24) // Expires in 24 hours

    // Create trainer record using service role (supabase already created above)
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
        email_verified: false,
        verification_code: verificationCode,
        verification_code_expires_at: codeExpiresAt.toISOString(),
      })
      .select()
      .single()

    if (trainerError) {
      console.error('Trainer creation error:', trainerError)
      // Try to clean up the auth user if trainer creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create trainer profile' },
        { status: 500 }
      )
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationCode, fullName || undefined)
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      // Don't fail registration if email fails - user can request resend
    }

    // Log code for development/testing (remove in production)
    console.log('🔐 Verification Code for', email, ':', verificationCode)

    // Seed default exercises for the new trainer
    try {
      await seedDefaultExercises(supabase, trainer.id)
    } catch (seedError) {
      console.error('Error seeding default exercises:', seedError)
      // Don't fail registration if exercise seeding fails - trainer can add exercises manually
    }

    // Return response without creating session - user must verify email first
    // Include code in development mode for testing (remove in production)
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Account created successfully. Please check your email for verification code.',
        trainerId: trainer.id,
        email: trainer.email,
        requiresVerification: true,
        // Only include code in development
        ...(isDevelopment && { verificationCode: verificationCode }),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Trainer registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

