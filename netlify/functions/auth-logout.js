// Netlify Function for logout
exports.handler = async (event, context) => {
  // CORS configuration
  const origin = event.headers.origin;
  const allowedOrigins = [
    'https://vocal-pony-24e3de.netlify.app',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:1313', 'http://localhost:3000'] : [])
  ];
  
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Allow POST for logout
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Simple logout - just return success
    // In production, you might want to maintain a token blacklist
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      })
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Server error',
        details: error.message
      })
    };
  }
};