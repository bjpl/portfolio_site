const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

class User extends Model {
  static associate(models) {
    // User has many portfolios
    this.hasMany(models.Portfolio, {
      foreignKey: 'userId',
      as: 'portfolios'
    });

    // User has many sessions
    this.hasMany(models.Session, {
      foreignKey: 'userId',
      as: 'sessions'
    });

    // User has many content versions
    this.hasMany(models.ContentVersion, {
      foreignKey: 'createdBy',
      as: 'contentVersions'
    });

    // User has many approved versions
    this.hasMany(models.ContentVersion, {
      foreignKey: 'approvedBy',
      as: 'approvedVersions'
    });

    // User has many workflow items assigned
    this.hasMany(models.WorkflowItem, {
      foreignKey: 'assignedTo',
      as: 'assignedWorkflow'
    });

    // User has many workflow items created
    this.hasMany(models.WorkflowItem, {
      foreignKey: 'createdBy',
      as: 'createdWorkflow'
    });
  }

  // Instance methods
  async validatePassword(password) {
    return bcrypt.compare(password, this.password);
  }

  async setPassword(password) {
    this.password = await bcrypt.hash(password, 12);
    return this;
  }

  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.emailVerificationToken;
    delete values.twoFactorSecret;
    return values;
  }

  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      bio: this.bio,
      website: this.website,
      social: this.social,
      createdAt: this.createdAt
    };
  }

  // Static methods
  static async findByEmail(email) {
    return this.findOne({
      where: { email: email.toLowerCase() }
    });
  }

  static async findByUsername(username) {
    return this.findOne({
      where: { username: username.toLowerCase() }
    });
  }

  static async findByCredentials(emailOrUsername, password) {
    const user = await this.findOne({
      where: {
        [this.sequelize.Sequelize.Op.or]: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check account status
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new Error('Account is temporarily locked');
    }

    // Validate password
    const isValid = await user.validatePassword(password);
    
    if (!isValid) {
      // Increment login attempts
      await user.increment('loginAttempts');
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 4) {
        await user.update({
          lockoutUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        });
        throw new Error('Account locked due to too many failed attempts');
      }
      
      throw new Error('Invalid credentials');
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.update({
        loginAttempts: 0,
        lockoutUntil: null,
        lastLogin: new Date()
      });
    }

    return user;
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true,
      isLowercase: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      isLowercase: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [60, 60] // bcrypt hash length
    }
  },
  firstName: {
    type: DataTypes.STRING,
    validate: {
      len: [1, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING,
    validate: {
      len: [1, 50]
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'editor', 'author', 'viewer'),
    defaultValue: 'viewer'
  },
  avatar: {
    type: DataTypes.STRING,
    validate: {
      isUrl: true
    }
  },
  bio: {
    type: DataTypes.TEXT
  },
  website: {
    type: DataTypes.STRING,
    validate: {
      isUrl: true
    }
  },
  social: {
    type: DataTypes.JSON,
    defaultValue: {
      twitter: null,
      linkedin: null,
      github: null,
      instagram: null
    }
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: false,
        marketing: false
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING
  },
  passwordResetToken: {
    type: DataTypes.STRING
  },
  passwordResetExpires: {
    type: DataTypes.DATE
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockoutUntil: {
    type: DataTypes.DATE
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING
  },
  refreshTokenVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['username']
    },
    {
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isEmailVerified']
    },
    {
      fields: ['lastLogin']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      // Hash password
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      
      // Convert email to lowercase
      if (user.email) {
        user.email = user.email.toLowerCase();
      }
      
      // Convert username to lowercase
      if (user.username) {
        user.username = user.username.toLowerCase();
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if changed
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      
      // Convert email to lowercase if changed
      if (user.changed('email')) {
        user.email = user.email.toLowerCase();
      }
      
      // Convert username to lowercase if changed
      if (user.changed('username')) {
        user.username = user.username.toLowerCase();
      }
    }
  }
});

// Session model
class Session extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
}

Session.init({
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
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.STRING
  },
  ipAddress: {
    type: DataTypes.INET
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Session',
  tableName: 'sessions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['token']
    },
    {
      fields: ['refreshToken']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

module.exports = { User, Session };