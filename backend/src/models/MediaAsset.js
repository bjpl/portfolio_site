/**
 * MediaAsset Model
 * Media file management with metadata and optimization tracking
 */

module.exports = (sequelize, DataTypes) => {
  const MediaAsset = sequelize.define('MediaAsset', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    original_filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    cdn_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    file_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    file_extension: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    alt_text: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    // Image-specific fields
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    aspect_ratio: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
    },
    color_palette: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Dominant colors extracted from image',
    },
    blur_hash: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'BlurHash for placeholder images',
    },
    // Video/Audio specific fields
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
      comment: 'Duration in seconds',
    },
    bitrate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    frame_rate: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
    },
    // Optimization and variants
    is_optimized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    optimization_status: {
      type: DataTypes.ENUM(
        'pending',
        'processing',
        'completed',
        'failed',
        'not_needed'
      ),
      defaultValue: 'pending',
    },
    variants: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Different sizes/formats of the same media',
    },
    thumbnails: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Thumbnail URLs at different sizes',
    },
    // Usage and associations
    associated_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to associated content (polymorphic)',
    },
    usage_context: {
      type: DataTypes.ENUM(
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
    // Metadata and technical details
    exif_data: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'EXIF data for images',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional file metadata',
    },
    // Access control
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    access_level: {
      type: DataTypes.ENUM('public', 'authenticated', 'private', 'restricted'),
      defaultValue: 'public',
    },
    download_allowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Analytics and tracking
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    download_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    last_accessed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Storage and CDN
    storage_provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'local',
    },
    storage_bucket: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    storage_key: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    cdn_provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Quality and content analysis
    quality_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    content_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'SHA-256 hash for duplicate detection',
    },
    virus_scan_status: {
      type: DataTypes.ENUM('pending', 'clean', 'infected', 'error'),
      defaultValue: 'pending',
    },
    virus_scan_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Status and lifecycle
    status: {
      type: DataTypes.ENUM('active', 'processing', 'archived', 'deleted'),
      defaultValue: 'active',
    },
    archived_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'media_assets',
    indexes: [
      { fields: ['filename'] },
      { fields: ['original_filename'] },
      { fields: ['file_type'] },
      { fields: ['mime_type'] },
      { fields: ['uploaded_by'] },
      { fields: ['associated_type'] },
      { fields: ['associated_id'] },
      { fields: ['usage_context'] },
      { fields: ['is_public'] },
      { fields: ['status'] },
      { fields: ['content_hash'] },
      { fields: ['file_size'] },
      { fields: ['created_at'] },
      { fields: ['associated_type', 'associated_id'] },
    ],
  });

  // Instance methods
  MediaAsset.prototype.getFileSize = function(unit = 'bytes') {
    const size = this.file_size;
    
    switch (unit.toLowerCase()) {
      case 'kb':
        return Math.round((size / 1024) * 100) / 100;
      case 'mb':
        return Math.round((size / (1024 * 1024)) * 100) / 100;
      case 'gb':
        return Math.round((size / (1024 * 1024 * 1024)) * 100) / 100;
      default:
        return size;
    }
  };

  MediaAsset.prototype.getFormattedFileSize = function() {
    const size = this.file_size;
    
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${this.getFileSize('kb')} KB`;
    if (size < 1024 * 1024 * 1024) return `${this.getFileSize('mb')} MB`;
    return `${this.getFileSize('gb')} GB`;
  };

  MediaAsset.prototype.getDimensions = function() {
    if (this.width && this.height) {
      return `${this.width}×${this.height}`;
    }
    return null;
  };

  MediaAsset.prototype.calculateAspectRatio = function() {
    if (this.width && this.height) {
      this.aspect_ratio = this.width / this.height;
      return this.aspect_ratio;
    }
    return null;
  };

  MediaAsset.prototype.getFormattedDuration = function() {
    if (!this.duration) return null;
    
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  MediaAsset.prototype.incrementViews = async function() {
    this.view_count += 1;
    this.last_accessed_at = new Date();
    await this.save({ fields: ['view_count', 'last_accessed_at'] });
  };

  MediaAsset.prototype.incrementDownloads = async function() {
    this.download_count += 1;
    await this.save({ fields: ['download_count'] });
  };

  MediaAsset.prototype.isImage = function() {
    return this.file_type === 'image';
  };

  MediaAsset.prototype.isVideo = function() {
    return this.file_type === 'video';
  };

  MediaAsset.prototype.isAudio = function() {
    return this.file_type === 'audio';
  };

  MediaAsset.prototype.isDocument = function() {
    return this.file_type === 'document';
  };

  MediaAsset.prototype.getVariant = function(variantName) {
    return this.variants && this.variants[variantName] || null;
  };

  MediaAsset.prototype.getThumbnail = function(size = 'medium') {
    return this.thumbnails && this.thumbnails[size] || null;
  };

  MediaAsset.prototype.canBeDownloaded = function() {
    return this.download_allowed && this.status === 'active' && this.is_public;
  };

  MediaAsset.prototype.isExpired = function() {
    return this.expires_at && new Date(this.expires_at) < new Date();
  };

  MediaAsset.prototype.needsVirusScan = function() {
    return this.virus_scan_status === 'pending' || 
           (this.virus_scan_date && 
            (new Date() - new Date(this.virus_scan_date)) > (30 * 24 * 60 * 60 * 1000)); // 30 days
  };

  MediaAsset.prototype.archive = async function() {
    this.status = 'archived';
    this.archived_at = new Date();
    await this.save();
  };

  MediaAsset.prototype.softDelete = async function() {
    this.status = 'deleted';
    await this.save();
  };

  // Class methods
  MediaAsset.getByType = function(fileType) {
    return this.findAll({
      where: { file_type: fileType, status: 'active' },
      order: [['created_at', 'DESC']],
    });
  };

  MediaAsset.getByAssociation = function(associatedType, associatedId) {
    return this.findAll({
      where: { 
        associated_type: associatedType,
        associated_id: associatedId,
        status: 'active'
      },
      order: [['created_at', 'ASC']],
    });
  };

  MediaAsset.getPublicAssets = function() {
    return this.findAll({
      where: { is_public: true, status: 'active' },
      order: [['created_at', 'DESC']],
    });
  };

  MediaAsset.getLargeFiles = function(sizeThresholdMB = 10) {
    const sizeThreshold = sizeThresholdMB * 1024 * 1024;
    return this.findAll({
      where: { 
        file_size: { [sequelize.Op.gte]: sizeThreshold },
        status: 'active'
      },
      order: [['file_size', 'DESC']],
    });
  };

  MediaAsset.getUnoptimizedAssets = function() {
    return this.findAll({
      where: { 
        is_optimized: false,
        file_type: 'image',
        status: 'active'
      },
      order: [['created_at', 'ASC']],
    });
  };

  MediaAsset.getExpiredAssets = function() {
    return this.findAll({
      where: {
        expires_at: { [sequelize.Op.lt]: new Date() },
        status: 'active',
      },
    });
  };

  MediaAsset.getStorageStats = async function() {
    const [totalCount, totalSize, typeStats] = await Promise.all([
      this.count({ where: { status: 'active' } }),
      this.sum('file_size', { where: { status: 'active' } }),
      this.findAll({
        attributes: [
          'file_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('file_size')), 'total_size'],
        ],
        where: { status: 'active' },
        group: 'file_type',
        raw: true,
      }),
    ]);

    return {
      total_files: totalCount,
      total_size: totalSize || 0,
      by_type: typeStats,
    };
  };

  MediaAsset.findDuplicates = function() {
    return this.findAll({
      attributes: [
        'content_hash',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('array_agg', sequelize.col('id')), 'file_ids'],
      ],
      where: { 
        content_hash: { [sequelize.Op.ne]: null },
        status: 'active'
      },
      group: 'content_hash',
      having: sequelize.literal('COUNT(*) > 1'),
      raw: true,
    });
  };

  // Associations
  MediaAsset.associate = (models) => {
    MediaAsset.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'uploader',
    });

    MediaAsset.hasMany(models.ContentVersion, {
      foreignKey: 'content_id',
      scope: { content_type: 'media_asset' },
      as: 'versions',
    });
  };

  return MediaAsset;
};