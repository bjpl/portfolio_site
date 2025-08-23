/**
 * Fallback API handler for unmatched routes
 * Provides graceful error handling and routing information
 */

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: ''
    };
  }

  const path = event.path.replace('/.netlify/functions/fallback', '');
  const method = event.httpMethod;

  console.log(`[Fallback] Unhandled API request: ${method} ${path}`);

  // Return informative error with available endpoints
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: 'API endpoint not found',
      path: path,
      method: method,
      message: 'This API endpoint is not available or has not been implemented yet.',
      availableEndpoints: {
        authentication: [
          'POST /api/auth/login',
          'POST /api/auth/logout',
          'POST /api/auth/refresh',
          'GET /api/auth/me'
        ],
        utilities: [
          'GET /api/health',
          'POST /api/contact'
        ],
        planned: [
          'GET,POST,PUT,DELETE /api/content/*',
          'GET,POST,PUT,DELETE /api/portfolio/*',
          'GET,POST /api/media/*'
        ]
      },
      suggestion: path.startsWith('/api/auth') ? 
        'Try using one of the available authentication endpoints.' :
        path.startsWith('/api/content') ?
        'Content management endpoints are planned for future implementation.' :
        'Please check the available endpoints list above.'
    })
  };
};