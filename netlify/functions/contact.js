// Simple contact form handler for Netlify Functions
exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Basic validation
    if (!data.name || !data.email || !data.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // In production, you would:
    // 1. Send email using SendGrid, Mailgun, etc.
    // 2. Store in database
    // 3. Send to Slack/Discord webhook
    
    // For now, just log and return success
    console.log('Contact form submission:', data);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
      })
    };
  } catch (error) {
    console.error('Contact form error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};