// Simple test function to verify auth endpoints are working
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: '' 
    };
  }
  
  try {
    // Test environment variables
    const envVars = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      NODE_ENV: process.env.NODE_ENV || 'unknown'
    };
    
    console.log('[TEST-AUTH] Environment check:', envVars);
    
    const result = {
      status: 'ok',
      message: 'Auth endpoint working',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path,
      environment: envVars,
      headers: event.headers
    };
    
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify(result, null, 2)
    };
  } catch (error) {
    console.error('[TEST-AUTH] Error:', error);
    
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        status: 'error',
        message: 'Test endpoint failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};