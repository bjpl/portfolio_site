/**
 * Enhanced Validation Middleware
 * Comprehensive input validation and sanitization
 */

const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');
const { logger } = require('../utils/logger');

/**
 * Common validation rules
 */
const commonValidations = {
  // ID validations
  uuid: param('id').isUUID().withMessage('Valid UUID required'),
  slug: param('slug').isSlug().withMessage('Valid slug required'),
  
  // Pagination
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sortBy').optional().isString().isLength({ max: 50 }).withMessage('Sort field too long'),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Sort order must be ASC or DESC')
  ],
  
  // Search and filtering
  search: query('search').optional().isString().isLength({ max: 100 }).withMessage('Search query too long'),
  category: query('category').optional().isString().isLength({ max: 50 }).withMessage('Category too long'),
  tag: query('tag').optional().isString().isLength({ max: 50 }).withMessage('Tag too long'),
  
  // Date ranges
  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
  ],
  
  // User data
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  name: [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters')
  ],
  
  username: body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters (letters, numbers, underscore, hyphen only)'),
  
  // Content validations
  title: body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title must be 1-255 characters'),
  description: body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  content: body('content').optional().trim().isLength({ max: 50000 }).withMessage('Content too long'),
  
  // URL validations
  url: body('url').optional().isURL({ protocols: ['http', 'https'] }).withMessage('Valid URL required'),
  imageUrl: body('imageUrl').optional().isURL({ protocols: ['http', 'https'] }).withMessage('Valid image URL required'),
  
  // Boolean validations
  boolean: (field) => body(field).optional().isBoolean().withMessage(`${field} must be true or false`),
  
  // Array validations
  stringArray: (field, maxItems = 50) => body(field)
    .optional()
    .isArray({ max: maxItems })
    .withMessage(`${field} must be an array with max ${maxItems} items`)
    .custom((arr) => {
      if (arr && arr.some(item => typeof item !== 'string' || item.length > 100)) {
        throw new Error(`${field} items must be strings under 100 characters`);
      }
      return true;
    }),
  
  // JSON object validation
  jsonObject: (field) => body(field).optional().isObject().withMessage(`${field} must be a valid object`)
};

/**
 * Specific validation sets for different endpoints
 */
const validationSets = {
  // User registration/profile
  userRegistration: [
    commonValidations.email,
    commonValidations.password,
    ...commonValidations.name,
    commonValidations.username,
    body('acceptTerms').equals('true').withMessage('Terms acceptance required'),
    body('newsletter').optional().isBoolean()
  ],
  
  userProfile: [
    ...commonValidations.name,
    commonValidations.username,
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio too long'),
    body('website').optional().isURL().withMessage('Valid website URL required'),
    body('location').optional().trim().isLength({ max: 100 }).withMessage('Location too long'),
    body('timezone').optional().isString().isLength({ max: 50 }),
    body('language').optional().isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']),
    commonValidations.jsonObject('settings'),
    commonValidations.jsonObject('preferences')
  ],
  
  // Project validation
  projectCreate: [
    commonValidations.title,
    body('slug').optional().isSlug().withMessage('Slug must be URL-friendly'),
    commonValidations.description,
    body('shortDescription').optional().trim().isLength({ max: 500 }),
    commonValidations.content,
    body('status').optional().isIn(['draft', 'published', 'archived']),
    commonValidations.boolean('featured'),
    commonValidations.boolean('isPublic'),
    commonValidations.imageUrl,
    body('thumbnailUrl').optional().isURL(),
    body('demoUrl').optional().isURL(),
    body('githubUrl').optional().isURL(),
    body('documentationUrl').optional().isURL(),
    commonValidations.stringArray('tags', 20),
    commonValidations.stringArray('skills', 30),
    commonValidations.stringArray('technologies', 30),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('client').optional().trim().isLength({ max: 100 }),
    body('role').optional().trim().isLength({ max: 100 }),
    body('teamSize').optional().isInt({ min: 1, max: 100 }),
    body('budget').optional().isNumeric(),
    body('duration').optional().isString().isLength({ max: 50 })
  ],
  
  // Contact form validation
  contactForm: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Name must be 2-100 characters (letters, spaces, hyphens, apostrophes, periods only)'),
    commonValidations.email,
    body('phone')
      .optional()
      .trim()
      .matches(/^[\+]?[\d\s\-\(\)]{10,20}$/)
      .withMessage('Valid phone number required'),
    body('company').optional().trim().isLength({ max: 100 }),
    body('website').optional().isURL(),
    body('subject').optional().trim().isLength({ min: 5, max: 200 }),
    body('message')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Message must be 10-2000 characters'),
    body('projectType').optional().isIn(['web-development', 'mobile-app', 'e-commerce', 'consulting', 'maintenance', 'other']),
    body('projectBudget').optional().isIn(['under-5k', '5k-15k', '15k-50k', '50k-100k', 'over-100k', 'not-specified']),
    body('projectTimeline').optional().isIn(['urgent', '1-month', '1-3-months', '3-6-months', '6-months-plus', 'flexible']),
    body('hearAboutUs').optional().isIn(['google', 'social-media', 'referral', 'portfolio', 'github', 'linkedin', 'other']),
    body('newsletter').optional().isBoolean(),
    body('gdprConsent').optional().isBoolean()
  ],
  
  // Media upload validation
  mediaUpload: [
    body('category').optional().isIn(['project', 'blog', 'profile', 'general']),
    commonValidations.title,
    commonValidations.description,
    body('altText').optional().trim().isLength({ max: 255 }),
    commonValidations.stringArray('tags', 10)
  ],
  
  // Authentication validation
  login: [
    body('email').notEmpty().withMessage('Email or username required'),
    body('password').notEmpty().withMessage('Password required'),
    body('rememberMe').optional().isBoolean()
  ],
  
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must meet security requirements'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
  ],
  
  forgotPassword: [
    commonValidations.email
  ],
  
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must meet security requirements')
  ]
};

