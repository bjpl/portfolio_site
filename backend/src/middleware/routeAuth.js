const { isPublicRoute, isAdminRoute } = require('../config/routes');
const logger = require('../utils/logger');

const { authenticate, optionalAuth, requireRole } = require('./auth');

/**
 * Automatic route authentication middleware
 * Applies appropriate auth based on route configuration
 */
const autoAuth = (req, res, next) => {
  const { method, path, originalUrl } = req;

  // Remove query parameters for route matching
  const cleanPath = originalUrl.split('?')[0];

  // Check if route is public
  if (isPublicRoute(method, cleanPath)) {
    // Apply optional auth for public routes (to get user info if available)
    return optionalAuth(req, res, next);
  }

  // Check if route is admin/dev tool
  if (isAdminRoute(cleanPath)) {
    // In production, require admin role
    if (process.env.NODE_ENV === 'production') {
      return authenticate(req, res, err => {
        if (err) return next(err);

        if (!req.user || req.user.role !== 'admin') {
          logger.warn('Unauthorized admin access attempt', {
            path: cleanPath,
            userId: req.user?.id,
            role: req.user?.role,
            ip: req.ip,
          });

          return res.status(403).json({
            error: 'Admin access required',
            message: 'This area is restricted to administrators only',
          });
        }

        next();
      });
    }

    // In development, allow with warning
    if (process.env.NODE_ENV === 'development') {
      return optionalAuth(req, res, err => {
        if (err) return next(err);

        if (!req.user) {
          console.warn(`⚠️  Accessing admin route without auth in development: ${cleanPath}`);
        }

        next();
      });
    }
  }

  // Check specific route patterns
  if (cleanPath.startsWith('/api/author/')) {
    return authenticate(req, res, err => {
      if (err) return next(err);

      // Require at least author role
      if (!['admin', 'editor', 'author'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Author access required',
          message: 'You need author privileges to access this resource',
        });
      }

      next();
    });
  }

  if (cleanPath.startsWith('/api/review/') || cleanPath.startsWith('/api/bulk/')) {
    return authenticate(req, res, err => {
      if (err) return next(err);

      // Require at least editor role
      if (!['admin', 'editor'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Editor access required',
          message: 'You need editor privileges to access this resource',
        });
      }

      next();
    });
  }

  // Default: require authentication for non-public routes
  return authenticate(req, res, next);
};

/**
 * Development tools access control
 */
const devToolsAuth = (req, res, next) => {
  // Block all dev tools in production unless admin
  if (process.env.NODE_ENV === 'production') {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(404).json({
        error: 'Not found',
        message: 'This resource does not exist',
      });
    }
  }

  next();
};

/**
 * Admin panel access control
 */
const adminPanelAuth = (req, res, next) => {
  // Allow access to login page and auth resources without authentication
  const allowedPaths = [
    '/login.html',
    '/auth.js', 
    '/styles.css',
    '/dashboard.html',
    '/dashboard.js',
    '/admin-nav.js',
    '/toast.js',
    '/design-system.css',
    '/file-manager.html',
    '/review.html',
    '/bulk-upload.html',
    // Content Management pages
    '/content-editor.html',
    '/pages.html',
    '/blog-posts.html',
    '/portfolio-items.html',
    // Media & Assets pages
    '/image-optimizer.html',
    // Development Tools pages
    '/build-deploy.html',
    '/api-explorer.html',
    '/logs.html',
    // Settings pages
    '/site-settings.html',
    '/user-management.html',
    '/analytics.html',
    '/backup.html'
  ];
  
  if (allowedPaths.includes(req.path)) {
    return next();
  }

  // Try to authenticate the user
  authenticate(req, res, (err) => {
    if (err || !req.user) {
      // Redirect to login page for HTML requests
      if (!req.xhr && !req.headers.accept?.includes('application/json')) {
        return res.redirect('/admin/login.html');
      }
      
      // Return JSON error for API requests
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access the admin panel',
      });
    }

    // Check admin or editor role for admin panel
    if (process.env.NODE_ENV === 'production' && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access the admin panel',
      });
    }

    next();
  });
};

/**
 * API versioning middleware
 */
const apiVersion =
  (version = 'v1') =>
  (req, res, next) => {
    req.apiVersion = version;

    // Add version to response headers
    res.set('X-API-Version', version);

    next();
  };

/**
 * Track API usage for authenticated users
 */
const trackApiUsage = async (req, res, next) => {
  if (req.user) {
    try {
      // Log API usage for rate limiting and analytics
      logger.info('API usage', {
        userId: req.user.id,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (error) {
      // Don't block request if tracking fails
      logger.error('Failed to track API usage', error);
    }
  }

  next();
};

/**
 * CORS configuration for public API
 */
const publicCors = (req, res, next) => {
  // Allow CORS for public routes
  if (isPublicRoute(req.method, req.path)) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400');
  } else {
    // Restrict CORS for protected routes
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const { origin } = req.headers;

    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

module.exports = {
  autoAuth,
  devToolsAuth,
  adminPanelAuth,
  apiVersion,
  trackApiUsage,
  publicCors,
};
