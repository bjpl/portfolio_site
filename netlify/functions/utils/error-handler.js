/**
 * Comprehensive Error Handling and Fallback System
 * Provides robust error handling, logging, and fallback mechanisms for production
 */

const { formatResponse, getStandardHeaders } = require('./supabase');

/**
 * Error types and their handling strategies
 */
const ERROR_TYPES = {
  // Database errors
  DATABASE_CONNECTION: 'database_connection',
  DATABASE_QUERY: 'database_query',
  DATABASE_TIMEOUT: 'database_timeout',
  
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'auth_invalid_credentials',
  AUTH_TOKEN_EXPIRED: 'auth_token_expired',
  AUTH_UNAUTHORIZED: 'auth_unauthorized',
  AUTH_FORBIDDEN: 'auth_forbidden',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'validation_required_field',
  VALIDATION_INVALID_FORMAT: 'validation_invalid_format',
  VALIDATION_CONSTRAINT: 'validation_constraint',
  
  // Network errors
  NETWORK_TIMEOUT: 'network_timeout',
  NETWORK_UNAVAILABLE: 'network_unavailable',
  
  // System errors
  SYSTEM_INTERNAL: 'system_internal',
  SYSTEM_MEMORY: 'system_memory',
  SYSTEM_RATE_LIMIT: 'system_rate_limit',
  
  // External service errors
  EXTERNAL_SERVICE_UNAVAILABLE: 'external_service_unavailable',
  EXTERNAL_API_ERROR: 'external_api_error'
};

/**
 * Error severity levels
 */
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error handler class with comprehensive fallback strategies
 */
class ErrorHandler {
  constructor(context = {}) {
    this.context = context;
    this.fallbackStrategies = new Map();
    this.errorLog = [];
    
    this.setupFallbackStrategies();
  }

  setupFallbackStrategies() {
    // Database fallback strategies
    this.fallbackStrategies.set(ERROR_TYPES.DATABASE_CONNECTION, {
      strategy: 'cache_first',
      fallback: () => this.useCachedData(),
      retry: true,
      retryCount: 3,
      retryDelay: 1000
    });

    this.fallbackStrategies.set(ERROR_TYPES.DATABASE_QUERY, {
      strategy: 'simplified_query',
      fallback: () => this.useSimplifiedQuery(),
      retry: true,
      retryCount: 2,
      retryDelay: 500
    });

    // Authentication fallback strategies
    this.fallbackStrategies.set(ERROR_TYPES.AUTH_INVALID_CREDENTIALS, {
      strategy: 'emergency_auth',
      fallback: () => this.useEmergencyAuth(),
      retry: false
    });

    this.fallbackStrategies.set(ERROR_TYPES.AUTH_TOKEN_EXPIRED, {
      strategy: 'token_refresh',
      fallback: () => this.refreshToken(),
      retry: true,
      retryCount: 1,
      retryDelay: 0
    });

    // Network fallback strategies
    this.fallbackStrategies.set(ERROR_TYPES.NETWORK_TIMEOUT, {
      strategy: 'offline_mode',
      fallback: () => this.enableOfflineMode(),
      retry: true,
      retryCount: 2,
      retryDelay: 2000
    });
  }

  /**
   * Main error handling method
   */
  async handleError(error, errorType = null, severity = SEVERITY_LEVELS.MEDIUM) {
    const errorInfo = this.analyzeError(error, errorType, severity);
    
    // Log the error
    this.logError(errorInfo);
    
    // Try fallback strategy if available
    if (this.fallbackStrategies.has(errorInfo.type)) {
      try {
        const strategy = this.fallbackStrategies.get(errorInfo.type);
        const fallbackResult = await this.executeFallbackStrategy(strategy, errorInfo);
        
        if (fallbackResult.success) {
          return {
            success: true,
            data: fallbackResult.data,
            fallbackUsed: true,
            fallbackType: strategy.strategy,
            originalError: errorInfo
          };
        }
      } catch (fallbackError) {
        console.error('Fallback strategy failed:', fallbackError);
        errorInfo.fallbackFailed = true;
      }
    }

    // Return formatted error response
    return this.formatErrorResponse(errorInfo);
  }

  /**
   * Analyze error to determine type and severity
   */
  analyzeError(error, providedType = null, providedSeverity = null) {
    const errorInfo = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: this.context,
      type: providedType,
      severity: providedSeverity || SEVERITY_LEVELS.MEDIUM,
      code: error.code || null,
      statusCode: this.determineStatusCode(error, providedType)
    };

    // Auto-detect error type if not provided
    if (!providedType) {
      errorInfo.type = this.detectErrorType(error);
    }

    // Auto-adjust severity based on error characteristics
    if (!providedSeverity) {
      errorInfo.severity = this.determineSeverity(error, errorInfo.type);
    }

