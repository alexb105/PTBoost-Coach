import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')

    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    // Verify session token (simple check - in production, verify JWT signature)
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionToken.value, 'base64').toString()
      )

      // Check if session is expired (24 hours)
      const sessionAge = Date.now() - sessionData.timestamp
      const maxAge = 86400000 // 24 hours in milliseconds

      if (sessionAge > maxAge) {
        return NextResponse.json(
          { authenticated: false },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { authenticated: true, email: sessionData.email },
        { status: 200 }
      )
    } catch (error) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}

