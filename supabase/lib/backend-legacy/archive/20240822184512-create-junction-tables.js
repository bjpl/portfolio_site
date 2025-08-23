'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create project_tags junction table
    await queryInterface.createTable('project_tags', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tag_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tags',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      relevance_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      added_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      added_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      source: {
        type: Sequelize.ENUM('manual', 'auto_suggest', 'import', 'ai_generated'),
        defaultValue: 'manual',
      },
      confidence_score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    // Create project_skills junction table
    await queryInterface.createTable('project_skills', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      skill_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'skills',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      proficiency_level: {
        type: Sequelize.ENUM('basic', 'intermediate', 'advanced', 'expert'),
        allowNull: false,
        defaultValue: 'intermediate',
      },
      usage_intensity: {
        type: Sequelize.ENUM('light', 'moderate', 'heavy', 'core'),
        allowNull: false,
        defaultValue: 'moderate',
      },
      skill_role: {
        type: Sequelize.ENUM(
          'primary_technology',
          'supporting_technology',
          'framework',
          'library',
          'tool',
          'methodology',
          'soft_skill',
          'other'
        ),
        allowNull: false,
        defaultValue: 'supporting_technology',
      },
      importance_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      learning_outcome: {
        type: Sequelize.ENUM(
          'no_learning',
          'reinforced_existing',
          'learned_new_aspects',
          'significant_improvement',
          'mastery_achieved'
        ),
        allowNull: true,
      },
      experience_gained_months: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },
      specific_features_used: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      challenges_faced: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      solutions_developed: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      version_used: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      context_of_use: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      alternatives_considered: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      would_use_again: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      recommendation_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      added_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      added_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      source: {
        type: Sequelize.ENUM('manual', 'project_analysis', 'resume_import', 'ai_detected'),
        defaultValue: 'manual',
      },
      confidence_score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
      },
      is_highlighted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // Add indexes for project_tags
    await queryInterface.addIndex('project_tags', ['project_id']);
    await queryInterface.addIndex('project_tags', ['tag_id']);
    await queryInterface.addIndex('project_tags', ['added_by']);
    await queryInterface.addIndex('project_tags', ['is_primary']);
    await queryInterface.addIndex('project_tags', ['relevance_score']);
    await queryInterface.addIndex('project_tags', ['source']);
    await queryInterface.addIndex('project_tags', ['project_id', 'tag_id'], { unique: true });

    // Add indexes for project_skills
    await queryInterface.addIndex('project_skills', ['project_id']);
    await queryInterface.addIndex('project_skills', ['skill_id']);
    await queryInterface.addIndex('project_skills', ['proficiency_level']);
    await queryInterface.addIndex('project_skills', ['usage_intensity']);
    await queryInterface.addIndex('project_skills', ['skill_role']);
    await queryInterface.addIndex('project_skills', ['importance_score']);
    await queryInterface.addIndex('project_skills', ['is_highlighted']);
    await queryInterface.addIndex('project_skills', ['source']);
    await queryInterface.addIndex('project_skills', ['project_id', 'skill_id'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('project_skills');
    await queryInterface.dropTable('project_tags');
  }
};