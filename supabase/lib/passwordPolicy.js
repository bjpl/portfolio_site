const crypto = require('crypto');
const logger = require('./logger');

class PasswordPolicy {
  constructor() {
    this.config = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      specialChars: '@$!%*?&',
      preventCommonPasswords: true,
      preventUserInfoInPassword: true,
      minPasswordAge: 24 * 60 * 60 * 1000, // 24 hours
      maxPasswordAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      passwordHistoryCount: 5,
      maxSequentialChars: 3,
      maxRepeatedChars: 3
    };
    
    // Common passwords list (top 100 most common)
    this.commonPasswords = new Set([
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      '1234567890', 'dragon', 'shadow', 'master', 'sunshine',
      'football', 'jesus', 'michael', 'ninja', 'mustang',
      'superman', 'batman', 'trustno1', 'hello', 'freedom',
      'whatever', 'login', 'princess', 'qwertyuiop', 'solo',
      'passw0rd', 'starwars', 'summer', 'flower', 'hotmail',
      'fuckoff', 'superman', '696969', 'rock', 'lovely',
      'babygirl', 'friends', 'basketball', 'fuckyou', 'secret',
      'michelle', 'jordan', 'baseball', 'party', 'cheese'
    ]);
  }

  /**
   * Validate password against policy
   */
  validatePassword(password, userData = {}) {
    const errors = [];
    const score = this.calculatePasswordStrength(password);
    
    // Length requirements
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }
    
    if (password.length > this.config.maxLength) {
      errors.push(`Password must not exceed ${this.config.maxLength} characters`);
    }
    
    // Character requirements
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.config.requireSpecialChars) {
      const specialCharsRegex = new RegExp(`[${this.escapeRegex(this.config.specialChars)}]`);
      if (!specialCharsRegex.test(password)) {
        errors.push(`Password must contain at least one special character (${this.config.specialChars})`);
      }
    }
    
    // Pattern checks
    if (this.hasSequentialChars(password)) {
      errors.push(`Password cannot contain more than ${this.config.maxSequentialChars} sequential characters`);
    }
    
    if (this.hasRepeatedChars(password)) {
      errors.push(`Password cannot contain more than ${this.config.maxRepeatedChars} repeated characters`);
    }
    
    // Common password check
    if (this.config.preventCommonPasswords && this.isCommonPassword(password)) {
      errors.push('Password is too common. Please choose a more secure password');
    }
    
    // User info check
    if (this.config.preventUserInfoInPassword && this.containsUserInfo(password, userData)) {
      errors.push('Password cannot contain personal information (name, email, username)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      score,
      strength: this.getStrengthLabel(score)
    };
  }

  /**
   * Calculate password strength score (0-100)
   */
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;
    
    // Pattern penalties
    if (this.hasSequentialChars(password)) score -= 10;
    if (this.hasRepeatedChars(password)) score -= 10;
    if (this.isCommonPassword(password)) score -= 25;
    
    // Entropy bonus
    const entropy = this.calculateEntropy(password);
    if (entropy > 50) score += 10;
    if (entropy > 75) score += 15;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate password entropy
   */
  calculateEntropy(password) {
    const charsets = {
      lowercase: /[a-z]/.test(password) ? 26 : 0,
      uppercase: /[A-Z]/.test(password) ? 26 : 0,
      numbers: /\d/.test(password) ? 10 : 0,
      symbols: /[^a-zA-Z0-9]/.test(password) ? 32 : 0
    };
    
    const charsetSize = Object.values(charsets).reduce((sum, size) => sum + size, 0);
    
    if (charsetSize === 0) return 0;
    
    return password.length * Math.log2(charsetSize);
  }

  /**
   * Get strength label from score
   */
  getStrengthLabel(score) {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  }

  /**
   * Check if password has sequential characters
   */
  hasSequentialChars(password) {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'qwertyuiopasdfghjklzxcvbnm',
      '0123456789'
    ];
    
    const lowerPassword = password.toLowerCase();
    
    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - this.config.maxSequentialChars; i++) {
        const subseq = sequence.substring(i, i + this.config.maxSequentialChars);
        if (lowerPassword.includes(subseq) || lowerPassword.includes(subseq.split('').reverse().join(''))) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check if password has repeated characters
   */
  hasRepeatedChars(password) {
    for (let i = 0; i <= password.length - this.config.maxRepeatedChars; i++) {
      const char = password[i];
      let count = 1;
      
      for (let j = i + 1; j < password.length && password[j] === char; j++) {
        count++;
      }
      
      if (count >= this.config.maxRepeatedChars) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if password is in common passwords list
   */
  isCommonPassword(password) {
    const lowerPassword = password.toLowerCase();
    
    // Direct match
    if (this.commonPasswords.has(lowerPassword)) {
      return true;
    }
    
    // Common variations
    const variations = [
      lowerPassword.replace(/[0@]/, 'o'),
      lowerPassword.replace(/[3]/, 'e'),
      lowerPassword.replace(/[1!]/, 'i'),
      lowerPassword.replace(/[5$]/, 's'),
      lowerPassword.replace(/[7]/, 't')
    ];
    
    return variations.some(variation => this.commonPasswords.has(variation));
  }

  /**
   * Check if password contains user information
   */
  containsUserInfo(password, userData) {
    const lowerPassword = password.toLowerCase();
    const userFields = [
      userData.firstName,
      userData.lastName,
      userData.username,
      userData.email?.split('@')[0] // Email local part
    ].filter(Boolean);
    
    for (const field of userFields) {
      if (field && field.length >= 3) {
        const lowerField = field.toLowerCase();
        if (lowerPassword.includes(lowerField) || lowerField.includes(lowerPassword)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check password age requirements
   */
  canChangePassword(user) {
    if (!user.passwordChangedAt) {
      return { canChange: true };
    }
    
    const timeSinceChange = Date.now() - new Date(user.passwordChangedAt).getTime();
    
    if (timeSinceChange < this.config.minPasswordAge) {
      const hoursRemaining = Math.ceil((this.config.minPasswordAge - timeSinceChange) / (60 * 60 * 1000));
      return {
        canChange: false,
        reason: `Password was changed recently. Must wait ${hoursRemaining} hours before changing again.`
      };
    }
    
    return { canChange: true };
  }

  /**
   * Check if password is expired
   */
  isPasswordExpired(user) {
    if (!user.passwordChangedAt || !this.config.maxPasswordAge) {
      return false;
    }
    
    const timeSinceChange = Date.now() - new Date(user.passwordChangedAt).getTime();
    return timeSinceChange > this.config.maxPasswordAge;
  }

  /**
   * Check password against history
   */
  async checkPasswordHistory(userId, newPassword) {
    try {
      const bcrypt = require('bcryptjs');
      const { User } = require('../models/User');
      
      const user = await User.findByPk(userId);
      if (!user || !user.passwordHistory) {
        return { isReused: false };
      }
      
      const history = user.passwordHistory || [];
      
      for (const historicalHash of history.slice(0, this.config.passwordHistoryCount)) {
        const matches = await bcrypt.compare(newPassword, historicalHash);
        if (matches) {
          return {
            isReused: true,
            message: `Password has been used recently. Please choose a different password.`
          };
        }
      }
      
      return { isReused: false };
    } catch (error) {
      logger.error('Password history check failed', error);
      return { isReused: false };
    }
  }

  /**
   * Add password to history
   */
  async addToPasswordHistory(userId, passwordHash) {
    try {
      const { User } = require('../models/User');
      
      const user = await User.findByPk(userId);
      if (!user) return;
      
      const history = user.passwordHistory || [];
      history.unshift(passwordHash);
      
      // Keep only recent passwords
      const trimmedHistory = history.slice(0, this.config.passwordHistoryCount);
      
      await user.update({ passwordHistory: trimmedHistory });
    } catch (error) {
      logger.error('Failed to update password history', error);
    }
  }

  /**
   * Generate secure password suggestions
   */
  generateSecurePassword(length = 16) {
    const charset = {
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      symbols: this.config.specialChars
    };
    
    let password = '';
    const charsetKeys = Object.keys(charset);
    
    // Ensure at least one character from each required set
    for (const key of charsetKeys) {
      const chars = charset[key];
      password += chars[crypto.randomInt(0, chars.length)];
    }
    
    // Fill remaining length
    const allChars = Object.values(charset).join('');
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  /**
   * Get password requirements as human-readable text
   */
  getPasswordRequirements() {
    const requirements = [];
    
    requirements.push(`Must be ${this.config.minLength}-${this.config.maxLength} characters long`);
    
    if (this.config.requireUppercase) {
      requirements.push('Must contain at least one uppercase letter');
    }
    
    if (this.config.requireLowercase) {
      requirements.push('Must contain at least one lowercase letter');
    }
    
    if (this.config.requireNumbers) {
      requirements.push('Must contain at least one number');
    }
    
    if (this.config.requireSpecialChars) {
      requirements.push(`Must contain at least one special character (${this.config.specialChars})`);
    }
    
    requirements.push(`Cannot contain more than ${this.config.maxSequentialChars} sequential characters`);
    requirements.push(`Cannot contain more than ${this.config.maxRepeatedChars} repeated characters`);
    requirements.push('Cannot be a common password');
    requirements.push('Cannot contain personal information');
    
    return requirements;
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if password needs to be changed soon
   */
  getPasswordExpiryWarning(user) {
    if (!user.passwordChangedAt || !this.config.maxPasswordAge) {
      return null;
    }
    
    const timeSinceChange = Date.now() - new Date(user.passwordChangedAt).getTime();
    const timeUntilExpiry = this.config.maxPasswordAge - timeSinceChange;
    
    // Warn 7 days before expiry
    if (timeUntilExpiry <= 7 * 24 * 60 * 60 * 1000 && timeUntilExpiry > 0) {
      const daysUntilExpiry = Math.ceil(timeUntilExpiry / (24 * 60 * 60 * 1000));
      return {
        warning: true,
        message: `Your password will expire in ${daysUntilExpiry} day(s). Please change it soon.`,
        daysRemaining: daysUntilExpiry
      };
    }
    
    return null;
  }
}

module.exports = new PasswordPolicy();
