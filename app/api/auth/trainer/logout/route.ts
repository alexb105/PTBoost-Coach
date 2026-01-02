import { NextRequest, NextResponse } from 'next/server'
import { clearTrainerSessionCookie } from '@/lib/trainer-auth'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    )

    return clearTrainerSessionCookie(response)
  } catch (error) {
    console.error('Trainer logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



