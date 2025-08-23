'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('media_assets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      cdn_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      file_type: {
        type: Sequelize.ENUM(
          'image',
          'video',
          'audio',
          'document',
          'archive',
          'code',
          'other'
        ),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      file_extension: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      alt_text: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      caption: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      aspect_ratio: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
      },
      color_palette: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      blur_hash: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bitrate: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      frame_rate: {
        type: Sequelize.DECIMAL(6, 3),
        allowNull: true,
      },
      is_optimized: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      optimization_status: {
        type: Sequelize.ENUM(
          'pending',
          'processing',
          'completed',
          'failed',
          'not_needed'
        ),
        defaultValue: 'pending',
      },
      variants: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      thumbnails: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      associated_type: {
        type: Sequelize.ENUM(
          'project',
          'experience',
          'education',
          'testimonial',
          'skill',
          'user_avatar',
          'blog_post',
          'page',
          'other'
        ),
        allowNull: true,
      },
      associated_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      usage_context: {
        type: Sequelize.ENUM(
          'thumbnail',
          'gallery',
          'hero_image',
          'avatar',
          'icon',
          'background',
          'attachment',
          'inline_content',
          'other'
        ),
        allowNull: true,
      },
      exif_data: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      access_level: {
        type: Sequelize.ENUM('public', 'authenticated', 'private', 'restricted'),
        defaultValue: 'public',
      },
      download_allowed: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      download_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      last_accessed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      storage_provider: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'local',
      },
      storage_bucket: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      storage_key: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      cdn_provider: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      quality_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      content_hash: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      virus_scan_status: {
        type: Sequelize.ENUM('pending', 'clean', 'infected', 'error'),
        defaultValue: 'pending',
      },
      virus_scan_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'processing', 'archived', 'deleted'),
        defaultValue: 'active',
      },
      archived_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
    await queryInterface.addIndex('media_assets', ['filename']);
    await queryInterface.addIndex('media_assets', ['original_filename']);
    await queryInterface.addIndex('media_assets', ['file_type']);
    await queryInterface.addIndex('media_assets', ['mime_type']);
    await queryInterface.addIndex('media_assets', ['uploaded_by']);
    await queryInterface.addIndex('media_assets', ['associated_type']);
    await queryInterface.addIndex('media_assets', ['associated_id']);
    await queryInterface.addIndex('media_assets', ['usage_context']);
    await queryInterface.addIndex('media_assets', ['is_public']);
    await queryInterface.addIndex('media_assets', ['status']);
    await queryInterface.addIndex('media_assets', ['content_hash']);
    await queryInterface.addIndex('media_assets', ['file_size']);
    await queryInterface.addIndex('media_assets', ['created_at']);
    await queryInterface.addIndex('media_assets', ['associated_type', 'associated_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('media_assets');
  }
};