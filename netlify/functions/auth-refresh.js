// Netlify Function for token refresh
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

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'No refresh token provided',
          success: false 
        })
      };
    }

    const token = authHeader.substring(7);
    
    try {
      // Validate existing token
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      
      // Generate new token with extended expiry
      const newTokenPayload = {
        username: payload.username || 'admin',
        email: payload.email || 'admin@portfolio.com',
        role: payload.role || 'admin',
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      const newToken = Buffer.from(JSON.stringify(newTokenPayload)).toString('base64');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: newToken,
          user: {
            id: 1,
            username: newTokenPayload.username,
            email: newTokenPayload.email,
            role: newTokenPayload.role
          }
        })
      };
      
    } catch (decodeError) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid refresh token',
          success: false 
        })
      };
    }
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server error', 
        details: error.message,
        success: false 
      })
    };
  }
};