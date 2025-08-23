/**
 * Netlify Edge Function for JWT Token Verification
 * Uses Deno runtime and Web Crypto API for serverless token validation
 */

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

/**
 * Verify JWT token using Web Crypto API
 */
async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Decode header and payload
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Verify algorithm
    if (header.alg !== 'HS256') {
      return null;
    }

    // Verify issuer
    if (payload.iss !== JWT_ISSUER) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    // Verify signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    
    return isValid ? payload : null;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Main edge function handler
 */
export default async function handler(request: Request, context: any): Promise<Response> {
  // Set CORS headers for all responses
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  });

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    // Extract token from request
    const token = extractToken(request);
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { status: 401, headers }
      );
    }

    // Verify token
    const payload = await verifyJWT(token);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers }
      );
    }

    // Return user information
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          username: payload.username,
          sub: payload.sub,
          iat: payload.iat,
          exp: payload.exp
        },
        valid: true
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Token verification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

// Export config for Netlify Edge Functions
export const config = {
  path: '/api/auth/verify',
  method: ['GET', 'POST', 'OPTIONS']
};