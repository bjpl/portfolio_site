const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../config/database');

class AuthAttempt extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }

  // Check if IP is currently blocked
  static async isBlocked(ipAddress, type = 'login') {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Count failed attempts in last 5 minutes
    const recentAttempts = await this.count({
      where: {
        ipAddress,
        type,
        success: false,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: fiveMinutesAgo
        }
      }
    });

    // Count failed attempts in last 15 minutes
    const mediumTermAttempts = await this.count({
      where: {
        ipAddress,
        type,
        success: false,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: fifteenMinutesAgo
        }
      }
    });

    // Block if more than 5 attempts in 5 minutes or 10 attempts in 15 minutes
    return recentAttempts >= 5 || mediumTermAttempts >= 10;
  }

  // Record authentication attempt
  static async recordAttempt(data) {
    return this.create({
      userId: data.userId || null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      type: data.type || 'login',
      success: data.success,
      failureReason: data.failureReason || null,
      metadata: data.metadata || {}
    });
  }

  // Get attempt statistics for an IP
  static async getAttemptStats(ipAddress, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await this.findAll({
      where: {
        ipAddress,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: since
        }
      },
      attributes: [
        'type',
        'success',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['type', 'success'],
      raw: true
    });

    return stats.reduce((acc, stat) => {
      const key = `${stat.type}_${stat.success ? 'success' : 'failed'}`;
      acc[key] = parseInt(stat.count);
      return acc;
    }, {});
  }

  // Clean old attempts (for maintenance)
  static async cleanOldAttempts(daysOld = 30) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    return this.destroy({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.lt]: cutoff
        }
      }
    });
  }
}

AuthAttempt.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Can be null for failed attempts with invalid user
    references: {
      model: 'users',
      key: 'id'
    }
  },
  ipAddress: {
    type: DataTypes.INET,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.TEXT
  },
  type: {
    type: DataTypes.ENUM(
      'login',
      'register',
      'password_reset',
      'email_verification',
      'api_key',
      'oauth',
      'two_factor'
    ),
    defaultValue: 'login'
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  failureReason: {
    type: DataTypes.STRING,
    comment: 'Reason for failure (invalid_credentials, account_locked, etc.)'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional context about the attempt'
  }
}, {
  sequelize,
  modelName: 'AuthAttempt',
  tableName: 'auth_attempts',
  timestamps: true,
  updatedAt: false, // We don't need updatedAt for log entries
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['ipAddress']
    },
    {
      fields: ['ipAddress', 'type', 'success']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['success']
    },
    {
      fields: ['type']
    }
  ]
});

module.exports = AuthAttempt;