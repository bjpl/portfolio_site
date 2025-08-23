/**
 * Netlify Edge Function for JWT Logout
 * Uses Deno runtime for serverless logout handling
 * Note: Since JWTs are stateless, logout is handled client-side by removing the token
 */

/**
 * Main edge function handler for logout
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
    // For JWT-based authentication, logout is typically handled client-side
    // by removing the token from storage. However, we can log the logout event
    // and potentially add the token to a blacklist in a real implementation.
    
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a production environment, you might want to:
      // 1. Add the token to a blacklist (requires external storage)
      // 2. Log the logout event for security audit
      console.log('User logout event:', new Date().toISOString());
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

// Export config for Netlify Edge Functions
export const config = {
  path: '/api/auth/logout',
  method: ['POST', 'OPTIONS']
};