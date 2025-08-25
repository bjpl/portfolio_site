exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    
    // Simple hardcoded auth for testing
    if (username === 'admin' && password === 'admin123') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: 'test-token-' + Date.now(),
          user: { username: 'admin', role: 'admin' }
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
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }
};