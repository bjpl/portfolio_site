/**
 * Authentication Utilities
 * Helper functions for JWT handling, session management, and security
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * JWT Token Utilities
 */
class JWTUtils {
  constructor(secret = process.env.JWT_SECRET || 'fallback-secret') {
    this.secret = secret;
    this.algorithm = 'HS256';
    this.defaultExpiration = '1h';
  }

  /**
   * Generate JWT token
   */
  generateToken(payload, options = {}) {
    const {
      expiresIn = this.defaultExpiration,
      audience,
      issuer,
      subject
    } = options;

    const tokenOptions = {
      algorithm: this.algorithm,
      expiresIn,
      ...(audience && { audience }),
      ...(issuer && { issuer }),
      ...(subject && { subject })
    };

    return jwt.sign(payload, this.secret, tokenOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token, options = {}) {
    try {
      return jwt.verify(token, this.secret, {
        algorithm: this.algorithm,
        ...options
      });
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.payload.exp) {
        return true;
      }
      
      return Date.now() >= decoded.payload.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token) {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh token if close to expiry
   */
  refreshTokenIfNeeded(token, payload, thresholdMinutes = 5) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return null;

    const timeUntilExpiry = expiry.getTime() - Date.now();
    const thresholdMs = thresholdMinutes * 60 * 1000;

    if (timeUntilExpiry < thresholdMs) {
      return this.generateToken(payload);
    }

    return null;
  }
}

/**
 * Session Management Utilities
 */
class SessionManager {
  constructor() {
    this.sessions = new Map(); // In-memory store (consider Redis for production)
    this.cleanupInterval = 300000; // 5 minutes
    this.maxAge = 86400000; // 24 hours
    
    this.startCleanup();
  }

  /**
   * Create new session
   */
  createSession(userId, userData = {}, options = {}) {
    const sessionId = this.generateSessionId();
    const expiresAt = Date.now() + (options.maxAge || this.maxAge);
    
    const session = {
      id: sessionId,
      userId,
      userData,
      createdAt: Date.now(),
      expiresAt,
      lastAccessed: Date.now(),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      isActive: true
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last accessed
    session.lastAccessed = Date.now();
    return session;
  }

  /**
   * Update session
   */
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    Object.assign(session, updates, {
      lastAccessed: Date.now()
    });

    return session;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Delete all sessions for user
   */
  deleteUserSessions(userId) {
    let deletedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Get all sessions for user
   */
  getUserSessions(userId) {
    const userSessions = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isActive) {
        userSessions.push({
          id: session.id,
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed,
          expiresAt: session.expiresAt,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent
        });
      }
    }
    
    return userSessions;
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
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
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    const now = Date.now();
    const sessions = Array.from(this.sessions.values());
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.isActive).length,
      expired: sessions.filter(s => now > s.expiresAt).length,
      uniqueUsers: new Set(sessions.map(s => s.userId)).size
    };
  }
}

/**
 * Password Security Utilities
 */
class PasswordUtils {
  /**
   * Validate password strength
   */
  static validatePassword(password) {
    const minLength = 8;
    const maxLength = 128;
    
    const tests = {
      length: password.length >= minLength && password.length <= maxLength,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noSpaces: !/\s/.test(password)
    };

    const score = Object.values(tests).filter(Boolean).length;
    const isValid = score >= 5; // At least 5 out of 6 criteria

    return {
      isValid,
      score,
      tests,
      feedback: this.getPasswordFeedback(tests, password)
    };
  }

  /**
   * Get password feedback
   */
  static getPasswordFeedback(tests, password) {
    const feedback = [];

    if (!tests.length) {
      feedback.push('Password must be at least 8 characters long');
    }
    if (!tests.uppercase) {
      feedback.push('Add at least one uppercase letter');
    }
    if (!tests.lowercase) {
      feedback.push('Add at least one lowercase letter');
    }
    if (!tests.number) {
      feedback.push('Add at least one number');
    }
    if (!tests.special) {
      feedback.push('Add at least one special character (!@#$%^&*...)');
    }
    if (!tests.noSpaces) {
      feedback.push('Remove spaces from password');
    }

    // Check for common patterns
    if (this.isCommonPassword(password)) {
      feedback.push('This password is too common, choose something more unique');
    }

    return feedback;
  }

