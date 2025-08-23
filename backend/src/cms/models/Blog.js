const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Blog = sequelize.define('Blog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        len: [1, 500]
      }
    },
    slug: {
      type: DataTypes.STRING(300),
      allowNull: false,
      unique: true,
      validate: {
        isLowercase: true,
        is: /^[a-z0-9-]+$/
      }
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    markdown: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    excerpt: {
      type: DataTypes.TEXT,
      validate: {
        len: [0, 500]
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'scheduled', 'archived'),
      defaultValue: 'draft',
      allowNull: false
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    featuredImage: {
      type: DataTypes.STRING(500),
      validate: {
        isUrl: true
      }
    },
    metaTitle: {
      type: DataTypes.STRING(70),
      validate: {
        len: [0, 70]
      }
    },
    metaDescription: {
      type: DataTypes.TEXT,
      validate: {
        len: [0, 160]
      }
    },
    metaKeywords: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    canonicalUrl: {
      type: DataTypes.STRING(500),
      validate: {
        isUrl: true
      }
    },
    readTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    commentsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    language: {
      type: DataTypes.STRING(5),
      defaultValue: 'en',
      validate: {
        isIn: [['en', 'es']]
      }
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['slug']
      },
      {
        fields: ['status']
      },
      {
        fields: ['publishedAt']
      },
      {
        fields: ['authorId']
      },
      {
        fields: ['language']
      }
    ]
  });

  Blog.associate = (models) => {
    Blog.belongsTo(models.User, { 
      foreignKey: 'authorId',
      as: 'author'
    });
    
    Blog.belongsToMany(models.Tag, {
      through: 'BlogTags',
      as: 'tags'
    });
    
    Blog.belongsToMany(models.BlogCategory, {
      through: 'BlogCategoryMappings',
      as: 'categories'
    });
    
    Blog.hasMany(models.Comment, {
      foreignKey: 'blogId',
      as: 'comments'
    });
    
    Blog.hasMany(models.BlogVersion, {
      foreignKey: 'blogId',
      as: 'versions'
    });
  };

  return Blog;
};