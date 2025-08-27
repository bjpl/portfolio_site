# Auth0 Integration Guide

## Overview

This guide covers the complete Auth0 authentication integration for the Next.js application, including setup, configuration, and usage.

## Architecture

The Auth0 integration consists of:

- **Auth0 Provider**: Wraps the app with authentication context
- **API Routes**: Handle login, logout, callback, and user data
- **Protected Routes**: Middleware for route protection
- **React Hooks**: Custom hooks for authentication state
- **UI Components**: Pre-built authentication components

## File Structure

```
nextjs-poc/
├── app/api/auth/
│   ├── [...auth0].ts           # Auth0 route handlers
│   ├── user/route.ts           # User profile endpoint
│   ├── me/route.ts             # Detailed user data
│   └── test/route.ts           # Test endpoint
├── app/api/protected/
│   └── example/route.ts        # Protected API example
├── components/auth/
│   ├── LoginButton.tsx         # Login button component
│   ├── LogoutButton.tsx        # Logout button component
│   ├── UserProfile.tsx         # User profile display
│   ├── ProtectedRoute.tsx      # Route protection wrapper
│   ├── AuthNavigation.tsx      # Navigation with auth state
│   └── AuthTest.tsx            # Testing component
├── hooks/
│   └── use-auth.ts             # Authentication hooks
├── lib/auth/
│   ├── auth0-provider.tsx      # Auth0 provider wrapper
│   └── auth0-config.ts         # Configuration and validation
└── middleware/auth/
    └── withAuth.ts             # Authentication middleware
```

## Environment Variables

### Required Variables

Create a `.env.local` file with the following variables:

```env
# Auth0 Configuration
AUTH0_SECRET=your-long-secret-at-least-32-characters
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

### Environment Setup Steps

1. **Generate AUTH0_SECRET**:
   ```bash
   openssl rand -hex 32
   ```

2. **Set AUTH0_BASE_URL**:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.netlify.app`

3. **Get Auth0 credentials** from your Auth0 dashboard

## Auth0 Application Configuration

### Application Settings

In your Auth0 application, configure:

1. **Application Type**: Single Page Application
2. **Allowed Callback URLs**:
   ```
   http://localhost:3000/api/auth/callback,
   https://your-domain.netlify.app/api/auth/callback
   ```
3. **Allowed Logout URLs**:
   ```
   http://localhost:3000,
   https://your-domain.netlify.app
   ```
4. **Allowed Web Origins**:
   ```
   http://localhost:3000,
   https://your-domain.netlify.app
   ```

### Advanced Settings

- **Grant Types**: Authorization Code, Refresh Token
- **Token Endpoint Authentication Method**: Client Secret (Post)

## Usage Examples

### Basic Authentication

```tsx
import { useAuth } from '@/hooks/use-auth'
import LoginButton from '@/components/auth/LoginButton'
import LogoutButton from '@/components/auth/LogoutButton'

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user.name}!</p>
          <LogoutButton />
        </div>
      ) : (
        <LoginButton />
      )}
    </div>
  )
}
```

### Protected Routes

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute'

function AdminPage() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  )
}
```

### Protected API Routes

```tsx
import { getSession } from '@auth0/nextjs-auth0'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await getSession()
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: 'Protected data', user: session.user })
}
```

### Navigation with Auth

```tsx
import AuthNavigation from '@/components/auth/AuthNavigation'

function Header() {
  return (
    <header>
      <nav>
        <AuthNavigation />
      </nav>
    </header>
  )
}
```

## API Endpoints

### Authentication Endpoints

- `GET /api/auth/login` - Initiate login
- `GET /api/auth/logout` - Initiate logout  
- `GET /api/auth/callback` - Auth0 callback
- `GET /api/auth/user` - Get current user
- `GET /api/auth/me` - Get detailed user profile
- `GET /api/auth/test` - Test authentication

### Protected Endpoints

- `GET /api/protected/example` - Example protected endpoint

## Hooks

### useAuth()

Primary authentication hook:

```tsx
const {
  user,              // User object or null
  error,             // Auth error or null
  isLoading,         // Loading state
  isAuthenticated,   // Boolean auth status
  login,             // Login function
  logout,            // Logout function
  requireAuth        // Redirect to login if not authenticated
} = useAuth()
```

### useUserProfile()

User profile hook:

```tsx
const {
  profile,    // Formatted user profile
  isLoading   // Loading state
} = useUserProfile()
```

### useAuthStatus()

Authentication status hook:

```tsx
const {
  isAuthenticated,   // Boolean auth status
  isLoading,         // Loading state
  hasError,          // Boolean error status
  error              // Error object
} = useAuthStatus()
```

## Testing

### Manual Testing

1. **Visit test page**: `/test/auth` (create this page with AuthTest component)
2. **Test login flow**: Click login button, complete Auth0 flow
3. **Test protected routes**: Visit protected pages
4. **Test logout flow**: Click logout button

### API Testing

```bash
# Test public endpoint
curl http://localhost:3000/api/auth/test

# Test protected endpoint (requires authentication)
curl http://localhost:3000/api/protected/example
```

## Deployment

### Netlify Deployment

1. **Environment Variables**: Add all Auth0 environment variables to Netlify
2. **Build Settings**: No special build configuration needed
3. **Redirects**: Auth0 handles redirects automatically

### Production Considerations

1. **Update callback URLs** in Auth0 dashboard
2. **Set production environment variables**
3. **Ensure HTTPS** for Auth0 callbacks
4. **Configure CORS** if needed for API calls

## Security Best Practices

1. **Secret Management**: Never commit secrets to version control
2. **HTTPS Only**: Use HTTPS in production
3. **Token Validation**: Auth0 SDK handles token validation
4. **Session Security**: Secure cookies are configured automatically
5. **CSRF Protection**: Built into Auth0 flow

## Troubleshooting

### Common Issues

1. **"Invalid state parameter"**: Check AUTH0_SECRET configuration
2. **"Callback URL mismatch"**: Verify Auth0 application settings
3. **"Authentication failed"**: Check environment variables
4. **Session not persisting**: Verify cookie settings

### Debug Mode

Enable Auth0 debug logging:

```env
AUTH0_DEBUG=true
```

### Validation

Use the configuration validator:

```tsx
import { validateAuth0Config } from '@/lib/auth/auth0-config'

const { isValid, errors } = validateAuth0Config()
console.log('Config valid:', isValid, errors)
```

## Migration from Existing Auth

If migrating from another auth system:

1. **User Migration**: Use Auth0's user import/migration features
2. **Session Handling**: Auth0 manages sessions automatically
3. **Role Mapping**: Configure roles in Auth0 dashboard
4. **API Integration**: Update API endpoints to use Auth0 tokens

## Support

- **Auth0 Documentation**: https://auth0.com/docs
- **Next.js Auth0 SDK**: https://github.com/auth0/nextjs-auth0
- **Community**: Auth0 Community forums