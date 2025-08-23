/**
 * Blog Post Model
 * Handles blog posts with full CMS capabilities including drafts, publishing, and SEO
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BlogPost = sequelize.define('BlogPost', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9-]+$/
      }
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500]
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    featuredImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'featured_image'
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived', 'scheduled'),
      defaultValue: 'draft',
      allowNull: false
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private', 'password', 'members'),
      defaultValue: 'public',
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    allowComments: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'allow_comments'
    },
    commentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'comment_count'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count'
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'like_count'
    },
    shareCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'share_count'
    },
    readingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reading_time'
    },
    language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en',
      allowNull: false
    },
    // SEO Fields
    metaTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'meta_title',
      validate: {
        len: [0, 255]
      }
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'meta_description',
      validate: {
        len: [0, 320]
      }
    },
    metaKeywords: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'meta_keywords'
    },
    canonicalUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'canonical_url'
    },
    // Social Media Fields
    ogTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'og_title'
    },
    ogDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'og_description'
    },
    ogImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'og_image'
    },
    twitterTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'twitter_title'
    },
    twitterDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'twitter_description'
    },
    twitterImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'twitter_image'
    },
    // Analytics and Tracking
    customFields: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'custom_fields'
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at'
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_for'
    }
  }, {
    tableName: 'blog_posts',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['slug']
      },
      {
        fields: ['status', 'visibility']
      },
      {
        fields: ['published_at']
      },
      {
        fields: ['featured']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['language']
      },
      {
        name: 'blog_posts_search_idx',
        using: 'gin',
        fields: [
          sequelize.literal(`to_tsvector('english', title || ' ' || coalesce(excerpt, '') || ' ' || content)`)
        ]
      }
    ],
    hooks: {
      beforeValidate: (post) => {
        // Auto-generate slug from title if not provided
        if (!post.slug && post.title) {
          post.slug = post.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        }

        // Calculate reading time (average 200 words per minute)
        if (post.content) {
          const wordCount = post.content.split(/\s+/).length;
          post.readingTime = Math.max(1, Math.ceil(wordCount / 200));
        }

        // Auto-generate excerpt from content if not provided
        if (!post.excerpt && post.content) {
          const textContent = post.content.replace(/<[^>]*>/g, ''); // Strip HTML
          post.excerpt = textContent.substring(0, 300) + (textContent.length > 300 ? '...' : '');
        }

        // Set published_at when status changes to published
        if (post.status === 'published' && !post.publishedAt) {
          post.publishedAt = new Date();
        }

        // Clear published_at when status changes from published
        if (post.status !== 'published' && post.publishedAt) {
          post.publishedAt = null;
        }
      },
      afterCreate: (post) => {
        // Index for search after creation
        if (post.status === 'published') {
          // Trigger search reindexing
          post.constructor.searchService?.indexDocument('blog_post', post);
        }
      },
      afterUpdate: (post) => {
        // Update search index after update
        if (post.status === 'published') {
          post.constructor.searchService?.indexDocument('blog_post', post);
        } else {
          post.constructor.searchService?.removeDocument('blog_post', post.id);
        }
      },
      afterDestroy: (post) => {
        // Remove from search index after deletion
        post.constructor.searchService?.removeDocument('blog_post', post.id);
      }
    }
  });

  // Class methods
  BlogPost.getPublished = function(options = {}) {
    return this.findAll({
      where: {
        status: 'published',
        visibility: 'public',
        publishedAt: {
          [sequelize.Sequelize.Op.lte]: new Date()
        }
      },
      order: [['publishedAt', 'DESC']],
      ...options
    });
  };

  BlogPost.getFeatured = function(limit = 5) {
    return this.findAll({
      where: {
        status: 'published',
        visibility: 'public',
        featured: true
      },
      order: [['publishedAt', 'DESC']],
      limit
    });
  };

  BlogPost.getBySlug = function(slug, includePrivate = false) {
    const where = { slug };
    if (!includePrivate) {
      where.status = 'published';
      where.visibility = 'public';
    }
    return this.findOne({ where });
  };

  BlogPost.search = function(query, options = {}) {
    return this.findAll({
      where: {
        [sequelize.Sequelize.Op.and]: [
          {
            status: 'published',
            visibility: 'public'
          },
          sequelize.literal(
            `to_tsvector('english', title || ' ' || coalesce(excerpt, '') || ' ' || content) @@ plainto_tsquery('english', '${query}')`
          )
        ]
      },
      order: [
        [
          sequelize.literal(
            `ts_rank(to_tsvector('english', title || ' ' || coalesce(excerpt, '') || ' ' || content), plainto_tsquery('english', '${query}'))`
          ),
          'DESC'
        ]
      ],
      ...options
    });
  };

  // Instance methods
  BlogPost.prototype.incrementView = async function() {
    await this.increment('viewCount');
    return this.reload();
  };

  BlogPost.prototype.incrementLike = async function() {
    await this.increment('likeCount');
    return this.reload();
  };

  BlogPost.prototype.incrementShare = async function() {
    await this.increment('shareCount');
    return this.reload();
  };

  BlogPost.prototype.publish = async function() {
    this.status = 'published';
    this.publishedAt = new Date();
    return this.save();
  };

  BlogPost.prototype.unpublish = async function() {
    this.status = 'draft';
    this.publishedAt = null;
    return this.save();
  };

  BlogPost.prototype.isPublished = function() {
    return this.status === 'published' && 
           this.visibility === 'public' && 
           this.publishedAt && 
           this.publishedAt <= new Date();
  };

  BlogPost.prototype.canView = function(user = null) {
    // Public posts can be viewed by anyone
    if (this.visibility === 'public' && this.isPublished()) {
      return true;
    }

    // Private posts require authentication
    if (this.visibility === 'private') {
      return user && (user.id === this.userId || user.hasRole('admin'));
    }

    // Password protected posts (implement password check elsewhere)
    if (this.visibility === 'password') {
      return true; // Password check handled at controller level
    }

    // Members only
    if (this.visibility === 'members') {
      return user !== null;
    }

    return false;
  };

  // Associations
  BlogPost.associate = function(models) {
    // Author relationship
    BlogPost.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author',
      onDelete: 'CASCADE'
    });

    // Tags relationship (many-to-many)
    BlogPost.belongsToMany(models.Tag, {
      through: 'BlogPostTag',
      foreignKey: 'blogPostId',
      otherKey: 'tagId',
      as: 'tags'
    });

    // Categories relationship (many-to-many)
    BlogPost.belongsToMany(models.Category, {
      through: 'BlogPostCategory',
      foreignKey: 'blogPostId',
      otherKey: 'categoryId',
      as: 'categories'
    });

    // Content versions for draft management
    BlogPost.hasMany(models.ContentVersion, {
      foreignKey: 'contentId',
      scope: {
        contentType: 'blog_post'
      },
      as: 'versions'
    });

    // Comments relationship
    BlogPost.hasMany(models.Comment, {
      foreignKey: 'postId',
      as: 'comments'
    });

    // Media assets relationship
    BlogPost.belongsToMany(models.MediaAsset, {
      through: 'BlogPostMedia',
      foreignKey: 'blogPostId',
      otherKey: 'mediaAssetId',
      as: 'media'
    });
  };

  return BlogPost;
};