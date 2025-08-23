const { DataTypes, Model } = require('sequelize');
const crypto = require('crypto');
const sequelize = require('../../config/database');

class RefreshToken extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }

  // Generate secure refresh token
  static generateToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Hash token for storage
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Verify token
  verifyToken(providedToken) {
    const hashedProvided = this.constructor.hashToken(providedToken);
    return crypto.timingSafeEqual(
      Buffer.from(this.tokenHash, 'hex'),
      Buffer.from(hashedProvided, 'hex')
    );
  }

  // Check if token is valid
  isValid() {
    if (!this.isActive) return false;
    if (this.expiresAt < new Date()) return false;
    if (this.isRevoked) return false;
    return true;
  }

  // Revoke token
  async revoke(reason = 'manual') {
    await this.update({
      isRevoked: true,
      revokedAt: new Date(),
      revokeReason: reason
    });
  }

  // Create token family (for rotation)
  static async createTokenFamily(userId, deviceInfo = {}) {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const familyId = crypto.randomUUID();
    
    const refreshToken = await this.create({
      userId,
      tokenHash,
      familyId,
      deviceInfo,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    return { token, refreshToken };
  }

  // Rotate token (create new, revoke old)
  async rotate(deviceInfo = {}) {
    // Generate new token
    const newToken = this.constructor.generateToken();
    const newTokenHash = this.constructor.hashToken(newToken);
    
    // Create new refresh token with same family
    const newRefreshToken = await this.constructor.create({
      userId: this.userId,
      tokenHash: newTokenHash,
      familyId: this.familyId,
      deviceInfo,
      parentTokenId: this.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      generation: (this.generation || 0) + 1
    });

    // Revoke current token
    await this.revoke('rotated');

    return { token: newToken, refreshToken: newRefreshToken };
  }

  // Revoke entire token family (security breach)
  async revokeFamily(reason = 'security_breach') {
    await this.constructor.update(
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: reason
      },
      {
        where: { familyId: this.familyId }
      }
    );
  }

  // Find token by hash
  static async findByToken(token) {
    const tokenHash = this.hashToken(token);
    return this.findOne({
      where: { tokenHash },
      include: ['user']
    });
  }

  // Clean expired tokens
  static async cleanExpired() {
    return this.destroy({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { expiresAt: { [sequelize.Sequelize.Op.lt]: new Date() } },
          { isRevoked: true, revokedAt: { [sequelize.Sequelize.Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        ]
      }
    });
  }

  // Get user's active tokens
  static async getUserTokens(userId) {
    return this.findAll({
      where: {
        userId,
        isActive: true,
        isRevoked: false,
        expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      attributes: ['id', 'deviceInfo', 'createdAt', 'lastUsedAt', 'familyId'],
      order: [['lastUsedAt', 'DESC']]
    });
  }
}

RefreshToken.init({
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
  tokenHash: {
    type: DataTypes.STRING(64), // SHA256 hash length
    allowNull: false,
    unique: true
  },
  familyId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Token family ID for rotation tracking'
  },
  parentTokenId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'refresh_tokens',
      key: 'id'
    },
    comment: 'Previous token in rotation chain'
  },
  generation: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Token generation number in family'
  },
  deviceInfo: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Device/browser information'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  revokedAt: {
    type: DataTypes.DATE
  },
  revokeReason: {
    type: DataTypes.STRING,
    comment: 'Reason for revocation'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of times this token was used'
  }
}, {
  sequelize,
  modelName: 'RefreshToken',
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['tokenHash'],
      unique: true
    },
    {
      fields: ['familyId']
    },
    {
      fields: ['parentTokenId']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isRevoked']
    },
    {
      fields: ['expiresAt']
    },
    {
      fields: ['lastUsedAt']
    }
  ]
});

module.exports = RefreshToken;