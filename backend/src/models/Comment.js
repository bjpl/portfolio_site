/**
 * Comment Model
 * Handles hierarchical comments for blog posts with moderation
 */

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
        notEmpty: true,
        len: [1, 5000]
      }
    },
    authorName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'author_name',
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    authorEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'author_email',
      validate: {
        isEmail: true
      }
    },
    authorUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'author_url',
      validate: {
        isUrl: true
      }
    },
    authorIp: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'author_ip'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'comments',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'spam', 'trash'),
      defaultValue: 'pending',
      allowNull: false
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'like_count'
    },
    dislikeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'dislike_count'
    },
    isSticky: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_sticky'
    },
    moderatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'moderated_by'
    },
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'moderated_at'
    },
    moderationNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'moderation_note'
    }
  }, {
    tableName: 'comments',
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['post_id', 'status', 'created_at']
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['author_email']
      },
      {
        fields: ['author_ip']
      },
      {
        fields: ['user_id']
      }
    ],
    hooks: {
      beforeCreate: (comment) => {
        // Auto-moderate based on rules
        comment.status = Comment.autoModerate(comment);
      },
      afterCreate: async (comment) => {
        // Update comment count on post
        if (comment.postId && comment.status === 'approved') {
          const post = await comment.getPost();
          if (post) {
            await post.increment('commentCount');
          }
        }
      },
      afterUpdate: async (comment, options) => {
        // Update comment count when status changes
        if (options.fields && options.fields.includes('status')) {
          const post = await comment.getPost();
          if (post) {
            const approvedCount = await Comment.count({
              where: {
                postId: post.id,
                status: 'approved'
              }
            });
            await post.update({ commentCount: approvedCount });
          }
        }
      }
    }
  });

  // Class methods
  Comment.autoModerate = function(comment) {
    // Simple auto-moderation rules
    const spamKeywords = ['viagra', 'casino', 'lottery', 'bitcoin', 'crypto', 'loan'];
    const contentLower = comment.content.toLowerCase();
    
    // Check for spam keywords
    if (spamKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'spam';
    }

    // Check for excessive links
    const linkCount = (comment.content.match(/https?:\/\//g) || []).length;
    if (linkCount > 2) {
      return 'spam';
    }

    // Check for duplicate content (implement if needed)
    // ...

    // Default to pending for manual review
    return 'pending';
  };

  Comment.getApproved = function(postId, options = {}) {
    return this.findAll({
      where: {
        postId,
        status: 'approved'
      },
      order: [
        ['isSticky', 'DESC'],
        ['createdAt', 'ASC']
      ],
      ...options
    });
  };

  Comment.getThreaded = async function(postId) {
    // Get all approved comments
    const comments = await this.findAll({
      where: {
        postId,
        status: 'approved'
      },
      order: [
        ['isSticky', 'DESC'],
        ['createdAt', 'ASC']
      ]
    });

    // Build threaded structure
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create map
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment.toJSON(),
        replies: []
      });
    });

    // Second pass: build hierarchy
    comments.forEach(comment => {
      const commentData = commentMap.get(comment.id);
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentData);
        }
      } else {
        rootComments.push(commentData);
      }
    });

    return rootComments;
  };

  Comment.getPending = function(options = {}) {
    return this.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']],
      ...options
    });
  };

  Comment.getByAuthorEmail = function(email, options = {}) {
    return this.findAll({
      where: { authorEmail: email },
      order: [['createdAt', 'DESC']],
      ...options
    });
  };

  // Instance methods
  Comment.prototype.approve = async function(moderatorId = null) {
    this.status = 'approved';
    if (moderatorId) {
      this.moderatedBy = moderatorId;
      this.moderatedAt = new Date();
    }
    return this.save();
  };

  Comment.prototype.reject = async function(moderatorId = null, note = null) {
    this.status = 'trash';
    if (moderatorId) {
      this.moderatedBy = moderatorId;
      this.moderatedAt = new Date();
    }
    if (note) {
      this.moderationNote = note;
    }
    return this.save();
  };

  Comment.prototype.markAsSpam = async function(moderatorId = null) {
    this.status = 'spam';
    if (moderatorId) {
      this.moderatedBy = moderatorId;
      this.moderatedAt = new Date();
    }
    return this.save();
  };

  Comment.prototype.incrementLike = async function() {
    await this.increment('likeCount');
    return this.reload();
  };

  Comment.prototype.incrementDislike = async function() {
    await this.increment('dislikeCount');
    return this.reload();
  };

  Comment.prototype.getReplies = function() {
    return Comment.findAll({
      where: {
        parentId: this.id,
        status: 'approved'
      },
      order: [['createdAt', 'ASC']]
    });
  };

  Comment.prototype.getDepth = async function() {
    let depth = 0;
    let current = this;
    
    while (current.parentId) {
      const parent = await Comment.findByPk(current.parentId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    
    return depth;
  };

  // Associations
  Comment.associate = function(models) {
    // Post relationship
    Comment.belongsTo(models.BlogPost, {
      foreignKey: 'postId',
      as: 'post',
      onDelete: 'CASCADE'
    });

    // User relationship (for registered users)
    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      allowNull: true
    });

    // Self-referencing for threaded comments
    Comment.belongsTo(Comment, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    Comment.hasMany(Comment, {
      foreignKey: 'parentId',
      as: 'replies'
    });

    // Moderator relationship
    Comment.belongsTo(models.User, {
      foreignKey: 'moderatedBy',
      as: 'moderator'
    });
  };

  return Comment;
};