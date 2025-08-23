const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const MongoStore = require('rate-limit-mongo');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const AuthAttempt = require('../models/AuthAttempt');

class RateLimitMiddleware {
  constructor() {
    this.store = this.createStore();
  }

  /**
   * Create store for rate limiting (Redis, MongoDB, or memory)
   */
  createStore() {
    const storeType = process.env.RATE_LIMIT_STORE || 'memory';

    switch (storeType) {
      case 'redis':
        if (process.env.REDIS_URL) {
          const redisClient = Redis.createClient({
            url: process.env.REDIS_URL,
            legacyMode: true
          });
          return new RedisStore({
            sendCommand: (...args) => redisClient.call(...args)
          });
        }
        console.warn('Redis URL not configured, falling back to memory store');
        return undefined;

      case 'mongodb':
        if (process.env.MONGODB_URI) {
          return new MongoStore({
            uri: process.env.MONGODB_URI,
            collectionName: 'rate_limits',
            expireTimeMs: 15 * 60 * 1000 // 15 minutes
          });
        }
        console.warn('MongoDB URI not configured, falling back to memory store');
        return undefined;

      default:
        return undefined; // Use default memory store
    }
  }

  /**
   * General API rate limiting
   */
  general() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
      }
    });
  }

  /**
   * Strict rate limiting for authentication endpoints
   */
  auth() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      skipSuccessfulRequests: true, // Don't count successful requests
      keyGenerator: (req) => `auth:${req.ip}`,
      handler: async (req, res) => {
        // Log the rate limit violation
        await AuthAttempt.recordAttempt({
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          type: 'login',
          success: false,
          failureReason: 'rate_limit_exceeded',
          metadata: {
            endpoint: req.path,
            method: req.method
          }
        });

        res.status(429).json({
          error: 'Too many authentication attempts',
          message: 'Please try again later',
          retryAfter: '15 minutes'
        });
      }
    });
  }

  /**
   * Very strict rate limiting for password reset
   */
  passwordReset() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Limit each IP to 3 password reset requests per hour
      message: {
        error: 'Too many password reset attempts, please try again later',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req) => `reset:${req.ip}`,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many password reset attempts',
          message: 'Please try again in an hour',
          retryAfter: '1 hour'
        });
      }
    });
  }

  /**
   * Rate limiting for registration
   */
  register() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // Limit each IP to 5 registrations per hour
      message: {
        error: 'Too many registration attempts, please try again later',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req) => `register:${req.ip}`
    });
  }

  /**
   * API key rate limiting
   */
  apiKey() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: (req) => {
        // Different limits based on API key permissions
        const permissions = req.apiKey?.permissions;
        if (permissions?.admin) return 10000;
        if (permissions?.write) return 5000;
        return 1000; // Read-only
      },
      message: {
        error: 'API rate limit exceeded',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      keyGenerator: (req) => `api:${req.apiKey?.id || req.ip}`
    });
  }

  /**
   * Slow down repeated requests (progressive delay)
   */
  slowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 10, // Allow 10 requests per windowMs without delay
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 20000, // Maximum delay of 20 seconds
      store: this.store,
      keyGenerator: (req) => req.user?.id || req.ip
    });
  }

  /**
   * Custom rate limiting with database tracking
   */
  customRateLimit(options = {}) {
    const {
      windowMs = 15 * 60 * 1000,
      max = 100,
      trackInDb = true,
      type = 'custom'
    } = options;

    return async (req, res, next) => {
      const key = req.user?.id || req.ip;
      const windowStart = new Date(Date.now() - windowMs);

      try {
        if (trackInDb) {
          // Check database for attempts
          const attempts = await AuthAttempt.count({
            where: {
              ipAddress: req.ip,
              type: type,
              createdAt: {
                [AuthAttempt.sequelize.Sequelize.Op.gte]: windowStart
              }
            }
          });

          if (attempts >= max) {
            return res.status(429).json({
              error: 'Rate limit exceeded',
              message: 'Too many requests, please try again later',
              retryAfter: Math.ceil(windowMs / 1000)
            });
          }

          // Record this request
          await AuthAttempt.recordAttempt({
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            type: type,
            success: true,
            metadata: {
              endpoint: req.path,
              method: req.method
            }
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Don't block requests on rate limit errors
      }
    };
  }

  /**
   * Adaptive rate limiting based on user behavior
   */
  adaptiveRateLimit() {
    return async (req, res, next) => {
      try {
        const ip = req.ip;
        const userId = req.user?.id;
        
        // Check recent failure rate
        const recentAttempts = await AuthAttempt.getAttemptStats(ip, 1);
        const failureRate = recentAttempts.login_failed || 0;
        const successRate = recentAttempts.login_success || 0;
        
        // Adaptive limits based on behavior
        let maxRequests = 100; // Default
        let windowMs = 15 * 60 * 1000; // 15 minutes

        if (failureRate > 10) {
          // High failure rate - very strict limits
          maxRequests = 5;
          windowMs = 60 * 60 * 1000; // 1 hour
        } else if (failureRate > 5) {
          // Moderate failure rate - stricter limits
          maxRequests = 20;
          windowMs = 30 * 60 * 1000; // 30 minutes
        } else if (successRate > 50) {
          // Good user - more lenient limits
          maxRequests = 200;
        }

        // Apply the adaptive rate limit
        const windowStart = new Date(Date.now() - windowMs);
        const recentCount = await AuthAttempt.count({
          where: {
            ipAddress: ip,
            createdAt: {
              [AuthAttempt.sequelize.Sequelize.Op.gte]: windowStart
            }
          }
        });

        if (recentCount >= maxRequests) {
          return res.status(429).json({
            error: 'Adaptive rate limit exceeded',
            message: 'Request frequency too high based on recent activity',
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('Adaptive rate limiting error:', error);
        next();
      }
    };
  }

  /**
   * Whitelist certain IPs from rate limiting
   */
  createWhitelistMiddleware(whitelist = []) {
    const whitelistedIPs = new Set([
      '127.0.0.1',
      '::1',
      ...whitelist,
      ...(process.env.RATE_LIMIT_WHITELIST?.split(',') || [])
    ]);

    return (req, res, next) => {
      if (whitelistedIPs.has(req.ip)) {
        return next();
      }
      // Continue to rate limiting
      next();
    };
  }

  /**
   * Get rate limit status for debugging
   */
  getStatus() {
    return async (req, res, next) => {
      if (process.env.NODE_ENV !== 'development') {
        return next();
      }

      try {
        const ip = req.ip;
        const stats = await AuthAttempt.getAttemptStats(ip, 1);
        
        req.rateLimitStatus = {
          ip,
          stats,
          user: req.user?.id || 'anonymous'
        };

        next();
      } catch (error) {
        next();
      }
    };
  }

  /**
   * Cleanup old rate limit records
   */
  async cleanup() {
    try {
      const result = await AuthAttempt.cleanOldAttempts(7); // Keep 7 days
      console.log(`Cleaned ${result} old rate limit records`);
      return result;
    } catch (error) {
      console.error('Rate limit cleanup error:', error);
      return 0;
    }
  }

  /**
   * Check if IP is currently blocked
   */
  async isBlocked(ip) {
    try {
      return await AuthAttempt.isBlocked(ip);
    } catch (error) {
      console.error('Block check error:', error);
      return false;
    }
  }

  /**
   * Manual IP blocking middleware
   */
  blockCheck() {
    return async (req, res, next) => {
      try {
        const isBlocked = await this.isBlocked(req.ip);
        
        if (isBlocked) {
          return res.status(429).json({
            error: 'IP temporarily blocked',
            message: 'Too many failed attempts. Please try again later.',
            retryAfter: '15 minutes'
          });
        }

        next();
      } catch (error) {
        console.error('Block check middleware error:', error);
        next();
      }
    };
  }
}

module.exports = new RateLimitMiddleware();