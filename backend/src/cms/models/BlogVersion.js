const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BlogVersion = sequelize.define('BlogVersion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    markdown: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    changeNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    blogId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Blogs',
        key: 'id'
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['blogId', 'version']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  BlogVersion.associate = (models) => {
    BlogVersion.belongsTo(models.Blog, {
      foreignKey: 'blogId',
      as: 'blog'
    });
    
    BlogVersion.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return BlogVersion;
};