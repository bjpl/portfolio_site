/**
 * Test Edge Function to verify Deno runtime and basic functionality
 */

export default async function handler(request: Request, context: any): Promise<Response> {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    // Test Deno runtime capabilities
    const denoVersion = Deno.version;
    const now = new Date();
    const country = context.geo?.country || 'Unknown';
    const city = context.geo?.city || 'Unknown';

    // Test Web Crypto API availability
    const cryptoAvailable = typeof crypto !== 'undefined' && 
                           typeof crypto.subtle !== 'undefined';

    // Test environment variables
    const envTest = Deno.env.get('NETLIFY') || 'Not set';

    const testData = {
      success: true,
      message: 'Edge Functions are working correctly!',
      runtime: {
        deno: denoVersion,
        timestamp: now.toISOString(),
        location: {
          country,
          city
        }
      },
      capabilities: {
        webCrypto: cryptoAvailable,
        environment: envTest,
        fetch: typeof fetch !== 'undefined',
        textEncoder: typeof TextEncoder !== 'undefined',
        textDecoder: typeof TextDecoder !== 'undefined'
      },
      headers: Object.fromEntries(request.headers.entries()),
      url: request.url,
      method: request.method
    };

    return new Response(
      JSON.stringify(testData, null, 2),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Edge function test error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers }
    );
  }
}

export const config = {
  path: '/api/test-edge'
};