'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('workflow_states', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      content_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      content_type: {
        type: Sequelize.ENUM(
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
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'content_versions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      workflow_type: {
        type: Sequelize.ENUM(
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
          'archive'
        ),
        allowNull: false,
      },
      current_step: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      step_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_steps: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      status: {
        type: Sequelize.ENUM(
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
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estimated_hours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      actual_hours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      progress_percentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      blocking_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      quality_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      feedback: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      checklist: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      attachments: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      notifications_sent: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      escalation_level: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      escalated_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      escalated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      next_step: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      next_assignee: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      workflow_data: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      automation_rules: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      dependencies: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        defaultValue: [],
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('workflow_states', ['content_id']);
    await queryInterface.addIndex('workflow_states', ['content_type']);
    await queryInterface.addIndex('workflow_states', ['version_id']);
    await queryInterface.addIndex('workflow_states', ['workflow_type']);
    await queryInterface.addIndex('workflow_states', ['current_step']);
    await queryInterface.addIndex('workflow_states', ['status']);
    await queryInterface.addIndex('workflow_states', ['priority']);
    await queryInterface.addIndex('workflow_states', ['assigned_to']);
    await queryInterface.addIndex('workflow_states', ['assigned_by']);
    await queryInterface.addIndex('workflow_states', ['due_date']);
    await queryInterface.addIndex('workflow_states', ['started_at']);
    await queryInterface.addIndex('workflow_states', ['completed_at']);
    await queryInterface.addIndex('workflow_states', ['escalation_level']);
    await queryInterface.addIndex('workflow_states', ['content_id', 'content_type']);
    await queryInterface.addIndex('workflow_states', ['assigned_to', 'status']);
    await queryInterface.addIndex('workflow_states', ['due_date', 'status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('workflow_states');
  }
};