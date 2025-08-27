import { ConfigParameters } from '@auth0/nextjs-auth0'

/**
 * Auth0 Configuration for Next.js
 * Environment variables required:
 * - AUTH0_SECRET
 * - AUTH0_BASE_URL
 * - AUTH0_ISSUER_BASE_URL
 * - AUTH0_CLIENT_ID
 * - AUTH0_CLIENT_SECRET
 */

export const auth0Config: ConfigParameters = {
  secret: process.env.AUTH0_SECRET!,
  baseURL: process.env.AUTH0_BASE_URL!,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL!,
  clientID: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  
  // Session configuration
  session: {
    rollingDuration: 24 * 60 * 60, // 24 hours
    absoluteDuration: 7 * 24 * 60 * 60, // 7 days
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  },

  // Auth0 routes configuration
  routes: {
    login: '/api/auth/login',
    callback: '/api/auth/callback',
    postLogoutRedirect: '/'
  }
}

/**
 * Validate Auth0 environment variables
 */
export function validateAuth0Config(): { isValid: boolean; errors: string[] } {
  const requiredEnvVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL', 
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET'
  ]

  const errors: string[] = []

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  })

  // Validate AUTH0_SECRET length
  if (process.env.AUTH0_SECRET && process.env.AUTH0_SECRET.length < 32) {
    errors.push('AUTH0_SECRET must be at least 32 characters long')
  }

  // Validate URLs
  if (process.env.AUTH0_BASE_URL && !isValidUrl(process.env.AUTH0_BASE_URL)) {
    errors.push('AUTH0_BASE_URL must be a valid URL')
  }

  if (process.env.AUTH0_ISSUER_BASE_URL && !isValidUrl(process.env.AUTH0_ISSUER_BASE_URL)) {
    errors.push('AUTH0_ISSUER_BASE_URL must be a valid URL')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Helper function to validate URLs
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

/**
 * Auth0 callback URLs for different environments
 */
export const getCallbackUrls = (baseUrl: string) => ({
  callback: `${baseUrl}/api/auth/callback`,
  logout: `${baseUrl}/api/auth/logout`,
  login: `${baseUrl}/api/auth/login`
})

export default auth0Config