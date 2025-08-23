'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('projects', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true,
      },
      short_description: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      project_type: {
        type: Sequelize.ENUM(
          'web_application',
          'mobile_app',
          'desktop_app',
          'library',
          'tool',
          'website',
          'api',
          'data_analysis',
          'machine_learning',
          'other'
        ),
        allowNull: false,
        defaultValue: 'web_application',
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived', 'private'),
        defaultValue: 'draft',
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      duration_months: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      team_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      my_role: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      responsibilities: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      technologies: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      challenges: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      solutions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      results: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      lessons_learned: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      demo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      repository_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      case_study_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      client_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      client_industry: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      budget_range: {
        type: Sequelize.ENUM('under_1k', '1k_5k', '5k_10k', '10k_25k', '25k_50k', '50k_plus', 'undisclosed'),
        allowNull: true,
      },
      thumbnail_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      gallery_images: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      video_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      metrics: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      awards: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      testimonials: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      seo_title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      seo_description: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      seo_keywords: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      like_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      published_at: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('projects', ['slug']);
    await queryInterface.addIndex('projects', ['status']);
    await queryInterface.addIndex('projects', ['project_type']);
    await queryInterface.addIndex('projects', ['featured']);
    await queryInterface.addIndex('projects', ['priority']);
    await queryInterface.addIndex('projects', ['start_date']);
    await queryInterface.addIndex('projects', ['published_at']);
    await queryInterface.addIndex('projects', ['view_count']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('projects');
  }
};