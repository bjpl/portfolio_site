const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { User } = require('./User');

class AuditLog extends Model {
  // Static method to create audit log with automatic risk assessment
  static async createAuditLog(eventType, userId = null, details = {}, request = null) {
    const auditService = require('../services/auditService');
    return auditService.logEvent(eventType, userId, details, request);
  }

  // Instance method to get formatted details
  getFormattedDetails() {
    try {
      return typeof this.details === 'string' 
        ? JSON.parse(this.details) 
        : this.details;
    } catch (error) {
      return this.details || {};
    }
  }

  // Instance method to check if event is security-related
  isSecurityEvent() {
    const securityEvents = [
      'brute_force_attempt',
      'suspicious_activity',
      'security_violation',
      'malicious_request',
      'access_denied',
      'login_failed',
      'unauthorized_access'
    ];
    
    return securityEvents.includes(this.eventType);
  }

  // Instance method to get risk color for UI
  getRiskColor() {
    switch (this.riskLevel) {
      case 'critical':
        return '#dc2626'; // red-600
      case 'high':
        return '#ea580c'; // orange-600
      case 'medium':
        return '#d97706'; // amber-600
      case 'low':
        return '#65a30d'; // lime-600
      default:
        return '#6b7280'; // gray-500
    }
  }
}

AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Event Information
  eventType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  
  // User Information
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Request Information
  ipAddress: {
    type: DataTypes.INET,
    allowNull: true
  },
  
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  endpoint: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  
  httpMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']]
    }
  },
  
  // Session Information
  sessionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Event Details
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  
  // Risk Assessment
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low',
    allowNull: false
  },
  
  // Timestamp
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  
  // Additional Context
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: false
  },
  
  // Location Information (if available)
  location: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Device Information
  deviceFingerprint: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Status flags
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Notes for investigation
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: false, // We use our own timestamp field
  
  indexes: [
    {
      fields: ['eventType']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['ipAddress']
    },
    {
      fields: ['riskLevel']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['isResolved']
    },
    {
      fields: ['eventType', 'timestamp']
    },
    {
      fields: ['userId', 'timestamp']
    },
    {
      fields: ['riskLevel', 'timestamp']
    }
  ]
});

// Associations
AuditLog.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  constraints: false // Allow null userId
});

AuditLog.belongsTo(User, { 
  foreignKey: 'resolvedBy', 
  as: 'resolver',
  constraints: false
});

User.hasMany(AuditLog, { 
  foreignKey: 'userId',
  as: 'auditLogs'
});

module.exports = { AuditLog };
