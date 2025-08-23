'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('skills', {
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.ENUM(
          'programming_language',
          'framework',
          'library',
          'database',
          'tool',
          'platform',
          'methodology',
          'soft_skill',
          'language',
          'certification',
          'other'
        ),
        allowNull: false,
        defaultValue: 'other',
      },
      subcategory: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      proficiency_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        allowNull: false,
        defaultValue: 'intermediate',
      },
      proficiency_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      years_of_experience: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },
      first_used_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      last_used_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_primary_skill: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      icon_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      icon_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      color_hex: {
        type: Sequelize.STRING(7),
        allowNull: true,
      },
      official_website: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      documentation_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      learning_resources: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      certifications: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      projects_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      endorsements_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'deprecated', 'learning'),
        defaultValue: 'active',
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

    // Add indexes
    await queryInterface.addIndex('skills', ['name']);
    await queryInterface.addIndex('skills', ['slug']);
    await queryInterface.addIndex('skills', ['category']);
    await queryInterface.addIndex('skills', ['proficiency_level']);
    await queryInterface.addIndex('skills', ['is_primary_skill']);
    await queryInterface.addIndex('skills', ['is_featured']);
    await queryInterface.addIndex('skills', ['display_order']);
    await queryInterface.addIndex('skills', ['status']);
    await queryInterface.addIndex('skills', ['years_of_experience']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('skills');
  }
};