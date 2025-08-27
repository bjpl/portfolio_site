import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'

/**
 * GET /api/auth/user
 * Returns the current authenticated user's information
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Return user information
    return NextResponse.json({
      user: {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
        email_verified: session.user.email_verified,
        updated_at: session.user.updated_at,
        nickname: session.user.nickname
      },
      isAuthenticated: true
    })
  } catch (error) {
    console.error('Auth user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}