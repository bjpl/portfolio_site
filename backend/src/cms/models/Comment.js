const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000]
      }
    },
    authorName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    authorEmail: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    authorWebsite: {
      type: DataTypes.STRING(200),
      validate: {
        isUrl: true
      }
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    userAgent: {
      type: DataTypes.STRING(500)
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'spam', 'rejected'),
      defaultValue: 'pending'
    },
    blogId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Blogs',
        key: 'id'
      }
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Comments',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['blogId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['parentId']
      }
    ]
  });

  Comment.associate = (models) => {
    Comment.belongsTo(models.Blog, {
      foreignKey: 'blogId',
      as: 'blog'
    });
    
    Comment.belongsTo(Comment, {
      foreignKey: 'parentId',
      as: 'parent'
    });
    
    Comment.hasMany(Comment, {
      foreignKey: 'parentId',
      as: 'replies'
    });
  };

  return Comment;
};