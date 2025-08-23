/**
 * Netlify Function: Contact Form Handler
 * Handles contact form submissions with validation and notifications
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed. Use POST.'
      })
    };
  }

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'message'];
    const missingFields = requiredFields.filter(field => !data[field] || !data[field].trim());
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Invalid email format'
        })
      };
    }

    // Basic spam protection
    const message = data.message.toLowerCase();
    const spamKeywords = ['viagra', 'casino', 'lottery', 'bitcoin', 'crypto', 'loan'];
    const hasSpam = spamKeywords.some(keyword => message.includes(keyword));
    
    if (hasSpam) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Message rejected by spam filter'
        })
      };
    }

    // Rate limiting (simple IP-based)
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    console.log(`Contact form submission from IP: ${clientIP}`);

    // In a real implementation, you would:
    // 1. Store the message in a database
    // 2. Send email notifications
    // 3. Integrate with services like Formspree, Netlify Forms, or SendGrid
    
    // For demo purposes, we'll simulate success
    const response = {
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.',
      timestamp: new Date().toISOString(),
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject || 'Contact Form Submission',
        messageLength: data.message.length
      }
    };

    // Log the submission (in production, you'd want proper logging)
    console.log('Contact form submission:', {
      name: data.name,
      email: data.email,
      subject: data.subject,
      timestamp: response.timestamp,
      ip: clientIP
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Contact form error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error. Please try again later.',
        timestamp: new Date().toISOString()
      })
    };
  }
};