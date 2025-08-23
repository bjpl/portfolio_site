/**
 * Authentication Middleware
 * Handles JWT authentication and role-based authorization
 */

const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const cache = require('../services/cache');

/**
 * Extract JWT token from request
 */
const extractToken = (req) => {
  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.substring(7);
  }
  
  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check query parameter (for WebSocket connections)
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  return null;
};

/**
 * Verify JWT token
 */
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
};

/**
 * Get user from cache or database
 */
const getUserById = async (userId) => {
  const cacheKey = `user:${userId}`;
  
  // Try cache first
  let user = await cache.get(cacheKey);
  if (user) {
    return JSON.parse(user);
  }
  
  // Get from database
  user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] }
      }
    ],
    attributes: { exclude: ['password', 'passwordResetToken', 'twoFactorSecret'] }
  });
  
  if (!user) {
    return null;
  }
  
  // Cache for 15 minutes
  await cache.set(cacheKey, JSON.stringify(user), 900);
  
  return user;
};

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('Access token required');
    }
    
    // Verify token
    const payload = verifyToken(token, config.security.jwtSecret);
    
    // Check if token is blacklisted
    const blacklistKey = `blacklist:${token}`;
    const isBlacklisted = await cache.get(blacklistKey);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }
    
    // Get user
    const user = await getUserById(payload.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    
    if (!user.isActive) {
      throw new AuthenticationError('User account is disabled');
    }
    
    // Add user methods
    user.hasRole = function(roles) {
      if (!Array.isArray(roles)) {
        roles = [roles];
      }
      
      if (!this.roles || this.roles.length === 0) {
        return false;
      }
      
      const userRoles = this.roles.map(role => role.name);
      return roles.some(role => userRoles.includes(role));
    };
    
    user.hasPermission = function(permission) {
      if (!this.roles || this.roles.length === 0) {
        return false;
      }
      
      return this.roles.some(role => 
        role.permissions && 
        Array.isArray(role.permissions) && 
        role.permissions.includes(permission)
      );
    };
    
    // Add user to request
    req.user = user;
    req.token = token;
    
    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }
    
    // Try to authenticate, but don't fail if invalid
    try {
      const payload = verifyToken(token, config.security.jwtSecret);
      
      // Check blacklist
      const blacklistKey = `blacklist:${token}`;
      const isBlacklisted = await cache.get(blacklistKey);
      if (!isBlacklisted) {
        const user = await getUserById(payload.userId);
        if (user && user.isActive) {
          // Add user methods
          user.hasRole = function(roles) {
            if (!Array.isArray(roles)) {
              roles = [roles];
            }
            
            if (!this.roles || this.roles.length === 0) {
              return false;
            }
            
            const userRoles = this.roles.map(role => role.name);
            return roles.some(role => userRoles.includes(role));
          };
          
          user.hasPermission = function(permission) {
            if (!this.roles || this.roles.length === 0) {
              return false;
            }
            
            return this.roles.some(role => 
              role.permissions && 
              Array.isArray(role.permissions) && 
              role.permissions.includes(permission)
            );
          };
          
          req.user = user;
          req.token = token;
        }
      }
    } catch (authError) {
      // Ignore authentication errors in optional mode
      logger.debug('Optional authentication failed:', authError.message);
    }
    
    next();
    
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Authorization middleware
 * Checks if user has required roles or permissions
 */
const authorize = (rolesOrPermissions, options = {}) => {
  const { requireAll = false, type = 'roles' } = options;
  
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }
      
      if (!Array.isArray(rolesOrPermissions)) {
        rolesOrPermissions = [rolesOrPermissions];
      }
      
      let hasAccess = false;
      
      if (type === 'roles') {
        if (requireAll) {
          hasAccess = rolesOrPermissions.every(role => req.user.hasRole(role));
        } else {
          hasAccess = req.user.hasRole(rolesOrPermissions);
        }
      } else if (type === 'permissions') {
        if (requireAll) {
          hasAccess = rolesOrPermissions.every(permission => req.user.hasPermission(permission));
        } else {
          hasAccess = rolesOrPermissions.some(permission => req.user.hasPermission(permission));
        }
      }
      
      if (!hasAccess) {
        throw new AuthorizationError('Insufficient permissions');
      }
      
      next();
      
    } catch (error) {
      logger.error('Authorization error:', error);
      next(error);
    }
  };
};

/**
 * Resource ownership authorization
 * Checks if user owns the resource or has admin rights
 */
const authorizeOwnership = (resourceParam = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Admins can access any resource
      if (req.user.hasRole('admin')) {
        return next();
      }
      
      const resourceId = req.params[resourceParam];
      if (!resourceId) {
        throw new AuthorizationError('Resource ID required');
      }
      
      // Resource ownership will be checked in the controller
      // This middleware just ensures the user is authenticated
      next();
      
    } catch (error) {
      logger.error('Ownership authorization error:', error);
      next(error);
    }
  };
};

/**
 * Rate limiting based on user role
 */
const roleBasedRateLimit = (limits) => {
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    // Get user's highest priority role limit
    let maxRequests = limits.default || 100;
    
    if (req.user.hasRole('admin')) {
      maxRequests = limits.admin || 1000;
    } else if (req.user.hasRole('editor')) {
      maxRequests = limits.editor || 500;
    } else if (req.user.hasRole('author')) {
      maxRequests = limits.author || 200;
    }
    
    // Store the limit for the rate limiter
    req.roleBasedLimit = maxRequests;
    
    next();
  };
};

/**
 * Two-factor authentication middleware
 */
const requireTwoFactor = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    if (!req.user.twoFactorEnabled) {
      return next();
    }
    
    // Check if 2FA was verified in this session
    const twoFactorKey = `2fa:verified:${req.user.id}:${req.token}`;
    const isVerified = await cache.get(twoFactorKey);
    
    if (!isVerified) {
      throw new AuthenticationError('Two-factor authentication required');
    }
    
    next();
    
  } catch (error) {
    logger.error('Two-factor authentication error:', error);
    next(error);
  }
};

/**
 * API key authentication middleware
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }
    
    // Get API key from cache or database
    const cacheKey = `apikey:${apiKey}`;
    let keyData = await cache.get(cacheKey);
    
    if (!keyData) {
      // In a real implementation, you'd have an ApiKey model
      // For now, we'll just check against a configured key
      if (apiKey !== config.security.apiKey) {
        throw new AuthenticationError('Invalid API key');
      }
      
      keyData = {
        id: 'system',
        name: 'System API Key',
        permissions: ['read', 'write']
      };
      
      await cache.set(cacheKey, JSON.stringify(keyData), 3600);
    } else {
      keyData = JSON.parse(keyData);
    }
    
    req.apiKey = keyData;
    
    next();
    
  } catch (error) {
    logger.error('API key authentication error:', error);
    next(error);
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  authorizeOwnership,
  roleBasedRateLimit,
  requireTwoFactor,
  authenticateApiKey,
  extractToken,
  verifyToken
};