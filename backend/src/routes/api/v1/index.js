/**
 * API v1 Routes Index
 * Main router for all API v1 endpoints
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const { logger } = require('../../../utils/logger');

// Import route modules
const authRoutes = require('./auth');
const projectsRoutes = require('./projects');
const blogRoutes = require('./blog');
const contactRoutes = require('./contact');
const adminRoutes = require('./admin');
const userRoutes = require('./users');
const mediaRoutes = require('./media');
const analyticsRoutes = require('./analytics');

const router = express.Router();

// Security middleware
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:1313',
      'https://brandoncurrie.com',
      'https://www.brandoncurrie.com',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Session-ID',
    'X-API-Key',
    'Accept',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

router.use(cors(corsOptions));

// Compression middleware
router.use(compression());

// Global rate limiting
const globalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip;
  }
});

router.use(globalLimit);

// Request logging middleware
router.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });
  });
  
  next();
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      authentication: true,
      rateLimit: true,
      cors: true,
      compression: true,
      logging: true,
      validation: true
    }
  });
});

// API version info
router.get('/version', (req, res) => {
  res.json({
    version: '1.0.0',
    apiVersion: 'v1',
    releaseDate: '2025-08-23',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/v1/auth',
      projects: '/api/v1/projects',
      blog: '/api/v1/blog',
      contact: '/api/v1/contact',
      admin: '/api/v1/admin',
      users: '/api/v1/users',
      media: '/api/v1/media',
      analytics: '/api/v1/analytics'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/projects', projectsRoutes);
router.use('/blog', blogRoutes);
router.use('/contact', contactRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/media', mediaRoutes);
router.use('/analytics', analyticsRoutes);

// 404 handler for unmatched API routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    message: `The endpoint ${req.method} ${req.originalUrl} was not found`,
    availableEndpoints: {
      auth: 'POST /api/v1/auth/login, POST /api/v1/auth/register',
      projects: 'GET /api/v1/projects, GET /api/v1/projects/:id',
      blog: 'GET /api/v1/blog/posts, GET /api/v1/blog/posts/:slug',
      contact: 'POST /api/v1/contact',
      admin: 'GET /api/v1/admin/* (protected)',
      documentation: 'GET /api/docs'
    }
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // CORS errors
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      code: 'CORS_ERROR',
      message: 'Origin not allowed'
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details || error.message
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;