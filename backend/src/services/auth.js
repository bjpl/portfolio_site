const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const config = require('../config');
const User = require('../models/User');
const logger = require('../utils/logger');

const cache = require('./cache');

class AuthService {
  constructor() {
    this.refreshTokens = new Map();
  }

  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, config.security.bcryptRounds);
    } catch (error) {
      logger.error('Password hashing failed', error);
      throw new Error('Password processing failed');
    }
  }

  async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Password comparison failed', error);
      return false;
    }
  }

  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    };

    const accessToken = jwt.sign(payload, config.security.jwtSecret, {
      expiresIn: config.security.jwtExpiresIn,
    });

    const refreshToken = jwt.sign(payload, config.security.jwtRefreshSecret, {
      expiresIn: config.security.jwtRefreshExpiresIn,
    });

    // Store refresh token
    this.refreshTokens.set(refreshToken, user.id);

    return { accessToken, refreshToken };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.security.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  verifyRefreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.security.jwtRefreshSecret);
      if (!this.refreshTokens.has(refreshToken)) {
        throw new Error('Refresh token not found');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async register(userData) {
    try {
      const { email, password, ...otherData } = userData;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        ...otherData,
      });

      logger.audit('user_registered', user.id, { email });

      // Generate tokens
      const tokens = this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is disabled');
      }

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password);
      if (!isValidPassword) {
        logger.audit('login_failed', user.id, { email, reason: 'invalid_password' });
        throw new Error('Invalid credentials');
      }

      // Update last login
      await user.update({ lastLoginAt: new Date() });

      logger.audit('user_logged_in', user.id, { email });

      // Generate tokens
      const tokens = this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(payload, config.security.jwtSecret, {
        expiresIn: config.security.jwtExpiresIn,
      });

      return { accessToken };
    } catch (error) {
      logger.error('Token refresh failed', error);
      throw error;
    }
  }

  async logout(refreshToken) {
    try {
      if (refreshToken && this.refreshTokens.has(refreshToken)) {
        const userId = this.refreshTokens.get(refreshToken);
        this.refreshTokens.delete(refreshToken);
        logger.audit('user_logged_out', userId);
      }
      return true;
    } catch (error) {
      logger.error('Logout failed', error);
      return false;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValid = await this.comparePassword(currentPassword, user.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await user.update({ password: hashedPassword });

      logger.audit('password_changed', userId);

      return true;
    } catch (error) {
      logger.error('Password change failed', error);
      throw error;
    }
  }

  async resetPassword(email) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if user exists
        return { message: 'If the email exists, a reset link has been sent' };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token (in production, you'd send an email)
      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetTokenExpiry,
      });

      logger.audit('password_reset_requested', user.id, { email });

      // In production, send email with reset link
      // await emailService.sendPasswordReset(user.email, resetToken);

      return { message: 'If the email exists, a reset link has been sent' };
    } catch (error) {
      logger.error('Password reset request failed', error);
      throw error;
    }
  }

  async confirmPasswordReset(token, newPassword) {
    try {
      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpiry: { [Op.gt]: new Date() },
        },
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password and clear reset token
      await user.update({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      });

      logger.audit('password_reset_completed', user.id);

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      logger.error('Password reset confirmation failed', error);
      throw error;
    }
  }

  sanitizeUser(user) {
    const { password, resetPasswordToken, resetPasswordExpiry, ...sanitizedUser } = user.toJSON();
    return sanitizedUser;
  }

  // Session management
  async createSession(user, sessionData = {}) {
    const sessionId = crypto.randomUUID();
    const session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ...sessionData,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    await cache.setSession(sessionId, session);
    return sessionId;
  }

  async getSession(sessionId) {
    return await cache.getSession(sessionId);
  }

  async updateSession(sessionId, updates) {
    const session = await cache.getSession(sessionId);
    if (!session) return false;

    const updatedSession = {
      ...session,
      ...updates,
      lastActivity: new Date(),
    };

    await cache.setSession(sessionId, updatedSession);
    return true;
  }

  async destroySession(sessionId) {
    return await cache.deleteSession(sessionId);
  }

  // Rate limiting for auth attempts
  async checkRateLimit(identifier, maxAttempts = 5, windowMs = 900000) {
    const key = `auth_attempts:${identifier}`;
    const window = Math.floor(Date.now() / windowMs);
    const attempts = (await cache.get(`${key}:${window}`)) || 0;

    if (attempts >= maxAttempts) {
      throw new Error('Too many authentication attempts. Please try again later.');
    }

    await cache.set(`${key}:${window}`, attempts + 1, windowMs / 1000);
    return true;
  }
}

module.exports = new AuthService();
