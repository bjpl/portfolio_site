const path = require('path');

const mongoSanitize = require('express-mongo-sanitize');
const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');

const config = require('../config');

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Sanitize HTML content
 */
const sanitizeHtml = value => {
  if (!value) return value;

  // XSS options for different content types
  const options = {
    whiteList: {
      a: ['href', 'title', 'target'],
      b: [],
      i: [],
      em: [],
      strong: [],
      p: [],
      br: [],
      ul: [],
      ol: [],
      li: [],
      blockquote: [],
      code: ['class'],
      pre: ['class'],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      img: ['src', 'alt', 'title', 'width', 'height'],
      table: [],
      thead: [],
      tbody: [],
      tr: [],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  };

  return xss(value, options);
};

/**
 * Sanitize markdown content
 */
const sanitizeMarkdown = value => {
  if (!value) return value;

  // Remove potential script injections while preserving markdown
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

/**
 * Validate and sanitize file upload
 */
const validateFileUpload =
  (fieldName = 'file') =>
  (req, res, next) => {
    if (!req.files || !req.files[fieldName]) {
      return next();
    }

    const files = Array.isArray(req.files[fieldName]) ? req.files[fieldName] : [req.files[fieldName]];

    for (const file of files) {
      // Check file size
      if (file.size > config.upload.maxFileSize) {
        return res.status(400).json({
          error: 'File too large',
          maxSize: config.upload.maxFileSize,
          actualSize: file.size,
        });
      }

      // Check file type
      const ext = path.extname(file.originalname).toLowerCase().slice(1);
      if (!config.upload.allowedFileTypes.includes(ext)) {
        return res.status(400).json({
          error: 'File type not allowed',
          allowedTypes: config.upload.allowedFileTypes,
          actualType: ext,
        });
      }

      // Sanitize filename
      file.sanitizedName = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
    }

    next();
  };

/**
 * Common validation rules
 */
const validators = {
  // User validations
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email required'),

  username: body('username')
    .isAlphanumeric()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 alphanumeric characters'),

  password: body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),

  // Content validations
  title: body('title').trim().isLength({ min: 1, max: 200 }).escape().withMessage('Title must be 1-200 characters'),

  slug: body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .isLength({ min: 1, max: 100 })
    .withMessage('Slug must be lowercase letters, numbers, and hyphens'),

  content: body('content')
    .trim()
    .isLength({ min: 1, max: 100000 })
    .customSanitizer(sanitizeMarkdown)
    .withMessage('Content required'),

  htmlContent: body('htmlContent')
    .trim()
    .isLength({ min: 1, max: 100000 })
    .customSanitizer(sanitizeHtml)
    .withMessage('HTML content required'),

  // Section and subsection
  section: body('section').isIn(['learn', 'make', 'meet', 'think']).withMessage('Invalid section'),

  subsection: body('subsection')
    .matches(/^[a-z-]+$/)
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid subsection'),

  // Language
  language: body('language').optional().isIn(['en', 'es']).withMessage('Invalid language'),

  // Pagination
  page: query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),

  limit: query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),

  // Sorting
  sortBy: query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'publishedAt'])
    .withMessage('Invalid sort field'),

  sortOrder: query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),

  // IDs
  id: param('id').isUUID().withMessage('Invalid ID format'),

  // Boolean flags
  draft: body('draft').optional().isBoolean().toBoolean().withMessage('Draft must be boolean'),

  published: body('published').optional().isBoolean().toBoolean().withMessage('Published must be boolean'),

  // Tags and categories
  tags: body('tags')
    .optional()
    .isArray()
    .customSanitizer(tags => tags.map(tag => tag.trim().toLowerCase()))
    .withMessage('Tags must be an array'),

  categories: body('categories')
    .optional()
    .isArray()
    .customSanitizer(cats => cats.map(cat => cat.trim().toLowerCase()))
    .withMessage('Categories must be an array'),

  // Metadata
  metadata: body('metadata')
    .optional()
    .isObject()
    .customSanitizer(mongoSanitize.sanitize)
    .withMessage('Metadata must be an object'),

  // Date validations
  startDate: query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),

  endDate: query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid end date')
    .custom((value, { req }) => {
      if (req.query.startDate && value < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  // Search
  search: query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .escape()
    .withMessage('Search query must be 1-100 characters'),
};

/**
 * Validation rule sets for different endpoints
 */
const validationRules = {
  // Auth validations
  register: [
    validators.email,
    validators.username,
    validators.password,
    body('firstName').optional().trim().isLength({ max: 50 }).escape(),
    body('lastName').optional().trim().isLength({ max: 50 }).escape(),
  ],

  login: [body('emailOrUsername').notEmpty().trim(), body('password').notEmpty()],

  // Content validations
  createContent: [
    validators.title,
    validators.content,
    validators.section,
    validators.subsection,
    validators.language,
    validators.draft,
    validators.tags,
    validators.categories,
    validators.metadata,
  ],

  updateContent: [
    validators.title.optional(),
    validators.content.optional(),
    validators.draft,
    validators.published,
    validators.tags,
    validators.categories,
    validators.metadata,
  ],

  // Query validations
  listContent: [
    validators.page,
    validators.limit,
    validators.sortBy,
    validators.sortOrder,
    validators.search,
    query('section').optional().isIn(['learn', 'make', 'meet', 'think']),
    query('subsection')
      .optional()
      .matches(/^[a-z-]+$/),
    query('language').optional().isIn(['en', 'es']),
    query('draft').optional().isBoolean().toBoolean(),
    query('published').optional().isBoolean().toBoolean(),
  ],

  // Bulk operations
  bulkCreate: [
    body('items').isArray({ min: 1, max: 100 }),
    body('items.*.title').trim().isLength({ min: 1, max: 200 }).escape(),
    body('items.*.section').isIn(['learn', 'make', 'meet', 'think']),
    body('items.*.subsection').matches(/^[a-z-]+$/),
    body('items.*.language').optional().isIn(['en', 'es']),
  ],

  // File operations
  uploadFile: [body('description').optional().trim().escape(), body('alt').optional().trim().escape()],
};

/**
 * Generic sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
  }

  // Sanitize query
  if (req.query) {
    req.query = mongoSanitize.sanitize(req.query);
  }

  // Sanitize params
  if (req.params) {
    req.params = mongoSanitize.sanitize(req.params);
  }

  next();
};

/**
 * Prevent NoSQL injection attacks
 */
const preventNoSQLInjection = (req, res, next) => {
  // Check for dangerous patterns
  const dangerous = ['$where', '$regex', '$ne', '$gt', '$lt', '$gte', '$lte'];

  const checkObject = obj => {
    if (!obj || typeof obj !== 'object') return false;

    for (const key in obj) {
      if (dangerous.includes(key)) return true;
      if (typeof obj[key] === 'object' && checkObject(obj[key])) return true;
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
};

/**
 * Validate JSON content type
 */
const requireJSON = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    if (!req.is('application/json')) {
      return res.status(400).json({
        error: 'Content-Type must be application/json',
      });
    }
  }
  next();
};

/**
 * Combined validation middleware
 */
const validate = rules => [requireJSON, sanitizeInput, preventNoSQLInjection, ...rules, handleValidationErrors];

module.exports = {
  validate,
  validators,
  validationRules,
  sanitizeHtml,
  sanitizeMarkdown,
  validateFileUpload,
  sanitizeInput,
  preventNoSQLInjection,
  requireJSON,
  handleValidationErrors,
};
