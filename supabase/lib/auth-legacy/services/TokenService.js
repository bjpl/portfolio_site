const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');
const RefreshToken = require('../models/RefreshToken');
const { User } = require('../../models/User');

class TokenService {
  constructor() {
    this.jwtSecret = config.security?.jwtSecret || process.env.JWT_SECRET;
    this.jwtRefreshSecret = config.security?.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET;
    this.jwtExpiresIn = config.security?.jwtExpiresIn || '15m';
    this.refreshTokenExpiry = config.security?.refreshTokenExpiry || '30d';
    
    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT secrets not configured');
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload, options = {}) {
    const defaultPayload = {
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // JWT ID for blacklisting
    };

    const tokenPayload = { ...defaultPayload, ...payload };
    const tokenOptions = {
      expiresIn: this.jwtExpiresIn,
      issuer: config.app?.name || 'portfolio-auth',
      audience: config.app?.domain || 'localhost',
      ...options
    };

    return jwt.sign(tokenPayload, this.jwtSecret, tokenOptions);
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token, options = {}) {
    try {
      const defaultOptions = {
        issuer: config.app?.name || 'portfolio-auth',
        audience: config.app?.domain || 'localhost'
      };

      return jwt.verify(token, this.jwtSecret, { ...defaultOptions, ...options });
    } catch (error) {
      this.handleTokenError(error);
    }
  }

  /**
   * Generate refresh token with rotation
   */
  async generateRefreshToken(userId, deviceInfo = {}) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { token, refreshToken } = await RefreshToken.createTokenFamily(userId, deviceInfo);
      
      return {
        token,
        refreshToken,
        expiresAt: refreshToken.expiresAt
      };
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
  }

  /**
   * Refresh access token with rotation
   */
  async refreshAccessToken(refreshTokenString, deviceInfo = {}) {
    try {
      const refreshTokenRecord = await RefreshToken.findByToken(refreshTokenString);
      
      if (!refreshTokenRecord) {
        throw new Error('Invalid refresh token');
      }

      if (!refreshTokenRecord.isValid()) {
        throw new Error('Refresh token expired or revoked');
      }

      // Check for token reuse (potential security breach)
      if (refreshTokenRecord.isRevoked) {
        // Revoke entire token family
        await refreshTokenRecord.revokeFamily('token_reuse_detected');
        throw new Error('Token reuse detected - security breach');
      }

      const user = refreshTokenRecord.user;
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      });

      // Rotate refresh token
      const { token: newRefreshToken, refreshToken: newRefreshRecord } = 
        await refreshTokenRecord.rotate(deviceInfo);

      // Update usage stats
      await newRefreshRecord.update({
        lastUsedAt: new Date(),
        usageCount: (refreshTokenRecord.usageCount || 0) + 1
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: newRefreshRecord.expiresAt,
        user: user.toJSON()
      };
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshTokenString, reason = 'manual') {
    try {
      const refreshToken = await RefreshToken.findByToken(refreshTokenString);
      
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      await refreshToken.revoke(reason);
      return { success: true, message: 'Token revoked successfully' };
    } catch (error) {
      throw new Error(`Failed to revoke token: ${error.message}`);
    }
  }

  /**
   * Revoke all user tokens
   */
  async revokeAllUserTokens(userId, reason = 'logout_all') {
    try {
      const tokens = await RefreshToken.findAll({
        where: { userId }
      });

      const revokePromises = tokens.map(token => token.revoke(reason));
      await Promise.all(revokePromises);

      return { 
        success: true, 
        message: `Revoked ${tokens.length} tokens`,
        count: tokens.length 
      };
    } catch (error) {
      throw new Error(`Failed to revoke user tokens: ${error.message}`);
    }
  }

  /**
   * Get user's active tokens
   */
  async getUserTokens(userId) {
    try {
      return await RefreshToken.getUserTokens(userId);
    } catch (error) {
      throw new Error(`Failed to get user tokens: ${error.message}`);
    }
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId, email) {
    const payload = {
      userId,
      email,
      type: 'email_verification'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h',
      issuer: config.app?.name || 'portfolio-auth'
    });
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      
      if (payload.type !== 'email_verification') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.handleTokenError(error);
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId, email) {
    const payload = {
      userId,
      email,
      type: 'password_reset'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '1h',
      issuer: config.app?.name || 'portfolio-auth'
    });
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      
      if (payload.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.handleTokenError(error);
    }
  }

  /**
   * Generate API access token
   */
  generateApiToken(payload, expiresIn = '1y') {
    return jwt.sign(
      { ...payload, type: 'api' },
      this.jwtSecret,
      {
        expiresIn,
        issuer: config.app?.name || 'portfolio-auth'
      }
    );
  }

  /**
   * Verify API token
   */
  verifyApiToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      
      if (payload.type !== 'api') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.handleTokenError(error);
    }
  }

  /**
   * Handle token verification errors
   */
  handleTokenError(error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    if (error.name === 'NotBeforeError') {
      throw new Error('Token not active yet');
    }
    throw error;
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(jti) {
    // This would typically check against a Redis cache or database
    // For now, return false - implement based on your blacklist strategy
    return false;
  }

  /**
   * Add token to blacklist
   */
  async blacklistToken(jti, expiresAt) {
    // This would typically add to a Redis cache or database
    // Implement based on your blacklist strategy
    console.log(`Token ${jti} blacklisted until ${expiresAt}`);
  }

  /**
   * Clean expired tokens (maintenance task)
   */
  async cleanExpiredTokens() {
    try {
      const result = await RefreshToken.cleanExpired();
      return { 
        success: true, 
        message: `Cleaned ${result} expired tokens`,
        count: result 
      };
    } catch (error) {
      throw new Error(`Failed to clean expired tokens: ${error.message}`);
    }
  }

  /**
   * Get token statistics
   */
  async getTokenStats() {
    try {
      const totalTokens = await RefreshToken.count();
      const activeTokens = await RefreshToken.count({
        where: {
          isActive: true,
          isRevoked: false,
          expiresAt: { [RefreshToken.sequelize.Sequelize.Op.gt]: new Date() }
        }
      });
      const expiredTokens = await RefreshToken.count({
        where: {
          expiresAt: { [RefreshToken.sequelize.Sequelize.Op.lt]: new Date() }
        }
      });
      const revokedTokens = await RefreshToken.count({
        where: { isRevoked: true }
      });

      return {
        total: totalTokens,
        active: activeTokens,
        expired: expiredTokens,
        revoked: revokedTokens
      };
    } catch (error) {
      throw new Error(`Failed to get token stats: ${error.message}`);
    }
  }
}

module.exports = new TokenService();