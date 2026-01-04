import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create a client with anon key for authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Authenticate user
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user needs to update password (first-time login)
    // Use service role client to check customer record
    const supabase = createServerClient()
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('one_time_password_used')
      .eq('id', authData.user.id)
      .single()

    if (customerError) {
      console.error('Error fetching customer data:', customerError)
      // Continue anyway - might be a new user without customer record
    }

    const needsPasswordUpdate = !customerData?.one_time_password_used

    // Session duration: 30 days if "Remember me" is checked, otherwise 24 hours
    const sessionDurationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const sessionDurationSec = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60

    // Create session with expiry timestamp
    const sessionToken = Buffer.from(
      JSON.stringify({ 
        userId: authData.user.id, 
        email: authData.user.email,
        timestamp: Date.now(),
        expiresAt: Date.now() + sessionDurationMs,
        rememberMe: !!rememberMe
      })
    ).toString('base64')

    const response = NextResponse.json(
      { 
        success: true, 
        needsPasswordUpdate,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        }
      },
      { status: 200 }
    )

    // Set session cookie with iOS-compatible settings
    // Using 'lax' for sameSite to work with iOS Safari ITP
    response.cookies.set('user_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionDurationSec,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

