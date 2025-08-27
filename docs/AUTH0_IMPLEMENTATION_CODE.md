# Auth0 Implementation Code Examples

## 🚀 Complete Code Implementation

This document contains all the code you need to implement Auth0 authentication in your Next.js application.

---

## 📁 File Structure

```
your-project/
├── app/
│   ├── api/auth/[...auth0]/route.ts    # Auth0 route handler
│   ├── admin/page.tsx                  # Protected admin page
│   ├── layout.tsx                      # Root layout with Auth0 provider
│   └── test/auth/page.tsx             # Testing page
├── components/auth/
│   ├── LoginButton.tsx                 # Login button component
│   ├── LogoutButton.tsx                # Logout button component  
│   ├── UserProfile.tsx                 # User profile display
│   ├── ProtectedRoute.tsx              # Route protection wrapper
│   ├── AuthNavigation.tsx              # Navigation with auth state
│   └── index.ts                        # Export barrel
├── hooks/
│   └── useAuth.ts                      # Authentication hooks
├── lib/auth/
│   ├── config.ts                       # Auth0 configuration
│   ├── permissions.ts                  # Role-based permissions
│   └── validation.ts                   # Config validation
├── middleware.ts                       # Next.js middleware for route protection
└── .env.local                         # Environment variables
```

---

## 🔧 Environment Configuration

### `.env.local`
```env
# Auth0 Configuration - REQUIRED
AUTH0_SECRET='your-32-character-secret-key'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'

# Optional - Advanced Configuration
AUTH0_AUDIENCE='https://your-api-domain.com'
AUTH0_SCOPE='openid profile email'
AUTH0_LOGIN_REDIRECT_URI='/admin'
AUTH0_LOGOUT_REDIRECT_URI='/'
```

---

## 🎯 Core Implementation

### 1. Auth0 Route Handler

**`app/api/auth/[...auth0]/route.ts`**
```typescript
import { handleAuth, handleLogin, handleLogout, handleCallback } from '@auth0/nextjs-auth0'

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      prompt: 'login',
      scope: 'openid profile email'
    },
    returnTo: process.env.AUTH0_LOGIN_REDIRECT_URI || '/admin'
  }),
  
  logout: handleLogout({
    returnTo: process.env.AUTH0_LOGOUT_REDIRECT_URI || '/'
  }),
  
  callback: handleCallback({
    afterCallback: async (req, res, session) => {
      // Custom logic after successful authentication
      console.log('User authenticated:', session.user.email)
      
      // You can add custom user processing here
      // e.g., create user record in database, assign roles, etc.
      
      return session
    }
  })
})
```

### 2. Root Layout with Auth0 Provider

**`app/layout.tsx`**
```tsx
import { UserProvider } from '@auth0/nextjs-auth0/client'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portfolio Site with Auth0',
  description: 'Secure portfolio site with Auth0 authentication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <UserProvider>
          <main className="container mx-auto">
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  )
}
```

### 3. Authentication Hook

**`hooks/useAuth.ts`**
```typescript
'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'

export interface AuthUser {
  sub: string
  name?: string
  email?: string
  picture?: string
  email_verified?: boolean
  nickname?: string
  updated_at?: string
}

export function useAuth() {
  const { user, error, isLoading } = useUser()
  const router = useRouter()

  const login = useCallback((returnTo?: string) => {
    const loginUrl = returnTo 
      ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/login'
    
    window.location.href = loginUrl
  }, [])

  const logout = useCallback((returnTo?: string) => {
    const logoutUrl = returnTo
      ? `/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/logout'
    
    window.location.href = logoutUrl
  }, [])

  const requireAuth = useCallback((redirectTo?: string) => {
    if (!isLoading && !user) {
      const redirect = redirectTo || `/api/auth/login?returnTo=${window.location.pathname}`
      router.push(redirect)
      return false
    }
    return !!user
  }, [user, isLoading, router])

  return {
    user: user as AuthUser | undefined,
    error,
    isLoading,
    isAuthenticated: !!user && !error,
    login,
    logout,
    requireAuth
  }
}

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

export function useAuthStatus() {
  const { user, error, isLoading } = useUser()

  return {
    isAuthenticated: !!user && !error,
    isLoading,
    hasError: !!error,
    error
  }
}

export function useRequireAuth(redirectTo?: string) {
  const { requireAuth } = useAuth()
  
  useEffect(() => {
    requireAuth(redirectTo)
  }, [requireAuth, redirectTo])
}
```

---

## 🎨 UI Components

### 1. Login Button

**`components/auth/LoginButton.tsx`**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'

interface LoginButtonProps {
  returnTo?: string
  children?: React.ReactNode
  className?: string
}

export default function LoginButton({ 
  returnTo, 
  children = 'Log In',
  className = 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors'
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
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Logging in...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
```

### 2. Logout Button

**`components/auth/LogoutButton.tsx`**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'

interface LogoutButtonProps {
  returnTo?: string
  children?: React.ReactNode
  className?: string
}

