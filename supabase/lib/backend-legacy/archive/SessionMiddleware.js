const session = require('express-session');
const MongoStore = require('connect-mongo');
const RedisStore = require('connect-redis');
const Redis = require('redis');
const crypto = require('crypto');

class SessionMiddleware {
  constructor() {
    this.sessionSecret = process.env.SESSION_SECRET || this.generateSessionSecret();
    this.store = this.createStore();
  }

  /**
   * Generate session secret if not provided
   */
  generateSessionSecret() {
    console.warn('SESSION_SECRET not provided, generating random secret (not suitable for production)');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Create session store
   */
  createStore() {
    const storeType = process.env.SESSION_STORE || 'memory';

    switch (storeType) {
      case 'redis':
        if (process.env.REDIS_URL) {
          const redisClient = Redis.createClient({
            url: process.env.REDIS_URL,
            legacyMode: true
          });
          
          redisClient.connect().catch(console.error);
          
          return new RedisStore({
            client: redisClient,
            prefix: 'sess:',
            ttl: 86400 // 24 hours
          });
        }
        console.warn('Redis URL not configured, falling back to memory store');
        return undefined;

      case 'mongodb':
        if (process.env.MONGODB_URI) {
          return MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
            ttl: 24 * 60 * 60 // 24 hours
          });
        }
        console.warn('MongoDB URI not configured, falling back to memory store');
        return undefined;

      default:
        console.warn('Using memory store for sessions (not suitable for production)');
        return undefined;
    }
  }

  /**
   * Basic session configuration
   */
  basic() {
    return session({
      secret: this.sessionSecret,
      name: 'portfolio.sid',
      resave: false,
      saveUninitialized: false,
      store: this.store,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      }
    });
  }

  /**
   * Secure session configuration for production
   */
  secure() {
    return session({
      secret: this.sessionSecret,
      name: 'portfolio.sid',
      resave: false,
      saveUninitialized: false,
      store: this.store,
      cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN
      },
      genid: () => {
        return crypto.randomBytes(32).toString('hex');
      }
    });
  }

  /**
   * Development session configuration
   */
  development() {
    return session({
      secret: this.sessionSecret,
      name: 'portfolio.dev.sid',
      resave: false,
      saveUninitialized: false,
      store: this.store,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      }
    });
  }

  /**
   * Configure session based on environment
   */
  configure() {
    if (process.env.NODE_ENV === 'production') {
      return this.secure();
    } else if (process.env.NODE_ENV === 'development') {
      return this.development();
    }
    return this.basic();
  }

  /**
   * Session security middleware
   */
  securityMiddleware() {
    return (req, res, next) => {
      // Regenerate session ID periodically
      if (req.session && req.session.user) {
        const lastRegeneration = req.session.lastRegeneration || 0;
        const now = Date.now();
        
        // Regenerate every 30 minutes
        if (now - lastRegeneration > 30 * 60 * 1000) {
          req.session.regenerate(() => {
            req.session.lastRegeneration = now;
            next();
          });
          return;
        }
      }

      // Set security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      });

      next();
    };
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection() {
    return (req, res, next) => {
      // Skip CSRF for API endpoints with API keys
      if (req.headers['x-api-key'] || 
          (req.headers.authorization && req.headers.authorization.includes('ak_'))) {
        return next();
      }

      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const token = req.headers['x-csrf-token'] || 
                   req.body._csrf || 
                   req.query._csrf;

      const sessionToken = req.session?.csrfToken;

      if (!token || !sessionToken || !this.verifyCSRFToken(token, sessionToken)) {
        return res.status(403).json({
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token'
        });
      }

      next();
    };
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(req) {
    const token = crypto.randomBytes(32).toString('hex');
    req.session.csrfToken = token;
    return token;
  }

  /**
   * Verify CSRF token
   */
  verifyCSRFToken(token, sessionToken) {
    return token && sessionToken && 
           crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));
  }

  /**
   * Session flash messages
   */
  flashMiddleware() {
    return (req, res, next) => {
      req.flash = (type, message) => {
        if (!req.session.flash) {
          req.session.flash = {};
        }
        if (!req.session.flash[type]) {
          req.session.flash[type] = [];
        }
        req.session.flash[type].push(message);
      };

      req.consumeFlash = (type) => {
        if (!req.session.flash || !req.session.flash[type]) {
          return [];
        }
        const messages = req.session.flash[type];
        delete req.session.flash[type];
        return messages;
      };

      res.locals.flash = req.session.flash || {};
      next();
    };
  }

  /**
   * Session timeout middleware
   */
  timeoutMiddleware(timeoutMinutes = 30) {
    return (req, res, next) => {
      if (req.session && req.session.user) {
        const now = Date.now();
        const lastActivity = req.session.lastActivity || 0;
        
        if (now - lastActivity > timeoutMinutes * 60 * 1000) {
          req.session.destroy(() => {
            res.status(401).json({
              error: 'Session expired',
              message: 'Your session has expired due to inactivity'
            });
          });
          return;
        }
        
        req.session.lastActivity = now;
      }
      
      next();
    };
  }

  /**
   * Concurrent session limiting
   */
  concurrentSessionLimit(maxSessions = 5) {
    return async (req, res, next) => {
      if (!req.session || !req.session.user) {
        return next();
      }

      try {
        const userId = req.session.user.id;
        const sessionId = req.session.id;

        // This would require a custom session store implementation
        // to track sessions by user ID
        // For now, just pass through
        next();
      } catch (error) {
        console.error('Concurrent session check error:', error);
        next();
      }
    };
  }

  /**
   * Session monitoring
   */
  monitoringMiddleware() {
    return (req, res, next) => {
      if (req.session && req.session.user) {
        // Log session activity
        console.log(`Session activity: User ${req.session.user.id}, IP: ${req.ip}, Path: ${req.path}`);
        
        // Track session metadata
        req.session.metadata = {
          lastIP: req.ip,
          lastUserAgent: req.get('User-Agent'),
          requestCount: (req.session.metadata?.requestCount || 0) + 1,
          lastActivity: new Date().toISOString()
        };
      }
      
      next();
    };
  }

  /**
   * Secure cookie configuration
   */
  configureCookies() {
    return (req, res, next) => {
      // Set secure cookie defaults
      res.cookie = ((originalCookie) => {
        return function(name, value, options = {}) {
          const secureOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            ...options
          };
          
          return originalCookie.call(this, name, value, secureOptions);
        };
      })(res.cookie);

      next();
    };
  }

  /**
   * Session cleanup middleware
   */
  cleanupMiddleware() {
    return (req, res, next) => {
      // Clean up session on logout
      if (req.path === '/logout' || req.path === '/auth/logout') {
        if (req.session) {
          req.session.destroy((err) => {
            if (err) {
              console.error('Session cleanup error:', err);
            }
            res.clearCookie('portfolio.sid');
            next();
          });
          return;
        }
      }
      
      next();
    };
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    try {
      // This would depend on the session store implementation
      return {
        activeSessions: 0, // Would need to implement with store
        totalSessions: 0,
        averageSessionDuration: 0,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Session stats error:', error);
      return null;
    }
  }

  /**
   * Validate session configuration
   */
  validateConfiguration() {
    const issues = [];

    if (!this.sessionSecret || this.sessionSecret.length < 32) {
      issues.push('Session secret is too short or missing');
    }

    if (process.env.NODE_ENV === 'production' && !this.store) {
      issues.push('Production environment should use persistent session store');
    }

    if (process.env.NODE_ENV === 'production' && !process.env.COOKIE_DOMAIN) {
      issues.push('Cookie domain should be set in production');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Session middleware with all security features
   */
  fullSecurityStack() {
    const middlewares = [];

    // Basic session
    middlewares.push(this.configure());
    
    // Security middleware
    middlewares.push(this.securityMiddleware());
    
    // Cookie configuration
    middlewares.push(this.configureCookies());
    
    // Flash messages
    middlewares.push(this.flashMiddleware());
    
    // Monitoring
    if (process.env.NODE_ENV !== 'test') {
      middlewares.push(this.monitoringMiddleware());
    }
    
    // Cleanup
    middlewares.push(this.cleanupMiddleware());

    return middlewares;
  }
}

module.exports = new SessionMiddleware();