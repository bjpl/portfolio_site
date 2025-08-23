const jwt = require('jsonwebtoken');
const TokenService = require('../services/TokenService');
const { User } = require('../../models/User');
const ApiKey = require('../models/ApiKey');
const AuthAttempt = require('../models/AuthAttempt');

class AuthMiddleware {
  /**
   * Authenticate JWT token
   */
  authenticate(options = {}) {
    const { required = true, roles = [] } = options;

    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          if (!required) {
            return next();
          }
          return res.status(401).json({
            error: 'Authentication required',
            message: 'No token provided'
          });
        }

        // Verify token
        const payload = TokenService.verifyAccessToken(token);

        // Check if token is blacklisted
        if (await TokenService.isTokenBlacklisted(payload.jti)) {
          return res.status(401).json({
            error: 'Token invalid',
            message: 'Token has been revoked'
          });
        }

        // Get user
        const user = await User.findByPk(payload.id);
        
        if (!user || !user.isActive) {
          return res.status(401).json({
            error: 'User not found',
            message: 'Invalid user or account deactivated'
          });
        }

        // Check role requirements
        if (roles.length > 0 && !roles.includes(user.role)) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            message: `Required role: ${roles.join(' or ')}`
          });
        }

        // Attach user to request
        req.user = user;
        req.token = token;
        req.tokenPayload = payload;

        next();
      } catch (error) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: error.message
        });
      }
    };
  }

  /**
   * Authenticate API key
   */
  authenticateApiKey(requiredPermissions = []) {
    return async (req, res, next) => {
      try {
        const apiKey = this.extractApiKey(req);

        if (!apiKey) {
          return res.status(401).json({
            error: 'API key required',
            message: 'No API key provided'
          });
        }

        // Find API key by prefix
        const prefix = apiKey.split('_')[0] + '_';
        const apiKeyRecord = await ApiKey.findOne({
          where: { prefix },
          include: ['user']
        });

        if (!apiKeyRecord) {
          await this.recordApiAttempt(req, false, 'invalid_key');
          return res.status(401).json({
            error: 'Invalid API key',
            message: 'API key not found'
          });
        }

        // Verify key
        if (!apiKeyRecord.verifyKey(apiKey)) {
          await this.recordApiAttempt(req, false, 'invalid_key');
          return res.status(401).json({
            error: 'Invalid API key',
            message: 'API key verification failed'
          });
        }

        // Check if key is valid
        if (!apiKeyRecord.isValid()) {
          await this.recordApiAttempt(req, false, 'key_expired_or_inactive');
          return res.status(401).json({
            error: 'API key invalid',
            message: 'API key is expired, inactive, or rate limited'
          });
        }

        // Check permissions
        if (requiredPermissions.length > 0) {
          const hasPermission = requiredPermissions.every(permission => 
            apiKeyRecord.permissions[permission] === true
          );

          if (!hasPermission) {
            await this.recordApiAttempt(req, false, 'insufficient_permissions');
            return res.status(403).json({
              error: 'Insufficient permissions',
              message: `Required permissions: ${requiredPermissions.join(', ')}`
            });
          }
        }

        // Check IP restrictions
        if (apiKeyRecord.allowedIPs.length > 0) {
          const clientIP = req.ip;
          const isAllowed = apiKeyRecord.allowedIPs.some(allowedIP => 
            this.ipMatches(clientIP, allowedIP)
          );

          if (!isAllowed) {
            await this.recordApiAttempt(req, false, 'ip_not_allowed');
            return res.status(403).json({
              error: 'IP not allowed',
              message: 'Request from unauthorized IP address'
            });
          }
        }

        // Check origin restrictions
        if (apiKeyRecord.allowedOrigins.length > 0) {
          const origin = req.get('Origin') || req.get('Referer');
          const isAllowed = origin && apiKeyRecord.allowedOrigins.some(allowedOrigin =>
            origin.includes(allowedOrigin)
          );

          if (!isAllowed) {
            await this.recordApiAttempt(req, false, 'origin_not_allowed');
            return res.status(403).json({
              error: 'Origin not allowed',
              message: 'Request from unauthorized origin'
            });
          }
        }

        // Update usage
        await apiKeyRecord.incrementUsage();
        await this.recordApiAttempt(req, true);

        // Attach to request
        req.apiKey = apiKeyRecord;
        req.user = apiKeyRecord.user;
        req.authMethod = 'api_key';

        next();
      } catch (error) {
        await this.recordApiAttempt(req, false, 'server_error');
        return res.status(401).json({
          error: 'API authentication failed',
          message: error.message
        });
      }
    };
  }

  /**
   * Role-based authorization
   */
  authorize(allowedRoles = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      if (allowedRoles.length === 0) {
        return next();
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${allowedRoles.join(' or ')}, current role: ${req.user.role}`
        });
      }

      next();
    };
  }

  /**
   * Permission-based authorization
   */
  requirePermissions(permissions = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const userPermissions = this.getUserPermissions(req.user);
      const hasAllPermissions = permissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required permissions: ${permissions.join(', ')}`
        });
      }

      next();
    };
  }

  /**
   * Resource ownership check
   */
  requireOwnership(resourceParam = 'id', userField = 'userId') {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required'
          });
        }

        const resourceId = req.params[resourceParam];
        const userId = req.user.id;

        // Admin can access all resources
        if (req.user.role === 'admin') {
          return next();
        }

        // Check if resource belongs to user
        // This would need to be implemented based on your specific models
        // For now, just check if the resource ID matches user ID
        if (resourceId !== userId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You can only access your own resources'
          });
        }

        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Authorization check failed',
          message: error.message
        });
      }
    };
  }

  /**
   * Optional authentication (doesn't fail if no token)
   */
  optionalAuth() {
    return this.authenticate({ required: false });
  }

  /**
   * Admin only access
   */
  adminOnly() {
    return this.authenticate({ roles: ['admin'] });
  }

  /**
   * Editor or higher access
   */
  editorOrHigher() {
    return this.authenticate({ roles: ['admin', 'editor'] });
  }

  /**
   * Author or higher access
   */
  authorOrHigher() {
    return this.authenticate({ roles: ['admin', 'editor', 'author'] });
  }

  /**
   * Extract token from request
   */
  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check query parameter for websocket connections
    if (req.query.token) {
      return req.query.token;
    }

    return null;
  }

  /**
   * Extract API key from request
   */
  extractApiKey(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('ak_')) {
        return token;
      }
    }

    // Check X-API-Key header
    if (req.headers['x-api-key']) {
      return req.headers['x-api-key'];
    }

    // Check query parameter
    if (req.query.api_key) {
      return req.query.api_key;
    }

    return null;
  }

  /**
   * Get user permissions based on role
   */
  getUserPermissions(user) {
    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_system'],
      editor: ['read', 'write', 'delete'],
      author: ['read', 'write'],
      viewer: ['read']
    };

    return rolePermissions[user.role] || ['read'];
  }

  /**
   * Check if IP matches allowed pattern (supports CIDR)
   */
  ipMatches(clientIP, allowedPattern) {
    if (clientIP === allowedPattern) {
      return true;
    }

    // Basic CIDR matching (would need a proper CIDR library for production)
    if (allowedPattern.includes('/')) {
      const [network, prefixLength] = allowedPattern.split('/');
      // Simplified check - implement proper CIDR matching
      return clientIP.startsWith(network.split('.').slice(0, Math.floor(prefixLength / 8)).join('.'));
    }

    return false;
  }

  /**
   * Record API authentication attempt
   */
  async recordApiAttempt(req, success, failureReason = null) {
    try {
      await AuthAttempt.recordAttempt({
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'api_key',
        success,
        failureReason,
        metadata: {
          endpoint: req.path,
          method: req.method
        }
      });
    } catch (error) {
      console.error('Failed to record API attempt:', error);
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user, permission) {
    const permissions = this.getUserPermissions(user);
    return permissions.includes(permission);
  }

  /**
   * Check if user can access resource
   */
  canAccessResource(user, resource, action = 'read') {
    // Admin can do anything
    if (user.role === 'admin') {
      return true;
    }

    // Check if user has required permission
    if (!this.hasPermission(user, action)) {
      return false;
    }

    // Check resource ownership
    if (resource.userId && resource.userId !== user.id) {
      // Only allow if user has elevated permissions
      return ['admin', 'editor'].includes(user.role);
    }

    return true;
  }

  /**
   * Validate session middleware
   */
  validateSession() {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return next();
        }

        // Check if user is still active
        const currentUser = await User.findByPk(req.user.id);
        
        if (!currentUser || !currentUser.isActive) {
          return res.status(401).json({
            error: 'Session invalid',
            message: 'User account is no longer active'
          });
        }

        // Check if user role changed (security)
        if (currentUser.role !== req.user.role) {
          return res.status(401).json({
            error: 'Session invalid',
            message: 'User permissions have changed, please re-authenticate'
          });
        }

        // Update user data in request
        req.user = currentUser;
        
        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Session validation failed',
          message: error.message
        });
      }
    };
  }

  /**
   * Enforce HTTPS in production
   */
  enforceHTTPS() {
    return (req, res, next) => {
      if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
        return res.redirect(301, `https://${req.get('Host')}${req.url}`);
      }
      next();
    };
  }
}

module.exports = new AuthMiddleware();