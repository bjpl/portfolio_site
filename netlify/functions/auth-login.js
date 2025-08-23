// Netlify Function for authentication login
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
    const body = JSON.parse(event.body);
    const { email, password, emailOrUsername } = body;
    
    // Support both formats
    const userInput = emailOrUsername || email;
    
    console.log('Login attempt:', { userInput, hasPassword: !!password });

    // Authentication logic - support multiple credential formats
    const validCredentials = [
      { user: 'admin', pass: 'password123', email: 'admin@portfolio.com' },
      { user: 'admin@example.com', pass: 'admin123', email: 'admin@example.com' },
      { user: 'admin@portfolio.com', pass: 'password123', email: 'admin@portfolio.com' }
    ];
    
    const isValid = validCredentials.some(cred => 
      (userInput === cred.user || userInput === cred.email) && password === cred.pass
    );
    
    if (isValid) {
      // Generate token with user info
      const tokenPayload = {
        username: 'admin',
        email: 'admin@portfolio.com',
        role: 'admin',
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: token,
          refreshToken: token,
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@portfolio.com',
            role: 'admin'
          }
        })
      };
    }

    console.log('Invalid credentials for:', userInput);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Invalid credentials' 
      })
    };
  } catch (error) {
    console.error('Auth error:', error);
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