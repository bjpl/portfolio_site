/**
 * Netlify Edge Function for JWT-based Authentication Login
 * Uses Deno runtime and Web Crypto API for serverless authentication
 */

interface LoginRequest {
  username: string;
  password: string;
}

interface JWTPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
  iss: string;
}

// Environment configuration
const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'fallback-secret-key-change-in-production';
const JWT_ISSUER = 'portfolio-edge-auth';
const TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

// Demo users (in production, this would come from a database)
const USERS = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'editor', password: 'editor123', role: 'editor' }
];

/**
 * Create JWT token using Web Crypto API
 */
async function createJWT(payload: JWTPayload): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Authenticate user credentials
 */
function authenticateUser(username: string, password: string): { username: string; role: string } | null {
  const user = USERS.find(u => u.username === username && u.password === password);
  return user ? { username: user.username, role: user.role } : null;
}

/**
 * Main edge function handler
 */
export default async function handler(request: Request, context: any): Promise<Response> {
  // Set CORS headers for all responses
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  });

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    // Parse request body
    const body: LoginRequest = await request.json();
    
    if (!body.username || !body.password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers }
      );
    }

    // Authenticate user
    const user = authenticateUser(body.username, body.password);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers }
      );
    }

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      sub: user.username,
      username: user.username,
      iat: now,
      exp: now + TOKEN_EXPIRY,
      iss: JWT_ISSUER
    };

    // Generate JWT token
    const token = await createJWT(payload);

    // Return success response with token
    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          username: user.username,
          role: user.role
        },
        expiresIn: TOKEN_EXPIRY
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

// Export config for Netlify Edge Functions
export const config = {
  path: '/api/auth/login',
  method: ['POST', 'OPTIONS']
};