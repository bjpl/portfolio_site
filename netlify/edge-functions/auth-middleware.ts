/**
 * Netlify Edge Function Authentication Middleware
 * Protects routes and verifies JWT tokens at the edge
 * Uses Deno runtime and Web Crypto API
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

// Protected routes configuration
const PROTECTED_ROUTES = [
  '/admin/*',
  '/api/admin/*',
  '/api/portfolio/*',
  '/api/content/*'
];

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => {
    const pattern = route.replace('*', '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(pathname);
  });
}

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
 * Extract token from various sources
 */
function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  // Check query parameter (less secure, for development only)
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  return null;
}

/**
 * Create unauthorized response
 */
function createUnauthorizedResponse(message: string = 'Unauthorized'): Response {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  });

  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers }
  );
}

/**
 * Main edge function handler
 */
export default async function handler(request: Request, context: any): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Set CORS headers for all responses
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // Check if route requires authentication
  if (!isProtectedRoute(pathname)) {
    // Route is not protected, continue to next handler
    return context.next();
  }

  try {
    // Extract token from request
    const token = extractToken(request);
    if (!token) {
      return createUnauthorizedResponse('Authentication required');
    }

    // Verify token
    const payload = await verifyJWT(token);
    if (!payload) {
      return createUnauthorizedResponse('Invalid or expired token');
    }

    // Add user context to request headers for downstream handlers
    const modifiedRequest = new Request(request.url, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'X-User-ID': payload.sub,
        'X-User-Name': payload.username,
        'X-Auth-Verified': 'true'
      },
      body: request.body
    });

    // Continue to next handler with modified request
    return context.next(modifiedRequest);

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return createUnauthorizedResponse('Authentication error');
  }
}

// Export config for Netlify Edge Functions
export const config = {
  path: ['/*'],
  excludedPath: ['/api/auth/*', '/css/*', '/js/*', '/images/*', '/_next/*', '/favicon.ico']
};