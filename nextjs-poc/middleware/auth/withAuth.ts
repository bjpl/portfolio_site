import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await getSession()
      
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Add user to request context
      // Note: In Next.js App Router, we can't modify the request object directly
      // Instead, we rely on getSession() in the handler
      return await handler(req)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}

/**
 * Check if user has specific permissions
 */
export async function checkPermissions(requiredPermissions: string[]) {
  try {
    const session = await getSession()
    
    if (!session?.user) {
      return { hasPermission: false, error: 'Not authenticated' }
    }

    // Get user permissions from Auth0 (this would typically come from user metadata or roles)
    // For now, return true - implement actual permission checking based on your Auth0 setup
    const userPermissions = session.user['permissions'] || []
    
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    )

    return { hasPermission: hasAllPermissions, error: null }
  } catch (error) {
    return { hasPermission: false, error: 'Permission check failed' }
  }
}

/**
 * Middleware for role-based access control
 */
export function withRole(requiredRole: string) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        const session = await getSession()
        
        if (!session?.user) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        // Check user role (this would come from Auth0 user metadata)
        const userRole = session.user['role'] || 'user'
        
        if (userRole !== requiredRole) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }

        return await handler(req)
      } catch (error) {
        console.error('Role middleware error:', error)
        return NextResponse.json(
          { error: 'Authorization failed' },
          { status: 403 }
        )
      }
    }
  }
}