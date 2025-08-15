const crypto = require('crypto');

const jwt = require('jsonwebtoken');

const config = require('../config');
const { User, Session } = require('../models/User');

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(payload, secret = config.security.jwtSecret, expiresIn = config.security.jwtExpiresIn) {
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    return this.generateToken(payload, config.security.jwtRefreshSecret, config.security.jwtRefreshExpiresIn);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token, secret = config.security.jwtSecret) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    return this.verifyToken(token, config.security.jwtRefreshSecret);
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { email, username, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ email: email.toLowerCase() }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
      throw new Error('Username already taken');
    }

    // Create verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create new user
    const user = await User.create({
      email,
      username,
      password,
      firstName,
      lastName,
      emailVerificationToken,
      role: 'viewer', // Default role
    });

    // Generate tokens
    const accessToken = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = this.generateRefreshToken({
      id: user.id,
      tokenVersion: 0,
    });

    // Create session
    await this.createSession(user.id, accessToken, refreshToken);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      emailVerificationToken,
    };
  }

  /**
   * Login user
   */
  async login(emailOrUsername, password, userAgent, ipAddress) {
    const user = await User.findByCredentials(emailOrUsername, password);

    if (!user.isEmailVerified && config.features.requireEmailVerification) {
      throw new Error('Please verify your email before logging in');
    }

    // Generate tokens
    const accessToken = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = this.generateRefreshToken({
      id: user.id,
      tokenVersion: user.refreshTokenVersion || 0,
    });

    // Create session
    await this.createSession(user.id, accessToken, refreshToken, userAgent, ipAddress);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user
   */
  async logout(token) {
    const session = await Session.findOne({ where: { token } });
    if (session) {
      await session.destroy();
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Logout all sessions
   */
  async logoutAll(userId) {
    await Session.destroy({ where: { userId } });
    return { message: 'All sessions terminated' };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    const payload = this.verifyRefreshToken(refreshToken);

    // Find session
    const session = await Session.findOne({
      where: { refreshToken },
      include: ['user'],
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await session.destroy();
      throw new Error('Session expired');
    }

    // Generate new access token
    const accessToken = this.generateToken({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    // Update session
    await session.update({
      token: accessToken,
      lastActivity: new Date(),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const user = await User.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error('Invalid verification token');
    }

    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
    });

    return { message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const user = await User.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    return {
      message: 'Password reset link sent',
      resetToken, // In production, send via email
    };
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [require('sequelize').Op.gt]: new Date() },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    await user.update({
      password: newPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    // Invalidate all sessions
    await this.logoutAll(user.id);

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await user.validatePassword(currentPassword);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    await user.update({ password: newPassword });

    // Invalidate all other sessions
    await Session.destroy({
      where: {
        userId,
        token: { [require('sequelize').Op.ne]: null },
      },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Create session
   */
  async createSession(userId, token, refreshToken, userAgent = null, ipAddress = null) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return Session.create({
      userId,
      token,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
    });
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(userId) {
    const sessions = await Session.findAll({
      where: {
        userId,
        expiresAt: { [require('sequelize').Op.gt]: new Date() },
      },
      attributes: ['id', 'userAgent', 'ipAddress', 'lastActivity', 'createdAt'],
    });

    return sessions;
  }

  /**
   * Revoke session
   */
  async revokeSession(userId, sessionId) {
    const session = await Session.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await session.destroy();
    return { message: 'Session revoked' };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const allowedUpdates = ['firstName', 'lastName', 'preferences', 'metadata'];
    const filteredUpdates = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    await user.update(filteredUpdates);
    return user.toJSON();
  }

  /**
   * Admin: Update user role
   */
  async updateUserRole(adminId, userId, newRole) {
    const admin = await User.findByPk(adminId);

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    await user.update({ role: newRole });

    // Invalidate user's sessions to force re-login
    await this.logoutAll(userId);

    return { message: 'User role updated', user: user.toJSON() };
  }

  /**
   * Admin: Deactivate user
   */
  async deactivateUser(adminId, userId) {
    const admin = await User.findByPk(adminId);

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    await user.update({ isActive: false });
    await this.logoutAll(userId);

    return { message: 'User deactivated' };
  }

  /**
   * Admin: Reactivate user
   */
  async reactivateUser(adminId, userId) {
    const admin = await User.findByPk(adminId);

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    await user.update({
      isActive: true,
      loginAttempts: 0,
      lockoutUntil: null,
    });

    return { message: 'User reactivated' };
  }
}

module.exports = new AuthService();
