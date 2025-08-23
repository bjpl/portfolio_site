const { DataTypes, Model } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../../config/database');

class ApiKey extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }

  // Generate secure API key
  static generateApiKey() {
    const prefix = 'ak_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return prefix + randomBytes;
  }

  // Hash API key for storage
  static hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  // Verify API key
  verifyKey(providedKey) {
    const hashedProvided = this.constructor.hashApiKey(providedKey);
    return crypto.timingSafeEqual(
      Buffer.from(this.keyHash, 'hex'),
      Buffer.from(hashedProvided, 'hex')
    );
  }

  // Check if key is active and not expired
  isValid() {
    if (!this.isActive) return false;
    if (this.expiresAt && this.expiresAt < new Date()) return false;
    if (this.rateLimit && this.currentUsage >= this.rateLimit) return false;
    return true;
  }

  // Increment usage counter
  async incrementUsage() {
    await this.increment('currentUsage');
    await this.update({ lastUsedAt: new Date() });
  }
}

ApiKey.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  keyHash: {
    type: DataTypes.STRING(64), // SHA256 hash length
    allowNull: false,
    unique: true
  },
  prefix: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      read: true,
      write: false,
      admin: false
    }
  },
  allowedIPs: {
    type: DataTypes.JSON,
    defaultValue: [], // Empty array means all IPs allowed
    comment: 'Array of IP addresses or CIDR blocks'
  },
  allowedOrigins: {
    type: DataTypes.JSON,
    defaultValue: [], // Empty array means all origins allowed
    comment: 'Array of allowed origin domains'
  },
  rateLimit: {
    type: DataTypes.INTEGER,
    comment: 'Requests per hour limit (null = unlimited)'
  },
  currentUsage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current hourly usage counter'
  },
  totalUsage: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Total lifetime usage counter'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    comment: 'Optional expiration date'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    comment: 'Last time this key was used'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional metadata for the API key'
  }
}, {
  sequelize,
  modelName: 'ApiKey',
  tableName: 'api_keys',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['keyHash'],
      unique: true
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['expiresAt']
    },
    {
      fields: ['lastUsedAt']
    }
  ]
});

module.exports = ApiKey;