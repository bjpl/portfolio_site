/**
 * Netlify Function: Contact Form Handler
 * Handles contact form submissions with validation and saves to Supabase
 */

const { 
  getSupabaseClient, 
  withErrorHandling, 
  formatResponse, 
  getStandardHeaders, 
  handleCORS,
  validateRequiredFields,
  sanitizeInput,
  checkRateLimit
} = require('./utils/supabase');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const headers = getStandardHeaders();

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Method not allowed. Use POST.', 
        null, 
        405
      ))
    };
  }

  try {
    // Parse request body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          'Invalid JSON in request body', 
          parseError.message, 
          400
        ))
      };
    }
    
    // Validate required fields
    const validation = validateRequiredFields(data, ['name', 'email', 'message']);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          `Missing required fields: ${validation.missing.join(', ')}`, 
          null, 
          400
        ))
      };
    }

    // Sanitize inputs
    data.name = sanitizeInput(data.name);
    data.email = sanitizeInput(data.email);
    data.message = sanitizeInput(data.message);
    data.subject = data.subject ? sanitizeInput(data.subject) : null;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          'Invalid email format', 
          null, 
          400
        ))
      };
    }

    // Rate limiting
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(clientIP, 5, 300000)) { // 5 requests per 5 minutes
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          'Too many requests. Please try again later.', 
          null, 
          429
        ))
      };
    }

    // Basic spam protection
    const message = data.message.toLowerCase();
    const spamKeywords = ['viagra', 'casino', 'lottery', 'bitcoin', 'crypto', 'loan', 'investment'];
    const hasSpam = spamKeywords.some(keyword => message.includes(keyword));
    
    if (hasSpam) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          'Message rejected by spam filter', 
          null, 
          400
        ))
      };
    }

    // Save to Supabase contact_messages table
    const supabase = getSupabaseClient();
    const contactData = {
      name: data.name,
      email: data.email,
      subject: data.subject || 'Contact Form Submission',
      message: data.message,
      ip_address: clientIP,
      user_agent: event.headers['user-agent'] || null,
      submitted_at: new Date().toISOString()
    };

    const result = await withErrorHandling(async () => {
      return await supabase
        .from('contact_messages')
        .insert([contactData])
        .select('id, created_at')
        .single();
    }, 'contact message insert');

    if (!result.success) {
      console.error('Failed to save contact message:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          'Failed to save message. Please try again.', 
          result.error, 
          500
        ))
      };
    }

    // Log successful submission
    console.log('Contact form submission saved:', {
      id: result.data.id,
      name: data.name,
      email: data.email,
      subject: data.subject,
      timestamp: result.data.created_at,
      ip: clientIP
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formatResponse(
        true,
        {
          id: result.data.id,
          name: data.name,
          email: data.email,
          subject: contactData.subject,
          messageLength: data.message.length,
          submittedAt: result.data.created_at
        },
        'Thank you for your message! We\'ll get back to you soon.'
      ))
    };

  } catch (error) {
    console.error('Contact form error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Internal server error. Please try again later.', 
        error.message, 
        500
      ))
    };
  }
};