/**
 * Security Middleware
 * Advanced security features including rate limiting, request validation, and threat detection
 */

const { SecurityUtils } = require('./auth-utils');

/**
 * Rate Limiting Middleware
 */
class RateLimiter {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = 300000; // 5 minutes
    
    this.startCleanup();
  }

  /**
   * Create rate limiter for specific endpoint
   */
  createLimiter(options = {}) {
    const {
      windowMs = 60000, // 1 minute
      maxRequests = 100,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = this.defaultKeyGenerator,
      handler = this.defaultHandler
    } = options;

    return async (event, context, next) => {
      const key = keyGenerator(event);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create store for this key
      if (!this.store.has(key)) {
        this.store.set(key, []);
      }

      const requests = this.store.get(key);
      const validRequests = requests.filter(req => req.timestamp > windowStart);

      // Check if limit exceeded
      if (validRequests.length >= maxRequests) {
        return handler(key, validRequests, maxRequests, windowMs);
      }

      // Record this request
      if (!skipSuccessfulRequests) {
        validRequests.push({
          timestamp: now,
          ip: this.getClientIP(event),
          userAgent: event.headers['user-agent'] || 'unknown'
        });
        
        this.store.set(key, validRequests);
      }

      // Continue to next handler
      const result = await next(event, context);

      // Record failed requests if needed
      if (!skipFailedRequests && result.statusCode >= 400) {
        const currentRequests = this.store.get(key) || [];
        currentRequests.push({
          timestamp: now,
          ip: this.getClientIP(event),
          userAgent: event.headers['user-agent'] || 'unknown',
          failed: true
        });
        
        this.store.set(key, currentRequests);
      }

      return result;
    };
  }

  /**
   * Default key generator (uses IP address)
   */
  defaultKeyGenerator(event) {
    return this.getClientIP(event);
  }

  /**
   * Default rate limit handler
   */
  defaultHandler(key, requests, maxRequests, windowMs) {
    const oldestRequest = Math.min(...requests.map(r => r.timestamp));
    const resetTime = oldestRequest + windowMs;
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      },
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        message: `Too many requests. Try again in ${retryAfter} seconds.`
      })
    };
  }

  /**
   * Get client IP address
   */
  getClientIP(event) {
    return event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           event.headers['x-real-ip'] || 
           event.headers['cf-connecting-ip'] || 
           'unknown';
  }

  /**
   * Start cleanup interval
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    let cleanedCount = 0;

    for (const [key, requests] of this.store.entries()) {
      const validRequests = requests.filter(req => 
        now - req.timestamp < maxAge
      );

      if (validRequests.length === 0) {
        this.store.delete(key);
        cleanedCount++;
      } else {
        this.store.set(key, validRequests);
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} rate limit entries`);
    }
  }

  /**
   * Get rate limit status for key
   */
  getStatus(key, windowMs = 60000, maxRequests = 100) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const requests = this.store.get(key) || [];
    const validRequests = requests.filter(req => req.timestamp > windowStart);

    return {
      key,
      requests: validRequests.length,
      maxRequests,
      remaining: Math.max(0, maxRequests - validRequests.length),
      resetTime: validRequests.length > 0 ? 
        Math.min(...validRequests.map(r => r.timestamp)) + windowMs : 
        now + windowMs,
      blocked: validRequests.length >= maxRequests
    };
  }
}

/**
 * Request Validation Middleware
 */
