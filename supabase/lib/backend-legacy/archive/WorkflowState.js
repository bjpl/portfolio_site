/**
 * WorkflowState Model
 * Content workflow and approval state tracking
 */

module.exports = (sequelize, DataTypes) => {
  const WorkflowState = sequelize.define('WorkflowState', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the main content record (polymorphic)',
    },
    content_type: {
      type: DataTypes.ENUM(
        'project',
        'experience',
        'education',
        'testimonial',
        'skill',
        'page',
        'blog_post',
        'portfolio_item',
        'other'
      ),
      allowNull: false,
    },
    version_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'content_versions',
        key: 'id',
      },
      comment: 'Specific version being worked on',
    },
    workflow_type: {
      type: DataTypes.ENUM(
        'content_creation',
        'content_review',
        'content_approval',
        'seo_optimization',
        'translation',
        'quality_check',
        'legal_review',
        'client_approval',
        'publishing',
        'maintenance',
        'archive',
        'educational_review',
        'pedagogical_validation',
        'student_testing',
        'peer_workshop',
        'cultural_adaptation',
        'impact_assessment',
        'portfolio_curation',
        'creative_editing',
        'multilingual_sync'
      ),
      allowNull: false,
    },
    current_step: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    step_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    total_steps: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    status: {
      type: DataTypes.ENUM(
        'not_started',
        'in_progress',
        'waiting_for_input',
        'blocked',
        'completed',
        'cancelled',
        'failed',
        'skipped',
        'on_hold'
      ),
      defaultValue: 'not_started',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
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
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimated_hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    actual_hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    progress_percentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    blocking_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quality_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    feedback: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of feedback objects',
    },
    checklist: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of checklist items with completion status',
    },
    attachments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'References to related files or documents',
    },
    notifications_sent: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Track of notifications sent',
    },
    escalation_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5,
      },
    },
    escalated_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    escalated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_step: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    next_assignee: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    workflow_data: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Workflow-specific data and configuration',
    },
    automation_rules: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Rules for automated workflow transitions',
    },
    dependencies: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Other workflow states this depends on',
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'workflow_states',
    indexes: [
      { fields: ['content_id'] },
      { fields: ['content_type'] },
      { fields: ['version_id'] },
      { fields: ['workflow_type'] },
      { fields: ['current_step'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['assigned_to'] },
      { fields: ['assigned_by'] },
      { fields: ['due_date'] },
      { fields: ['started_at'] },
      { fields: ['completed_at'] },
      { fields: ['escalation_level'] },
      { fields: ['content_id', 'content_type'] },
      { fields: ['assigned_to', 'status'] },
      { fields: ['due_date', 'status'] },
    ],
  });

  // Instance methods
  WorkflowState.prototype.startWork = async function(userId = null) {
    this.status = 'in_progress';
    this.started_at = new Date();
    this.progress_percentage = 0;
    
    if (userId) {
      this.assigned_to = userId;
      this.assigned_at = new Date();
    }
    
    await this.save();
  };

  WorkflowState.prototype.completeWork = async function(notes = null, qualityScore = null) {
    this.status = 'completed';
    this.completed_at = new Date();
    this.progress_percentage = 100;
    
    if (notes) {
      this.resolution_notes = notes;
    }
    
    if (qualityScore !== null) {
      this.quality_score = qualityScore;
    }
    
    await this.save();
    
    // Auto-advance to next step if configured
    await this.advanceToNextStep();
  };

  WorkflowState.prototype.blockWork = async function(reason, escalate = false) {
    this.status = 'blocked';
    this.blocking_reason = reason;
    
    if (escalate) {
      this.escalation_level += 1;
      this.escalated_at = new Date();
    }
    
    await this.save();
  };

  WorkflowState.prototype.assignTo = async function(userId, assignedBy = null) {
    this.assigned_to = userId;
    this.assigned_by = assignedBy;
    this.assigned_at = new Date();
    
    if (this.status === 'not_started') {
      this.status = 'in_progress';
    }
    
    await this.save();
  };

  WorkflowState.prototype.updateProgress = async function(percentage) {
    this.progress_percentage = Math.max(0, Math.min(100, percentage));
    
    if (this.progress_percentage === 100 && this.status === 'in_progress') {
      await this.completeWork();
    } else {
      await this.save();
    }
  };

  WorkflowState.prototype.addFeedback = async function(feedback, userId = null) {
    const feedbackEntry = {
      id: require('uuid').v4(),
      content: feedback,
      author: userId,
      timestamp: new Date(),
      type: 'general',
    };
    
    this.feedback = [...(this.feedback || []), feedbackEntry];
    this.changed('feedback', true);
    await this.save();
  };

  WorkflowState.prototype.updateChecklist = async function(itemId, completed, notes = null) {
    const checklist = [...(this.checklist || [])];
    const itemIndex = checklist.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      checklist[itemIndex].completed = completed;
      checklist[itemIndex].completed_at = completed ? new Date() : null;
      if (notes) {
        checklist[itemIndex].notes = notes;
      }
    }
    
    this.checklist = checklist;
    this.changed('checklist', true);
    
    // Update progress based on checklist completion
    const completedItems = checklist.filter(item => item.completed).length;
    const totalItems = checklist.length;
    
    if (totalItems > 0) {
      this.progress_percentage = Math.round((completedItems / totalItems) * 100);
    }
    
    await this.save();
  };

  WorkflowState.prototype.isOverdue = function() {
    return this.due_date && new Date() > new Date(this.due_date) && 
           this.status !== 'completed' && this.status !== 'cancelled';
  };

  WorkflowState.prototype.getDurationInDays = function() {
    if (!this.started_at) return 0;
    
    const endDate = this.completed_at || new Date();
    const startDate = new Date(this.started_at);
    const diffTime = Math.abs(endDate - startDate);
    
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  WorkflowState.prototype.getTimeRemaining = function() {
    if (!this.due_date || this.status === 'completed') return null;
    
    const now = new Date();
    const dueDate = new Date(this.due_date);
    const diffTime = dueDate - now;
    
    if (diffTime < 0) return 'overdue';
    
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    }
  };

  WorkflowState.prototype.advanceToNextStep = async function() {
    if (!this.next_step) return false;
    
    // Create next workflow state
    const nextWorkflow = await WorkflowState.create({
      content_id: this.content_id,
      content_type: this.content_type,
      version_id: this.version_id,
      workflow_type: this.workflow_type,
      current_step: this.next_step,
      step_order: this.step_order + 1,
      total_steps: this.total_steps,
      assigned_to: this.next_assignee,
      assigned_by: this.assigned_to,
      assigned_at: this.next_assignee ? new Date() : null,
      priority: this.priority,
      workflow_data: this.workflow_data,
    });
    
    return nextWorkflow;
  };

  // Class methods
  WorkflowState.getActiveWorkflows = function(userId = null) {
    const where = {
      status: ['in_progress', 'waiting_for_input', 'blocked'],
    };
    
    if (userId) {
      where.assigned_to = userId;
    }
    
    return this.findAll({
      where,
      order: [['priority', 'DESC'], ['due_date', 'ASC']],
    });
  };

  WorkflowState.getOverdueWorkflows = function() {
    return this.findAll({
      where: {
        due_date: { [sequelize.Op.lt]: new Date() },
        status: { [sequelize.Op.notIn]: ['completed', 'cancelled'] },
      },
      order: [['due_date', 'ASC']],
    });
  };

  WorkflowState.getWorkflowsByContent = function(contentId, contentType) {
    return this.findAll({
      where: {
        content_id: contentId,
        content_type: contentType,
      },
      order: [['step_order', 'ASC'], ['created_at', 'DESC']],
    });
  };

  WorkflowState.getWorkflowStats = async function(userId = null) {
    const where = userId ? { assigned_to: userId } : {};
    
    const [total, completed, inProgress, overdue] = await Promise.all([
      this.count({ where }),
      this.count({ where: { ...where, status: 'completed' } }),
      this.count({ where: { ...where, status: 'in_progress' } }),
      this.count({ 
        where: { 
          ...where, 
          due_date: { [sequelize.Op.lt]: new Date() },
          status: { [sequelize.Op.notIn]: ['completed', 'cancelled'] }
        }
      }),
    ]);
    
    return {
      total,
      completed,
      in_progress: inProgress,
      overdue,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  // Associations
  WorkflowState.associate = (models) => {
    WorkflowState.belongsTo(models.User, {
      foreignKey: 'assigned_to',
      as: 'assignee',
    });

    WorkflowState.belongsTo(models.User, {
      foreignKey: 'assigned_by',
      as: 'assigner',
    });

    WorkflowState.belongsTo(models.User, {
      foreignKey: 'escalated_to',
      as: 'escalation_contact',
    });

    WorkflowState.belongsTo(models.User, {
      foreignKey: 'next_assignee',
      as: 'next_assignee_user',
    });

    WorkflowState.belongsTo(models.ContentVersion, {
      foreignKey: 'version_id',
      as: 'version',
    });
  };

  return WorkflowState;
};