/**
 * Sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization failed', {
      error: error.message,
      url: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Request processing failed',
      code: 'SANITIZATION_ERROR'
    });
  }
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {
        // Allow basic formatting in certain fields
        p: [],
        br: [],
        strong: [],
        b: [],
        em: [],
        i: [],
        ul: [],
        ol: [],
        li: [],
        a: ['href', 'title'],
        code: [],
        pre: []
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      // Limit object depth to prevent DoS
      if (key.length > 100) return; // Skip extremely long keys
      
      sanitized[key] = sanitizeObject(obj[key]);
    });
    return sanitized;
  }
  
  return obj;
};

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    logger.warn('Validation failed', {
      url: req.originalUrl,
      method: req.method,
      errors: errorDetails,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errorDetails,
      message: 'Please check your input and try again'
    });
  }
  
  next();
};

/**
 * Custom validation helpers
 */
const customValidations = {
  // Validate file upload
  validateFileUpload: (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
    return (req, res, next) => {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          code: 'NO_FILES'
        });
      }
      
      for (const file of req.files) {
        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: `File type ${file.mimetype} not allowed`,
            code: 'INVALID_FILE_TYPE',
            allowedTypes
          });
        }
        
        // Check file size
        if (file.size > maxSize) {
          return res.status(400).json({
            error: `File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
            code: 'FILE_TOO_LARGE',
            maxSize: Math.round(maxSize / 1024 / 1024)
          });
        }
        
        // Validate filename
        if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
          return res.status(400).json({
            error: 'Invalid filename characters',
            code: 'INVALID_FILENAME'
          });
        }
      }
      
      next();
    };
  },
  
  // Validate JSON Web Token format
  validateJWTFormat: body('token').matches(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/)
    .withMessage('Invalid token format'),
  
  // Validate UUID format
  validateUUIDFormat: (field) => body(field).matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    .withMessage(`${field} must be a valid UUID`),
  
  // Validate slug format
  validateSlugFormat: (field) => body(field).matches(/^[a-z0-9-]+$/)
    .withMessage(`${field} must be a valid slug (lowercase letters, numbers, hyphens only)`),
  
  // Validate color hex code
  validateHexColor: (field) => body(field).optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage(`${field} must be a valid hex color code`),
  
  // Validate timezone
  validateTimezone: (field) => body(field).optional().isIn(Intl.supportedValuesOf('timeZone'))
    .withMessage(`${field} must be a valid timezone`),
  
  // Validate IP address
  validateIP: (field) => body(field).optional().isIP()
    .withMessage(`${field} must be a valid IP address`),
  
  // Validate date is in the future
  validateFutureDate: (field) => body(field).optional().isISO8601().custom((value) => {
    if (new Date(value) <= new Date()) {
      throw new Error(`${field} must be a future date`);
    }
    return true;
  }),
  
  // Validate date range (start before end)
  validateDateRange: (startField, endField) => body(endField).optional().custom((endDate, { req }) => {
    const startDate = req.body[startField];
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      throw new Error(`${endField} must be after ${startField}`);
    }
    return true;
  })
};

/**
 * Rate limiting validation
 */
const validateRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    // Clean old entries
    for (const [ip, data] of attempts.entries()) {
      if (now - data.windowStart > windowMs) {
        attempts.delete(ip);
      }
    }
    
    // Check current attempts
    const userAttempts = attempts.get(key);
    
    if (!userAttempts) {
      attempts.set(key, { count: 1, windowStart: now });
      return next();
    }
    
    if (now - userAttempts.windowStart > windowMs) {
      // Reset window
      attempts.set(key, { count: 1, windowStart: now });
      return next();
    }
    
    if (userAttempts.count >= max) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((windowMs - (now - userAttempts.windowStart)) / 1000)
      });
    }
    
    userAttempts.count++;
    next();
  };
};

module.exports = {
  commonValidations,
  validationSets,
  sanitizeInput,
  handleValidationErrors,
  customValidations,
  validateRateLimit
};