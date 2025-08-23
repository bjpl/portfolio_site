const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class WorkflowComment extends Model {
  static associate(models) {
    // WorkflowComment belongs to workflow item
    this.belongsTo(models.WorkflowItem, {
      foreignKey: 'workflowItemId',
      as: 'workflowItem'
    });

    // WorkflowComment belongs to user
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });

    // WorkflowComment can have a parent (for replies)
    this.belongsTo(models.WorkflowComment, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    // WorkflowComment can have replies
    this.hasMany(models.WorkflowComment, {
      foreignKey: 'parentId',
      as: 'replies'
    });
  }

  // Instance methods
  toJSON() {
    return {
      id: this.id,
      workflowItemId: this.workflowItemId,
      userId: this.userId,
      parentId: this.parentId,
      comment: this.comment,
      type: this.type,
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Edit comment
  async editComment(newComment, userId) {
    if (this.userId !== userId) {
      throw new Error('Only the author can edit this comment');
    }

    await this.update({
      comment: newComment,
      isEdited: true,
      editedAt: new Date(),
      metadata: {
        ...this.metadata,
        editHistory: [
          ...(this.metadata.editHistory || []),
          {
            previousComment: this.comment,
            editedAt: new Date()
          }
        ]
      }
    });

    return this;
  }

  // Static methods
  static async getCommentsForWorkflow(workflowItemId, options = {}) {
    const { page = 1, limit = 50, includeReplies = true } = options;

    const queryOptions = {
      where: { 
        workflowItemId,
        parentId: null // Only get top-level comments
      },
      include: [
        {
          model: this.sequelize.models.User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit,
      offset: (page - 1) * limit
    };

    if (includeReplies) {
      queryOptions.include.push({
        model: this.sequelize.models.WorkflowComment,
        as: 'replies',
        include: [
          {
            model: this.sequelize.models.User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
          }
        ],
        order: [['createdAt', 'ASC']]
      });
    }

    const comments = await this.findAll(queryOptions);
    const total = await this.count({ 
      where: { 
        workflowItemId,
        parentId: null 
      } 
    });

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async createComment(data) {
    const { workflowItemId, userId, comment, type = 'comment', parentId = null, metadata = {} } = data;

    // Validate workflow item exists
    const { WorkflowItem } = require('./WorkflowItem');
    const workflowItem = await WorkflowItem.findByPk(workflowItemId);
    if (!workflowItem) {
      throw new Error('Workflow item not found');
    }

    // Validate parent comment if provided
    if (parentId) {
      const parentComment = await this.findByPk(parentId);
      if (!parentComment || parentComment.workflowItemId !== workflowItemId) {
        throw new Error('Invalid parent comment');
      }
    }

    const newComment = await this.create({
      workflowItemId,
      userId,
      parentId,
      comment,
      type,
      metadata
    });

    // Return with associations
    return this.findByPk(newComment.id, {
      include: [
        {
          model: this.sequelize.models.User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }
      ]
    });
  }
}

WorkflowComment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workflowItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workflow_items',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  parentId: {
    type: DataTypes.UUID,
    references: {
      model: 'workflow_comments',
      key: 'id'
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 10000]
    }
  },
  type: {
    type: DataTypes.ENUM('comment', 'status_change', 'assignment', 'approval', 'rejection'),
    defaultValue: 'comment'
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  editedAt: {
    type: DataTypes.DATE
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {
      editHistory: [],
      attachments: [],
      mentions: []
    }
  }
}, {
  sequelize,
  modelName: 'WorkflowComment',
  tableName: 'workflow_comments',
  timestamps: true,
  indexes: [
    {
      fields: ['workflowItemId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['parentId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = WorkflowComment;