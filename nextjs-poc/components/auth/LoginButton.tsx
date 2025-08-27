'use client'

import { useAuth } from '@/hooks/use-auth'

interface LoginButtonProps {
  className?: string
  children?: React.ReactNode
  returnTo?: string
}

/**
 * Login Button Component
 * Handles Auth0 login flow
 */
export function LoginButton({ 
  className = "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors",
  children = "Log In",
  returnTo
}: LoginButtonProps) {
  const { login, isLoading } = useAuth()

  const handleLogin = () => {
    login(returnTo)
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  )
}

export default LoginButton