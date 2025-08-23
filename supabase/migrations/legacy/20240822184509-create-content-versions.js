'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('content_versions', {
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
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      version_label: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      content_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      content_html: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      content_markdown: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      change_type: {
        type: Sequelize.ENUM(
          'created',
          'updated',
          'published',
          'unpublished',
          'archived',
          'restored',
          'merged',
          'branched',
          'major_update',
          'minor_update',
          'patch_update',
          'content_review',
          'seo_update',
          'metadata_update'
        ),
        allowNull: false,
        defaultValue: 'updated',
      },
      change_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      changes_summary: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      word_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      character_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      reading_time_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      seo_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      readability_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      quality_metrics: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      published_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      parent_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'content_versions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      is_current: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_draft: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_backup: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM(
          'draft',
          'pending_review',
          'under_review',
          'approved',
          'published',
          'archived',
          'rejected'
        ),
        defaultValue: 'draft',
      },
      scheduled_publish_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      auto_save: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      language: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'en',
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      source_type: {
        type: Sequelize.ENUM('manual', 'import', 'api', 'automated', 'migration'),
        defaultValue: 'manual',
      },
      source_reference: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      diff_from_previous: {
        type: Sequelize.JSONB,
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

    // Add indexes
    await queryInterface.addIndex('content_versions', ['content_id']);
    await queryInterface.addIndex('content_versions', ['content_type']);
    await queryInterface.addIndex('content_versions', ['version_number']);
    await queryInterface.addIndex('content_versions', ['created_by']);
    await queryInterface.addIndex('content_versions', ['is_current']);
    await queryInterface.addIndex('content_versions', ['is_published']);
    await queryInterface.addIndex('content_versions', ['status']);
    await queryInterface.addIndex('content_versions', ['published_at']);
    await queryInterface.addIndex('content_versions', ['scheduled_publish_at']);
    await queryInterface.addIndex('content_versions', ['change_type']);
    await queryInterface.addIndex('content_versions', ['parent_version_id']);
    await queryInterface.addIndex('content_versions', ['content_id', 'content_type']);
    
    // Add unique constraint
    await queryInterface.addIndex('content_versions', ['content_id', 'version_number'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('content_versions');
  }
};