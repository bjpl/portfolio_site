'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('experiences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      company: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      company_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      company_logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      employment_type: {
        type: Sequelize.ENUM(
          'full_time',
          'part_time',
          'contract',
          'freelance',
          'internship',
          'volunteer',
          'consulting',
          'temporary'
        ),
        allowNull: false,
        defaultValue: 'full_time',
      },
      work_arrangement: {
        type: Sequelize.ENUM('on_site', 'remote', 'hybrid'),
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_current: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      responsibilities: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      achievements: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      technologies: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      industry: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      company_size: {
        type: Sequelize.ENUM(
          'startup_1_10',
          'small_11_50',
          'medium_51_200',
          'large_201_1000',
          'enterprise_1000_plus'
        ),
        allowNull: true,
      },
      team_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      reports_to: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      direct_reports: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      salary_range: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: 'USD',
      },
      key_projects: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      skills_gained: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      references: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      reason_for_leaving: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM('active', 'hidden', 'archived'),
        defaultValue: 'active',
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
    await queryInterface.addIndex('experiences', ['company']);
    await queryInterface.addIndex('experiences', ['title']);
    await queryInterface.addIndex('experiences', ['employment_type']);
    await queryInterface.addIndex('experiences', ['is_current']);
    await queryInterface.addIndex('experiences', ['start_date']);
    await queryInterface.addIndex('experiences', ['end_date']);
    await queryInterface.addIndex('experiences', ['display_order']);
    await queryInterface.addIndex('experiences', ['is_featured']);
    await queryInterface.addIndex('experiences', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('experiences');
  }
};