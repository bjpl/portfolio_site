/**
 * ContentVersion Model
 * Content versioning and revision history for all content types
 */

module.exports = (sequelize, DataTypes) => {
  const ContentVersion = sequelize.define('ContentVersion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the main content record (polymorphic)',
    },
    content_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    version_label: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    content_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    content_html: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content_markdown: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    change_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.TEXT,
      allowNull: true,
    },
    changes_summary: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Structured summary of what changed',
    },
    word_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    character_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    reading_time_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    seo_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    readability_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    quality_metrics: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    published_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    parent_version_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'content_versions',
        key: 'id',
      },
      comment: 'For branching and merging versions',
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_draft: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_backup: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.DATE,
      allowNull: true,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    auto_save: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'en',
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    source_type: {
      type: DataTypes.ENUM('manual', 'import', 'api', 'automated', 'migration'),
      defaultValue: 'manual',
    },
    source_reference: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    diff_from_previous: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'JSON diff from previous version',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'content_versions',
    indexes: [
      { fields: ['content_id'] },
      { fields: ['content_type'] },
      { fields: ['version_number'] },
      { fields: ['created_by'] },
      { fields: ['is_current'] },
      { fields: ['is_published'] },
      { fields: ['status'] },
      { fields: ['published_at'] },
      { fields: ['scheduled_publish_at'] },
      { fields: ['change_type'] },
      { fields: ['parent_version_id'] },
      { fields: ['content_id', 'content_type'] },
      { fields: ['content_id', 'version_number'], unique: true },
    ],
  });

  // Instance methods
  ContentVersion.prototype.calculateReadingTime = function() {
    if (!this.content_html && !this.content_markdown) return 0;
    
    const content = this.content_html || this.content_markdown || '';
    const wordsPerMinute = 200;
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    
    this.word_count = wordCount;
    this.reading_time_minutes = Math.ceil(wordCount / wordsPerMinute);
    
    return this.reading_time_minutes;
  };

  ContentVersion.prototype.calculateCharacterCount = function() {
    const content = this.content_html || this.content_markdown || '';
    this.character_count = content.replace(/<[^>]*>/g, '').length;
    return this.character_count;
  };

  ContentVersion.prototype.generateDiff = function(previousVersion) {
    if (!previousVersion) return null;
    
    // This would integrate with a diff library
    const diff = {
      title_changed: this.title !== previousVersion.title,
      content_changed: JSON.stringify(this.content_data) !== JSON.stringify(previousVersion.content_data),
      metadata_changed: JSON.stringify(this.metadata) !== JSON.stringify(previousVersion.metadata),
      timestamp: new Date(),
    };
    
    this.diff_from_previous = diff;
    return diff;
  };

  ContentVersion.prototype.makeCurrentVersion = async function() {
    // Update all versions of this content to not be current
    await ContentVersion.update(
      { is_current: false },
      { 
        where: { 
          content_id: this.content_id,
          content_type: this.content_type 
        } 
      }
    );
    
    // Make this version current
    this.is_current = true;
    await this.save();
  };

  ContentVersion.prototype.publish = async function(publishedBy = null) {
    this.is_published = true;
    this.is_draft = false;
    this.status = 'published';
    this.published_at = new Date();
    
    if (publishedBy) {
      this.published_by = publishedBy;
    }
    
    await this.save();
    await this.makeCurrentVersion();
  };

  ContentVersion.prototype.unpublish = async function() {
    this.is_published = false;
    this.status = 'draft';
    await this.save();
  };

  ContentVersion.prototype.archive = async function() {
    this.status = 'archived';
    this.is_current = false;
    await this.save();
  };

  ContentVersion.prototype.canBePublished = function() {
    return this.status === 'approved' || this.status === 'draft';
  };

  ContentVersion.prototype.isScheduled = function() {
    return this.scheduled_publish_at && this.scheduled_publish_at > new Date();
  };

  ContentVersion.prototype.isExpired = function() {
    return this.expires_at && this.expires_at < new Date();
  };

  // Class methods
  ContentVersion.getCurrentVersion = function(contentId, contentType) {
    return this.findOne({
      where: {
        content_id: contentId,
        content_type: contentType,
        is_current: true,
      },
    });
  };

  ContentVersion.getPublishedVersion = function(contentId, contentType) {
    return this.findOne({
      where: {
        content_id: contentId,
        content_type: contentType,
        is_published: true,
        status: 'published',
      },
      order: [['published_at', 'DESC']],
    });
  };

  ContentVersion.getAllVersions = function(contentId, contentType) {
    return this.findAll({
      where: {
        content_id: contentId,
        content_type: contentType,
      },
      order: [['version_number', 'DESC']],
      include: [
        { model: sequelize.models.User, as: 'creator', attributes: ['id', 'username', 'display_name'] },
        { model: sequelize.models.User, as: 'reviewer', attributes: ['id', 'username', 'display_name'] },
        { model: sequelize.models.User, as: 'approver', attributes: ['id', 'username', 'display_name'] },
      ],
    });
  };

  ContentVersion.getScheduledForPublishing = function() {
    return this.findAll({
      where: {
        scheduled_publish_at: { [sequelize.Op.lte]: new Date() },
        status: 'approved',
        is_published: false,
      },
    });
  };

  ContentVersion.getExpiredContent = function() {
    return this.findAll({
      where: {
        expires_at: { [sequelize.Op.lte]: new Date() },
        is_published: true,
      },
    });
  };

  // Associations
  ContentVersion.associate = (models) => {
    ContentVersion.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });

    ContentVersion.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      as: 'reviewer',
    });

    ContentVersion.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver',
    });

    ContentVersion.belongsTo(models.User, {
      foreignKey: 'published_by',
      as: 'publisher',
    });

    ContentVersion.belongsTo(models.ContentVersion, {
      foreignKey: 'parent_version_id',
      as: 'parent_version',
    });

    ContentVersion.hasMany(models.ContentVersion, {
      foreignKey: 'parent_version_id',
      as: 'child_versions',
    });

    ContentVersion.hasMany(models.WorkflowState, {
      foreignKey: 'version_id',
      as: 'workflow_states',
    });
  };

  return ContentVersion;
};