class RequestValidator {
  /**
   * Validate request structure
   */
  static validateRequest(schema) {
    return async (event, context, next) => {
      try {
        // Parse body if present
        let body = {};
        if (event.body) {
          try {
            body = JSON.parse(event.body);
          } catch (error) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                error: 'Invalid JSON in request body',
                code: 'INVALID_JSON'
              })
            };
          }
        }

        // Validate against schema
        const validation = this.validateObject(body, schema);
        if (!validation.valid) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Request validation failed',
              code: 'VALIDATION_ERROR',
              details: validation.errors
            })
          };
        }

        // Add validated data to event
        event.validatedBody = validation.data;
        
        return await next(event, context);
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Validation error',
            code: 'VALIDATION_FAILED'
          })
        };
      }
    };
  }

  /**
   * Validate object against schema
   */
  static validateObject(data, schema) {
    const errors = [];
    const validatedData = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      // Required check
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        if (rules.default !== undefined) {
          validatedData[field] = rules.default;
        }
        continue;
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`Field '${field}' must be of type ${rules.type}`);
        continue;
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
          continue;
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`Field '${field}' must be at most ${rules.maxLength} characters`);
          continue;
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`Field '${field}' format is invalid`);
          continue;
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field '${field}' must be at least ${rules.min}`);
          continue;
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field '${field}' must be at most ${rules.max}`);
          continue;
        }
      }

      // Array validations
      if (rules.type === 'object' && Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push(`Field '${field}' must have at least ${rules.minItems} items`);
          continue;
        }
        
        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push(`Field '${field}' must have at most ${rules.maxItems} items`);
          continue;
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
        continue;
      }

      // Custom validation
      if (rules.validate) {
        const customResult = rules.validate(value, data);
        if (customResult !== true) {
          errors.push(customResult || `Field '${field}' is invalid`);
          continue;
        }
      }

      // Transform value if needed
      validatedData[field] = rules.transform ? rules.transform(value) : value;
    }

    return {
      valid: errors.length === 0,
      errors,
      data: validatedData
    };
  }

  /**
   * Common validation schemas
   */
  static schemas = {
    email: {
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 254,
      transform: (value) => value.toLowerCase().trim()
    },
    
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    },
    
    name: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 100,
      transform: (value) => value.trim()
    },
    
    url: {
      type: 'string',
      required: false,
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'Must be a valid URL';
        }
      }
    }
  };
}

/**
 * Security Headers Middleware
 */
class SecurityHeaders {
  /**
   * Add security headers to response
   */
  static addSecurityHeaders(options = {}) {
    const {
      contentSecurityPolicy = true,
      xFrameOptions = 'DENY',
      xContentTypeOptions = 'nosniff',
      referrerPolicy = 'strict-origin-when-cross-origin',
      xXSSProtection = '1; mode=block'
    } = options;

    return async (event, context, next) => {
      const result = await next(event, context);

      const securityHeaders = {};

      if (contentSecurityPolicy) {
        securityHeaders['Content-Security-Policy'] = 
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self'; " +
          "connect-src 'self' https:; " +
          "frame-ancestors 'none';";
      }

      if (xFrameOptions) {
        securityHeaders['X-Frame-Options'] = xFrameOptions;
      }

      if (xContentTypeOptions) {
        securityHeaders['X-Content-Type-Options'] = xContentTypeOptions;
      }

      if (referrerPolicy) {
        securityHeaders['Referrer-Policy'] = referrerPolicy;
      }

      if (xXSSProtection) {
        securityHeaders['X-XSS-Protection'] = xXSSProtection;
      }

      return {
        ...result,
        headers: {
          ...result.headers,
          ...securityHeaders
        }
      };
    };
  }
}

/**
 * Threat Detection Middleware
 */
