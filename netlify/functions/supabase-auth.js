const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with new instance credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables');
  console.log('Using new Supabase instance:', supabaseUrl);
}

// Enhanced connection validation for new instance
if (!supabaseUrl.includes('tdmzayzkqyegvfgxlolj.supabase.co') && process.env.NODE_ENV === 'production') {
  console.warn('Warning: Not using expected Supabase instance');
}

// Create admin client for server-side operations with enhanced error handling
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'x-application': 'portfolio-netlify-functions',
      'x-supabase-instance': 'tdmzayzkqyegvfgxlolj'
    }
  }
});

// Create client for user operations with enhanced configuration
const createSupabaseClient = (accessToken = null) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-application': 'portfolio-netlify-functions-client',
        'x-supabase-instance': 'tdmzayzkqyegvfgxlolj',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    }
  });
};

// Rate limiting map
const rateLimitMap = new Map();

// Rate limiting function
const checkRateLimit = (identifier, windowMs = 900000, maxRequests = 5) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }
  
  const requests = rateLimitMap.get(identifier);
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
  return true;
};

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 900000; // 15 minutes
  
  for (const [identifier, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(timestamp => timestamp > (now - windowMs));
    if (validRequests.length === 0) {
      rateLimitMap.delete(identifier);
    } else {
      rateLimitMap.set(identifier, validRequests);
    }
  }
}, 300000); // Clean every 5 minutes

// Helper function to get client IP
const getClientIP = (event) => {
  return event.headers['x-forwarded-for'] || 
         event.headers['x-real-ip'] || 
         event.headers['cf-connecting-ip'] || 
         'unknown';
};

// Helper function to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate password strength
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { httpMethod, path, headers } = event;
    const clientIP = getClientIP(event);
    
    // Parse the action from the path or body
    const pathParts = path.split('/');
    const action = pathParts[pathParts.length - 1] || 'unknown';
    
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Invalid JSON in request body',
            code: 'INVALID_JSON'
          })
        };
      }
    }

    // Rate limiting check for sensitive operations
    const sensitiveActions = ['signup', 'signin', 'reset-password', 'verify-otp'];
    if (sensitiveActions.includes(action) && !checkRateLimit(clientIP, 900000, 5)) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      };
    }

    switch (action) {
      case 'signup':
        return await handleSignUp(body, clientIP);
      
      case 'signin':
        return await handleSignIn(body, clientIP);
      
      case 'signout':
        return await handleSignOut(headers);
      
      case 'reset-password':
        return await handlePasswordReset(body, clientIP);
      
      case 'verify-otp':
        return await handleOTPVerification(body);
      
      case 'refresh':
        return await handleTokenRefresh(body);
      
      case 'user':
        return await handleGetUser(headers);
      
      case 'update-user':
        return await handleUpdateUser(body, headers);
      
      case 'oauth':
        return await handleOAuthLogin(body);
      
      case 'oauth-callback':
        return await handleOAuthCallback(body);
      
      case 'change-password':
        return await handlePasswordChange(body, headers);
      
      case 'resend-confirmation':
        return await handleResendConfirmation(body, clientIP);

      default:
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Authentication endpoint not found',
            code: 'ENDPOINT_NOT_FOUND'
          })
        };
    }

  } catch (error) {
    console.error('Supabase Auth Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

// Sign up with email verification
async function handleSignUp(body, clientIP) {
  const { email, password, userData = {} } = body;

  // Validation
  if (!email || !password) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      })
    };
  }

  if (!isValidEmail(email)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    };
  }

  if (!isValidPassword(password)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        code: 'WEAK_PASSWORD'
      })
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.URL || 'https://your-site.netlify.app'}/auth/callback`,
        data: {
          ...userData,
          created_from_ip: clientIP,
          role: 'user' // Default role
        }
      }
    });

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'SIGNUP_ERROR'
        })
      };
    }

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'User created successfully. Please check your email for verification.',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          email_confirmed_at: data.user?.email_confirmed_at
        },
        session: data.session
      })
    };

  } catch (error) {
    console.error('Sign up error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to create user account',
        code: 'SIGNUP_FAILED'
      })
    };
  }
}

// Sign in with email/password
async function handleSignIn(body, clientIP) {
  const { email, password, remember = false } = body;

  if (!email || !password) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      })
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'SIGNIN_ERROR'
        })
      };
    }

    // Update user metadata with sign-in info
    if (data.user) {
      await supabaseAdmin.auth.updateUser({
        user_metadata: {
          ...data.user.user_metadata,
          last_sign_in_ip: clientIP,
          last_sign_in_at: new Date().toISOString()
        }
      });
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Sign in successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
          app_metadata: data.user.app_metadata,
          role: data.user.app_metadata?.role || 'user'
        },
        session: data.session
      })
    };

  } catch (error) {
    console.error('Sign in error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to sign in',
        code: 'SIGNIN_FAILED'
      })
    };
  }
}

// Sign out
async function handleSignOut(headers) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'No valid session found',
        code: 'NO_SESSION'
      })
    };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { error } = await supabaseAdmin.auth.signOut(token);

    if (error) {
      console.warn('Sign out warning:', error);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Signed out successfully' })
    };

  } catch (error) {
    console.error('Sign out error:', error);
    return {
      statusCode: 200, // Return success even if error
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Signed out successfully' })
    };
  }
}

// Password reset
async function handlePasswordReset(body, clientIP) {
  const { email } = body;

  if (!email) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      })
    };
  }

  if (!isValidEmail(email)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    };
  }

  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.URL || 'https://your-site.netlify.app'}/auth/reset-password`
    });

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'RESET_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Password reset email sent successfully'
      })
    };

  } catch (error) {
    console.error('Password reset error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to send password reset email',
        code: 'RESET_FAILED'
      })
    };
  }
}

