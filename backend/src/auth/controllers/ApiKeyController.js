const ApiKeyService = require('../services/ApiKeyService');

class ApiKeyController {
  /**
   * Create new API key
   */
  async createApiKey(req, res) {
    try {
      const {
        name,
        permissions = { read: true, write: false, admin: false },
        allowedIPs = [],
        allowedOrigins = [],
        rateLimit = null,
        expiresAt = null
      } = req.body;

      if (!name) {
        return res.status(400).json({
          error: 'Name is required',
          message: 'API key name must be provided'
        });
      }

      const apiKeyData = {
        name,
        permissions,
        allowedIPs,
        allowedOrigins,
        rateLimit: rateLimit ? parseInt(rateLimit) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      };

      const result = await ApiKeyService.createApiKey(req.user.id, apiKeyData);

      res.status(201).json({
        message: 'API key created successfully',
        apiKey: result.apiKey, // Only shown once
        keyInfo: {
          id: result.id,
          name: result.name,
          prefix: result.prefix,
          permissions: result.permissions,
          expiresAt: result.expiresAt,
          createdAt: result.createdAt
        }
      });

    } catch (error) {
      console.error('Create API key error:', error);
      
      res.status(400).json({
        error: 'Failed to create API key',
        message: error.message
      });
    }
  }

  /**
   * List user's API keys
   */
  async listApiKeys(req, res) {
    try {
      const { includeInactive = false } = req.query;
      
      const apiKeys = await ApiKeyService.listApiKeys(req.user.id, {
        includeInactive: includeInactive === 'true'
      });

      res.json({
        apiKeys,
        total: apiKeys.length
      });

    } catch (error) {
      console.error('List API keys error:', error);
      
      res.status(500).json({
        error: 'Failed to list API keys',
        message: error.message
      });
    }
  }

  /**
   * Get API key details
   */
  async getApiKey(req, res) {
    try {
      const { keyId } = req.params;

      const apiKey = await ApiKeyService.getApiKey(req.user.id, keyId);

      res.json({
        apiKey
      });

    } catch (error) {
      console.error('Get API key error:', error);
      
      if (error.message === 'API key not found') {
        return res.status(404).json({
          error: 'API key not found'
        });
      }

      res.status(500).json({
        error: 'Failed to get API key',
        message: error.message
      });
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(req, res) {
    try {
      const { keyId } = req.params;
      const updates = req.body;

      // Convert expiresAt to Date if provided
      if (updates.expiresAt) {
        updates.expiresAt = new Date(updates.expiresAt);
      }

      // Convert rateLimit to integer if provided
      if (updates.rateLimit) {
        updates.rateLimit = parseInt(updates.rateLimit);
      }

      const result = await ApiKeyService.updateApiKey(req.user.id, keyId, updates);

      res.json({
        message: 'API key updated successfully',
        apiKey: result
      });

    } catch (error) {
      console.error('Update API key error:', error);
      
      if (error.message === 'API key not found') {
        return res.status(404).json({
          error: 'API key not found'
        });
      }

      res.status(400).json({
        error: 'Failed to update API key',
        message: error.message
      });
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(req, res) {
    try {
      const { keyId } = req.params;

      const result = await ApiKeyService.revokeApiKey(req.user.id, keyId);

      res.json(result);

    } catch (error) {
      console.error('Revoke API key error:', error);
      
      if (error.message === 'API key not found') {
        return res.status(404).json({
          error: 'API key not found'
        });
      }

      res.status(500).json({
        error: 'Failed to revoke API key',
        message: error.message
      });
    }
  }

  /**
   * Revoke all API keys
   */
  async revokeAllApiKeys(req, res) {
    try {
      const result = await ApiKeyService.revokeAllApiKeys(req.user.id);

      res.json(result);

    } catch (error) {
      console.error('Revoke all API keys error:', error);
      
      res.status(500).json({
        error: 'Failed to revoke all API keys',
        message: error.message
      });
    }
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(req, res) {
    try {
      const { keyId } = req.params;

      const result = await ApiKeyService.rotateApiKey(req.user.id, keyId);

      res.json(result);

    } catch (error) {
      console.error('Rotate API key error:', error);
      
      if (error.message === 'API key not found') {
        return res.status(404).json({
          error: 'API key not found'
        });
      }

      res.status(500).json({
        error: 'Failed to rotate API key',
        message: error.message
      });
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(req, res) {
    try {
      const { keyId } = req.params;
      const { timeframe = '24h' } = req.query;

      const stats = await ApiKeyService.getUsageStats(req.user.id, keyId, timeframe);

      res.json({
        stats
      });

    } catch (error) {
      console.error('Get usage stats error:', error);
      
      if (error.message === 'API key not found') {
        return res.status(404).json({
          error: 'API key not found'
        });
      }

      res.status(500).json({
        error: 'Failed to get usage statistics',
        message: error.message
      });
    }
  }

  /**
   * Generate usage report
   */
  async generateUsageReport(req, res) {
    try {
      const { timeframe = '30d' } = req.query;

      const report = await ApiKeyService.generateUsageReport(req.user.id, timeframe);

      res.json({
        report
      });

    } catch (error) {
      console.error('Generate usage report error:', error);
      
      res.status(500).json({
        error: 'Failed to generate usage report',
        message: error.message
      });
    }
  }

  /**
   * Get system statistics (admin only)
   */
  async getSystemStats(req, res) {
    try {
      // Verify admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Admin role required'
        });
      }

      const stats = await ApiKeyService.getSystemStats();

      res.json({
        stats
      });

    } catch (error) {
      console.error('Get system stats error:', error);
      
      res.status(500).json({
        error: 'Failed to get system statistics',
        message: error.message
      });
    }
  }

  /**
   * Clean expired keys (admin only)
   */
  async cleanExpiredKeys(req, res) {
    try {
      // Verify admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Admin role required'
        });
      }

      const deletedCount = await ApiKeyService.cleanExpiredKeys();

      res.json({
        message: 'Expired keys cleaned successfully',
        deletedCount
      });

    } catch (error) {
      console.error('Clean expired keys error:', error);
      
      res.status(500).json({
        error: 'Failed to clean expired keys',
        message: error.message
      });
    }
  }

  /**
   * Reset usage counters (admin only)
   */
  async resetUsageCounters(req, res) {
    try {
      // Verify admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Admin role required'
        });
      }

