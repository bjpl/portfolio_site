const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const config = require('../config');

/**
 * Helmet security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.server.isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: !config.server.isDevelopment,
});

/**
 * Global rate limiter
 */
const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      limit: config.rateLimit.maxRequests,
    });
  },
});

/**
 * Strict rate limiter for auth endpoints
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for file uploads
 */
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Upload limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for API endpoints
 */
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create endpoint-specific rate limiter
 */
const createRateLimiter = (options = {}) =>
  rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || 'Too many requests',
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || (req => req.ip),
    handler: (req, res) => {
      res.status(429).json({
        error: options.message || 'Too many requests',
        retryAfter: Math.ceil((options.windowMs || 900000) / 1000),
      });
    },
  });

/**
 * IP-based rate limiting with user override
 */
const hybridRateLimiter = (options = {}) => {
  const limiters = new Map();
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;

  return (req, res, next) => {
    const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;

    if (!limiters.has(key)) {
      limiters.set(
        key,
        createRateLimiter({
          windowMs,
          max: req.user ? max * 2 : max, // Authenticated users get higher limit
          message: options.message,
          keyGenerator: () => key,
        })
      );
    }

    limiters.get(key)(req, res, next);
  };
};

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in whitelist
    if (config.cors.origin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours
};

/**
 * Compression middleware
 */
const compressionOptions = {
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
};

/**
 * Security middleware to prevent common attacks
 */
const preventCommonAttacks = (req, res, next) => {
  // Prevent prototype pollution
  if (req.body && typeof req.body === 'object') {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    const checkObject = obj => {
      for (const key in obj) {
        if (dangerousKeys.includes(key)) {
          return res.status(400).json({ error: 'Invalid input' });
        }
        if (obj[key] && typeof obj[key] === 'object') {
          checkObject(obj[key]);
        }
      }
    };

    checkObject(req.body);
  }

  // Check for suspicious patterns in URLs
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /<script/gi, // Script injection
    /javascript:/gi, // JavaScript protocol
    /on\w+=/gi, // Event handlers
  ];

  const url = req.originalUrl;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
  }

  next();
};

/**
 * Request size limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxSize = config.upload.maxFileSize * 10; // 10x file size for requests

  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      maxSize,
    });
  }

  next();
};

/**
 * Trusted proxy configuration
 */
const configureTrustedProxy = app => {
  // Trust proxy if behind reverse proxy (nginx, cloudflare, etc.)
  if (config.server.isProduction) {
    app.set('trust proxy', 1);
  }
};

/**
 * Security event logger
 */
const logSecurityEvent = (eventType, req, details = {}) => {
  const event = {
    type: eventType,
    timestamp: new Date(),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    ...details,
  };

  // In production, send to monitoring service
  if (config.server.isProduction) {
    // Send to Sentry, LogRocket, etc.
    console.log('[SECURITY]', JSON.stringify(event));
  } else {
    console.log('[SECURITY]', event);
  }
};

/**
 * Honeypot middleware to detect bots
 */
const honeypot =
  (fieldName = 'website') =>
  (req, res, next) => {
    if (req.body && req.body[fieldName]) {
      logSecurityEvent('HONEYPOT_TRIGGERED', req, {
        field: fieldName,
        value: req.body[fieldName],
      });

      // Silently reject but appear successful
      return res.json({ message: 'Success' });
    }
    next();
  };

/**
 * Apply all security middleware
 */
const applySecurity = app => {
  // Configure trusted proxy
  configureTrustedProxy(app);

  // Basic security headers
  app.use(securityHeaders);

  // Compression
  app.use(compression(compressionOptions));

  // MongoDB query sanitization
  app.use(
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        logSecurityEvent('NOSQL_INJECTION_ATTEMPT', req, { key });
      },
    })
  );

  // Prevent common attacks
  app.use(preventCommonAttacks);

  // Request size limiting
  app.use(requestSizeLimiter);

  // Global rate limiting
  app.use('/api/', globalRateLimiter);
};

module.exports = {
  securityHeaders,
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  apiRateLimiter,
  createRateLimiter,
  hybridRateLimiter,
  corsOptions,
  compressionOptions,
  preventCommonAttacks,
  requestSizeLimiter,
  configureTrustedProxy,
  logSecurityEvent,
  honeypot,
  applySecurity,
};
