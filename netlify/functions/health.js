// Health check endpoint for Netlify Functions
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'production',
      message: 'Portfolio site API is running on Netlify Functions'
    })
  };
};