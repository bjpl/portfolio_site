/**
 * Role Model
 * Role-based access control system
 */

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 50],
      },
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidPermissions(value) {
          if (typeof value !== 'object') {
            throw new Error('Permissions must be an object');
          }
        },
      },
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    hierarchy_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'roles',
    indexes: [
      { fields: ['name'] },
      { fields: ['status'] },
      { fields: ['hierarchy_level'] },
      { fields: ['is_system_role'] },
    ],
  });

  // Instance methods
  Role.prototype.hasPermission = function(permission) {
    const parts = permission.split('.');
    let current = this.permissions;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return false;
      }
      current = current[part];
    }
    
    return current === true;
  };

  Role.prototype.addPermission = function(permission, value = true) {
    const parts = permission.split('.');
    let current = this.permissions;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
    this.changed('permissions', true);
  };

  Role.prototype.removePermission = function(permission) {
    const parts = permission.split('.');
    let current = this.permissions;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        return false;
      }
      current = current[part];
    }
    
    delete current[parts[parts.length - 1]];
    this.changed('permissions', true);
    return true;
  };

  // Associations
  Role.associate = (models) => {
    Role.belongsToMany(models.User, {
      through: models.UserRole,
      foreignKey: 'role_id',
      otherKey: 'user_id',
      as: 'users',
    });
  };

  return Role;
};