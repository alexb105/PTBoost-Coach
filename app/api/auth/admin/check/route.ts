import { NextRequest, NextResponse } from 'next/server'
import { checkAdminSession } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminSession(request)

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { 
        authenticated: true, 
        email: session.email,
        role: session.role,
        isTrainer: !!session.trainerId,
        isPlatformAdmin: session.role === 'admin' && !session.trainerId
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}
