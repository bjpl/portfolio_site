import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'

/**
 * GET /api/protected/example
 * Example protected API route that requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Example protected data
    return NextResponse.json({
      message: 'This is a protected endpoint',
      user: {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name
      },
      timestamp: new Date().toISOString(),
      permissions: ['read:profile', 'write:profile'] // Example permissions
    })
  } catch (error) {
    console.error('Protected API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/protected/example
 * Example protected POST endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    if (!body.data) {
      return NextResponse.json(
        { error: 'Missing required data field' },
        { status: 400 }
      )
    }

    // Process authenticated request
    return NextResponse.json({
      message: 'Data processed successfully',
      userId: session.user.sub,
      processedAt: new Date().toISOString(),
      data: body.data
    })
  } catch (error) {
    console.error('Protected POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}