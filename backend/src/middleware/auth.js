const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user data to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED' 
      });
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    
    // Check if user still exists and is active
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid or inactive user',
        code: 'USER_INACTIVE' 
      });
    }

    // Attach user data to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || []
    };

    // Log successful authentication
    logger.audit('auth_success', user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl
    });

    next();
  } catch (error) {
    logger.audit('auth_failed', null, {
      error: error.message,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl
    });

    if (error.message === 'Token expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }

    return res.status(401).json({ 
      error: 'Invalid token',
      code: 'TOKEN_INVALID' 
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if user has required role or permission
 */
const authorize = (rolesOrPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    const { role, permissions = [] } = req.user;
    const requiredItems = Array.isArray(rolesOrPermissions) 
      ? rolesOrPermissions 
      : [rolesOrPermissions];

    // Check if user has required role
    const hasRole = requiredItems.includes(role);
    
    // Check if user has required permission
    const hasPermission = requiredItems.some(item => 
      permissions.includes(item)
    );

    // Admin role has access to everything
    const isAdmin = role === 'admin';

    if (!hasRole && !hasPermission && !isAdmin) {
      logger.audit('access_denied', req.user.id, {
        required: requiredItems,
        userRole: role,
        userPermissions: permissions,
        endpoint: req.originalUrl
      });

      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredItems 
      });
    }

    next();
  };
};

/**
 * Permission-based authorization
 * More granular than role-based
 */
const requirePermission = (permission) => {
  return authorize([permission]);
};

/**
 * Role-based authorization
 * Requires specific role
 */
const requireRole = (role) => {
  return authorize([role]);
};

/**
 * Admin-only access
 */
const requireAdmin = () => {
  return requireRole('admin');
};

/**
 * Rate limiting for authentication endpoints
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    code: 'RATE_LIMITED',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP and email/username if provided
    const identifier = req.body?.email || req.body?.username || req.ip;
    return `auth:${identifier}`;
  },
  skip: (req) => {
    // Skip rate limiting for successful requests
    return req.rateLimit?.current === 1;
  }
});

/**
 * Brute force protection for login attempts
 */
const bruteForceProtection = async (req, res, next) => {
  try {
    const identifier = req.body?.email || req.body?.username;
    if (!identifier) {
      return next();
    }

    // Check rate limit using auth service
    await authService.checkRateLimit(identifier);
    next();
  } catch (error) {
    logger.security('brute_force_detected', {
      identifier: req.body?.email || req.body?.username,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(429).json({
      error: error.message,
      code: 'BRUTE_FORCE_PROTECTION'
    });
  }
};

/**
 * Session validation middleware
 * Validates active session and updates last activity
 */
const validateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    
    if (sessionId) {
      const session = await authService.getSession(sessionId);
      if (session) {
        req.session = session;
        // Update last activity
        await authService.updateSession(sessionId, {
          lastActivity: new Date(),
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Session validation failed', error);
    next(); // Continue without session
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await User.findByPk(decoded.id);
      
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || []
        };
      }
    }
  } catch (error) {
    // Ignore errors in optional auth
    logger.debug('Optional auth failed', error.message);
  }
  
  next();
};

/**
 * Device fingerprinting middleware
 * Tracks device characteristics for security
 */
const deviceFingerprinting = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  req.deviceFingerprint = {
    userAgent,
    acceptLanguage,
    acceptEncoding,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  
  next();
};

module.exports = {
  authenticateToken,
  authorize,
  requirePermission,
  requireRole,
  requireAdmin,
  authRateLimit,
  bruteForceProtection,
  validateSession,
  optionalAuth,
  deviceFingerprinting
};