class ThreatDetection {
  constructor() {
    this.suspiciousIPs = new Map();
    this.blockedIPs = new Set();
    this.patterns = {
      sqlInjection: /(\b(union|select|insert|delete|drop|create|alter|exec|execute)\b)|(-{2})|(\*\/)|\/\*|\bor\b.*=.*\bor\b/i,
      xss: /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i,
      pathTraversal: /\.\.\/|\.\.\\/,
      commandInjection: /[;&|`$\(\)]/
    };
  }

  /**
   * Detect and block threats
   */
  createDetector(options = {}) {
    const {
      enableSQLInjectionDetection = true,
      enableXSSDetection = true,
      enablePathTraversalDetection = true,
      enableCommandInjectionDetection = true,
      suspiciousThreshold = 5,
      blockDuration = 3600000 // 1 hour
    } = options;

    return async (event, context, next) => {
      const clientIP = this.getClientIP(event);
      
      // Check if IP is blocked
      if (this.blockedIPs.has(clientIP)) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Access denied',
            code: 'IP_BLOCKED'
          })
        };
      }

      // Analyze request for threats
      const threats = this.analyzeRequest(event, {
        enableSQLInjectionDetection,
        enableXSSDetection,
        enablePathTraversalDetection,
        enableCommandInjectionDetection
      });

      if (threats.length > 0) {
        this.recordSuspiciousActivity(clientIP, threats);
        
        // Check if should block
        const suspiciousCount = this.suspiciousIPs.get(clientIP) || 0;
        if (suspiciousCount >= suspiciousThreshold) {
          this.blockIP(clientIP, blockDuration);
          
          console.warn(`Blocked IP ${clientIP} due to ${threats.join(', ')}`);
          
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Access denied due to suspicious activity',
              code: 'SUSPICIOUS_ACTIVITY_BLOCKED'
            })
          };
        }

        // Log threat but allow request
        console.warn(`Suspicious activity from ${clientIP}: ${threats.join(', ')}`);
      }

      return await next(event, context);
    };
  }

  /**
   * Analyze request for threats
   */
  analyzeRequest(event, options) {
    const threats = [];
    const checkData = [
      event.queryStringParameters,
      event.body ? JSON.parse(event.body) : {},
      event.headers
    ].filter(Boolean);

    for (const data of checkData) {
      const dataString = JSON.stringify(data);

      if (options.enableSQLInjectionDetection && 
          this.patterns.sqlInjection.test(dataString)) {
        threats.push('SQL injection attempt');
      }

      if (options.enableXSSDetection && 
          this.patterns.xss.test(dataString)) {
        threats.push('XSS attempt');
      }

      if (options.enablePathTraversalDetection && 
          this.patterns.pathTraversal.test(dataString)) {
        threats.push('Path traversal attempt');
      }

      if (options.enableCommandInjectionDetection && 
          this.patterns.commandInjection.test(dataString)) {
        threats.push('Command injection attempt');
      }
    }

    return threats;
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(ip, threats) {
    const currentCount = this.suspiciousIPs.get(ip) || 0;
    this.suspiciousIPs.set(ip, currentCount + threats.length);
  }

  /**
   * Block IP address
   */
  blockIP(ip, duration) {
    this.blockedIPs.add(ip);
    
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      this.suspiciousIPs.delete(ip);
    }, duration);
  }

  /**
   * Get client IP address
   */
  getClientIP(event) {
    return event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           event.headers['x-real-ip'] || 
           event.headers['cf-connecting-ip'] || 
           'unknown';
  }
}

/**
 * Input Sanitization Middleware
 */
class InputSanitizer {
  /**
   * Sanitize request inputs
   */
  static sanitizeInputs(options = {}) {
    const {
      stripHtml = true,
      trimWhitespace = true,
      maxFieldLength = 10000,
      allowedTags = []
    } = options;

    return async (event, context, next) => {
      // Sanitize query parameters
      if (event.queryStringParameters) {
        event.queryStringParameters = this.sanitizeObject(
          event.queryStringParameters, 
          { stripHtml, trimWhitespace, maxFieldLength }
        );
      }

      // Sanitize body
      if (event.body) {
        try {
          const body = JSON.parse(event.body);
          const sanitizedBody = this.sanitizeObject(
            body, 
            { stripHtml, trimWhitespace, maxFieldLength }
          );
          event.body = JSON.stringify(sanitizedBody);
        } catch (error) {
          // Invalid JSON, leave as is
        }
      }

      return await next(event, context);
    };
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj, options) {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj, options);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value, options);
    }

    return sanitized;
  }

  /**
   * Sanitize individual value
   */
  static sanitizeValue(value, options) {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Trim whitespace
    if (options.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Strip HTML
    if (options.stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Limit length
    if (options.maxFieldLength && sanitized.length > options.maxFieldLength) {
      sanitized = sanitized.substring(0, options.maxFieldLength);
    }

    return sanitized;
  }
}

// Create singleton instances
const rateLimiter = new RateLimiter();
const threatDetection = new ThreatDetection();

// Export middleware classes and instances
module.exports = {
  RateLimiter,
  RequestValidator,
  SecurityHeaders,
  ThreatDetection,
  InputSanitizer,
  rateLimiter,
  threatDetection
};