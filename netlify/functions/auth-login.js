// Netlify Function for authentication
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const { email, password } = JSON.parse(event.body);

    // Simple authentication (in production, use proper auth service)
    if (email === 'admin@example.com' && password === 'admin123') {
      // Generate a simple token (in production, use JWT properly)
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: token,
          user: {
            id: 1,
            username: 'admin',
            email: email,
            role: 'admin'
          }
        })
      };
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: error.message })
    };
  }
};