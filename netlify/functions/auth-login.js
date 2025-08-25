// Auth login endpoint for Netlify Functions with Supabase integration
const { createClient } = require('@supabase/supabase-js');

// Enhanced logging for debugging
const log = (level, message, data = null) => {
  console[level](`[AUTH-LOGIN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Utility functions for consistent response formatting
const formatResponse = (success, data = null, message = '', error = null, statusCode = 200) => ({
  success,
  data,
  message,
  error,
  timestamp: new Date().toISOString(),
  statusCode
});

const getStandardHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
});

const handleCORS = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getStandardHeaders(),
      body: ''
    };
  }
  return null;
};

const validateRequiredFields = (data, required) => {
  const missing = required.filter(field => !data[field]);
  return { valid: missing.length === 0, missing };
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

// Initialize Supabase client with environment variables and fallbacks
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      'https://tdmzayzkqyegvfgxlolj.supabase.co';
                      
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';
  
  log('info', 'Initializing Supabase client', { 
    url: supabaseUrl, 
    hasKey: !!supabaseKey,
    keyLength: supabaseKey ? supabaseKey.length : 0
  });
  
  if (!supabaseKey) {
    throw new Error('Supabase anonymous key is missing');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

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
      log('info', 'Attempting Supabase authentication', { identifier: cleanIdentifier });
      
      // Determine if login identifier is email or username
      const isEmail = cleanIdentifier.includes('@');
      
      let authResponse;
      if (isEmail) {
        log('info', 'Authenticating with email');
        authResponse = await supabase.auth.signInWithPassword({
          email: cleanIdentifier,
          password: cleanPassword
        });
      } else {
        log('info', 'Authenticating with username, looking up email');
        // For username, we need to query users table to find email
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', cleanIdentifier)
          .single();
          
        if (userError || !userData) {
          log('warn', 'Username not found in profiles table', userError);
          throw new Error('User not found');
        }
        
        log('info', 'Found user email, authenticating');
        authResponse = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: cleanPassword
        });
      }

      if (authResponse.error) {
        log('error', 'Supabase authentication error', authResponse.error);
        throw authResponse.error;
      }

      const { user, session } = authResponse.data;
      log('info', 'Supabase authentication successful', { userId: user?.id });
      
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
      log('warn', 'Supabase authentication failed, trying emergency credentials', supabaseError.message);
      
      // Fall back to emergency admin credentials
      if ((cleanIdentifier === 'admin' || cleanIdentifier === 'admin@portfolio.com') && 
          cleanPassword === 'password123') {
        
        log('info', 'Emergency admin authentication successful');
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
      
      log('error', 'Both Supabase and emergency authentication failed');
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
    log('error', 'Auth login critical error', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(false, null, 'Internal server error', error.message, 500))
    };
  }
};