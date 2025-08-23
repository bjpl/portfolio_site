/**
 * Creative Work Model
 * For poetry, prose, and creative writing with multilingual support
 */

module.exports = (sequelize, DataTypes) => {
  const CreativeWork = sequelize.define('CreativeWork', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
      },
    },
    title_es: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/,
      },
    },
    work_type: {
      type: DataTypes.ENUM(
        'poetry',
        'prose',
        'short_story',
        'essay',
        'creative_nonfiction',
        'travel_writing',
        'reflection',
        'spoken_word',
        'bilingual_piece',
        'visual_poetry'
      ),
      allowNull: false,
    },
    form: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Free verse, sonnet, haiku, etc.',
    },
    language: {
      type: DataTypes.ENUM('en', 'es', 'bilingual'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Main content with preserved formatting',
    },
    content_es: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Spanish version or translation',
    },
    content_formatted: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HTML formatted version with line breaks, spacing',
    },
    content_formatted_es: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Spanish formatted version',
    },
    inspiration: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Background story, inspiration, context',
    },
    inspiration_es: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location_written: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    date_written: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    themes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Love, nature, travel, identity, etc.',
    },
    mood: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Contemplative, joyful, melancholic, etc.',
    },
    reading_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 60,
      },
    },
    performance_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes for readings, emphasis, timing',
    },
    audio_recording: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'media_assets',
        key: 'id',
      },
      comment: 'Audio recording of the piece',
    },
    video_recording: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'media_assets',
        key: 'id',
      },
      comment: 'Video performance recording',
    },
    workshop_history: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Workshop feedback and revision history',
    },
    peer_feedback: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Peer workshop feedback',
    },
    publications: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Where and when published',
    },
    awards: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Awards, recognitions, contest results',
    },
    readings: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Public readings and performances',
    },
    collaboration: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'If collaborative work, co-author details',
    },
    status: {
      type: DataTypes.ENUM(
        'draft',
        'workshop',
        'revision',
        'peer_review',
        'final_edit',
        'ready',
        'published',
        'performed',
        'archived'
      ),
      defaultValue: 'draft',
    },
    publication_status: {
      type: DataTypes.ENUM('private', 'portfolio_only', 'public'),
      defaultValue: 'portfolio_only',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    word_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    line_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'For poetry',
    },
    stanza_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'For poetry',
    },
    seo_description: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    seo_description_es: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    tags_es: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'creative_works',
    indexes: [
      { fields: ['slug'] },
      { fields: ['work_type'] },
      { fields: ['language'] },
      { fields: ['status'] },
      { fields: ['publication_status'] },
      { fields: ['featured'] },
      { fields: ['date_written'] },
      { fields: ['published_at'] },
      { fields: ['themes'], using: 'gin' },
      { fields: ['mood'], using: 'gin' },
      { fields: ['tags'], using: 'gin' },
    ],
  });

  // Instance methods
  CreativeWork.prototype.getLocalizedContent = function(language = 'en') {
    return {
      title: language === 'es' && this.title_es ? this.title_es : this.title,
      content: language === 'es' && this.content_es ? this.content_es : this.content,
      content_formatted: language === 'es' && this.content_formatted_es ? this.content_formatted_es : this.content_formatted,
      inspiration: language === 'es' && this.inspiration_es ? this.inspiration_es : this.inspiration,
      seo_description: language === 'es' && this.seo_description_es ? this.seo_description_es : this.seo_description,
      tags: language === 'es' && this.tags_es.length > 0 ? this.tags_es : this.tags,
    };
  };

  CreativeWork.prototype.updateWordCount = function() {
    const content = this.content || '';
    this.word_count = content.split(/\s+/).filter(word => word.length > 0).length;
    
    if (this.work_type === 'poetry') {
      this.line_count = content.split('\n').length;
      // Count stanzas (separated by double line breaks)
      this.stanza_count = content.split('\n\n').length;
    }
  };

  CreativeWork.prototype.addWorkshopFeedback = async function(feedback, workshopDate, facilitator) {
    const feedbackEntry = {
      id: require('uuid').v4(),
      content: feedback,
      workshop_date: workshopDate,
      facilitator,
      timestamp: new Date(),
    };
    
    this.workshop_history = [...(this.workshop_history || []), feedbackEntry];
    this.changed('workshop_history', true);
    await this.save();
  };

  CreativeWork.prototype.addPublication = async function(publicationData) {
    const publication = {
      id: require('uuid').v4(),
      ...publicationData,
      added_date: new Date(),
    };
    
    this.publications = [...(this.publications || []), publication];
    this.changed('publications', true);
    await this.save();
  };

  CreativeWork.prototype.scheduleReading = async function(readingData) {
    const reading = {
      id: require('uuid').v4(),
      ...readingData,
      scheduled_date: new Date(),
    };
    
    this.readings = [...(this.readings || []), reading];
    this.changed('readings', true);
    await this.save();
  };

  CreativeWork.prototype.getReadingTime = function() {
    if (this.reading_time_minutes) return this.reading_time_minutes;
    
    // Estimate reading time based on word count and type
    const wordsPerMinute = this.work_type === 'poetry' ? 100 : 200;
    return Math.ceil((this.word_count || 0) / wordsPerMinute);
  };

  CreativeWork.prototype.publish = async function() {
    this.status = 'published';
    this.published_at = new Date();
    await this.save();
  };

  // Class methods
  CreativeWork.getFeatured = function(limit = 6) {
    return this.findAll({
      where: {
        featured: true,
        status: ['published', 'performed'],
        publication_status: ['portfolio_only', 'public'],
      },
      order: [['published_at', 'DESC']],
      limit,
    });
  };

  CreativeWork.getByType = function(workType, limit = 10) {
    return this.findAll({
      where: {
        work_type: workType,
        status: ['published', 'performed'],
      },
      order: [['date_written', 'DESC']],
      limit,
    });
  };

  CreativeWork.getByTheme = function(theme, limit = 10) {
    return this.findAll({
      where: {
        themes: { [sequelize.Op.contains]: [theme] },
        status: ['published', 'performed'],
      },
      order: [['date_written', 'DESC']],
      limit,
    });
  };

  CreativeWork.getRecent = function(limit = 10) {
    return this.findAll({
      where: {
        status: ['published', 'performed'],
        publication_status: ['portfolio_only', 'public'],
      },
      order: [['date_written', 'DESC']],
      limit,
    });
  };

  CreativeWork.search = function(query, options = {}) {
    const {
      workType,
      language,
      themes,
      limit = 20,
      offset = 0
    } = options;

    const where = {
      status: ['published', 'performed'],
      [sequelize.Op.or]: [
        { title: { [sequelize.Op.iLike]: `%${query}%` } },
        { content: { [sequelize.Op.iLike]: `%${query}%` } },
        { tags: { [sequelize.Op.overlap]: [query] } },
      ],
    };

    if (language === 'es' || language === 'bilingual') {
      where[sequelize.Op.or].push(
        { title_es: { [sequelize.Op.iLike]: `%${query}%` } },
        { content_es: { [sequelize.Op.iLike]: `%${query}%` } },
        { tags_es: { [sequelize.Op.overlap]: [query] } }
      );
    }

    if (workType) where.work_type = workType;
    if (language) where.language = language;
    if (themes && themes.length > 0) {
      where.themes = { [sequelize.Op.overlap]: themes };
    }

    return this.findAndCountAll({
      where,
      order: [['date_written', 'DESC']],
      limit,
      offset,
    });
  };

  // Associations
  CreativeWork.associate = (models) => {
    CreativeWork.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'author',
    });

    CreativeWork.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'editor',
    });

    CreativeWork.belongsTo(models.MediaAsset, {
      foreignKey: 'audio_recording',
      as: 'audio_media',
    });

    CreativeWork.belongsTo(models.MediaAsset, {
      foreignKey: 'video_recording',
      as: 'video_media',
    });

    CreativeWork.hasMany(models.WorkflowState, {
      foreignKey: 'content_id',
      as: 'workflows',
      scope: { content_type: 'creative_work' },
    });
  };

  // Hooks
  CreativeWork.beforeSave(async (creativeWork, options) => {
    // Update word count automatically
    creativeWork.updateWordCount();
  });

  return CreativeWork;
};