'use client'

import { useAuth } from '@/hooks/use-auth'
import LoginButton from './LoginButton'
import LogoutButton from './LogoutButton'
import UserProfile from './UserProfile'

interface AuthNavigationProps {
  className?: string
  compact?: boolean
}

/**
 * Auth Navigation Component
 * Shows login/logout buttons and user profile based on auth state
 */
export function AuthNavigation({ 
  className = "flex items-center space-x-4",
  compact = false
}: AuthNavigationProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className={className}>
        <div className="animate-pulse">
          <div className="h-8 w-20 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className={className}>
        <UserProfile compact={compact} />
        <LogoutButton 
          className={compact 
            ? "bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-sm rounded transition-colors" 
            : "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
          }
        >
          {compact ? 'Out' : 'Log Out'}
        </LogoutButton>
      </div>
    )
  }

  return (
    <div className={className}>
      <LoginButton 
        className={compact
          ? "bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-sm rounded transition-colors"
          : "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        }
      >
        {compact ? 'In' : 'Log In'}
      </LoginButton>
    </div>
  )
}

export default AuthNavigation