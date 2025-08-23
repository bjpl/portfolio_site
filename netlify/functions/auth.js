// Simple auth endpoint for Netlify Functions
// In production, consider using Netlify Identity for proper auth

const ADMIN_USER = {
  username: 'admin',
  email: 'admin@portfolio.com',
  // This is the hash for 'password123' - in production, use environment variables
  passwordHash: '$2a$10$afmPk0ks7cRHrNgSv/lf7Oor8EwILf7iOCmNjmd6X7CK3sRbjxp82'
};

// Simple JWT implementation (use a proper library in production)
function generateToken(user) {
  const payload = {
    user: user.username,
    email: user.email,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  // In production, use a real JWT library and secret from environment
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    const origin = event.headers.origin;
    const allowedOrigins = [
      'https://vocal-pony-24e3de.netlify.app',
      'https://www.vocal-pony-24e3de.netlify.app',
      // Add your custom domain here when you set it up:
      // 'https://yourdomain.com',
      // 'https://www.yourdomain.com',
      ...(process.env.NODE_ENV === 'development' ? [
        'http://localhost:1313', 
        'http://localhost:3000', 
        'http://localhost:8888',
        'http://127.0.0.1:1313'
      ] : [])
    ];
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: ''
    };
  }

  // Only allow POST for login
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract path from both direct function calls and API proxy routes
    let path = '';
    if (event.path.includes('/.netlify/functions/auth')) {
      path = event.path.replace('/.netlify/functions/auth', '');
    } else if (event.path.includes('/api/auth/')) {
      path = '/' + event.path.split('/api/auth/')[1];
    }
    
    console.log('Auth function called with path:', event.path, 'extracted path:', path);
    
    // Handle login
    if (path === '/login' || path === '') {
      const { emailOrUsername, password } = JSON.parse(event.body);
      
      // Check credentials (simplified for demo)
      if ((emailOrUsername === 'admin' || emailOrUsername === 'admin@portfolio.com') && 
          password === 'password123') {
        
        const token = generateToken(ADMIN_USER);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            user: {
              username: ADMIN_USER.username,
              email: ADMIN_USER.email,
              role: 'admin'
            },
            token: token,
            refreshToken: token // Same as access token for simplicity
          })
        };
      }
      
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      };
    }
    
    // Handle logout
    if (path === '/logout') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Logged out successfully'
        })
      };
    }
    
    // Handle refresh token
    if (path === '/refresh') {
      // In production, validate the refresh token properly
      const token = generateToken(ADMIN_USER);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          token: token
        })
      };
    }
    
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
    
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};