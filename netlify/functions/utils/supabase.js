/**
 * Supabase Utilities and Client Configuration
 * Provides singleton client, connection pooling, error handling, and response formatters
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables validation with new Supabase instance
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Validate new Supabase instance
if (!SUPABASE_URL.includes('tdmzayzkqyegvfgxlolj.supabase.co') && process.env.NODE_ENV === 'production') {
  console.warn('Warning: Not using expected Supabase instance');
}

// Singleton Supabase clients
let supabaseClient = null;
let supabaseServiceClient = null;

/**
 * Get Supabase client (anon key - for public operations)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Don't persist in serverless
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application': 'portfolio-site-functions',
          'x-supabase-instance': 'tdmzayzkqyegvfgxlolj'
        }
      }
    });
  }
  return supabaseClient;
}

/**
 * Get Supabase service client (service key - for admin operations)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseServiceClient() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY is required for admin operations');
  }
  
  if (!supabaseServiceClient) {
    supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application': 'portfolio-site-functions-admin',
          'x-supabase-instance': 'tdmzayzkqyegvfgxlolj'
        }
      }
    });
  }
  return supabaseServiceClient;
}

/**
 * Health check for Supabase connection
 * @returns {Promise<{healthy: boolean, latency?: number, error?: string}>}
 */
async function checkSupabaseHealth() {
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseClient();
    
    // Simple query to check connection
    const { data, error } = await supabase
      .from('health_check')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found, which is OK for health check
      return {
        healthy: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
    
    return {
      healthy: true,
      latency: Date.now() - startTime
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      latency: Date.now() - startTime
    };
  }
}

/**
 * Wrapper for Supabase operations with error handling
 * @param {Function} operation - Async function that performs the Supabase operation
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<{data: any, error: any, success: boolean}>}
 */
async function withErrorHandling(operation, operationName = 'Unknown operation') {
  try {
    const result = await operation();
    
    if (result.error) {
      console.error(`Supabase ${operationName} error:`, result.error);
      return {
        data: null,
        error: result.error,
        success: false
      };
    }
    
    return {
      data: result.data,
      error: null,
      success: true
    };
  } catch (error) {
    console.error(`Supabase ${operationName} exception:`, error);
    return {
      data: null,
      error: {
        message: error.message,
        code: 'EXCEPTION',
        details: error
      },
      success: false
    };
  }
}

/**
 * Standard response formatter for API endpoints
 * @param {boolean} success - Whether the operation was successful
 * @param {any} data - The response data
 * @param {string} message - Success/error message
 * @param {any} error - Error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted response object
 */
function formatResponse(success, data = null, message = '', error = null, statusCode = 200) {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    message
  };
  
  if (success) {
    response.data = data;
  } else {
    response.error = error || message;
    if (statusCode >= 500) {
      response.message = 'Internal server error';
      response.error = 'An unexpected error occurred';
    }
  }
  
  return response;
}

/**
 * Standard headers with CORS support
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Headers object
 */
function getStandardHeaders(additionalHeaders = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    ...additionalHeaders
  };
}

/**
 * Handle CORS preflight requests
 * @param {Object} event - Netlify function event
 * @returns {Object|null} Response object for preflight, or null to continue
 */
function handleCORS(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getStandardHeaders(),
      body: ''
    };
  }
  return null;
}

/**
 * Validate required fields in request data
 * @param {Object} data - Request data to validate
 * @param {string[]} requiredFields - Array of required field names
 * @returns {{valid: boolean, missing: string[]}}
 */
function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter(field => 
    !data[field] || (typeof data[field] === 'string' && !data[field].trim())
  );
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Rate limiting helper (simple memory-based)
 * @param {string} identifier - Client identifier (IP, user ID, etc.)
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} Whether request is allowed
 */
const rateLimitStore = new Map();

function checkRateLimit(identifier, maxRequests = 100, windowMs = 900000) { // 15 minutes default
  const now = Date.now();
  const key = identifier;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const record = rateLimitStore.get(key);
  
  if (now > record.resetTime) {
    // Reset the window
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Clean up rate limit store (call periodically)
 */
function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup rate limit store every hour
setInterval(cleanupRateLimit, 3600000);

module.exports = {
  getSupabaseClient,
  getSupabaseServiceClient,
  checkSupabaseHealth,
  withErrorHandling,
  formatResponse,
  getStandardHeaders,
  handleCORS,
  validateRequiredFields,
  sanitizeInput,
  checkRateLimit
};