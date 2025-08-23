const { AuditLog } = require('../models/AuditLog');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class AuditService {
  constructor() {
    this.eventTypes = {
      // Authentication events
      USER_LOGIN: 'user_login',
      USER_LOGOUT: 'user_logout',
      USER_REGISTER: 'user_register',
      LOGIN_FAILED: 'login_failed',
      PASSWORD_CHANGED: 'password_changed',
      PASSWORD_RESET_REQUESTED: 'password_reset_requested',
      PASSWORD_RESET_COMPLETED: 'password_reset_completed',
      EMAIL_VERIFIED: 'email_verified',
      OAUTH_LOGIN: 'oauth_login',
      OAUTH_REGISTER: 'oauth_register',
      OAUTH_LINKED: 'oauth_linked',
      OAUTH_UNLINKED: 'oauth_unlinked',
      
      // Authorization events
      ACCESS_DENIED: 'access_denied',
      ROLE_CHANGED: 'role_changed',
      PERMISSION_GRANTED: 'permission_granted',
      PERMISSION_REVOKED: 'permission_revoked',
      
      // Session events
      SESSION_CREATED: 'session_created',
      SESSION_DESTROYED: 'session_destroyed',
      SESSION_EXPIRED: 'session_expired',
      CONCURRENT_LOGIN: 'concurrent_login',
      
      // Data events
      DATA_CREATED: 'data_created',
      DATA_UPDATED: 'data_updated',
      DATA_DELETED: 'data_deleted',
      DATA_ACCESSED: 'data_accessed',
      FILE_UPLOADED: 'file_uploaded',
      FILE_DELETED: 'file_deleted',
      
      // Security events
      BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
      SUSPICIOUS_ACTIVITY: 'suspicious_activity',
      SECURITY_VIOLATION: 'security_violation',
      RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
      MALICIOUS_REQUEST: 'malicious_request',
      
      // Admin events
      ADMIN_ACTION: 'admin_action',
      USER_IMPERSONATION: 'user_impersonation',
      BULK_OPERATION: 'bulk_operation',
      SYSTEM_CONFIG_CHANGED: 'system_config_changed',
      
      // API events
      API_KEY_CREATED: 'api_key_created',
      API_KEY_REVOKED: 'api_key_revoked',
      API_RATE_LIMITED: 'api_rate_limited'
    };
    
    this.riskLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Log audit event
   */
  async logEvent(eventType, userId = null, details = {}, request = null) {
    try {
      const auditData = {
        eventType,
        userId,
        details: JSON.stringify(details),
        riskLevel: this.calculateRiskLevel(eventType, details),
        timestamp: new Date()
      };

      // Extract request information if provided
      if (request) {
        auditData.ipAddress = this.getClientIp(request);
        auditData.userAgent = request.headers['user-agent'] || null;
        auditData.endpoint = request.originalUrl || request.url;
        auditData.httpMethod = request.method;
        auditData.sessionId = request.sessionID || null;
      }

      // Create audit log entry
      const auditLog = await AuditLog.create(auditData);
      
      // Also log to application logger for immediate visibility
      logger.audit(eventType, userId, {
        ...details,
        auditId: auditLog.id,
        riskLevel: auditData.riskLevel
      });

      // Check for suspicious patterns
      await this.checkSuspiciousPatterns(eventType, userId, auditData.ipAddress);

      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', {
        eventType,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate risk level based on event type and details
   */
  calculateRiskLevel(eventType, details) {
    const highRiskEvents = [
      this.eventTypes.BRUTE_FORCE_ATTEMPT,
      this.eventTypes.SUSPICIOUS_ACTIVITY,
      this.eventTypes.SECURITY_VIOLATION,
      this.eventTypes.MALICIOUS_REQUEST,
      this.eventTypes.USER_IMPERSONATION
    ];

    const mediumRiskEvents = [
      this.eventTypes.LOGIN_FAILED,
      this.eventTypes.ACCESS_DENIED,
      this.eventTypes.ROLE_CHANGED,
      this.eventTypes.PASSWORD_CHANGED,
      this.eventTypes.ADMIN_ACTION,
      this.eventTypes.BULK_OPERATION
    ];

    if (highRiskEvents.includes(eventType)) {
      return this.riskLevels.HIGH;
    }

    if (mediumRiskEvents.includes(eventType)) {
      return this.riskLevels.MEDIUM;
    }

    // Check specific details for risk escalation
    if (details.failed_attempts && details.failed_attempts > 3) {
      return this.riskLevels.HIGH;
    }

    if (details.suspicious_patterns) {
      return this.riskLevels.MEDIUM;
    }

    return this.riskLevels.LOW;
  }

  /**
   * Check for suspicious patterns
   */
  async checkSuspiciousPatterns(eventType, userId, ipAddress) {
    try {
      const timeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
      
      // Check for multiple failed logins
      if (eventType === this.eventTypes.LOGIN_FAILED) {
        const failedAttempts = await AuditLog.count({
          where: {
            eventType: this.eventTypes.LOGIN_FAILED,
            [Op.or]: [
              { userId },
              { ipAddress }
            ],
            timestamp: { [Op.gte]: timeWindow }
          }
        });

        if (failedAttempts >= 5) {
          await this.logEvent(
            this.eventTypes.BRUTE_FORCE_ATTEMPT,
            userId,
            {
              failedAttempts,
              timeWindow: 15,
              triggerEvent: eventType
            }
          );
        }
      }

      // Check for rapid API requests
      const recentRequests = await AuditLog.count({
        where: {
          ipAddress,
          timestamp: { [Op.gte]: timeWindow }
        }
      });

      if (recentRequests >= 100) {
        await this.logEvent(
          this.eventTypes.RATE_LIMIT_EXCEEDED,
          userId,
          {
            requestCount: recentRequests,
            timeWindow: 15,
            ipAddress
          }
        );
      }

      // Check for access from multiple IPs
      if (userId) {
        const uniqueIPs = await AuditLog.findAll({
          attributes: ['ipAddress'],
          where: {
            userId,
            timestamp: { [Op.gte]: timeWindow }
          },
          group: ['ipAddress']
        });

        if (uniqueIPs.length >= 5) {
          await this.logEvent(
            this.eventTypes.SUSPICIOUS_ACTIVITY,
            userId,
            {
              uniqueIPs: uniqueIPs.length,
              timeWindow: 15,
              pattern: 'multiple_ips'
            }
          );
        }
      }
    } catch (error) {
      logger.error('Failed to check suspicious patterns', error);
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}, pagination = {}) {
    try {
      const {
        eventType,
        userId,
        ipAddress,
        riskLevel,
        startDate,
        endDate,
        search
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'DESC'
      } = pagination;

      const where = {};

      if (eventType) {
        where.eventType = eventType;
      }

      if (userId) {
        where.userId = userId;
      }

      if (ipAddress) {
        where.ipAddress = ipAddress;
      }

      if (riskLevel) {
        where.riskLevel = riskLevel;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.timestamp[Op.lte] = new Date(endDate);
        }
      }

      if (search) {
        where[Op.or] = [
          { eventType: { [Op.iLike]: `%${search}%` } },
          { details: { [Op.iLike]: `%${search}%` } },
          { endpoint: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        include: ['user'] // Include user details
      });

      return {
        auditLogs: rows,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to retrieve audit logs', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(timeframe = '24h') {
    try {
      let startDate;
      
      switch (timeframe) {
        case '1h':
          startDate = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const [eventStats, riskStats, topUsers, topIPs] = await Promise.all([
        // Event type statistics
        AuditLog.findAll({
          attributes: [
            'eventType',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            timestamp: { [Op.gte]: startDate }
          },
          group: ['eventType'],
          order: [[sequelize.literal('count'), 'DESC']]
        }),

        // Risk level statistics
        AuditLog.findAll({
          attributes: [
            'riskLevel',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            timestamp: { [Op.gte]: startDate }
          },
          group: ['riskLevel']
        }),

        // Top users by activity
        AuditLog.findAll({
          attributes: [
            'userId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            timestamp: { [Op.gte]: startDate },
            userId: { [Op.ne]: null }
          },
          group: ['userId'],
          order: [[sequelize.literal('count'), 'DESC']],
          limit: 10,
          include: ['user']
        }),

        // Top IP addresses
        AuditLog.findAll({
          attributes: [
            'ipAddress',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            timestamp: { [Op.gte]: startDate },
            ipAddress: { [Op.ne]: null }
          },
          group: ['ipAddress'],
          order: [[sequelize.literal('count'), 'DESC']],
          limit: 10
        })
      ]);

      return {
        timeframe,
        eventTypes: eventStats,
        riskLevels: riskStats,
        topUsers,
        topIPs
      };
    } catch (error) {
      logger.error('Failed to generate audit statistics', error);
      throw error;
    }
  }

  /**
   * Get security alerts (high-risk events)
   */
  async getSecurityAlerts(limit = 50) {
    try {
      const alerts = await AuditLog.findAll({
        where: {
          riskLevel: {
            [Op.in]: [this.riskLevels.HIGH, this.riskLevels.CRITICAL]
          },
          timestamp: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        order: [['timestamp', 'DESC']],
        limit,
        include: ['user']
      });

      return alerts;
    } catch (error) {
      logger.error('Failed to retrieve security alerts', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const { auditLogs } = await this.getAuditLogs(filters, { limit: 10000 });
      
      if (format === 'csv') {
        const csv = this.convertToCSV(auditLogs);
        return {
          data: csv,
          filename: `audit_logs_${Date.now()}.csv`,
          contentType: 'text/csv'
        };
      }

      return {
        data: JSON.stringify(auditLogs, null, 2),
        filename: `audit_logs_${Date.now()}.json`,
        contentType: 'application/json'
      };
    } catch (error) {
      logger.error('Failed to export audit logs', error);
      throw error;
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  convertToCSV(auditLogs) {
    const headers = [
      'ID', 'Event Type', 'User ID', 'IP Address', 
      'User Agent', 'Endpoint', 'Risk Level', 'Timestamp', 'Details'
    ];
    
    const rows = auditLogs.map(log => [
      log.id,
      log.eventType,
      log.userId || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.endpoint || '',
      log.riskLevel,
      log.timestamp.toISOString(),
      log.details || '{}'
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  /**
   * Get client IP from request
   */
  getClientIp(request) {
    return request.ip ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           request.headers['x-forwarded-for']?.split(',')[0] ||
           request.headers['x-real-ip'] ||
           'unknown';
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const deletedCount = await AuditLog.destroy({
        where: {
          timestamp: { [Op.lt]: cutoffDate },
          riskLevel: { [Op.in]: [this.riskLevels.LOW, this.riskLevels.MEDIUM] }
        }
      });

      logger.info(`Cleaned up ${deletedCount} old audit log entries`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs', error);
      throw error;
    }
  }
}

module.exports = new AuditService();
