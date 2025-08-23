const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Comprehensive Security Headers Configuration
 */
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline styles for admin interface
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some admin functionality
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "blob:"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.github.com", // For OAuth
        "https://accounts.google.com" // For OAuth
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    },
    reportOnly: false
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin']
  },
  
  // Permissions Policy
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: []
  }
});

/**
 * Global Rate Limiting
 */
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

/**
 * API Rate Limiting (more restrictive)
 */
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window for API
  message: {
    error: 'API rate limit exceeded',
    code: 'API_RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Upload Rate Limiting
 */
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    error: 'Upload rate limit exceeded',
    code: 'UPLOAD_RATE_LIMITED'
  }
});

/**
 * Input Sanitization Middleware
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize against NoSQL injection
  mongoSanitize()(req, res, () => {
    // XSS protection for string inputs
    const sanitizeObject = (obj) => {
      if (typeof obj === 'string') {
        return xss(obj, {
          whiteList: {}, // Remove all HTML tags
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script']
        });
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body and query parameters
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  });
};

/**
 * Request Logging for Security Monitoring
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // XSS attempts
    /union.*select/gi, // SQL injection
    /javascript:/gi, // JavaScript protocol
    /data:.*base64/gi // Data URI attacks
  ];
  
  const checkSuspicious = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  const url = req.originalUrl || req.url;
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';
  
  let suspicious = false;
  
  // Check URL, headers, and body for suspicious content
  if (checkSuspicious(url) || 
      checkSuspicious(userAgent) || 
      checkSuspicious(referer)) {
    suspicious = true;
  }
  
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (checkSuspicious(bodyString)) {
      suspicious = true;
    }
  }
  
  if (suspicious) {
    logger.security('suspicious_request', {
      ip: req.ip,
      method: req.method,
      url,
      userAgent,
      referer,
      body: req.body
    });
  }
  
  // Log response time and status
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (res.statusCode >= 400 || duration > 5000) {
      logger.security('slow_or_error_request', {
        ip: req.ip,
        method: req.method,
        url,
        statusCode: res.statusCode,
        duration,
        userAgent
      });
    }
  });
  
  next();
};

/**
 * IP Whitelist/Blacklist Middleware
 */
const ipFilter = (req, res, next) => {
  const clientIp = req.ip;
  
  // Check if IP is blacklisted
  const blacklistedIPs = config.security?.blacklistedIPs || [];
  if (blacklistedIPs.includes(clientIp)) {
    logger.security('blacklisted_ip_attempt', {
      ip: clientIp,
      url: req.originalUrl,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLACKLISTED'
    });
  }
  
  // Check whitelist for admin endpoints
  if (req.originalUrl.startsWith('/admin/api/')) {
    const whitelistedIPs = config.security?.adminWhitelistedIPs || [];
    if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIp)) {
      logger.security('non_whitelisted_admin_access', {
        ip: clientIp,
        url: req.originalUrl,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(403).json({
        error: 'Admin access not allowed from this IP',
        code: 'IP_NOT_WHITELISTED'
      });
    }
  }
  
  next();
};

/**
 * File Upload Security
 */
const fileUploadSecurity = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }
  
  const files = req.files || [req.file];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown'
  ];
  
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  
  for (const file of files) {
    if (!file) continue;
    
    // Check file size
    if (file.size > maxFileSize) {
      return res.status(400).json({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize: maxFileSize
      });
    }
    
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.security('disallowed_file_upload', {
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip
      });
      
      return res.status(400).json({
        error: 'File type not allowed',
        code: 'INVALID_FILE_TYPE',
        allowed: allowedMimeTypes
      });
    }
    
    // Check file extension matches MIME type
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const mimeToExt = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'text/markdown': ['md']
    };
    
    const expectedExts = mimeToExt[file.mimetype] || [];
    if (!expectedExts.includes(ext)) {
      logger.security('file_extension_mismatch', {
        filename: file.originalname,
        mimetype: file.mimetype,
        extension: ext,
        ip: req.ip
      });
      
      return res.status(400).json({
        error: 'File extension does not match content type',
        code: 'EXTENSION_MISMATCH'
      });
    }
  }
  
  next();
};

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://yourdomain.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.security('cors_violation', {
        origin,
        ip: 'unknown' // req not available here
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  securityHeaders,
  globalRateLimit,
  apiRateLimit,
  uploadRateLimit,
  sanitizeInput,
  securityLogger,
  ipFilter,
  fileUploadSecurity,
  corsOptions
};
