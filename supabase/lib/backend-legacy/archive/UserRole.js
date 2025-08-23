/**
 * UserRole Model
 * Junction table for User-Role many-to-many relationship
 */

module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired'),
      defaultValue: 'active',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'user_roles',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['role_id'] },
      { fields: ['assigned_by'] },
      { fields: ['status'] },
      { fields: ['expires_at'] },
      { fields: ['user_id', 'role_id'], unique: true },
    ],
  });

  // Instance methods
  UserRole.prototype.isExpired = function() {
    return this.expires_at && this.expires_at < new Date();
  };

  UserRole.prototype.isActive = function() {
    return this.status === 'active' && !this.isExpired();
  };

  // Associations
  UserRole.associate = (models) => {
    UserRole.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    UserRole.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role',
    });

    UserRole.belongsTo(models.User, {
      foreignKey: 'assigned_by',
      as: 'assigner',
    });
  };

  return UserRole;
};