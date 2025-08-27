/**
 * Simple Health Check Function - No Dependencies
 * Minimal function for Netlify deployment validation
 */

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  // Simple health check response
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'netlify',
    version: '1.0.0',
    deployment: {
      context: context.clientContext?.custom?.netlify_deploy_context || 'unknown',
      region: process.env.AWS_REGION || 'unknown'
    },
    message: 'Portfolio site health check passed'
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(healthData)
  };
};