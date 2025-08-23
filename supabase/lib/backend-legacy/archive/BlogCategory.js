const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BlogCategory = sequelize.define('BlogCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isLowercase: true,
        is: /^[a-z0-9-]+$/
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#007bff',
      validate: {
        is: /^#[0-9A-Fa-f]{6}$/
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['slug']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  BlogCategory.associate = (models) => {
    BlogCategory.belongsToMany(models.Blog, {
      through: 'BlogCategoryMappings',
      as: 'blogs'
    });
  };

  return BlogCategory;
};