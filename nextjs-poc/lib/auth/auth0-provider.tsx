'use client'

import { UserProvider } from '@auth0/nextjs-auth0/client'
import { ReactNode } from 'react'

interface Auth0ProviderWrapperProps {
  children: ReactNode
}

/**
 * Auth0 Provider Wrapper for Next.js Client Components
 * Provides Auth0 authentication context to the application
 */
export function Auth0ProviderWrapper({ children }: Auth0ProviderWrapperProps) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
}

export default Auth0ProviderWrapper