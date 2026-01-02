import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createTrainerSessionToken, setTrainerSessionCookie } from '@/lib/trainer-auth'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Find trainer by email and verification code
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, email, verification_code, verification_code_expires_at, email_verified')
      .eq('email', email.toLowerCase().trim())
      .eq('verification_code', code)
      .single()

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Check if code has expired
    if (trainer.verification_code_expires_at) {
      const expiresAt = new Date(trainer.verification_code_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please request a new one.' },
          { status: 400 }
        )
      }
    }

    // Check if already verified
    if (trainer.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Mark email as verified and clear verification code
    const { error: updateError } = await supabase
      .from('trainers')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trainer.id)

    if (updateError) {
      console.error('Error updating trainer verification:', updateError)
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      )
    }

    // Create session token
    const sessionToken = createTrainerSessionToken(trainer.id, trainer.email)

    // Create response with session cookie
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Email verified successfully',
        trainer: {
          id: trainer.id,
          email: trainer.email,
        }
      },
      { status: 200 }
    )

    return setTrainerSessionCookie(response, sessionToken)
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

