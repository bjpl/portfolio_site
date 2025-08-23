const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Rate limiting
const rateLimitMap = new Map();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

/**
 * Extract JWT token from Authorization header
 */
function extractToken(headers) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}

/**
 * Verify JWT token with Supabase
 */
async function verifyToken(token) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }

    return user;
  } catch (error) {
    throw new Error(`Token verification error: ${error.message}`);
  }
}

/**
 * Check if user has required permissions
 */
function checkPermissions(user, requiredRole = null, requiredPermissions = []) {
  if (!user) {
    return false;
  }

  // Check role if specified
  if (requiredRole) {
    const userRole = user.app_metadata?.role || user.user_metadata?.role || 'user';
    
    // Role hierarchy: admin > editor > user
    const roleHierarchy = {
      'admin': 3,
      'editor': 2,
      'user': 1
    };

    const userRoleLevel = roleHierarchy[userRole] || 1;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 1;

    if (userRoleLevel < requiredRoleLevel) {
      return false;
    }
  }

  // Check specific permissions if provided
  if (requiredPermissions.length > 0) {
    const userPermissions = user.app_metadata?.permissions || [];
    const hasAllPermissions = requiredPermissions.every(perm => 
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      return false;
    }
  }

  return true;
}

/**
 * Rate limiting check
 */
function checkRateLimit(identifier, windowMs = 60000, maxRequests = 100) {
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
}

/**
 * Get client IP address
 */
function getClientIP(event) {
  return event.headers['x-forwarded-for'] || 
         event.headers['x-real-ip'] || 
         event.headers['cf-connecting-ip'] || 
         'unknown';
}

/**
 * Main authentication middleware
 */
async function requireAuth(event, options = {}) {
  const {
    requiredRole = null,
    requiredPermissions = [],
    rateLimit = { windowMs: 60000, maxRequests: 100 },
    allowAnonymous = false
  } = options;

  try {
    const token = extractToken(event.headers);
    
    // If no token and anonymous access is not allowed
    if (!token && !allowAnonymous) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      };
    }

    // Rate limiting
    if (rateLimit) {
      const clientIP = getClientIP(event);
      if (!checkRateLimit(clientIP, rateLimit.windowMs, rateLimit.maxRequests)) {
        return {
          statusCode: 429,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED'
          })
        };
      }
    }

    let user = null;

    // Verify token if provided
    if (token) {
      try {
        user = await verifyToken(token);
      } catch (error) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          })
        };
      }
    }

    // Check permissions
    if (!allowAnonymous && !checkPermissions(user, requiredRole, requiredPermissions)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: {
            role: requiredRole,
            permissions: requiredPermissions
          }
        })
      };
    }

    // Return user context for successful authentication
    return {
      success: true,
      user,
      context: {
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.app_metadata?.role || user?.user_metadata?.role || 'user',
        userPermissions: user?.app_metadata?.permissions || [],
        clientIP: getClientIP(event)
      }
    };

  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
}

/**
 * Middleware for optional authentication
 */
async function optionalAuth(event, options = {}) {
  return requireAuth(event, { ...options, allowAnonymous: true });
}

/**
 * Middleware for admin-only routes
 */
async function requireAdmin(event, options = {}) {
  return requireAuth(event, { ...options, requiredRole: 'admin' });
}

/**
 * Middleware for editor or admin routes
 */
async function requireEditor(event, options = {}) {
  return requireAuth(event, { ...options, requiredRole: 'editor' });
}

/**
 * Create a wrapper function for protected routes
 */
function withAuth(handler, authOptions = {}) {
  return async (event, context) => {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Authenticate request
    const authResult = await requireAuth(event, authOptions);
    
    // If authentication failed, return error
    if (!authResult.success) {
      return authResult;
    }

    // Add auth context to event
    event.auth = authResult.context;
    event.user = authResult.user;

    // Call the original handler
    try {
      return await handler(event, context);
    } catch (error) {
      console.error('Handler error:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Internal server error',
          code: 'HANDLER_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      };
    }
  };
}

/**
 * Create a wrapper function for admin-only routes
 */
function withAdminAuth(handler, options = {}) {
  return withAuth(handler, { ...options, requiredRole: 'admin' });
}

/**
 * Create a wrapper function for editor routes
 */
function withEditorAuth(handler, options = {}) {
  return withAuth(handler, { ...options, requiredRole: 'editor' });
}

/**
 * User context injection for templates/views
 */
function injectUserContext(user) {
  return {
    id: user?.id || null,
    email: user?.email || null,
    isAuthenticated: !!user,
    role: user?.app_metadata?.role || user?.user_metadata?.role || 'user',
    permissions: user?.app_metadata?.permissions || [],
    profile: {
      name: user?.user_metadata?.name || user?.user_metadata?.full_name || null,
      avatar: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
      ...user?.user_metadata
    },
    isAdmin: (user?.app_metadata?.role === 'admin'),
    isEditor: ['admin', 'editor'].includes(user?.app_metadata?.role || user?.user_metadata?.role),
    createdAt: user?.created_at,
    lastSignIn: user?.last_sign_in_at
  };
}

/**
 * Refresh token validation
 */
async function validateRefreshToken(refreshToken) {
  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      throw new Error(`Refresh token validation failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw new Error(`Refresh token validation error: ${error.message}`);
  }
}

/**
 * Session validation helper
 */
async function validateSession(event) {
  const token = extractToken(event.headers);
  
  if (!token) {
    return { valid: false, reason: 'No token provided' };
  }

  try {
    const user = await verifyToken(token);
    return { 
      valid: true, 
      user,
      context: injectUserContext(user)
    };
  } catch (error) {
    return { 
      valid: false, 
      reason: error.message 
    };
  }
}

/**
 * Clean up old rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  const maxAge = 3600000; // 1 hour
  
  for (const [identifier, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(timestamp => timestamp > (now - maxAge));
    if (validRequests.length === 0) {
      rateLimitMap.delete(identifier);
    } else {
      rateLimitMap.set(identifier, validRequests);
    }
  }
}, 600000); // Clean every 10 minutes

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireEditor,
  withAuth,
  withAdminAuth,
  withEditorAuth,
  verifyToken,
  extractToken,
  checkPermissions,
  checkRateLimit,
  getClientIP,
  injectUserContext,
  validateRefreshToken,
  validateSession,
  corsHeaders
};