import { handleAuth, handleLogin, handleCallback, handleLogout } from '@auth0/nextjs-auth0'

export default handleAuth({
  login: handleLogin({
    returnTo: '/admin'
  }),
  logout: handleLogout({
    returnTo: '/'
  }),
  callback: handleCallback()
})