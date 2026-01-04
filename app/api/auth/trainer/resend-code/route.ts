import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email-verification'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Find trainer by email
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, email, full_name, email_verified')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (trainerError || !trainer) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { success: true, message: 'If an account exists, a verification code has been sent.' },
        { status: 200 }
      )
    }

    // Check if already verified
    if (trainer.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode()
    const codeExpiresAt = new Date()
    codeExpiresAt.setHours(codeExpiresAt.getHours() + 24) // Expires in 24 hours

    // Update trainer with new code
    const { error: updateError } = await supabase
      .from('trainers')
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: codeExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', trainer.id)

    if (updateError) {
      console.error('Error updating verification code:', updateError)
      return NextResponse.json(
        { error: 'Failed to generate new verification code' },
        { status: 500 }
      )
    }

    // Send verification email
    try {
      await sendVerificationEmail(trainer.email, verificationCode, trainer.full_name || undefined)
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Verification code has been sent to your email' 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





