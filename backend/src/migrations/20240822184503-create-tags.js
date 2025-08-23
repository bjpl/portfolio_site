'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tags', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.ENUM(
          'technology',
          'skill',
          'industry',
          'methodology',
          'tool',
          'language',
          'framework',
          'topic',
          'project_type',
          'general',
          'other'
        ),
        allowNull: false,
        defaultValue: 'general',
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      parent_tag_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tags',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      hierarchy_level: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_system_tag: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      auto_suggest: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      seo_title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      seo_description: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      synonyms: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      related_tags: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        defaultValue: [],
      },
      popularity_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      trending_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
      },
      first_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'deprecated', 'merged'),
        defaultValue: 'active',
      },
      merged_into_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tags',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      external_references: {
        type: Sequelize.JSONB,
        defaultValue: {},
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
    await queryInterface.addIndex('tags', ['name']);
    await queryInterface.addIndex('tags', ['slug']);
    await queryInterface.addIndex('tags', ['category']);
    await queryInterface.addIndex('tags', ['parent_tag_id']);
    await queryInterface.addIndex('tags', ['hierarchy_level']);
    await queryInterface.addIndex('tags', ['usage_count']);
    await queryInterface.addIndex('tags', ['popularity_score']);
    await queryInterface.addIndex('tags', ['is_featured']);
    await queryInterface.addIndex('tags', ['is_system_tag']);
    await queryInterface.addIndex('tags', ['status']);
    await queryInterface.addIndex('tags', ['last_used_at']);
    await queryInterface.addIndex('tags', ['trending_score']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tags');
  }
};