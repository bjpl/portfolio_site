const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const config = require('../config');
const { User } = require('../models/User');
const logger = require('../utils/logger');
const auditService = require('./auditService');

class TwoFactorService {
  constructor() {
    this.serviceName = config.app?.name || 'Portfolio Admin';
    this.issuer = config.app?.issuer || 'Portfolio';
    this.backupCodeLength = 8;
    this.backupCodeCount = 10;
  }

  /**
   * Generate 2FA secret for user
   */
  generateSecret(userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${userEmail})`,
        issuer: this.issuer,
        length: 32
      });

      return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        manualEntry: {
          account: userEmail,
          issuer: this.issuer,
          secret: secret.base32
        }
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      logger.error('Failed to generate QR code', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret, token, window = 2) {
    try {
      // Remove any spaces or formatting from token
      const cleanToken = token.replace(/\s/g, '');

      if (!/^\d{6}$/.test(cleanToken)) {
        return false;
      }

      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: cleanToken,
        window // Allow some time drift
      });
    } catch (error) {
      logger.error('Failed to verify 2FA token', error);
      return false;
    }
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId, token, request = null) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.twoFactorEnabled) {
        throw new Error('2FA is already enabled for this user');
      }

      if (!user.twoFactorSecret) {
        throw new Error('2FA secret not found. Please generate a new secret first.');
      }

      // Verify the provided token
      const isValidToken = this.verifyToken(user.twoFactorSecret, token);
      if (!isValidToken) {
        throw new Error('Invalid verification code. Please try again.');
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Enable 2FA
      await user.update({
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes
      });

      await auditService.logEvent(
        'two_factor_enabled',
        userId,
        {
          email: user.email,
          backupCodesGenerated: backupCodes.length
        },
        request
      );

      logger.info('2FA enabled for user', {
        userId,
        email: user.email
      });

      return {
        success: true,
        message: '2FA has been enabled successfully',
        backupCodes // Return once for user to save
      };
    } catch (error) {
      logger.error('Failed to enable 2FA', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId, password, request = null) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
      }

      // Verify password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Disable 2FA
      await user.update({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      });

      await auditService.logEvent(
        'two_factor_disabled',
        userId,
        {
          email: user.email,
          disabledViaPassword: true
        },
        request
      );

      logger.info('2FA disabled for user', {
        userId,
        email: user.email
      });

      return {
        success: true,
        message: '2FA has been disabled successfully'
      };
    } catch (error) {
      logger.error('Failed to disable 2FA', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Verify 2FA during login
   */
  async verify2FALogin(userId, token, isBackupCode = false, request = null) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
      }

      let isValid = false;
      let usedBackupCode = false;

      if (isBackupCode) {
        // Verify backup code
        const result = await this.verifyBackupCode(user, token);
        isValid = result.isValid;
        usedBackupCode = result.codeUsed;
      } else {
        // Verify TOTP token
        isValid = this.verifyToken(user.twoFactorSecret, token);
      }

      if (!isValid) {
        await auditService.logEvent(
          'two_factor_failed',
          userId,
          {
            email: user.email,
            tokenType: isBackupCode ? 'backup_code' : 'totp',
            token: token.substring(0, 2) + '****'
          },
          request
        );
        
        throw new Error('Invalid verification code');
      }

      await auditService.logEvent(
        'two_factor_verified',
        userId,
        {
          email: user.email,
          tokenType: isBackupCode ? 'backup_code' : 'totp',
          backupCodeUsed: usedBackupCode
        },
        request
      );

      return {
        success: true,
        message: '2FA verification successful',
        backupCodeUsed: usedBackupCode
      };
    } catch (error) {
      logger.error('2FA verification failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes() {
    const codes = [];
    
    for (let i = 0; i < this.backupCodeCount; i++) {
      // Generate random code with format: XXXX-XXXX
      const part1 = crypto.randomInt(1000, 9999);
      const part2 = crypto.randomInt(1000, 9999);
      codes.push(`${part1}-${part2}`);
    }
    
    return codes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(user, code) {
    try {
      if (!user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
        return { isValid: false, codeUsed: false };
      }

      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      const codeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);
      
      if (codeIndex === -1) {
        return { isValid: false, codeUsed: false };
      }

      // Remove used backup code
      const updatedCodes = [...user.twoFactorBackupCodes];
      updatedCodes.splice(codeIndex, 1);
      
      await user.update({
        twoFactorBackupCodes: updatedCodes
      });

      return { isValid: true, codeUsed: true };
    } catch (error) {
      logger.error('Backup code verification failed', error);
      return { isValid: false, codeUsed: false };
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId, password, request = null) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
      }

      // Verify password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      await user.update({
        twoFactorBackupCodes: hashedBackupCodes
      });

      await auditService.logEvent(
        'backup_codes_regenerated',
        userId,
        {
          email: user.email,
          newCodesCount: backupCodes.length
        },
        request
      );

      logger.info('Backup codes regenerated', {
        userId,
        email: user.email
      });

      return {
        success: true,
        message: 'Backup codes regenerated successfully',
        backupCodes
      };
    } catch (error) {
      logger.error('Failed to regenerate backup codes', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get 2FA status for user
   */
  async get2FAStatus(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        enabled: user.twoFactorEnabled || false,
        hasSecret: !!user.twoFactorSecret,
        backupCodesRemaining: user.twoFactorBackupCodes ? user.twoFactorBackupCodes.length : 0
      };
    } catch (error) {
      logger.error('Failed to get 2FA status', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Admin: Force disable 2FA for user
   */
  async adminDisable2FA(adminId, targetUserId, reason, request = null) {
    try {
      const admin = await User.findByPk(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const targetUser = await User.findByPk(targetUserId);
      if (!targetUser) {
        throw new Error('Target user not found');
      }

      if (!targetUser.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
      }

      // Disable 2FA
      await targetUser.update({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      });

      await auditService.logEvent(
        'admin_action',
        adminId,
        {
          action: 'force_disable_2fa',
          targetUserId,
          targetUserEmail: targetUser.email,
          reason
        },
        request
      );

      await auditService.logEvent(
        'two_factor_disabled',
        targetUserId,
        {
          email: targetUser.email,
          disabledByAdmin: true,
          adminId,
          reason
        },
        request
      );

      logger.info('2FA force disabled by admin', {
        adminId,
        adminEmail: admin.email,
        targetUserId,
        targetUserEmail: targetUser.email,
        reason
      });

      return {
        success: true,
        message: '2FA has been disabled for the user'
      };
    } catch (error) {
      logger.error('Failed to admin disable 2FA', {
        error: error.message,
        adminId,
        targetUserId
      });
      throw error;
    }
  }

  /**
   * Generate recovery code for account recovery
   */
  async generateRecoveryCode(userId, request = null) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate a secure recovery code
      const recoveryCode = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await user.update({
        twoFactorRecoveryCode: recoveryCode,
        twoFactorRecoveryExpires: expiresAt
      });

      await auditService.logEvent(
        'recovery_code_generated',
        userId,
        {
          email: user.email,
          expiresAt: expiresAt.toISOString()
        },
        request
      );

      return {
        success: true,
        recoveryCode,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to generate recovery code', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Verify recovery code and disable 2FA
   */
  async verifyRecoveryCode(email, recoveryCode, request = null) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.twoFactorRecoveryCode || !user.twoFactorRecoveryExpires) {
        throw new Error('No recovery code found for this user');
      }

      if (new Date() > new Date(user.twoFactorRecoveryExpires)) {
        throw new Error('Recovery code has expired');
      }

      if (user.twoFactorRecoveryCode !== recoveryCode) {
        await auditService.logEvent(
          'recovery_code_failed',
          user.id,
          {
            email: user.email,
            providedCode: recoveryCode.substring(0, 8) + '...'
          },
          request
        );
        
        throw new Error('Invalid recovery code');
      }

      // Disable 2FA and clear recovery code
      await user.update({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorRecoveryCode: null,
        twoFactorRecoveryExpires: null
      });

      await auditService.logEvent(
        'two_factor_disabled',
        user.id,
        {
          email: user.email,
          disabledViaRecovery: true
        },
        request
      );

      return {
        success: true,
        message: '2FA has been disabled using recovery code'
      };
    } catch (error) {
      logger.error('Recovery code verification failed', {
        error: error.message,
        email
      });
      throw error;
    }
  }
}

module.exports = new TwoFactorService();