// OTP verification
async function handleOTPVerification(body) {
  const { email, token, type = 'email' } = body;

  if (!email || !token) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Email and token are required',
        code: 'MISSING_CREDENTIALS'
      })
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email,
      token,
      type
    });

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'VERIFICATION_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Verification successful',
        user: data.user,
        session: data.session
      })
    };

  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to verify OTP',
        code: 'VERIFICATION_FAILED'
      })
    };
  }
}

// Token refresh
async function handleTokenRefresh(body) {
  const { refresh_token } = body;

  if (!refresh_token) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      })
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'REFRESH_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        session: data.session,
        user: data.user
      })
    };

  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to refresh token',
        code: 'REFRESH_FAILED'
      })
    };
  }
}

// Get current user
async function handleGetUser(headers) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Authorization token required',
        code: 'NO_TOKEN'
      })
    };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'GET_USER_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          role: user.app_metadata?.role || 'user',
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at
        }
      })
    };

  } catch (error) {
    console.error('Get user error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to get user',
        code: 'GET_USER_FAILED'
      })
    };
  }
}

// Update user
async function handleUpdateUser(body, headers) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Authorization token required',
        code: 'NO_TOKEN'
      })
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const { email, user_metadata = {}, password } = body;

  try {
    const updateData = {};
    
    if (email) {
      if (!isValidEmail(email)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Invalid email format',
            code: 'INVALID_EMAIL'
          })
        };
      }
      updateData.email = email;
    }

    if (password) {
      if (!isValidPassword(password)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
            code: 'WEAK_PASSWORD'
          })
        };
      }
      updateData.password = password;
    }

    if (Object.keys(user_metadata).length > 0) {
      updateData.data = user_metadata;
    }

    const { data, error } = await supabaseAdmin.auth.updateUser(updateData);

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'UPDATE_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'User updated successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata
        }
      })
    };

  } catch (error) {
    console.error('Update user error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to update user',
        code: 'UPDATE_FAILED'
      })
    };
  }
}

// OAuth login
async function handleOAuthLogin(body) {
  const { provider, redirectTo } = body;
  
  const validProviders = ['google', 'github', 'discord', 'twitter'];
  if (!provider || !validProviders.includes(provider)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Valid provider is required',
        code: 'INVALID_PROVIDER',
        validProviders
      })
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || `${process.env.URL || 'https://your-site.netlify.app'}/auth/callback`
      }
    });

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'OAUTH_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        url: data.url,
        provider
      })
    };

  } catch (error) {
    console.error('OAuth login error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to initiate OAuth login',
        code: 'OAUTH_FAILED'
      })
    };
  }
}

// OAuth callback handler
async function handleOAuthCallback(body) {
  const { code, state, error: authError } = body;

  if (authError) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: `OAuth error: ${authError}`,
        code: 'OAUTH_CALLBACK_ERROR'
      })
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Authorization code is required',
        code: 'MISSING_AUTH_CODE'
      })
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'OAUTH_EXCHANGE_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'OAuth authentication successful',
        user: data.user,
        session: data.session
      })
    };

  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to process OAuth callback',
        code: 'OAUTH_CALLBACK_FAILED'
      })
    };
  }
}

// Change password
async function handlePasswordChange(body, headers) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Authorization token required',
        code: 'NO_TOKEN'
      })
    };
  }

  const { password } = body;

  if (!password) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'New password is required',
        code: 'MISSING_PASSWORD'
      })
    };
  }

  if (!isValidPassword(password)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        code: 'WEAK_PASSWORD'
      })
    };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.updateUser({
      password
    });

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'PASSWORD_CHANGE_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Password changed successfully'
      })
    };

  } catch (error) {
    console.error('Password change error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to change password',
        code: 'PASSWORD_CHANGE_FAILED'
      })
    };
  }
}

// Resend confirmation email
async function handleResendConfirmation(body, clientIP) {
  const { email } = body;

  if (!email) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      })
    };
  }

  if (!isValidEmail(email)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      })
    };
  }

  try {
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.URL || 'https://your-site.netlify.app'}/auth/callback`
      }
    });

    if (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message,
          code: error.status || 'RESEND_ERROR'
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Confirmation email sent successfully'
      })
    };

  } catch (error) {
    console.error('Resend confirmation error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to resend confirmation email',
        code: 'RESEND_FAILED'
      })
    };
  }
}