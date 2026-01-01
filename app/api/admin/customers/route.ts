import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Check admin session helper
async function checkAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get('admin_session')
  
  if (!sessionToken) {
    return null
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionToken.value, 'base64').toString()
    )

    const sessionAge = Date.now() - sessionData.timestamp
    const maxAge = 86400000 // 24 hours

    if (sessionAge > maxAge) {
      return null
    }

    return sessionData
  } catch {
    return null
  }
}

// GET - Fetch all customers
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ customers: data || [] })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { email, full_name, phone } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Generate a secure one-time password (12 characters, mix of letters and numbers)
    const generateOneTimePassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
      let password = ''
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const oneTimePassword = generateOneTimePassword()

    const supabase = createServerClient()

    // Create user in Supabase Auth with the generated one-time password
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: oneTimePassword,
      email_confirm: true,
    })

    if (authError) {
      throw authError
    }

    // Create customer record with one_time_password_used flag
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert({
        id: authData.user.id,
        email,
        full_name: full_name || null,
        phone: phone || null,
        one_time_password_used: false,
      })
      .select()
      .single()

    if (customerError) {
      // If customer insert fails, try to delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw customerError
    }

    return NextResponse.json(
      { 
        customer: customerData, 
        oneTimePassword: oneTimePassword,
        message: 'Customer created successfully' 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    )
  }
}

