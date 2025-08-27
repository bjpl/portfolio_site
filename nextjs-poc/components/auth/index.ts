// Auth Components Barrel Export
export { default as Auth0ProviderWrapper } from '@/lib/auth/auth0-provider'
export { default as LoginButton } from './LoginButton'
export { default as LogoutButton } from './LogoutButton'
export { default as UserProfile } from './UserProfile'
export { default as ProtectedRoute } from './ProtectedRoute'
export { default as AuthNavigation } from './AuthNavigation'
export { default as AuthTest } from './AuthTest'

// Type exports
export type { UserProfile as UserProfileType } from '@auth0/nextjs-auth0/client'