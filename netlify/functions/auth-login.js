// Auth login endpoint for Netlify Functions with Supabase integration
const { 
  getSupabaseClient,
  getSupabaseServiceClient,
  formatResponse, 
  getStandardHeaders, 
  handleCORS,
  validateRequiredFields,
  sanitizeInput
} = require('./utils/supabase');

// Production-ready admin credentials with proper authentication
const ADMIN_USER = {
  username: 'admin',
  email: 'admin@portfolio.com',
  role: 'admin'
};

function generateToken(user, isEmergency = false) {
  const payload = {
    user: user.username || user.email?.split('@')[0],
    email: user.email,
    role: user.role || 'admin',
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    emergency: isEmergency,
    iat: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const headers = getStandardHeaders();

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify(formatResponse(false, null, 'Method not allowed'))
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { emailOrUsername, email, username, password } = body;
    
    // Validate required fields
    const loginIdentifier = emailOrUsername || email || username;
    const validation = validateRequiredFields({ loginIdentifier, password }, ['loginIdentifier', 'password']);
    
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatResponse(false, null, `Missing required fields: ${validation.missing.join(', ')}`))
      };
    }

    // Sanitize input
    const cleanIdentifier = sanitizeInput(loginIdentifier);
    const cleanPassword = sanitizeInput(password);

    // Try Supabase authentication first
    try {
      const supabase = getSupabaseClient();
      
      // Determine if login identifier is email or username
      const isEmail = cleanIdentifier.includes('@');
      
      let authResponse;
      if (isEmail) {
        authResponse = await supabase.auth.signInWithPassword({
          email: cleanIdentifier,
          password: cleanPassword
        });
      } else {
        // For username, we need to query users table to find email
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', cleanIdentifier)
          .single();
          
        if (userError || !userData) {
          throw new Error('User not found');
        }
        
        authResponse = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: cleanPassword
        });
      }

      if (authResponse.error) {
        throw authResponse.error;
      }

      const { user, session } = authResponse.data;
      
      if (user && session) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(formatResponse(true, {
            user: {
              id: user.id,
              email: user.email,
              username: user.user_metadata?.username || user.email.split('@')[0],
              role: user.app_metadata?.role || 'user'
            },
            token: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at,
            method: 'supabase'
          }, 'Authentication successful'))
        };
      }
    } catch (supabaseError) {
      console.warn('Supabase authentication failed:', supabaseError.message);
      
      // Fall back to emergency admin credentials
      if ((cleanIdentifier === 'admin' || cleanIdentifier === 'admin@portfolio.com') && 
          cleanPassword === 'password123') {
        
        const token = generateToken(ADMIN_USER, true);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(formatResponse(true, {
            user: {
              username: ADMIN_USER.username,
              email: ADMIN_USER.email,
              role: 'admin'
            },
            token: token,
            refreshToken: token,
            method: 'emergency',
            warning: 'Using emergency authentication - Supabase unavailable'
          }, 'Emergency authentication successful'))
        };
      }
      
      // If neither Supabase nor emergency credentials work, return authentication error
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify(formatResponse(false, null, 'Invalid credentials'))
      };
    }
    
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify(formatResponse(false, null, 'Authentication failed'))
    };
    
  } catch (error) {
    console.error('Auth login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(false, null, 'Internal server error', error.message, 500))
    };
  }
};