export default function LogoutButton({ 
  returnTo = '/',
  children = 'Log Out',
  className = 'bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors'
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
      {isLoading ? 'Logging out...' : children}
    </button>
  )
}
```

### 3. User Profile

**`components/auth/UserProfile.tsx`**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import LogoutButton from './LogoutButton'

interface UserProfileProps {
  showLogout?: boolean
  className?: string
}

export default function UserProfile({ 
  showLogout = true,
  className = 'bg-white p-6 rounded-lg shadow-md'
}: UserProfileProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className={className}>
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-300 h-12 w-12"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={className}>
      <div className="flex items-start space-x-4">
        {user.picture && (
          <img 
            src={user.picture} 
            alt={user.name || 'User Avatar'} 
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {user.name || 'Anonymous User'}
            </h3>
            {user.email_verified && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Verified
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 truncate">{user.email}</p>
          
          {user.nickname && user.nickname !== user.name && (
            <p className="text-xs text-gray-500">@{user.nickname}</p>
          )}
          
          <div className="mt-4 space-y-2 text-xs text-gray-500">
            <p>User ID: <span className="font-mono">{user.sub}</span></p>
            {user.updated_at && (
              <p>Last Updated: {new Date(user.updated_at).toLocaleDateString()}</p>
            )}
          </div>
          
          {showLogout && (
            <div className="mt-4">
              <LogoutButton className="text-sm bg-gray-600 hover:bg-gray-700 px-4 py-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 4. Protected Route Component

**`components/auth/ProtectedRoute.tsx`**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { ReactNode, useEffect } from 'react'
import LoginButton from './LoginButton'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
  showFallback?: boolean
  redirectTo?: string
  requireAuth?: boolean
}

export default function ProtectedRoute({ 
  children, 
  fallback,
  showFallback = true,
  redirectTo,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, requireAuth: doRequireAuth } = useAuth()

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      doRequireAuth(redirectTo)
    }
  }, [isAuthenticated, isLoading, requireAuth, doRequireAuth, redirectTo])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated && requireAuth) {
    if (fallback) return <>{fallback}</>
    
    if (showFallback) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              Please log in to access this page.
            </p>
            <LoginButton returnTo={window.location.pathname} />
          </div>
        </div>
      )
    }
    
    return null
  }

  return <>{children}</>
}
```

### 5. Authentication Navigation

**`components/auth/AuthNavigation.tsx`**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import LoginButton from './LoginButton'
import LogoutButton from './LogoutButton'
import Link from 'next/link'

export default function AuthNavigation() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="animate-pulse bg-gray-300 h-8 w-20 rounded"></div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          {user.picture && (
            <img 
              src={user.picture} 
              alt={user.name || 'User'}
              className="w-8 h-8 rounded-full border-2 border-gray-200"
            />
          )}
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">
              {user.name || 'User'}
            </p>
            <p className="text-xs text-gray-600">{user.email}</p>
          </div>
        </div>
        
        <nav className="flex items-center space-x-4">
          <Link 
            href="/admin" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Admin
          </Link>
          <LogoutButton className="text-sm bg-gray-600 hover:bg-gray-700 px-3 py-1" />
        </nav>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <LoginButton />
    </div>
  )
}
```

### 6. Component Index

**`components/auth/index.ts`**
```typescript
export { default as LoginButton } from './LoginButton'
export { default as LogoutButton } from './LogoutButton'
export { default as UserProfile } from './UserProfile'
export { default as ProtectedRoute } from './ProtectedRoute'
export { default as AuthNavigation } from './AuthNavigation'
```

---

## 🛡️ Route Protection

### 1. Next.js Middleware

**`middleware.ts`**
```typescript
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge'

export default withMiddlewareAuthRequired({
  returnTo: '/unauthorized'
})

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/api/protected/:path*'
  ]
}
```

### 2. API Route Protection

**`app/api/protected/example/route.ts`**
```typescript
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withApiAuthRequired(async function handler(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No session found' }, 
        { status: 401 }
      )
    }

    // Your protected logic here
    const protectedData = {
      message: 'This is protected data',
      timestamp: new Date().toISOString(),
      user: {
        id: session.user.sub,
        email: session.user.email,
        name: session.user.name
      },
      serverInfo: {
        environment: process.env.NODE_ENV,
        version: '1.0.0'
      }
    }

    return NextResponse.json(protectedData)
    
  } catch (error) {
    console.error('Protected API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
})

export const POST = withApiAuthRequired(async function handler(request: NextRequest) {
  try {
    const session = await getSession()
    const body = await request.json()
    
    // Process POST request with authentication
    return NextResponse.json({
      message: 'Data received',
      user: session?.user.email,
      data: body
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 400 }
    )
  }
})
```

---

## 📄 Page Examples

### 1. Admin Dashboard

**`app/admin/page.tsx`**
```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import UserProfile from '@/components/auth/UserProfile'

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome to the protected admin area.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Dashboard Content</h2>
              <p className="text-gray-600 mb-4">
                This content is only visible to authenticated users.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900">Total Users</h3>
                  <p className="text-2xl font-bold text-blue-600">1,234</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900">Active Sessions</h3>
                  <p className="text-2xl font-bold text-green-600">89</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <UserProfile />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