      const resetCount = await ApiKeyService.resetUsageCounters();

      res.json({
        message: 'Usage counters reset successfully',
        resetCount
      });

    } catch (error) {
      console.error('Reset usage counters error:', error);
      
      res.status(500).json({
        error: 'Failed to reset usage counters',
        message: error.message
      });
    }
  }

  /**
   * Validate API key permissions
   */
  validatePermissions(req, res, next) {
    const { permissions = {} } = req.body;
    
    // Validate permission structure
    const validPermissions = ['read', 'write', 'admin'];
    const providedPermissions = Object.keys(permissions);
    
    const invalidPermissions = providedPermissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        error: 'Invalid permissions',
        message: `Invalid permissions: ${invalidPermissions.join(', ')}`,
        validPermissions
      });
    }

    // Check if user can grant these permissions
    if (permissions.admin && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only admins can create API keys with admin permissions'
      });
    }

    if (permissions.write && !['admin', 'editor'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Editor role or higher required to create API keys with write permissions'
      });
    }

    next();
  }

  /**
   * Validate IP addresses
   */
  validateIPs(req, res, next) {
    const { allowedIPs = [] } = req.body;
    
    if (!Array.isArray(allowedIPs)) {
      return res.status(400).json({
        error: 'Invalid IP format',
        message: 'allowedIPs must be an array'
      });
    }

    // Basic IP validation (could be enhanced with proper IP validation library)
    const invalidIPs = allowedIPs.filter(ip => {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
      return !ipRegex.test(ip);
    });

    if (invalidIPs.length > 0) {
      return res.status(400).json({
        error: 'Invalid IP addresses',
        message: `Invalid IP addresses: ${invalidIPs.join(', ')}`,
        format: 'Use format: 192.168.1.1 or 192.168.1.0/24'
      });
    }

    next();
  }

  /**
   * Validate expiration date
   */
  validateExpiration(req, res, next) {
    const { expiresAt } = req.body;
    
    if (expiresAt) {
      const expiration = new Date(expiresAt);
      
      if (isNaN(expiration.getTime())) {
        return res.status(400).json({
          error: 'Invalid expiration date',
          message: 'expiresAt must be a valid date'
        });
      }

      if (expiration <= new Date()) {
        return res.status(400).json({
          error: 'Invalid expiration date',
          message: 'Expiration date must be in the future'
        });
      }

      // Limit maximum expiration to 1 year for non-admin users
      if (req.user.role !== 'admin') {
        const maxExpiration = new Date();
        maxExpiration.setFullYear(maxExpiration.getFullYear() + 1);
        
        if (expiration > maxExpiration) {
          return res.status(400).json({
            error: 'Expiration too far in future',
            message: 'Maximum expiration is 1 year for non-admin users'
          });
        }
      }
    }

    next();
  }
}

module.exports = new ApiKeyController();