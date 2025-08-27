# Auth0 Complete Setup Guide & Implementation Plan

## 🚀 Overview

This guide provides step-by-step instructions to set up Auth0 authentication from scratch for your Next.js application. It covers everything from account creation to production deployment.

## 📋 Table of Contents

1. [Auth0 Account Setup](#auth0-account-setup)
2. [Application Configuration](#application-configuration)
3. [Environment Variables](#environment-variables)
4. [Next.js Implementation](#nextjs-implementation)
5. [Protected Routes](#protected-routes)
6. [Testing & Validation](#testing--validation)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Auth0 Account Setup

### Step 1: Create Auth0 Account

1. **Visit Auth0**: Go to [https://auth0.com](https://auth0.com)
2. **Sign Up**: Click "Sign up" and create your account
3. **Choose Plan**: Select the Free plan (sufficient for development)
4. **Verify Email**: Complete email verification process

### Step 2: Create Your Tenant

1. **Tenant Domain**: Choose a unique tenant name (e.g., `your-company-dev`)
2. **Region**: Select the region closest to your users
3. **Environment**: Choose "Development" initially

---

## 🎯 Application Configuration

### Step 1: Create New Application

1. **Dashboard Access**: Login to Auth0 Dashboard
2. **Applications**: Navigate to Applications → Applications
3. **Create Application**: Click "+ Create Application"
4. **Application Name**: Enter your app name (e.g., "Portfolio Site")
5. **Application Type**: Select **"Single Page Web Applications"**

### Step 2: Application Settings

Configure the following in your application settings:

#### Basic Information
```
Name: Portfolio Site
Domain: your-tenant.auth0.com
Client ID: [Generated automatically]
Client Secret: [Generated automatically - keep secure]
```

#### Application URIs

**Allowed Callback URLs:**
```
http://localhost:3000/api/auth/callback
https://your-domain.netlify.app/api/auth/callback
https://your-domain.vercel.app/api/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
https://your-domain.netlify.app
https://your-domain.vercel.app
```

**Allowed Web Origins:**
```
http://localhost:3000
https://your-domain.netlify.app
https://your-domain.vercel.app
```

**Allowed Origins (CORS):**
```
http://localhost:3000
https://your-domain.netlify.app
https://your-domain.vercel.app
```

#### Advanced Settings

1. **Grant Types**: 
   - ✅ Authorization Code
   - ✅ Refresh Token
   - ✅ Implicit (for SPA)

2. **Token Endpoint Authentication Method**: 
   - Select "Client Secret (Post)"

3. **OIDC Conformant**: Enable (should be enabled by default)

---

## 🔐 Environment Variables

### Step 1: Generate Secret Key

Generate a secure secret for session encryption:

```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using online generator
# Visit: https://generate-secret.vercel.app/32
```

### Step 2: Create Environment File

Create `.env.local` in your Next.js project root:

```env
# Auth0 Configuration - REQUIRED
AUTH0_SECRET='your-generated-secret-from-step-1'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
AUTH0_CLIENT_ID='your-client-id-from-auth0-dashboard'
AUTH0_CLIENT_SECRET='your-client-secret-from-auth0-dashboard'

# Optional - Advanced Configuration
AUTH0_AUDIENCE='https://your-api-domain.com'
AUTH0_SCOPE='openid profile email'

# Optional - Custom redirect URLs
AUTH0_LOGIN_REDIRECT_URI='/admin'
AUTH0_LOGOUT_REDIRECT_URI='/'
```

### Step 3: Environment Variables Explanation

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AUTH0_SECRET` | ✅ | 32+ character secret for session encryption | Generated via openssl |
| `AUTH0_BASE_URL` | ✅ | Your application's base URL | `http://localhost:3000` |
| `AUTH0_ISSUER_BASE_URL` | ✅ | Your Auth0 tenant URL | `https://dev-abc123.auth0.com` |
| `AUTH0_CLIENT_ID` | ✅ | Application Client ID from Auth0 | From Auth0 dashboard |
| `AUTH0_CLIENT_SECRET` | ✅ | Application Client Secret from Auth0 | From Auth0 dashboard |
| `AUTH0_AUDIENCE` | ⚪ | API identifier if using Auth0 APIs | Custom API audience |
| `AUTH0_SCOPE` | ⚪ | OAuth scopes to request | `openid profile email` |

---

## ⚙️ Next.js Implementation

### Step 1: Install Dependencies

```bash
npm install @auth0/nextjs-auth0
# or
yarn add @auth0/nextjs-auth0
```

### Step 2: Configure Auth0 Route Handler

Create `pages/api/auth/[...auth0].ts` (Pages Router) or `app/api/auth/[...auth0]/route.ts` (App Router):

**For App Router (`app/api/auth/[...auth0]/route.ts`):**
```typescript
import { handleAuth, handleLogin, handleLogout, handleCallback } from '@auth0/nextjs-auth0'

export const GET = handleAuth({
  login: handleLogin({
    returnTo: '/admin'
  }),
  logout: handleLogout({
    returnTo: '/'
  }),
  callback: handleCallback()
})
```

**For Pages Router (`pages/api/auth/[...auth0].ts`):**
```typescript
import { handleAuth, handleLogin, handleLogout } from '@auth0/nextjs-auth0'

export default handleAuth({
  login: handleLogin({
    returnTo: '/admin'
  }),
  logout: handleLogout({
    returnTo: '/'
  })
})
```

### Step 3: Add Auth0 Provider

**App Router (`app/layout.tsx`):**
```tsx
import { UserProvider } from '@auth0/nextjs-auth0/client'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
```

**Pages Router (`pages/_app.tsx`):**
```tsx
import { UserProvider } from '@auth0/nextjs-auth0/client'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  )
}
```

### Step 4: Create Authentication Hook

Create `hooks/useAuth.ts`:
```typescript
'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

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
```

### Step 5: Create UI Components

**Login Button (`components/auth/LoginButton.tsx`):**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'

export default function LoginButton() {
  const { login, isLoading } = useAuth()

  return (
    <button
      onClick={() => login('/admin')}
      disabled={isLoading}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
    >
      {isLoading ? 'Loading...' : 'Log In'}
    </button>
  )
}
```

**Logout Button (`components/auth/LogoutButton.tsx`):**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'

export default function LogoutButton() {
  const { logout, isLoading } = useAuth()

  return (
    <button
      onClick={() => logout('/')}
      disabled={isLoading}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
    >
      {isLoading ? 'Loading...' : 'Log Out'}
    </button>
  )
}
```

**User Profile (`components/auth/UserProfile.tsx`):**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'

export default function UserProfile() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div>Loading user...</div>
  if (!user) return null

  return (
    <div className="flex items-center space-x-4">
      {user.picture && (
        <img 
          src={user.picture} 
          alt={user.name || 'User'} 
          className="w-8 h-8 rounded-full"
        />
      )}
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-gray-600">{user.email}</p>
      </div>
    </div>
  )
}
```

---

## 🛡️ Protected Routes

### Method 1: Component-Level Protection

**Protected Route Component (`components/auth/ProtectedRoute.tsx`):**
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { ReactNode, useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function ProtectedRoute({ 
  children, 
  fallback = <div>Please log in to access this page.</div> 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, requireAuth } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      requireAuth()
    }
  }, [isAuthenticated, isLoading, requireAuth])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return fallback
  }

  return <>{children}</>
}
```

**Usage:**
```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute'

function AdminPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Admin Dashboard</h1>
        <p>This content is only visible to authenticated users.</p>
      </div>
    </ProtectedRoute>
  )
}
```

### Method 2: Next.js Middleware Protection

**Create `middleware.ts` in your project root:**
```typescript
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge'

export default withMiddlewareAuthRequired()

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/api/protected/:path*'
  ]
}
```

### Method 3: API Route Protection

**Protected API Route (`app/api/protected/example/route.ts`):**
```typescript
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withApiAuthRequired(async function handler(request: NextRequest) {
  const session = await getSession()
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ 
    message: 'This is protected data',
    user: session.user 
  })
})
```

---

## 🧪 Testing & Validation

### Step 1: Environment Validation

Create `lib/auth/validate-config.ts`:
```typescript
export function validateAuth0Config() {
  const requiredVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL', 
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET'
  ]

  const missing = requiredVars.filter(variable => !process.env[variable])
  
  return {
    isValid: missing.length === 0,
    missing,
    errors: missing.map(variable => `Missing required environment variable: ${variable}`)
  }
}
```

### Step 2: Create Test Page

Create `app/test/auth/page.tsx`:
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import LoginButton from '@/components/auth/LoginButton'
import LogoutButton from '@/components/auth/LogoutButton'
import UserProfile from '@/components/auth/UserProfile'

export default function AuthTestPage() {
  const { user, isAuthenticated, isLoading, error } = useAuth()

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Auth0 Integration Test</h1>
      
      <div className="space-y-6">
        {/* Authentication Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>Error: {error ? error.message : 'None'}</p>
        </div>

        {/* User Information */}
        {isAuthenticated && user && (
          <div className="bg-green-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">User Information</h2>
            <UserProfile />
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Raw User Data</summary>
              <pre className="mt-2 text-sm bg-white p-2 rounded overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Authentication Controls */}
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Authentication Controls</h2>
          <div className="space-x-4">
            {isAuthenticated ? (
              <LogoutButton />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>

        {/* API Test */}
        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Protected API Test</h2>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/protected/example')
                const data = await response.json()
                alert(JSON.stringify(data, null, 2))
              } catch (error) {
                alert('API Error: ' + error.message)
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            Test Protected API
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 3: Manual Testing Checklist

1. **✅ Visit test page**: Navigate to `/test/auth`
2. **✅ Test login flow**: 
   - Click "Log In" button
   - Complete Auth0 authentication
   - Verify redirect to intended page
3. **✅ Test user data**: 
   - Check user information displays correctly
   - Verify profile picture loads
   - Confirm email and name are present
4. **✅ Test protected routes**: 
   - Try accessing `/admin` without auth (should redirect)
   - Login and access `/admin` (should work)
5. **✅ Test API protection**: 
   - Call protected API without auth (should return 401)
   - Call protected API with auth (should return data)
6. **✅ Test logout flow**: 
   - Click "Log Out" button
   - Verify redirect to home page
   - Confirm user is logged out

---

## 🚀 Production Deployment

### Step 1: Update Auth0 Application Settings

1. **Add Production URLs**: Update callback URLs with your production domain
2. **Environment**: Change tenant environment from "Development" to "Production"
3. **Domain Verification**: Add your production domain if using custom domain

### Step 2: Environment Variables (Production)

**Netlify:**
```bash
# Via Netlify CLI
netlify env:set AUTH0_SECRET "your-production-secret"
netlify env:set AUTH0_BASE_URL "https://your-domain.netlify.app"
netlify env:set AUTH0_ISSUER_BASE_URL "https://your-tenant.auth0.com"
netlify env:set AUTH0_CLIENT_ID "your-client-id"
netlify env:set AUTH0_CLIENT_SECRET "your-client-secret"
```

**Vercel:**
```bash
# Via Vercel CLI
vercel env add AUTH0_SECRET
vercel env add AUTH0_BASE_URL
vercel env add AUTH0_ISSUER_BASE_URL
vercel env add AUTH0_CLIENT_ID
vercel env:set AUTH0_CLIENT_SECRET
```

### Step 3: Security Checklist

- ✅ Use HTTPS in production
- ✅ Set secure environment variables
- ✅ Verify callback URLs match exactly
- ✅ Enable security headers
- ✅ Configure CORS properly
- ✅ Use strong AUTH0_SECRET (32+ characters)
- ✅ Enable login anomaly detection in Auth0
- ✅ Configure rate limiting

---

## 🔧 Troubleshooting

### Common Issues & Solutions

**1. "Invalid state parameter" Error**
```
Cause: AUTH0_SECRET misconfiguration or session corruption
Solution: 
- Regenerate AUTH0_SECRET
- Clear browser cookies
- Restart development server
```

**2. "Callback URL mismatch" Error**
```
Cause: URL in Auth0 dashboard doesn't match actual callback
Solution:
- Verify AUTH0_BASE_URL matches your domain
- Update Auth0 application callback URLs
- Check for http vs https mismatch
```

**3. "Access denied" Error**
```
Cause: User denied permission or app not properly configured
Solution:
- Check Auth0 application type (should be SPA)
- Verify grant types are enabled
- Check user permissions in Auth0
```

**4. Session not persisting**
```
Cause: Cookie configuration issues
Solution:
- Verify AUTH0_BASE_URL is correct
- Check cookie settings for your domain
- Ensure HTTPS in production
```

**5. Environment variables not loading**
```
Cause: .env.local not found or variables misnamed
Solution:
- Verify .env.local is in project root
- Check variable names match exactly
- Restart development server
```

### Debug Mode

Enable detailed logging:
```env
AUTH0_DEBUG=true
DEBUG=@auth0/nextjs-auth0*
```

---

## 📋 Integration Checklist

### Pre-Setup Checklist
- [ ] Auth0 account created
- [ ] Tenant configured
- [ ] Application created in Auth0
- [ ] Application type set to "Single Page Application"

### Configuration Checklist
- [ ] Callback URLs configured
- [ ] Logout URLs configured  
- [ ] Web Origins configured
- [ ] Grant types enabled (Authorization Code, Refresh Token)
- [ ] OIDC Conformant enabled

### Environment Checklist
- [ ] AUTH0_SECRET generated (32+ characters)
- [ ] AUTH0_BASE_URL set correctly
- [ ] AUTH0_ISSUER_BASE_URL set correctly
- [ ] AUTH0_CLIENT_ID copied from Auth0
- [ ] AUTH0_CLIENT_SECRET copied from Auth0
- [ ] .env.local file created and ignored in git

### Implementation Checklist
- [ ] @auth0/nextjs-auth0 installed
- [ ] API route handler created ([...auth0].ts)
- [ ] UserProvider added to app layout
- [ ] Authentication hook created (useAuth)
- [ ] Login/Logout buttons implemented
- [ ] User profile component created

### Protection Checklist
- [ ] Protected route component created
- [ ] Middleware configured (optional)
- [ ] API route protection implemented
- [ ] Role-based access control (if needed)

### Testing Checklist
- [ ] Login flow tested
- [ ] Logout flow tested
- [ ] Protected routes tested
- [ ] API protection tested
- [ ] User data retrieval tested
- [ ] Error handling tested

### Production Checklist
- [ ] Production URLs added to Auth0
- [ ] Environment variables set in hosting platform
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Performance monitoring enabled

---

## 🎯 Next Steps

After completing this setup:

1. **User Management**: Implement user roles and permissions
2. **Database Integration**: Sync Auth0 users with your database
3. **API Security**: Add JWT validation for APIs
4. **Monitoring**: Set up Auth0 logs and monitoring
5. **Social Login**: Configure social providers (Google, GitHub, etc.)
6. **Multi-factor Authentication**: Enable MFA for enhanced security

## 📚 Additional Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Next.js Auth0 SDK](https://github.com/auth0/nextjs-auth0)
- [Auth0 Management API](https://auth0.com/docs/api/management/v2)
- [Auth0 Best Practices](https://auth0.com/docs/best-practices)