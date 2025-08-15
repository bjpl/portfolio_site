const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

const config = require('../config');

// Database connection
let sequelize;
if (config.database.type === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.database.name, // Use DB_NAME as the file path for SQLite
    logging: config.server.isDevelopment ? console.log : false,
  });
} else {
  sequelize = new Sequelize(config.database.name, config.database.user, config.database.password, {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.type,
    logging: config.server.isDevelopment ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

// User Model
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase());
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 30],
        isAlphanumeric: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100],
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name',
    },
    role: {
      type: DataTypes.ENUM('admin', 'editor', 'author', 'viewer'),
      defaultValue: 'viewer',
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified',
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      field: 'email_verification_token',
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      field: 'password_reset_token',
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      field: 'password_reset_expires',
    },
    refreshTokens: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'refresh_tokens',
    },
    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login',
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_attempts',
    },
    lockoutUntil: {
      type: DataTypes.DATE,
      field: 'lockout_until',
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false,
        },
      },
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async user => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, config.security.bcryptRounds);
        }
      },
      beforeUpdate: async user => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, config.security.bcryptRounds);
        }
      },
    },
  }
);

// Instance methods
User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.isLocked = function () {
  return this.lockoutUntil && this.lockoutUntil > Date.now();
};

User.prototype.incrementLoginAttempts = async function () {
  // Reset attempts if lockout has expired
  if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
    return this.update({
      loginAttempts: 1,
      lockoutUntil: null,
    });
  }

  const updates = { loginAttempts: this.loginAttempts + 1 };
  const maxAttempts = 5;
  const lockoutHours = 2;

  if (updates.loginAttempts >= maxAttempts && !this.isLocked()) {
    updates.lockoutUntil = new Date(Date.now() + lockoutHours * 60 * 60 * 1000);
  }

  return this.update(updates);
};

User.prototype.resetLoginAttempts = async function () {
  return this.update({
    loginAttempts: 0,
    lockoutUntil: null,
  });
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.emailVerificationToken;
  delete values.passwordResetToken;
  delete values.passwordResetExpires;
  delete values.refreshTokens;
  return values;
};

// Class methods
User.findByEmail = function (email) {
  return this.findOne({ where: { email: email.toLowerCase() } });
};

User.findByUsername = function (username) {
  return this.findOne({ where: { username } });
};

User.findByCredentials = async function (emailOrUsername, password) {
  const user = await this.findOne({
    where: {
      [Sequelize.Op.or]: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.isLocked()) {
    throw new Error('Account is locked. Please try again later.');
  }

  const isValid = await user.validatePassword(password);

  if (!isValid) {
    await user.incrementLoginAttempts();
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  await user.resetLoginAttempts();
  await user.update({ lastLogin: new Date() });

  return user;
};

// Permissions
User.prototype.can = function (action, resource) {
  const permissions = {
    admin: ['*'],
    editor: ['create', 'read', 'update', 'delete:own', 'publish'],
    author: ['create', 'read', 'update:own', 'delete:own'],
    viewer: ['read'],
  };

  const userPermissions = permissions[this.role] || [];

  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(action)) return true;
  if (userPermissions.includes(`${action}:own`)) {
    // Check if user owns the resource
    return resource && resource.userId === this.id;
  }

  return false;
};

// Session Model for storing sessions
const Session = sequelize.define(
  'Session',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token',
    },
    userAgent: {
      type: DataTypes.STRING,
      field: 'user_agent',
    },
    ipAddress: {
      type: DataTypes.STRING,
      field: 'ip_address',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    lastActivity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'last_activity',
    },
  },
  {
    tableName: 'sessions',
    timestamps: true,
    underscored: true,
  }
);

// Associations
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Session, sequelize };
