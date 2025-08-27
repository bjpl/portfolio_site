// Auth Library Barrel Export
export { default as Auth0ProviderWrapper } from './auth0-provider'
export { auth0Config, validateAuth0Config, getCallbackUrls } from './auth0-config'

// Server-side Auth0 exports
export { 
  withPageAuthRequired,
  withApiAuthRequired,
  getSession,
  getAccessToken,
  handleAuth,
  handleLogin,
  handleLogout,
  handleCallback
} from '@auth0/nextjs-auth0'

// Client-side Auth0 exports
export { 
  UserProvider, 
  useUser
} from '@auth0/nextjs-auth0/client'