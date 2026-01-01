import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('user_session')

    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionToken.value, 'base64').toString()
      )

      const sessionAge = Date.now() - sessionData.timestamp
      const maxAge = 86400000 // 24 hours

      if (sessionAge > maxAge) {
        return NextResponse.json(
          { authenticated: false },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { authenticated: true, userId: sessionData.userId, email: sessionData.email },
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