```

### 2. Test Page

**`app/test/auth/page.tsx`**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { LoginButton, LogoutButton, UserProfile } from '@/components/auth'
import { useState } from 'react'

export default function AuthTestPage() {
  const { user, isAuthenticated, isLoading, error } = useAuth()
  const [apiResult, setApiResult] = useState<string>('')

  const testProtectedAPI = async () => {
    setApiResult('Loading...')
    try {
      const response = await fetch('/api/protected/example')
      const data = await response.json()
      setApiResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setApiResult(`Error: ${error.message}`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Auth0 Integration Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Loading:</span>
              <span className={isLoading ? 'text-yellow-600' : 'text-green-600'}>
                {isLoading ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Error:</span>
              <span className={error ? 'text-red-600' : 'text-green-600'}>
                {error ? error.message : 'None'}
              </span>
            </div>
          </div>
          
          <div className="mt-6 space-x-4">
            {isAuthenticated ? (
              <LogoutButton />
            ) : (
              <LoginButton returnTo="/test/auth" />
            )}
          </div>
        </div>

        {/* User Profile */}
        {isAuthenticated && user && (
          <UserProfile showLogout={false} />
        )}

        {/* API Testing */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Protected API Test</h2>
          <button
            onClick={testProtectedAPI}
            disabled={!isAuthenticated}
            className={`px-4 py-2 rounded-lg font-medium ${
              isAuthenticated 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Test Protected API
          </button>
          
          {apiResult && (
            <pre className="mt-4 p-4 bg-gray-100 rounded-lg overflow-auto text-sm">
              {apiResult}
            </pre>
          )}
        </div>

        {/* Raw User Data */}
        {user && (
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Raw User Data</h2>
            <pre className="p-4 bg-gray-100 rounded-lg overflow-auto text-sm">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 🔧 Utility Functions

### 1. Config Validation

**`lib/auth/validation.ts`**
```typescript
export interface ValidationResult {
  isValid: boolean
  missing: string[]
  errors: string[]
  warnings: string[]
}

export function validateAuth0Config(): ValidationResult {
  const requiredVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL', 
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET'
  ]

  const optionalVars = [
    'AUTH0_AUDIENCE',
    'AUTH0_SCOPE',
    'AUTH0_LOGIN_REDIRECT_URI',
    'AUTH0_LOGOUT_REDIRECT_URI'
  ]

  const missing = requiredVars.filter(variable => !process.env[variable])
  const errors: string[] = []
  const warnings: string[] = []

  // Check for missing required variables
  missing.forEach(variable => {
    errors.push(`Missing required environment variable: ${variable}`)
  })

  // Validate AUTH0_SECRET length
  const secret = process.env.AUTH0_SECRET
  if (secret && secret.length < 32) {
    warnings.push('AUTH0_SECRET should be at least 32 characters long for security')
  }

  // Validate URL format
  const baseUrl = process.env.AUTH0_BASE_URL
  if (baseUrl && !baseUrl.startsWith('http')) {
    errors.push('AUTH0_BASE_URL must start with http:// or https://')
  }

  const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL
  if (issuerUrl && !issuerUrl.startsWith('https://')) {
    errors.push('AUTH0_ISSUER_BASE_URL must start with https://')
  }

  // Check for optional variables
  optionalVars.forEach(variable => {
    if (!process.env[variable]) {
      warnings.push(`Optional environment variable not set: ${variable}`)
    }
  })

  return {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
    warnings
  }
}

export function logValidationResult(result: ValidationResult) {
  if (result.isValid) {
    console.log('✅ Auth0 configuration is valid')
  } else {
    console.error('❌ Auth0 configuration errors:')
    result.errors.forEach(error => console.error(`  - ${error}`))
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Auth0 configuration warnings:')
    result.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
}
```

### 2. Auth0 Configuration

**`lib/auth/config.ts`**
```typescript
import { ConfigParameters } from '@auth0/nextjs-auth0'

export const auth0Config: ConfigParameters = {
  domain: process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  audience: process.env.AUTH0_AUDIENCE,
  scope: process.env.AUTH0_SCOPE || 'openid profile email',
  session: {
    cookieSecret: process.env.AUTH0_SECRET || '',
    cookieName: 'appSession',
    cookieDomain: process.env.NODE_ENV === 'production' 
      ? process.env.AUTH0_BASE_URL?.replace(/https?:\/\//, '')
      : undefined,
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieSameSite: 'lax' as const,
    cookieLifetime: 60 * 60 * 24 * 7, // 7 days
    rolling: true
  },
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: process.env.AUTH0_LOGOUT_REDIRECT_URI || '/'
  }
}

export default auth0Config
```

---

This completes the comprehensive Auth0 implementation code. All files are ready to use and follow Next.js 14+ best practices with the App Router.