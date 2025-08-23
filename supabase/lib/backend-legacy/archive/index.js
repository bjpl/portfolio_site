/**
 * API v2 Routes - Main Router
 * Comprehensive REST API with OpenAPI 3.0 specification
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import route modules
const authRoutes = require('./auth');
const contentRoutes = require('./content');
const searchRoutes = require('./search');
const analyticsRoutes = require('./analytics');
const webhookRoutes = require('./webhooks');
const graphqlRoutes = require('./graphql');
const fileRoutes = require('./files');
const systemRoutes = require('./system');

// Import middleware
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { logRequest } = require('../../middleware/logging');
const { errorHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Security middleware
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

router.use(compression());

// CORS configuration
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:1313', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  credentials: true
}));

// Rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message, code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip + ':' + (req.headers.authorization || req.headers['x-api-key'] || 'anonymous');
  }
});

// Different rate limits for different endpoints
router.use('/auth/login', createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts'));
router.use('/auth/register', createRateLimit(60 * 60 * 1000, 3, 'Too many registration attempts'));
router.use('/search', createRateLimit(60 * 1000, 30, 'Too many search requests'));
router.use('/files/upload', createRateLimit(60 * 60 * 1000, 50, 'Too many file uploads'));
router.use(createRateLimit(15 * 60 * 1000, 1000, 'Too many requests')); // General rate limit

// Request logging
router.use(logRequest);

// Parse JSON and URL-encoded data
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * @swagger
 * /api/v2:
 *   get:
 *     summary: API Information
 *     description: Returns API version and basic information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Portfolio Site REST API"
 *                 version:
 *                   type: string
 *                   example: "2.0.0"
 *                 description:
 *                   type: string
 *                   example: "Comprehensive REST API for portfolio management"
 *                 documentation:
 *                   type: string
 *                   example: "/api-docs"
 *                 graphql:
 *                   type: string
 *                   example: "/api/v2/graphql"
 */
router.get('/', (req, res) => {
  res.json({
    name: 'Portfolio Site REST API',
    version: '2.0.0',
    description: 'Comprehensive REST API for Hugo-based portfolio site',
    documentation: '/api-docs',
    graphql: '/api/v2/graphql',
    endpoints: {
      health: '/api/v2/health',
      auth: '/api/v2/auth',
      content: '/api/v2/content',
      search: '/api/v2/search',
      analytics: '/api/v2/analytics',
      webhooks: '/api/v2/webhooks',
      files: '/api/v2/files'
    },
    features: [
      'Full CRUD operations',
      'Advanced search & filtering',
      'Real-time analytics',
      'Webhook integrations',
      'GraphQL support',
      'Multi-language content',
      'File management',
      'SEO optimization'
    ]
  });
});

// Mount route modules
router.use('/health', systemRoutes);
router.use('/auth', authRoutes);
router.use('/content', contentRoutes);
router.use('/search', searchRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', authenticateToken, authorizeRole(['admin']), webhookRoutes);
router.use('/graphql', graphqlRoutes);
router.use('/files', fileRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    message: `The requested endpoint ${req.method} ${req.originalUrl} was not found`,
    availableEndpoints: [
      'GET /api/v2',
      'GET /api/v2/health',
      'POST /api/v2/auth/login',
      'GET /api/v2/content/blog',
      'GET /api/v2/content/portfolio',
      'GET /api/v2/search',
      'GET /api/v2/analytics/overview',
      'GET /api/v2/webhooks',
      'POST /api/v2/graphql',
      'POST /api/v2/files/upload'
    ],
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
router.use(errorHandler);

module.exports = router;