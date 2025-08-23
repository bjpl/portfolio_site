'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('education', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      institution: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      institution_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      institution_logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      degree_type: {
        type: Sequelize.ENUM(
          'high_school',
          'associate',
          'bachelor',
          'master',
          'doctorate',
          'certificate',
          'diploma',
          'professional',
          'bootcamp',
          'online_course',
          'workshop',
          'seminar',
          'other'
        ),
        allowNull: false,
      },
      degree_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      field_of_study: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      specialization: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      graduation_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_current: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      grade_type: {
        type: Sequelize.ENUM('gpa', 'percentage', 'classification', 'pass_fail', 'other'),
        allowNull: true,
      },
      grade_value: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      grade_scale: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      honors: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      activities: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      coursework: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      thesis_title: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      thesis_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      thesis_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      advisor: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      skills_acquired: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      projects: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      certifications: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      credential_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      credential_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      renewal_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: 'USD',
      },
      duration_hours: {
        type: Sequelize.INTEGER,
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
    await queryInterface.addIndex('education', ['institution']);
    await queryInterface.addIndex('education', ['degree_type']);
    await queryInterface.addIndex('education', ['field_of_study']);
    await queryInterface.addIndex('education', ['is_current']);
    await queryInterface.addIndex('education', ['is_completed']);
    await queryInterface.addIndex('education', ['graduation_date']);
    await queryInterface.addIndex('education', ['display_order']);
    await queryInterface.addIndex('education', ['is_featured']);
    await queryInterface.addIndex('education', ['status']);
    await queryInterface.addIndex('education', ['expiry_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('education');
  }
};