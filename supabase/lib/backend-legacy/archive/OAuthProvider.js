const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../config/database');

class OAuthProvider extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }

  // Get user's connected providers
  static async getUserProviders(userId) {
    return this.findAll({
      where: { userId },
      attributes: ['provider', 'providerId', 'email', 'isActive', 'connectedAt', 'lastUsedAt']
    });
  }

  // Find user by OAuth provider info
  static async findByProvider(provider, providerId) {
    return this.findOne({
      where: { provider, providerId },
      include: [{
        model: sequelize.models.User,
        as: 'user'
      }]
    });
  }

  // Link OAuth account to existing user
  static async linkProvider(userId, providerData) {
    const existing = await this.findOne({
      where: {
        userId,
        provider: providerData.provider
      }
    });

    if (existing) {
      // Update existing connection
      return existing.update({
        providerId: providerData.providerId,
        email: providerData.email,
        displayName: providerData.displayName,
        avatar: providerData.avatar,
        profileData: providerData.profileData,
        accessToken: providerData.accessToken,
        refreshToken: providerData.refreshToken,
        tokenExpiresAt: providerData.tokenExpiresAt,
        isActive: true,
        lastUsedAt: new Date()
      });
    }

    // Create new connection
    return this.create({
      userId,
      ...providerData,
      connectedAt: new Date(),
      lastUsedAt: new Date()
    });
  }

  // Unlink provider from user
  static async unlinkProvider(userId, provider) {
    const connection = await this.findOne({
      where: { userId, provider }
    });

    if (!connection) {
      throw new Error('Provider connection not found');
    }

    await connection.destroy();
    return { message: 'Provider unlinked successfully' };
  }

  // Update provider tokens
  async updateTokens(accessToken, refreshToken, expiresAt) {
    return this.update({
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt,
      lastUsedAt: new Date()
    });
  }
}

OAuthProvider.init({
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
  provider: {
    type: DataTypes.ENUM('github', 'google', 'microsoft', 'discord', 'twitter'),
    allowNull: false
  },
  providerId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Unique ID from the OAuth provider'
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    },
    comment: 'Email from OAuth provider (may differ from user email)'
  },
  displayName: {
    type: DataTypes.STRING,
    comment: 'Display name from OAuth provider'
  },
  avatar: {
    type: DataTypes.STRING,
    comment: 'Avatar URL from OAuth provider'
  },
  profileData: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional profile data from provider'
  },
  accessToken: {
    type: DataTypes.TEXT,
    comment: 'Encrypted access token for API calls'
  },
  refreshToken: {
    type: DataTypes.TEXT,
    comment: 'Encrypted refresh token'
  },
  tokenExpiresAt: {
    type: DataTypes.DATE,
    comment: 'When the access token expires'
  },
  scopes: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Granted OAuth scopes'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this OAuth connection is active'
  },
  connectedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When this provider was first connected'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    comment: 'Last time this OAuth provider was used for authentication'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional provider-specific metadata'
  }
}, {
  sequelize,
  modelName: 'OAuthProvider',
  tableName: 'oauth_providers',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['provider', 'providerId'],
      unique: true
    },
    {
      fields: ['userId', 'provider'],
      unique: true
    },
    {
      fields: ['email']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['lastUsedAt']
    }
  ]
});

module.exports = OAuthProvider;