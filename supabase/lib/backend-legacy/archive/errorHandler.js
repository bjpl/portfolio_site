/**
 * Comprehensive Error Handling Middleware
 * Global error handling with logging, monitoring, and user-friendly responses
 */

const { logger } = require('../utils/logger');
const config = require('../config');

/**
 * Error types and codes
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ERROR_TYPES.VALIDATION_ERROR, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ERROR_TYPES.AUTHENTICATION_ERROR);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ERROR_TYPES.AUTHORIZATION_ERROR);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ERROR_TYPES.NOT_FOUND_ERROR);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, ERROR_TYPES.RATE_LIMIT_ERROR, { retryAfter });
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, ERROR_TYPES.DATABASE_ERROR, { originalError: originalError?.message });
  }
}

class FileUploadError extends AppError {
  constructor(message = 'File upload failed', details = null) {
    super(message, 400, ERROR_TYPES.FILE_UPLOAD_ERROR, details);
  }
}

/**
 * Error response formatter
 */
const formatErrorResponse = (error, req) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const baseResponse = {
    success: false,
    error: error.message,
    code: error.code || ERROR_TYPES.INTERNAL_SERVER_ERROR,
    timestamp: error.timestamp || new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add details if available
  if (error.details) {
    baseResponse.details = error.details;
  }

  // Add retry information for rate limiting
  if (error.code === ERROR_TYPES.RATE_LIMIT_ERROR && error.details?.retryAfter) {
    baseResponse.retryAfter = error.details.retryAfter;
  }

  // Include request ID if available
  if (req.id) {
    baseResponse.requestId = req.id;
  }

  // Include stack trace in development
  if (!isProduction && error.stack) {
    baseResponse.stack = error.stack;
  }

  return baseResponse;
};

/**
 * Database error handler
 */
const handleDatabaseError = (error, req) => {
  logger.error('Database error occurred', {
    error: error.message,
    stack: error.stack,
    sql: error.sql,
    parameters: error.parameters,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });

  // Handle specific Sequelize errors
  if (error.name === 'SequelizeValidationError') {
    const validationErrors = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return new ValidationError('Validation failed', validationErrors);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path || 'field';
    return new ValidationError(`${field} already exists`);
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new ValidationError('Invalid reference to related resource');
  }

  if (error.name === 'SequelizeConnectionError') {
    return new DatabaseError('Database connection failed');
  }

  if (error.name === 'SequelizeTimeoutError') {
    return new DatabaseError('Database operation timed out');
  }

  return new DatabaseError('Database operation failed');
};

/**
 * JWT error handler
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }

  return new AuthenticationError('Token validation failed');
};

/**
 * Multer (file upload) error handler
 */
const handleMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new FileUploadError('File size exceeds limit', {
      maxSize: error.limit,
      field: error.field
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return new FileUploadError('Too many files uploaded', {
      maxFiles: error.limit,
      field: error.field
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new FileUploadError('Unexpected file field', {
      field: error.field
    });
  }

  if (error.code === 'LIMIT_FIELD_KEY') {
    return new FileUploadError('Field name too long');
  }

  if (error.code === 'LIMIT_FIELD_VALUE') {
    return new FileUploadError('Field value too long');
  }

  if (error.code === 'LIMIT_FIELD_COUNT') {
    return new FileUploadError('Too many fields');
  }

  return new FileUploadError('File upload failed');
};

/**
 * Validation error handler
 */
const handleValidationError = (error) => {
  if (error.name === 'ValidationError' && error.details) {
    return new ValidationError('Validation failed', error.details);
  }

  return new ValidationError(error.message);
};

/**
 * Not found handler (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  let handledError = error;

  // Convert known error types
  if (error.name?.includes('Sequelize')) {
    handledError = handleDatabaseError(error, req);
  } else if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
    handledError = handleJWTError(error);
  } else if (error.code?.startsWith('LIMIT_')) {
    handledError = handleMulterError(error);
  } else if (error.name === 'ValidationError') {
    handledError = handleValidationError(error);
  } else if (!error.isOperational) {
    // Handle unexpected errors
    logger.error('Unexpected error occurred', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    handledError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : error.message,
      500,
      ERROR_TYPES.INTERNAL_SERVER_ERROR
    );
  }

  // Ensure we have a proper error object
  if (!(handledError instanceof AppError)) {
    handledError = new AppError(
      handledError.message || 'Internal server error',
      handledError.statusCode || 500,
      handledError.code || ERROR_TYPES.INTERNAL_SERVER_ERROR
    );
  }

  // Log operational errors
  if (handledError.isOperational) {
    const logLevel = handledError.statusCode >= 500 ? 'error' : 'warn';
    
    logger[logLevel]('Operational error occurred', {
      error: handledError.message,
      code: handledError.code,
      statusCode: handledError.statusCode,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: handledError.details
    });
  }

  // Format and send error response
  const errorResponse = formatErrorResponse(handledError, req);
  
  // Set additional headers for specific error types
  if (handledError.code === ERROR_TYPES.RATE_LIMIT_ERROR && handledError.details?.retryAfter) {
    res.set('Retry-After', handledError.details.retryAfter);
  }

  res.status(handledError.statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 * Wraps async route handlers to automatically catch and forward errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error monitoring and alerting
 */
const monitorError = (error, req, metadata = {}) => {
  // Integration points for external monitoring services
  // Example: Sentry, DataDog, New Relic, etc.
  
  if (process.env.SENTRY_DSN) {
    // Sentry integration example
    // Sentry.captureException(error, {
    //   user: req.user ? { id: req.user.id, email: req.user.email } : null,
    //   request: {
    //     url: req.originalUrl,
    //     method: req.method,
    //     headers: req.headers,
    //     ip: req.ip
    //   },
    //   extra: metadata
    // });
  }

  // Critical error alerts (email, Slack, etc.)
  if (error.statusCode >= 500 && process.env.ALERT_WEBHOOK) {
    // Send alert to monitoring system
    const alertPayload = {
      message: `Critical error in ${config.app.name}`,
      error: error.message,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      metadata
    };

    // Example webhook call (implement based on your monitoring setup)
    // axios.post(process.env.ALERT_WEBHOOK, alertPayload).catch(() => {
    //   logger.error('Failed to send error alert');
    // });
  }
};

/**
 * Graceful error handling for unhandled rejections and exceptions
 */
const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
    
    // Don't exit process for unhandled rejections in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  process.on('warning', (warning) => {
    logger.warn('Node.js Warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  FileUploadError,

  // Error handlers
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // Utilities
  ERROR_TYPES,
  formatErrorResponse,
  monitorError,
  setupGlobalErrorHandlers
};