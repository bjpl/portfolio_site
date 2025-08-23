const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { User } = require('../../models/User');
const EmailService = require('./EmailService');

class ApiKeyService {
  /**
   * Create new API key for user
   */
  async createApiKey(userId, keyData) {
    try {
      const {
        name,
        permissions = { read: true, write: false, admin: false },
        allowedIPs = [],
        allowedOrigins = [],
        rateLimit = null,
        expiresAt = null
      } = keyData;

      // Validate user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check user permissions for creating API keys
      if (!this.canCreateApiKey(user, permissions)) {
        throw new Error('Insufficient permissions to create API key with requested permissions');
      }

      // Generate API key
      const apiKey = ApiKey.generateApiKey();
      const keyHash = ApiKey.hashApiKey(apiKey);
      const prefix = apiKey.substring(0, 5); // ak_xx

      // Create API key record
      const apiKeyRecord = await ApiKey.create({
        userId,
        name,
        keyHash,
        prefix,
        permissions,
        allowedIPs,
        allowedOrigins,
        rateLimit,
        expiresAt,
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          userAgent: keyData.userAgent || null,
          ipAddress: keyData.ipAddress || null
        }
      });

      // Send security notification
      await EmailService.sendSecurityAlert(user, 'api_key_created', {
        keyName: name,
        permissions: Object.keys(permissions).filter(p => permissions[p]),
        timestamp: new Date(),
        ipAddress: keyData.ipAddress
      });

      return {
        apiKey, // Only returned once
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        prefix: apiKeyRecord.prefix,
        permissions: apiKeyRecord.permissions,
        expiresAt: apiKeyRecord.expiresAt,
        createdAt: apiKeyRecord.createdAt
      };
    } catch (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  /**
   * List user's API keys (without revealing actual keys)
   */
  async listApiKeys(userId, options = {}) {
    try {
      const { includeInactive = false } = options;

      const whereClause = { userId };
      if (!includeInactive) {
        whereClause.isActive = true;
      }

      const apiKeys = await ApiKey.findAll({
        where: whereClause,
        attributes: [
          'id', 'name', 'prefix', 'permissions', 'allowedIPs', 
          'allowedOrigins', 'rateLimit', 'currentUsage', 'totalUsage',
          'isActive', 'expiresAt', 'lastUsedAt', 'createdAt'
        ],
        order: [['createdAt', 'DESC']]
      });

      return apiKeys.map(key => ({
        ...key.toJSON(),
        maskedKey: key.prefix + '***',
        isExpired: key.expiresAt && key.expiresAt < new Date(),
        isRateLimited: key.rateLimit && key.currentUsage >= key.rateLimit
      }));
    } catch (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }
  }

  /**
   * Get API key details
   */
  async getApiKey(userId, keyId) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { id: keyId, userId },
        attributes: [
          'id', 'name', 'prefix', 'permissions', 'allowedIPs',
          'allowedOrigins', 'rateLimit', 'currentUsage', 'totalUsage',
          'isActive', 'expiresAt', 'lastUsedAt', 'createdAt', 'metadata'
        ]
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      return {
        ...apiKey.toJSON(),
        maskedKey: apiKey.prefix + '***',
        isExpired: apiKey.expiresAt && apiKey.expiresAt < new Date(),
        isRateLimited: apiKey.rateLimit && apiKey.currentUsage >= apiKey.rateLimit,
        usagePercentage: apiKey.rateLimit ? 
          Math.round((apiKey.currentUsage / apiKey.rateLimit) * 100) : 0
      };
    } catch (error) {
      throw new Error(`Failed to get API key: ${error.message}`);
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(userId, keyId, updates) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { id: keyId, userId },
        include: ['user']
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Validate permissions if being updated
      if (updates.permissions && !this.canCreateApiKey(apiKey.user, updates.permissions)) {
        throw new Error('Insufficient permissions to update API key with requested permissions');
      }

      const allowedUpdates = [
        'name', 'permissions', 'allowedIPs', 'allowedOrigins', 
        'rateLimit', 'expiresAt', 'isActive'
      ];

      const filteredUpdates = {};
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });

      await apiKey.update(filteredUpdates);

      return {
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        updatedAt: apiKey.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId, keyId) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { id: keyId, userId },
        include: ['user']
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      await apiKey.destroy();

      // Send security notification
      await EmailService.sendSecurityAlert(apiKey.user, 'api_key_revoked', {
        keyName: apiKey.name,
        timestamp: new Date()
      });

      return {
        success: true,
        message: 'API key revoked successfully',
        revokedKey: {
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix
        }
      };
    } catch (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  /**
   * Revoke all user API keys
   */
  async revokeAllApiKeys(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const apiKeys = await ApiKey.findAll({
        where: { userId, isActive: true }
      });

      const revokedCount = await ApiKey.destroy({
        where: { userId, isActive: true }
      });

      // Send security notification
      await EmailService.sendSecurityAlert(user, 'all_api_keys_revoked', {
        count: revokedCount,
        timestamp: new Date()
      });

      return {
        success: true,
        message: `Revoked ${revokedCount} API keys`,
        revokedCount
      };
    } catch (error) {
      throw new Error(`Failed to revoke all API keys: ${error.message}`);
    }
  }

  /**
   * Rotate API key (create new, revoke old)
   */
  async rotateApiKey(userId, keyId) {
    try {
      const oldApiKey = await ApiKey.findOne({
        where: { id: keyId, userId },
        include: ['user']
      });

      if (!oldApiKey) {
        throw new Error('API key not found');
      }

      // Create new API key with same settings
      const newApiKeyData = {
        name: oldApiKey.name + ' (Rotated)',
        permissions: oldApiKey.permissions,
        allowedIPs: oldApiKey.allowedIPs,
        allowedOrigins: oldApiKey.allowedOrigins,
        rateLimit: oldApiKey.rateLimit,
        expiresAt: oldApiKey.expiresAt
      };

      const newApiKey = await this.createApiKey(userId, newApiKeyData);

      // Revoke old key
      await oldApiKey.destroy();

      return {
        success: true,
        message: 'API key rotated successfully',
        newKey: newApiKey,
        oldKeyId: keyId
      };
    } catch (error) {
      throw new Error(`Failed to rotate API key: ${error.message}`);
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(userId, keyId, timeframe = '24h') {
    try {
      const apiKey = await ApiKey.findOne({
        where: { id: keyId, userId }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      // This would typically query usage logs from a time-series database
      // For now, return current usage data
      return {
        keyId: apiKey.id,
        keyName: apiKey.name,
        currentUsage: apiKey.currentUsage,
        totalUsage: apiKey.totalUsage,
        rateLimit: apiKey.rateLimit,
        usagePercentage: apiKey.rateLimit ? 
          Math.round((apiKey.currentUsage / apiKey.rateLimit) * 100) : 0,
        lastUsedAt: apiKey.lastUsedAt,
        timeframe,
        // Mock data - implement actual usage tracking
        hourlyUsage: this.generateMockUsageData(timeframe),
        topEndpoints: [],
        errorRate: 0.02
      };
    } catch (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }

  /**
   * Reset API key usage counters (hourly reset)
   */
  async resetUsageCounters() {
    try {
      const result = await ApiKey.update(
        { currentUsage: 0 },
        { where: {} }
      );

      console.log(`Reset usage counters for ${result[0]} API keys`);
      return result[0];
    } catch (error) {
      console.error('Failed to reset usage counters:', error);
      return 0;
    }
  }

  /**
   * Clean expired API keys
   */
  async cleanExpiredKeys() {
    try {
      const expiredKeys = await ApiKey.findAll({
        where: {
          expiresAt: {
            [ApiKey.sequelize.Sequelize.Op.lt]: new Date()
          }
        },
        include: ['user']
      });

      // Notify users of expired keys
      for (const key of expiredKeys) {
        if (key.user) {
          await EmailService.sendSecurityAlert(key.user, 'api_key_expired', {
            keyName: key.name,
            expiredAt: key.expiresAt
          });
        }
      }

      const deletedCount = await ApiKey.destroy({
        where: {
          expiresAt: {
            [ApiKey.sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      });

      console.log(`Cleaned ${deletedCount} expired API keys`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to clean expired keys:', error);
      return 0;
    }
  }

  /**
   * Verify API key
   */
  async verifyApiKey(keyString) {
    try {
      if (!keyString || !keyString.startsWith('ak_')) {
        return null;
      }

      const prefix = keyString.substring(0, 5);
      const apiKey = await ApiKey.findOne({
        where: { prefix },
        include: ['user']
      });

      if (!apiKey || !apiKey.verifyKey(keyString) || !apiKey.isValid()) {
        return null;
      }

      return apiKey;
    } catch (error) {
      console.error('API key verification error:', error);
      return null;
    }
  }

  /**
   * Check if user can create API key with given permissions
   */
  canCreateApiKey(user, permissions) {
    // Admin can create any API key
    if (user.role === 'admin') {
      return true;
    }

    // Editors can create read/write keys
    if (user.role === 'editor') {
      return !permissions.admin;
    }

    // Authors can create read-only keys
    if (user.role === 'author') {
      return permissions.read && !permissions.write && !permissions.admin;
    }

    // Viewers cannot create API keys
    return false;
  }

  /**
   * Generate API key usage report
   */
  async generateUsageReport(userId, timeframe = '30d') {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const apiKeys = await ApiKey.findAll({
        where: { userId },
        attributes: [
          'id', 'name', 'totalUsage', 'currentUsage', 
          'lastUsedAt', 'createdAt', 'isActive'
        ]
      });

      const report = {
        userId,
        username: user.username,
        timeframe,
        generatedAt: new Date(),
        summary: {
          totalKeys: apiKeys.length,
          activeKeys: apiKeys.filter(k => k.isActive).length,
          totalUsage: apiKeys.reduce((sum, k) => sum + (k.totalUsage || 0), 0),
          currentUsage: apiKeys.reduce((sum, k) => sum + (k.currentUsage || 0), 0)
        },
        keys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          totalUsage: key.totalUsage || 0,
          currentUsage: key.currentUsage || 0,
          lastUsedAt: key.lastUsedAt,
          daysSinceLastUse: key.lastUsedAt ? 
            Math.floor((new Date() - key.lastUsedAt) / (1000 * 60 * 60 * 24)) : null,
          isActive: key.isActive
        }))
      };

      return report;
    } catch (error) {
      throw new Error(`Failed to generate usage report: ${error.message}`);
    }
  }

  /**
   * Get system-wide API key statistics (admin only)
   */
  async getSystemStats() {
    try {
      const totalKeys = await ApiKey.count();
      const activeKeys = await ApiKey.count({ where: { isActive: true } });
      const expiredKeys = await ApiKey.count({
        where: {
          expiresAt: {
            [ApiKey.sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      });

      const usageStats = await ApiKey.findAll({
        attributes: [
          [ApiKey.sequelize.fn('SUM', ApiKey.sequelize.col('totalUsage')), 'totalUsage'],
          [ApiKey.sequelize.fn('SUM', ApiKey.sequelize.col('currentUsage')), 'currentUsage'],
          [ApiKey.sequelize.fn('AVG', ApiKey.sequelize.col('totalUsage')), 'avgUsage']
        ],
        raw: true
      });

      return {
        totalKeys,
        activeKeys,
        expiredKeys,
        inactiveKeys: totalKeys - activeKeys,
        usage: {
          total: parseInt(usageStats[0].totalUsage) || 0,
          current: parseInt(usageStats[0].currentUsage) || 0,
          average: parseFloat(usageStats[0].avgUsage) || 0
        },
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get system stats: ${error.message}`);
    }
  }

  /**
   * Generate mock usage data for demo purposes
   */
  generateMockUsageData(timeframe) {
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const data = [];
    
    for (let i = 0; i < hours; i++) {
      data.push({
        hour: new Date(Date.now() - (hours - i) * 60 * 60 * 1000),
        requests: Math.floor(Math.random() * 100),
        errors: Math.floor(Math.random() * 5)
      });
    }
    
    return data;
  }
}

module.exports = new ApiKeyService();