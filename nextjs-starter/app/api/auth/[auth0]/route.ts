import { handleAuth, handleCallback, handleLogin, handleLogout } from '@auth0/nextjs-auth0'
import { syncUserWithSupabase } from '@/lib/supabase'
import { NextRequest } from 'next/server'

const afterCallback = async (req: NextRequest, session: any) => {
  // Sync user with Supabase after successful Auth0 login
  if (session?.user) {
    await syncUserWithSupabase(session.user)
  }
  return session
}

export const GET = handleAuth({
  login: handleLogin({
    returnTo: '/admin/dashboard'
  }),
  logout: handleLogout({
    returnTo: '/'
  }),
  callback: handleCallback({
    afterCallback
  })
})