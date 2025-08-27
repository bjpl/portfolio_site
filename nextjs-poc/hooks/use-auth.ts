'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Custom hook for Auth0 authentication
 * Provides authentication state and utilities
 */
export function useAuth() {
  const { user, error, isLoading } = useUser()
  const router = useRouter()

  const login = useCallback((returnTo?: string) => {
    const loginUrl = returnTo 
      ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/login'
    
    router.push(loginUrl)
  }, [router])

  const logout = useCallback((returnTo?: string) => {
    const logoutUrl = returnTo
      ? `/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/logout'
    
    router.push(logoutUrl)
  }, [router])

  const requireAuth = useCallback((redirectTo = '/api/auth/login') => {
    if (!isLoading && !user) {
      router.push(redirectTo)
      return false
    }
    return !!user
  }, [user, isLoading, router])

  return {
    user,
    error,
    isLoading,
    isAuthenticated: !!user && !error,
    login,
    logout,
    requireAuth
  }
}

/**
 * Hook for getting user profile data
 */
export function useUserProfile() {
  const { user, isLoading } = useUser()

  return {
    profile: user ? {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      emailVerified: user.email_verified,
      nickname: user.nickname,
      updatedAt: user.updated_at
    } : null,
    isLoading
  }
}

/**
 * Hook for authentication status checks
 */
export function useAuthStatus() {
  const { user, error, isLoading } = useUser()

  return {
    isAuthenticated: !!user && !error,
    isLoading,
    hasError: !!error,
    error
  }
}