'use client'

import { useAuth } from '@/hooks/use-auth'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
  returnTo?: string
}

/**
 * Logout Button Component
 * Handles Auth0 logout flow
 */
export function LogoutButton({ 
  className = "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors",
  children = "Log Out",
  returnTo
}: LogoutButtonProps) {
  const { logout, isLoading } = useAuth()

  const handleLogout = () => {
    logout(returnTo)
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  )
}

export default LogoutButton