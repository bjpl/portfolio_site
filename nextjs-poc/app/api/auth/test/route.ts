import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'

/**
 * GET /api/auth/test
 * Test endpoint to verify Auth0 integration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    return NextResponse.json({
      message: 'Auth0 integration test endpoint',
      isAuthenticated: !!session?.user,
      user: session?.user ? {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture
      } : null,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAuth0Config: {
          secret: !!process.env.AUTH0_SECRET,
          baseUrl: !!process.env.AUTH0_BASE_URL,
          issuerBaseUrl: !!process.env.AUTH0_ISSUER_BASE_URL,
          clientId: !!process.env.AUTH0_CLIENT_ID,
          clientSecret: !!process.env.AUTH0_CLIENT_SECRET
        }
      }
    })
  } catch (error) {
    console.error('Auth test endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Test endpoint failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}