  /**
   * Check if password is commonly used
   */
  static isCommonPassword(password) {
    const common = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    return common.includes(password.toLowerCase());
  }

  /**
   * Generate secure random password
   */
  static generateSecurePassword(length = 16) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

/**
 * Security Utilities
 */
class SecurityUtils {
  /**
   * Generate secure random string
   */
  static generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate cryptographically secure UUID
   */
  static generateSecureUUID() {
    return crypto.randomUUID();
  }

  /**
   * Hash sensitive data
   */
  static hashData(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  static createHMAC(data, secret, algorithm = 'sha256') {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data, signature, secret, algorithm = 'sha256') {
    const expectedSignature = this.createHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Encrypt data using AES
   */
  static encrypt(text, password) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data using AES
   */
  static decrypt(encryptedData, password) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(password, 'salt', 32);
    
    const decipher = crypto.createDecipher(
      algorithm, 
      key, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Trim whitespace
    if (options.trim !== false) {
      sanitized = sanitized.trim();
    }

    // Remove HTML if specified
    if (options.stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Limit length if specified
    if (options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if IP is in allowed range
   */
  static isAllowedIP(ip, allowedRanges = []) {
    if (allowedRanges.length === 0) {
      return true;
    }

    // Simple implementation - can be extended with proper CIDR matching
    return allowedRanges.some(range => {
      if (range === ip) return true;
      if (range.includes('*')) {
        const pattern = range.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(ip);
      }
      return false;
    });
  }

  /**
   * Rate limiting helper
   */
  static createRateLimiter(windowMs = 60000, maxRequests = 100) {
    const requests = new Map();

    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      for (const [id, timestamps] of requests.entries()) {
        const validTimestamps = timestamps.filter(t => t > windowStart);
        if (validTimestamps.length === 0) {
          requests.delete(id);
        } else {
          requests.set(id, validTimestamps);
        }
      }

      // Check current identifier
      const currentRequests = requests.get(identifier) || [];
      const validRequests = currentRequests.filter(t => t > windowStart);

      if (validRequests.length >= maxRequests) {
        return {
          allowed: false,
          resetTime: Math.min(...validRequests) + windowMs,
          remainingRequests: 0
        };
      }

      // Add current request
      validRequests.push(now);
      requests.set(identifier, validRequests);

      return {
        allowed: true,
        resetTime: now + windowMs,
        remainingRequests: maxRequests - validRequests.length
      };
    };
  }
}

/**
 * Role and Permission Utilities
 */
class RoleUtils {
  static roleHierarchy = {
    'admin': 100,
    'editor': 50,
    'user': 10,
    'guest': 1
  };

  /**
   * Check if user has required role level
   */
  static hasRoleLevel(userRole, requiredRole) {
    const userLevel = this.roleHierarchy[userRole] || 0;
    const requiredLevel = this.roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has specific permissions
   */
  static hasPermissions(userPermissions = [], requiredPermissions = []) {
    if (!Array.isArray(requiredPermissions)) {
      requiredPermissions = [requiredPermissions];
    }

    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Get effective permissions for role
   */
  static getEffectivePermissions(role, customPermissions = []) {
    const rolePermissions = {
      admin: ['*'], // All permissions
      editor: ['read', 'write', 'edit', 'publish'],
      user: ['read', 'comment'],
      guest: ['read']
    };

    const basePermissions = rolePermissions[role] || ['read'];
    
    // If admin, return wildcard
    if (basePermissions.includes('*')) {
      return ['*'];
    }

    // Combine role permissions with custom permissions
    return [...new Set([...basePermissions, ...customPermissions])];
  }

  /**
   * Check if permission is allowed
   */
  static isPermissionAllowed(userPermissions, requiredPermission) {
    // Admin wildcard check
    if (userPermissions.includes('*')) {
      return true;
    }

    // Direct permission check
    return userPermissions.includes(requiredPermission);
  }
}

// Create singleton instances
const jwtUtils = new JWTUtils();
const sessionManager = new SessionManager();

// Export utilities
module.exports = {
  JWTUtils,
  SessionManager,
  PasswordUtils,
  SecurityUtils,
  RoleUtils,
  jwtUtils,
  sessionManager
};