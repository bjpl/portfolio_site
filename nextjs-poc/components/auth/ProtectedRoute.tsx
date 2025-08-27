'use client'

import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'
import LoginButton from './LoginButton'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Protected Route Component
 * Renders children only if user is authenticated
 */
export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = '/api/auth/login'
}: ProtectedRouteProps) {
  const { user, isLoading, requireAuth } = useAuth()

  useEffect(() => {
    // Only redirect if we're not loading and user is not authenticated
    if (!isLoading && !user) {
      requireAuth(redirectTo)
    }
  }, [user, isLoading, requireAuth, redirectTo])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600 mb-6">
              Please sign in to access this page.
            </p>
            <LoginButton className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition-colors">
              Sign In
            </LoginButton>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute