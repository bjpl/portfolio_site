const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const crypto = require('crypto');
const zxcvbn = require('zxcvbn');

class PasswordService {
  constructor() {
    this.defaultRounds = 12;
    this.argon2Options = {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
      hashLength: 32
    };
    
    this.useArgon2 = process.env.USE_ARGON2 === 'true';
    this.pepper = process.env.PASSWORD_PEPPER || '';
  }

  /**
   * Hash password using bcrypt or argon2
   */
  async hashPassword(password, options = {}) {
    try {
      const pepperedPassword = password + this.pepper;
      
      if (this.useArgon2) {
        return await argon2.hash(pepperedPassword, {
          ...this.argon2Options,
          ...options
        });
      } else {
        const saltRounds = options.rounds || this.defaultRounds;
        return await bcrypt.hash(pepperedPassword, saltRounds);
      }
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    try {
      const pepperedPassword = password + this.pepper;
      
      if (this.useArgon2) {
        return await argon2.verify(hash, pepperedPassword);
      } else {
        return await bcrypt.compare(pepperedPassword, hash);
      }
    } catch (error) {
      throw new Error(`Password verification failed: ${error.message}`);
    }
  }

  /**
   * Check if password needs rehashing (for bcrypt round updates)
   */
  needsRehash(hash, targetRounds = null) {
    if (this.useArgon2) {
      // Argon2 hashes don't need rehashing check in the same way
      return false;
    }
    
    const rounds = targetRounds || this.defaultRounds;
    return bcrypt.getRounds(hash) < rounds;
  }

  /**
   * Validate password strength
   */
  validatePassword(password, userData = {}) {
    const result = zxcvbn(password, [
      userData.username,
      userData.email,
      userData.firstName,
      userData.lastName,
      'password',
      'admin',
      'user'
    ].filter(Boolean));

    const requirements = {
      minLength: password.length >= 8,
      maxLength: password.length <= 128,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      notCommon: result.score >= 2,
      notPersonal: !this.containsPersonalInfo(password, userData)
    };

    const isValid = Object.values(requirements).every(Boolean);
    
    return {
      isValid,
      score: result.score,
      requirements,
      feedback: result.feedback,
      crackTimeDisplay: result.crack_times_display.offline_slow_hashing_1e4_per_second
    };
  }

  /**
   * Check if password contains personal information
   */
  containsPersonalInfo(password, userData) {
    const personalData = [
      userData.username,
      userData.email?.split('@')[0],
      userData.firstName,
      userData.lastName,
      userData.displayName
    ].filter(Boolean);

    const lowerPassword = password.toLowerCase();
    
    return personalData.some(data => 
      data.length > 2 && lowerPassword.includes(data.toLowerCase())
    );
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 16, options = {}) {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true,
      excludeSimilar = true,
      excludeAmbiguous = true
    } = options;

    let charset = '';
    
    if (includeLowercase) {
      charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }
    
    if (includeUppercase) {
      charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    
    if (includeNumbers) {
      charset += excludeSimilar ? '23456789' : '0123456789';
    }
    
    if (includeSymbols) {
      charset += excludeAmbiguous ? '!@#$%^&*-_=+[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
    }

    if (!charset) {
      throw new Error('At least one character type must be included');
    }

    let password = '';
    const randomBytes = crypto.randomBytes(length * 2);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    return password;
  }

  /**
   * Generate password reset token
   */
  generateResetToken() {
    return {
      token: crypto.randomBytes(32).toString('hex'),
      expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };
  }

  /**
   * Hash token for secure storage
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify reset token
   */
  verifyResetToken(token, hashedToken) {
    const hashedProvided = this.hashToken(token);
    return crypto.timingSafeEqual(
      Buffer.from(hashedToken, 'hex'),
      Buffer.from(hashedProvided, 'hex')
    );
  }

  /**
   * Check for commonly breached passwords
   */
  async isBreachedPassword(password) {
    try {
      // Use haveibeenpwned API to check password
      const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.substring(0, 5);
      const suffix = sha1.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const data = await response.text();

      const lines = data.split('\n');
      const match = lines.find(line => line.startsWith(suffix));

      if (match) {
        const count = parseInt(match.split(':')[1]);
        return { isBreached: true, count };
      }

      return { isBreached: false, count: 0 };
    } catch (error) {
      // If API is unavailable, don't block password changes
      console.warn('Password breach check failed:', error.message);
      return { isBreached: false, count: 0, error: error.message };
    }
  }

  /**
   * Time-safe password comparison to prevent timing attacks
   */
  async timeSafeVerify(password, hash) {
    try {
      const startTime = Date.now();
      const result = await this.verifyPassword(password, hash);
      
      // Add random delay to prevent timing analysis
      const elapsed = Date.now() - startTime;
      const minTime = 100; // Minimum 100ms
      
      if (elapsed < minTime) {
        await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
      }

      return result;
    } catch (error) {
      // Ensure consistent timing even on errors
      await new Promise(resolve => setTimeout(resolve, 100));
      throw error;
    }
  }

  /**
   * Migrate password hash to newer algorithm
   */
  async migratePasswordHash(currentHash, password) {
    try {
      // Verify with current hash
      const isValid = await this.verifyPassword(password, currentHash);
      if (!isValid) {
        throw new Error('Invalid password for migration');
      }

      // Generate new hash with current settings
      const newHash = await this.hashPassword(password);
      
      return {
        newHash,
        migrated: true,
        algorithm: this.useArgon2 ? 'argon2id' : 'bcrypt'
      };
    } catch (error) {
      throw new Error(`Password migration failed: ${error.message}`);
    }
  }

  /**
   * Generate password history entry
   */
  hashPasswordForHistory(password, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password + this.pepper, actualSalt, 10000, 64, 'sha256');
    
    return {
      salt: actualSalt,
      hash: hash.toString('hex')
    };
  }

  /**
   * Validate password policy compliance
   */
  validatePasswordPolicy(password, userData = {}, policy = {}) {
    const defaultPolicy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      minScore: 2,
      preventPersonalInfo: true,
      preventCommonPasswords: true,
      preventBreachedPasswords: false // Async check, handle separately
    };

    const activePolicy = { ...defaultPolicy, ...policy };
    const validation = this.validatePassword(password, userData);
    const errors = [];

    if (password.length < activePolicy.minLength) {
      errors.push(`Password must be at least ${activePolicy.minLength} characters long`);
    }

    if (password.length > activePolicy.maxLength) {
      errors.push(`Password must not exceed ${activePolicy.maxLength} characters`);
    }

    if (activePolicy.requireUppercase && !validation.requirements.hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (activePolicy.requireLowercase && !validation.requirements.hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (activePolicy.requireNumbers && !validation.requirements.hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    if (activePolicy.requireSymbols && !validation.requirements.hasSpecialChars) {
      errors.push('Password must contain at least one special character');
    }

    if (activePolicy.preventPersonalInfo && validation.requirements.notPersonal === false) {
      errors.push('Password must not contain personal information');
    }

    if (activePolicy.preventCommonPasswords && validation.score < activePolicy.minScore) {
      errors.push('Password is too common or easily guessable');
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: validation.score,
      feedback: validation.feedback
    };
  }
}

module.exports = new PasswordService();