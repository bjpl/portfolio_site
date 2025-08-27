import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, getSession } from '@auth0/nextjs-auth0'

/**
 * GET /api/auth/me
 * Returns detailed user profile with tokens and permissions
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

    // Get access token for API calls
    const { accessToken } = await getAccessToken()

    return NextResponse.json({
      user: session.user,
      accessToken: accessToken ? 'present' : 'missing', // Don't expose actual token
      session: {
        createdAt: session.createdAt,
        idToken: session.idToken ? 'present' : 'missing'
      }
    })
  } catch (error) {
    console.error('Auth me API error:', error)
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    )
  }
}