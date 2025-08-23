const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class WorkflowItem extends Model {
  static associate(models) {
    // WorkflowItem belongs to user (assignee)
    this.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });

    // WorkflowItem belongs to user (creator)
    this.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // WorkflowItem has many comments
    this.hasMany(models.WorkflowComment, {
      foreignKey: 'workflowItemId',
      as: 'comments'
    });
  }

  // Instance methods
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      entityType: this.entityType,
      entityId: this.entityId,
      status: this.status,
      priority: this.priority,
      assignedTo: this.assignedTo,
      createdBy: this.createdBy,
      dueDate: this.dueDate,
      completedAt: this.completedAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Transition to next status
  async transition(newStatus, userId, comment = null) {
    const validTransitions = {
      'pending': ['in-progress', 'cancelled'],
      'in-progress': ['review', 'completed', 'cancelled'],
      'review': ['approved', 'rejected', 'in-progress'],
      'approved': ['completed'],
      'rejected': ['in-progress', 'cancelled'],
      'completed': [],
      'cancelled': ['pending']
    };

    if (!validTransitions[this.status].includes(newStatus)) {
      throw new Error(`Invalid transition from ${this.status} to ${newStatus}`);
    }

    const oldStatus = this.status;
    await this.update({
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : null,
      metadata: {
        ...this.metadata,
        statusHistory: [
          ...(this.metadata.statusHistory || []),
          {
            from: oldStatus,
            to: newStatus,
            changedBy: userId,
            changedAt: new Date(),
            comment
          }
        ]
      }
    });

    // Create workflow comment if provided
    if (comment) {
      const { WorkflowComment } = require('./WorkflowComment');
      await WorkflowComment.create({
        workflowItemId: this.id,
        userId,
        comment,
        type: 'status_change',
        metadata: { statusChange: { from: oldStatus, to: newStatus } }
      });
    }

    return this;
  }

  // Assign to user
  async assignTo(userId, assignedBy) {
    const oldAssignee = this.assignedTo;
    await this.update({
      assignedTo: userId,
      metadata: {
        ...this.metadata,
        assignmentHistory: [
          ...(this.metadata.assignmentHistory || []),
          {
            from: oldAssignee,
            to: userId,
            assignedBy,
            assignedAt: new Date()
          }
        ]
      }
    });

    return this;
  }

  // Check if overdue
  isOverdue() {
    if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
      return false;
    }
    return new Date() > new Date(this.dueDate);
  }

  // Get time remaining
  getTimeRemaining() {
    if (!this.dueDate) return null;
    
    const now = new Date();
    const due = new Date(this.dueDate);
    const diff = due - now;
    
    if (diff <= 0) return { overdue: true, days: 0, hours: 0 };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { overdue: false, days, hours };
  }

  // Static methods
  static async getWorkflowByStatus(status, options = {}) {
    const { page = 1, limit = 20, assignedTo = null } = options;
    
    const whereClause = { status };
    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    const items = await this.findAll({
      where: whereClause,
      include: [
        {
          model: this.sequelize.models.User,
          as: 'assignee',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: this.sequelize.models.User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['priority', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    const total = await this.count({ where: whereClause });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getOverdueItems() {
    const items = await this.findAll({
      where: {
        dueDate: { [this.sequelize.Sequelize.Op.lt]: new Date() },
        status: { [this.sequelize.Sequelize.Op.notIn]: ['completed', 'cancelled'] }
      },
      include: [
        {
          model: this.sequelize.models.User,
          as: 'assignee',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    return items;
  }

  static async getWorkflowStats() {
    const stats = await this.findAll({
      attributes: [
        'status',
        [this.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status']
    });

    const overdue = await this.count({
      where: {
        dueDate: { [this.sequelize.Sequelize.Op.lt]: new Date() },
        status: { [this.sequelize.Sequelize.Op.notIn]: ['completed', 'cancelled'] }
      }
    });

    return {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat.dataValues.count;
        return acc;
      }, {}),
      overdue
    };
  }
}

WorkflowItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT
  },
  type: {
    type: DataTypes.ENUM('approval', 'review', 'task', 'bug', 'feature'),
    allowNull: false
  },
  entityType: {
    type: DataTypes.ENUM('portfolio', 'project', 'experience', 'education', 'content'),
    allowNull: false
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in-progress', 'review', 'approved', 'rejected', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  assignedTo: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dueDate: {
    type: DataTypes.DATE
  },
  completedAt: {
    type: DataTypes.DATE
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {
      statusHistory: [],
      assignmentHistory: [],
      attachments: []
    }
  }
}, {
  sequelize,
  modelName: 'WorkflowItem',
  tableName: 'workflow_items',
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['entityType', 'entityId']
    },
    {
      fields: ['assignedTo']
    },
    {
      fields: ['createdBy']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['dueDate']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = WorkflowItem;