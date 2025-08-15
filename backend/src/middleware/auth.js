const jwt = require('jsonwebtoken');

const config = require('../config');
const { User, Session } = require('../models/User');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, config.security.jwtSecret);

    // Find session
    const session = await Session.findOne({
      where: { token },
      include: ['user'],
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await session.destroy();
      return res.status(401).json({ error: 'Session expired' });
    }

    // Check if user is active
    if (!session.user.isActive) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    // Update last activity
    await session.update({ lastActivity: new Date() });

    // Attach user to request
    req.user = session.user;
    req.session = session;
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.security.jwtSecret);

    const session = await Session.findOne({
      where: { token },
      include: ['user'],
    });

    if (session && session.expiresAt > new Date() && session.user.isActive) {
      req.user = session.user;
      req.session = session;
      req.token = token;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Require specific role(s)
 */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };

/**
 * Require specific permission
 */
const requirePermission =
  (action, getResource = null) =>
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let resource = null;
    if (getResource) {
      resource = await getResource(req);
    }

    if (!req.user.can(action, resource)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        action,
        role: req.user.role,
      });
    }

    next();
  };

/**
 * Rate limit by user
 */
const userRateLimit = (maxRequests = 100, windowMs = 900000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const userRequests = requests.get(userId) || [];

    // Clean old requests
    const validRequests = userRequests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000),
      });
    }

    validRequests.push(now);
    requests.set(userId, validRequests);

    next();
  };
};

/**
 * Extract token from request
 */
function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // Check query parameter (for download links)
  if (req.query.token) {
    return req.query.token;
  }

  return null;
}

/**
 * API Key authentication (for external services)
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.apiKeys.external) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

/**
 * Admin only middleware
 */
const adminOnly = [authenticate, requireRole('admin')];

/**
 * Editor and above middleware
 */
const editorOnly = [authenticate, requireRole('admin', 'editor')];

/**
 * Author and above middleware
 */
const authorOnly = [authenticate, requireRole('admin', 'editor', 'author')];

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  userRateLimit,
  apiKeyAuth,
  adminOnly,
  editorOnly,
  authorOnly,
};