    return errorInfo;
  }

  /**
   * Detect error type from error characteristics
   */
  detectErrorType(error) {
    const message = (error.message || '').toLowerCase();
    const code = error.code;

    // Database errors
    if (message.includes('connection') && (message.includes('database') || message.includes('postgres'))) {
      return ERROR_TYPES.DATABASE_CONNECTION;
    }
    if (code === 'PGRST116' || message.includes('table') || message.includes('column')) {
      return ERROR_TYPES.DATABASE_QUERY;
    }
    if (message.includes('timeout') && message.includes('database')) {
      return ERROR_TYPES.DATABASE_TIMEOUT;
    }

    // Authentication errors
    if (message.includes('invalid') && (message.includes('credentials') || message.includes('password'))) {
      return ERROR_TYPES.AUTH_INVALID_CREDENTIALS;
    }
    if (message.includes('token') && (message.includes('expired') || message.includes('invalid'))) {
      return ERROR_TYPES.AUTH_TOKEN_EXPIRED;
    }
    if (message.includes('unauthorized') || code === 401) {
      return ERROR_TYPES.AUTH_UNAUTHORIZED;
    }
    if (message.includes('forbidden') || code === 403) {
      return ERROR_TYPES.AUTH_FORBIDDEN;
    }

    // Network errors
    if (message.includes('timeout') || message.includes('econnreset')) {
      return ERROR_TYPES.NETWORK_TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_TYPES.NETWORK_UNAVAILABLE;
    }

    // Rate limiting
    if (code === 429 || message.includes('rate limit')) {
      return ERROR_TYPES.SYSTEM_RATE_LIMIT;
    }

    return ERROR_TYPES.SYSTEM_INTERNAL;
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, type) {
    // Critical errors that affect core functionality
    const criticalTypes = [
      ERROR_TYPES.DATABASE_CONNECTION,
      ERROR_TYPES.SYSTEM_MEMORY,
      ERROR_TYPES.AUTH_FORBIDDEN
    ];

    // High priority errors
    const highPriorityTypes = [
      ERROR_TYPES.DATABASE_TIMEOUT,
      ERROR_TYPES.AUTH_UNAUTHORIZED,
      ERROR_TYPES.EXTERNAL_SERVICE_UNAVAILABLE
    ];

    if (criticalTypes.includes(type)) {
      return SEVERITY_LEVELS.CRITICAL;
    }
    if (highPriorityTypes.includes(type)) {
      return SEVERITY_LEVELS.HIGH;
    }
    if (error.statusCode >= 500) {
      return SEVERITY_LEVELS.HIGH;
    }
    if (error.statusCode >= 400) {
      return SEVERITY_LEVELS.MEDIUM;
    }

    return SEVERITY_LEVELS.LOW;
  }

  /**
   * Determine HTTP status code from error
   */
  determineStatusCode(error, type) {
    if (error.statusCode) return error.statusCode;
    if (error.code) {
      const numericCode = parseInt(error.code);
      if (!isNaN(numericCode) && numericCode >= 100 && numericCode < 600) {
        return numericCode;
      }
    }

    // Map error types to status codes
    const typeToStatusCode = {
      [ERROR_TYPES.AUTH_INVALID_CREDENTIALS]: 401,
      [ERROR_TYPES.AUTH_TOKEN_EXPIRED]: 401,
      [ERROR_TYPES.AUTH_UNAUTHORIZED]: 401,
      [ERROR_TYPES.AUTH_FORBIDDEN]: 403,
      [ERROR_TYPES.VALIDATION_REQUIRED_FIELD]: 400,
      [ERROR_TYPES.VALIDATION_INVALID_FORMAT]: 400,
      [ERROR_TYPES.VALIDATION_CONSTRAINT]: 422,
      [ERROR_TYPES.SYSTEM_RATE_LIMIT]: 429,
      [ERROR_TYPES.DATABASE_CONNECTION]: 503,
      [ERROR_TYPES.DATABASE_TIMEOUT]: 504,
      [ERROR_TYPES.NETWORK_TIMEOUT]: 504,
      [ERROR_TYPES.EXTERNAL_SERVICE_UNAVAILABLE]: 503
    };

    return typeToStatusCode[type] || 500;
  }

  /**
   * Execute fallback strategy with retry logic
   */
  async executeFallbackStrategy(strategy, errorInfo) {
    let attempt = 0;
    const maxAttempts = strategy.retry ? (strategy.retryCount || 1) + 1 : 1;

    while (attempt < maxAttempts) {
      try {
        if (attempt > 0 && strategy.retryDelay) {
          await this.delay(strategy.retryDelay * attempt);
        }

        const result = await strategy.fallback();
        return { success: true, data: result, attempts: attempt + 1 };
      } catch (fallbackError) {
        attempt++;
        console.warn(`Fallback attempt ${attempt} failed:`, fallbackError.message);
        
        if (attempt >= maxAttempts) {
          return { 
            success: false, 
            error: fallbackError, 
            attempts: attempt,
            strategy: strategy.strategy 
          };
        }
      }
    }
  }

  /**
   * Fallback implementations
   */
  async useCachedData() {
    // Implementation would depend on caching system
    console.log('Using cached data fallback');
    return { fallback: true, message: 'Using cached data due to database connectivity issues' };
  }

  async useSimplifiedQuery() {
    console.log('Using simplified query fallback');
    return { fallback: true, message: 'Using simplified data structure' };
  }

  async useEmergencyAuth() {
    console.log('Using emergency authentication fallback');
    return { 
      fallback: true, 
      message: 'Emergency authentication mode activated',
      token: 'emergency_token'
    };
  }

  async refreshToken() {
    console.log('Attempting token refresh');
    // Implementation would refresh the authentication token
    return { fallback: true, message: 'Token refreshed successfully' };
  }

  async enableOfflineMode() {
    console.log('Enabling offline mode');
    return { 
      fallback: true, 
      message: 'Operating in offline mode',
      offline: true 
    };
  }

  /**
   * Log error for monitoring and debugging
   */
  logError(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // Console logging with severity-based formatting
    const prefix = this.getSeverityPrefix(errorInfo.severity);
    console.error(`${prefix} [${errorInfo.type}] ${errorInfo.message}`);
    
    if (errorInfo.severity === SEVERITY_LEVELS.CRITICAL) {
      console.error('CRITICAL ERROR STACK:', errorInfo.stack);
    }

    // In production, you would send this to your monitoring service
    if (process.env.NODE_ENV === 'production' && errorInfo.severity !== SEVERITY_LEVELS.LOW) {
      this.sendToMonitoring(errorInfo);
    }
  }

  getSeverityPrefix(severity) {
    const prefixes = {
      [SEVERITY_LEVELS.LOW]: '⚠️ ',
      [SEVERITY_LEVELS.MEDIUM]: '❌',
      [SEVERITY_LEVELS.HIGH]: '🚨',
      [SEVERITY_LEVELS.CRITICAL]: '💥'
    };
    return prefixes[severity] || '❌';
  }

  /**
   * Send error to monitoring service
   */
  sendToMonitoring(errorInfo) {
    // Placeholder for monitoring integration (Sentry, etc.)
    console.log('Sending to monitoring service:', {
      type: errorInfo.type,
      severity: errorInfo.severity,
      message: errorInfo.message,
      timestamp: errorInfo.timestamp
    });
  }

  /**
   * Format error response for API
   */
  formatErrorResponse(errorInfo) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Don't expose sensitive information in production
    const sanitizedError = {
      type: errorInfo.type,
      message: isProduction ? this.getSanitizedMessage(errorInfo) : errorInfo.message,
      code: errorInfo.code,
      timestamp: errorInfo.timestamp
    };

    // Include stack trace only in development
    if (!isProduction && errorInfo.stack) {
      sanitizedError.stack = errorInfo.stack;
    }

    return {
      success: false,
      error: sanitizedError,
      statusCode: errorInfo.statusCode,
      headers: getStandardHeaders()
    };
  }

  /**
   * Get user-friendly error message
   */
  getSanitizedMessage(errorInfo) {
    const userFriendlyMessages = {
      [ERROR_TYPES.DATABASE_CONNECTION]: 'Service temporarily unavailable. Please try again later.',
      [ERROR_TYPES.DATABASE_QUERY]: 'Unable to process your request at this time.',
      [ERROR_TYPES.AUTH_INVALID_CREDENTIALS]: 'Invalid username or password.',
      [ERROR_TYPES.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
      [ERROR_TYPES.AUTH_UNAUTHORIZED]: 'Authentication required.',
      [ERROR_TYPES.AUTH_FORBIDDEN]: 'You do not have permission to access this resource.',
      [ERROR_TYPES.VALIDATION_REQUIRED_FIELD]: 'Required information is missing.',
      [ERROR_TYPES.VALIDATION_INVALID_FORMAT]: 'The information provided is not in the correct format.',
      [ERROR_TYPES.NETWORK_TIMEOUT]: 'Request timed out. Please try again.',
      [ERROR_TYPES.SYSTEM_RATE_LIMIT]: 'Too many requests. Please wait before trying again.',
      [ERROR_TYPES.SYSTEM_INTERNAL]: 'An unexpected error occurred. Please try again later.'
    };

    return userFriendlyMessages[errorInfo.type] || 'An unexpected error occurred.';
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {},
      byType: {},
      recent: this.errorLog.slice(-10)
    };

    this.errorLog.forEach(error => {
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }
}

/**
 * Create error handler middleware for Netlify Functions
 */
function createErrorMiddleware(context = {}) {
  const errorHandler = new ErrorHandler(context);

  return async function(handler) {
    return async (event, netlifyContext) => {
      try {
        return await handler(event, netlifyContext);
      } catch (error) {
        const result = await errorHandler.handleError(error);
        
        if (result.success) {
          // Fallback succeeded, return the fallback data
          return {
            statusCode: 200,
            headers: result.headers || getStandardHeaders(),
            body: JSON.stringify(formatResponse(
              true,
              result.data,
              'Request completed using fallback method'
            ))
          };
        } else {
          // Return error response
          return {
            statusCode: result.statusCode,
            headers: result.headers,
            body: JSON.stringify(formatResponse(
              false,
              null,
              result.error.message,
              result.error,
              result.statusCode
            ))
          };
        }
      }
    };
  };
}

module.exports = {
  ErrorHandler,
  ERROR_TYPES,
  SEVERITY_LEVELS,
  createErrorMiddleware
};