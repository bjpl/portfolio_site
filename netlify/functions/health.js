/**
 * Netlify Function: Health Check
 * Universal endpoint that works in all environments
 */

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'netlify',
      version: '1.0.0',
      uptime: process.uptime ? Math.floor(process.uptime()) : null,
      region: context.clientContext?.custom?.netlify_region || 'unknown',
      deployment: {
        id: context.clientContext?.custom?.netlify_deploy_id || 'unknown',
        context: context.clientContext?.custom?.netlify_deploy_context || 'unknown'
      },
      features: {
        cors: true,
        offline: true,
        fallback: true,
        monitoring: true
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Health check error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      })
    };
  }
};