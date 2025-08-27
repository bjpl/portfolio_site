/**
 * Auth0 Configuration for Netlify Functions
 * Handles Auth0 authentication integration with Supabase
 */

const { ManagementClient, AuthenticationClient } = require('auth0');

// Auth0 Configuration
const auth0Config = {
  domain: process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', ''),
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  audience: process.env.AUTH0_AUDIENCE || `${process.env.AUTH0_BASE_URL}/api`,
  scope: 'openid profile email',
  redirectUri: `${process.env.AUTH0_BASE_URL}/callback`,
  postLogoutRedirectUri: `${process.env.AUTH0_BASE_URL}/`,
  session: {
    cookieSecret: process.env.SESSION_SECRET,
    cookieName: 'auth0-session',
    cookieDomain: process.env.NODE_ENV === 'production' ? '.netlify.app' : 'localhost',
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieSameSite: 'lax',
    cookieLifetime: 60 * 60 * 24 * 7, // 7 days
    rolling: true
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'AUTH0_ISSUER_BASE_URL',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'AUTH0_BASE_URL',
  'SESSION_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

/**
 * Create Auth0 Management Client
 * Used for managing users, roles, and other Auth0 resources
 */
const createManagementClient = () => {
  return new ManagementClient({
    domain: auth0Config.domain,
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID || auth0Config.clientId,
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || auth0Config.clientSecret,
    audience: `https://${auth0Config.domain}/api/v2/`,
    tokenProvider: {
      enableCache: true,
      cacheTTLInSeconds: 10
    }
  });
};

/**
 * Create Auth0 Authentication Client
 * Used for login, logout, and token management
 */
const createAuthenticationClient = () => {
  return new AuthenticationClient({
    domain: auth0Config.domain,
    clientId: auth0Config.clientId,
    clientSecret: auth0Config.clientSecret
  });
};

/**
 * Verify Auth0 JWT Token
 */
const verifyToken = async (token) => {
  const jwt = require('jsonwebtoken');
  const jwksClient = require('jwks-rsa');

  const client = jwksClient({
    jwksUri: `https://${auth0Config.domain}/.well-known/jwks.json`,
    requestHeaders: {},
    timeout: 30000,
    cache: true,
    rateLimit: true
  });

  function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: auth0Config.clientId,
      issuer: `https://${auth0Config.domain}/`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

/**
 * Create Supabase JWT for Auth0 user
 * Maps Auth0 user to Supabase authentication
 */
const createSupabaseJWT = (auth0User) => {
  const jwt = require('jsonwebtoken');
  
  const payload = {
    sub: auth0User.sub,
    aud: 'authenticated',
    role: 'authenticated',
    email: auth0User.email,
    email_verified: auth0User.email_verified || false,
    phone_verified: false,
    app_metadata: {
      provider: 'auth0',
      providers: ['auth0']
    },
    user_metadata: {
      name: auth0User.name,
      picture: auth0User.picture,
      nickname: auth0User.nickname
    },
    aal: 'aal1',
    amr: [{ method: 'oauth', timestamp: Math.floor(Date.now() / 1000) }],
    session_id: `auth0-${auth0User.sub}`,
    is_anonymous: false
  };

  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, {
    expiresIn: '1h',
    issuer: process.env.NEXT_PUBLIC_SUPABASE_URL,
    audience: 'authenticated'
  });
};

/**
 * Handle Auth0 Login Flow
 */
const handleLogin = async (event) => {
  const authClient = createAuthenticationClient();
  
  // Generate state parameter for CSRF protection
  const crypto = require('crypto');
  const state = crypto.randomBytes(32).toString('hex');
  
  const authorizationUrl = authClient.buildAuthorizeUrl({
    responseType: 'code',
    redirectUri: auth0Config.redirectUri,
    scope: auth0Config.scope,
    state: state,
    audience: auth0Config.audience
  });

  return {
    statusCode: 302,
    headers: {
      Location: authorizationUrl,
      'Set-Cookie': [
        `auth0-state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
        `auth0-redirect=${event.queryStringParameters?.redirect || '/'}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
      ]
    }
  };
};

/**
 * Handle Auth0 Callback
 */
const handleCallback = async (event) => {
  const { code, state } = event.queryStringParameters || {};
  const cookies = parseCookies(event.headers.cookie || '');

  // Verify state parameter
  if (!state || state !== cookies['auth0-state']) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid state parameter' })
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Authorization code not provided' })
    };
  }

  try {
    const authClient = createAuthenticationClient();
    
    // Exchange code for token
    const tokenResponse = await authClient.oauth.authorizationCodeGrant({
      code: code,
      redirect_uri: auth0Config.redirectUri
    });

    // Get user profile
    const userProfile = await authClient.users.getInfo(tokenResponse.data.access_token);

    // Create session
    const sessionData = {
      user: userProfile.data,
      tokens: tokenResponse.data,
      expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000)
    };

    // Create Supabase JWT
    const supabaseJWT = createSupabaseJWT(userProfile.data);

    // Encrypt session data
    const encryptedSession = encryptSession(sessionData);
    const redirectUrl = cookies['auth0-redirect'] || '/';

    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl,
        'Set-Cookie': [
          `${auth0Config.session.cookieName}=${encryptedSession}; Path=/; HttpOnly; SameSite=${auth0Config.session.cookieSameSite}; Max-Age=${auth0Config.session.cookieLifetime}${auth0Config.session.cookieSecure ? '; Secure' : ''}`,
          `supabase-jwt=${supabaseJWT}; Path=/; HttpOnly; SameSite=${auth0Config.session.cookieSameSite}; Max-Age=3600${auth0Config.session.cookieSecure ? '; Secure' : ''}`,
          'auth0-state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
          'auth0-redirect=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        ]
      }
    };
  } catch (error) {
    console.error('Auth0 callback error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};

/**
 * Handle Logout
 */
const handleLogout = async (event) => {
  const logoutUrl = `https://${auth0Config.domain}/v2/logout?client_id=${auth0Config.clientId}&returnTo=${encodeURIComponent(auth0Config.postLogoutRedirectUri)}`;

  return {
    statusCode: 302,
    headers: {
      Location: logoutUrl,
      'Set-Cookie': [
        `${auth0Config.session.cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        'supabase-jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ]
    }
  };
};

/**
 * Get User Session
 */
const getSession = (event) => {
  const cookies = parseCookies(event.headers.cookie || '');
  const sessionCookie = cookies[auth0Config.session.cookieName];

  if (!sessionCookie) {
    return null;
  }

  try {
    return decryptSession(sessionCookie);
  } catch (error) {
    console.error('Session decryption error:', error);
    return null;
  }
};

/**
 * Refresh Access Token
 */
const refreshToken = async (refreshToken) => {
  const authClient = createAuthenticationClient();
  
  try {
    const tokenResponse = await authClient.oauth.refreshTokenGrant({
      refresh_token: refreshToken
    });

    return tokenResponse.data;
  } catch (error) {
    throw new Error('Token refresh failed');
  }
};

/**
 * Utility Functions
 */
const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.split('=').map(c => c.trim());
      cookies[name] = value;
    });
  }
  return cookies;
};

const encryptSession = (sessionData) => {
  const crypto = require('crypto');
  const algorithm = 'aes-256-gcm';
  const key = crypto.createHash('sha256').update(auth0Config.session.cookieSecret).digest();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from(auth0Config.session.cookieName));
  
  let encrypted = cipher.update(JSON.stringify(sessionData), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}.${encrypted}.${authTag.toString('hex')}`;
};

const decryptSession = (encryptedSession) => {
  const crypto = require('crypto');
  const algorithm = 'aes-256-gcm';
  const key = crypto.createHash('sha256').update(auth0Config.session.cookieSecret).digest();
  
  const [ivHex, encryptedHex, authTagHex] = encryptedSession.split('.');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = encryptedHex;
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from(auth0Config.session.cookieName));
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
};

/**
 * Middleware for protecting routes
 */
const requireAuth = async (event, context, callback) => {
  const session = getSession(event);
  
  if (!session) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required' })
    };
  }

  // Check if session is expired
  if (session.expiresAt < Date.now()) {
    try {
      const newTokens = await refreshToken(session.tokens.refresh_token);
      session.tokens = newTokens;
      session.expiresAt = Date.now() + (newTokens.expires_in * 1000);
      
      // Update session cookie would need to be handled by the calling function
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Session expired' })
      };
    }
  }

  // Add user to event context
  event.user = session.user;
  event.tokens = session.tokens;
  
  return callback(event, context);
};

module.exports = {
  auth0Config,
  createManagementClient,
  createAuthenticationClient,
  verifyToken,
  createSupabaseJWT,
  handleLogin,
  handleCallback,
  handleLogout,
  getSession,
  refreshToken,
  requireAuth,
  parseCookies
};