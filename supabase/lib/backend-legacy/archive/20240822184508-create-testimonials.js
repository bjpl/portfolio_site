'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('testimonials', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      author_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      author_title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      author_company: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      author_email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      author_linkedin: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      author_photo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      company_logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      short_content: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      testimonial_type: {
        type: Sequelize.ENUM(
          'client_review',
          'colleague_recommendation',
          'linkedin_recommendation',
          'project_feedback',
          'general_testimonial',
          'video_testimonial',
          'written_recommendation'
        ),
        allowNull: false,
        defaultValue: 'client_review',
      },
      relationship: {
        type: Sequelize.ENUM(
          'client',
          'colleague',
          'manager',
          'direct_report',
          'collaborator',
          'mentor',
          'mentee',
          'vendor',
          'partner',
          'other'
        ),
        allowNull: true,
      },
      project_context: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      work_period: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      skills_mentioned: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      source_platform: {
        type: Sequelize.ENUM(
          'linkedin',
          'upwork',
          'freelancer',
          'fiverr',
          'clutch',
          'google_reviews',
          'direct_email',
          'in_person',
          'other'
        ),
        allowNull: true,
      },
      source_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      received_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('active', 'pending', 'rejected', 'archived'),
        defaultValue: 'pending',
      },
      verification_status: {
        type: Sequelize.ENUM('unverified', 'verified', 'disputed'),
        defaultValue: 'unverified',
      },
      verification_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      language: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'en',
      },
      location: {
        type: Sequelize.STRING(200),
        allowNull: true,
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
      video_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      audio_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      consent_given: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      consent_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      usage_permissions: {
        type: Sequelize.JSONB,
        defaultValue: {
          website: false,
          marketing: false,
          social_media: false,
          proposals: false,
        },
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
    await queryInterface.addIndex('testimonials', ['author_name']);
    await queryInterface.addIndex('testimonials', ['author_company']);
    await queryInterface.addIndex('testimonials', ['testimonial_type']);
    await queryInterface.addIndex('testimonials', ['relationship']);
    await queryInterface.addIndex('testimonials', ['is_featured']);
    await queryInterface.addIndex('testimonials', ['is_public']);
    await queryInterface.addIndex('testimonials', ['status']);
    await queryInterface.addIndex('testimonials', ['verification_status']);
    await queryInterface.addIndex('testimonials', ['received_date']);
    await queryInterface.addIndex('testimonials', ['display_order']);
    await queryInterface.addIndex('testimonials', ['rating']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('testimonials');
  }
};