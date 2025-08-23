/**
 * Environment configuration checker
 * Validates environment variables and API setup
 */

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: ''
    };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    NETLIFY: process.env.NETLIFY || 'false',
    NETLIFY_DEV: process.env.NETLIFY_DEV || 'false',
    DEPLOY_URL: process.env.DEPLOY_URL,
    URL: process.env.URL,
    CONTEXT: process.env.CONTEXT,
    BRANCH: process.env.BRANCH
  };

  const apiConfig = {
    functionsPath: '/.netlify/functions',
    baseUrl: process.env.URL || 'https://vocal-pony-24e3de.netlify.app',
    environment: envVars.NODE_ENV,
    isNetlify: envVars.NETLIFY === 'true',
    isDev: envVars.NETLIFY_DEV === 'true'
  };

  // Check available functions
  const availableFunctions = [
    'health',
    'auth', 
    'contact',
    'content',
    'fallback',
    'env-check'
  ];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envVars,
      apiConfiguration: apiConfig,
      availableFunctions: availableFunctions,
      endpoints: {
        health: `${apiConfig.baseUrl}/api/health`,
        auth: {
          login: `${apiConfig.baseUrl}/api/auth/login`,
          logout: `${apiConfig.baseUrl}/api/auth/logout`,
          refresh: `${apiConfig.baseUrl}/api/auth/refresh`,
          me: `${apiConfig.baseUrl}/api/auth/me`
        },
        contact: `${apiConfig.baseUrl}/api/contact`,
        content: {
          projects: `${apiConfig.baseUrl}/api/content/projects`,
          skills: `${apiConfig.baseUrl}/api/content/skills`
        }
      },
      deployment: {
        url: envVars.URL,
        deployUrl: envVars.DEPLOY_URL,
        context: envVars.CONTEXT,
        branch: envVars.BRANCH
      }
    })
  };
};