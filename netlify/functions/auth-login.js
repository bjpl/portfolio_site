// Auth login endpoint for Netlify Functions
const ADMIN_USER = {
  username: 'admin',
  email: 'admin@portfolio.com',
  passwordHash: '$2a$10$afmPk0ks7cRHrNgSv/lf7Oor8EwILf7iOCmNjmd6X7CK3sRbjxp82'
};

function generateToken(user) {
  const payload = {
    user: user.username,
    email: user.email,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { emailOrUsername, password } = JSON.parse(event.body);
    
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
          refreshToken: token
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
    
  } catch (error) {
    console.error('Auth login error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};