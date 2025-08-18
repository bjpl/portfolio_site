/**
 * Application Constants
 * Centralized configuration for all magic numbers and constants
 */

module.exports = {
  // Authentication
  AUTH: {
    JWT_EXPIRY: process.env.JWT_EXPIRY || '1h',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    LOCKOUT_DURATION: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutes
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
    SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000, // 30 minutes
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    AUTH_MAX_REQUESTS: 5, // For login/register endpoints
    AUTH_WINDOW_MS: 15 * 60 * 1000,
    API_MAX_REQUESTS: 1000,
    API_WINDOW_MS: 15 * 60 * 1000,
  },

  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    MAX_IMAGE_SIZE: parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_FILE_TYPES: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/json', 'text/csv'
    ],
    MAX_FILES_PER_UPLOAD: 10,
    UPLOAD_TIMEOUT: 60000, // 1 minute
  },

  // Database
  DATABASE: {
    CONNECTION_TIMEOUT: parseInt(process.env.DB_TIMEOUT) || 30000,
    POOL_MIN: parseInt(process.env.DB_POOL_MIN) || 2,
    POOL_MAX: parseInt(process.env.DB_POOL_MAX) || 10,
    IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
    ACQUIRE_TIMEOUT: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
    EVICT_TIMEOUT: parseInt(process.env.DB_EVICT_TIMEOUT) || 1000,
  },

  // Cache
  CACHE: {
    DEFAULT_TTL: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
    SHORT_TTL: 300, // 5 minutes
    LONG_TTL: 86400, // 24 hours
    MAX_KEYS: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
    CHECK_PERIOD: 600, // 10 minutes
  },

  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_PAGE: 1,
  },

  // WebSocket
  WEBSOCKET: {
    HEARTBEAT_INTERVAL: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 60000, // 1 minute
    MAX_CONNECTIONS: parseInt(process.env.WS_MAX_CONNECTIONS) || 100,
    MESSAGE_SIZE_LIMIT: 1024 * 1024, // 1MB
    RECONNECT_DELAY: 1000,
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_BACKOFF_MULTIPLIER: 2,
    MAX_RECONNECT_DELAY: 30000,
  },

  // Logging
  LOGGING: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 5,
    ROTATION_INTERVAL: 60000, // 1 minute check
  },

  // Security
  SECURITY: {
    CORS_MAX_AGE: 86400, // 24 hours
    CSRF_TOKEN_LENGTH: 32,
    API_KEY_LENGTH: 32,
    OTP_LENGTH: 6,
    OTP_EXPIRY: 5 * 60 * 1000, // 5 minutes
  },

  // Analytics
  ANALYTICS: {
    BATCH_SIZE: 100,
    FLUSH_INTERVAL: 30000, // 30 seconds
    MAX_QUEUE_SIZE: 1000,
    RETENTION_DAYS: 90,
  },

  // Performance
  PERFORMANCE: {
    SLOW_QUERY_THRESHOLD: 1000, // 1 second
    SLOW_REQUEST_THRESHOLD: 3000, // 3 seconds
    MEMORY_CHECK_INTERVAL: 60000, // 1 minute
    MEMORY_THRESHOLD: 0.9, // 90% of available memory
  },

  // Email
  EMAIL: {
    MAX_RECIPIENTS: 50,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000, // 5 seconds
    TEMPLATE_CACHE_TTL: 3600, // 1 hour
  },

  // Build & Deploy
  BUILD: {
    TIMEOUT: 5 * 60 * 1000, // 5 minutes
    MAX_PARALLEL_BUILDS: 2,
    ARTIFACT_RETENTION_DAYS: 30,
    LOG_RETENTION_DAYS: 7,
  },

  // Content
  CONTENT: {
    TITLE_MAX_LENGTH: 200,
    EXCERPT_MAX_LENGTH: 500,
    SLUG_MAX_LENGTH: 100,
    TAG_MAX_LENGTH: 50,
    MAX_TAGS: 10,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    DRAFT_EXPIRY_DAYS: 30,
  },

  // API Response
  RESPONSE: {
    SUCCESS_CODE: 200,
    CREATED_CODE: 201,
    NO_CONTENT_CODE: 204,
    BAD_REQUEST_CODE: 400,
    UNAUTHORIZED_CODE: 401,
    FORBIDDEN_CODE: 403,
    NOT_FOUND_CODE: 404,
    CONFLICT_CODE: 409,
    UNPROCESSABLE_ENTITY_CODE: 422,
    TOO_MANY_REQUESTS_CODE: 429,
    INTERNAL_ERROR_CODE: 500,
    SERVICE_UNAVAILABLE_CODE: 503,
  },

  // Miscellaneous
  MISC: {
    DEFAULT_TIMEZONE: process.env.TZ || 'UTC',
    DEFAULT_LOCALE: process.env.LOCALE || 'en-US',
    DEFAULT_CURRENCY: process.env.CURRENCY || 'USD',
    MAX_URL_LENGTH: 2048,
    MAX_SEARCH_RESULTS: 100,
    SEARCH_MIN_LENGTH: 2,
    SEARCH_DEBOUNCE_MS: 300,
  },
};