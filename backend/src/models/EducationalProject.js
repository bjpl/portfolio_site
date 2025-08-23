/**
 * Educational Project Model
 * Specialized model for educational projects, case studies, and teaching materials
 */

module.exports = (sequelize, DataTypes) => {
  const EducationalProject = sequelize.define('EducationalProject', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [3, 200],
      },
    },
    title_es: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        len: [3, 200],
      },
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/,
      },
    },
    project_type: {
      type: DataTypes.ENUM(
        'curriculum_design',
        'edtech_development',
        'vr_ar_experience',
        'ai_integration',
        'assessment_system',
        'learning_platform',
        'teacher_training',
        'research_project',
        'case_study',
        'pilot_program'
      ),
      allowNull: false,
    },
    educational_level: {
      type: DataTypes.ARRAY(DataTypes.ENUM(
        'early_childhood',
        'elementary',
        'middle_school',
        'high_school',
        'university',
        'graduate',
        'professional',
        'adult_learner'
      )),
      defaultValue: [],
    },
    subject_areas: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Languages, STEM, Arts, etc.',
    },
    learning_objectives: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of learning objective objects with standards alignment',
    },
    pedagogical_approach: {
      type: DataTypes.ARRAY(DataTypes.ENUM(
        'constructivist',
        'collaborative',
        'project_based',
        'inquiry_based',
        'flipped_classroom',
        'blended_learning',
        'competency_based',
        'personalized',
        'game_based',
        'experiential'
      )),
      defaultValue: [],
    },
    target_audience: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Demographics, prior knowledge, special needs, etc.',
    },
    duration: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Project duration details: development_time, implementation_period, etc.',
    },
    context: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Institution, program, scale, geographic context',
    },
    technology_stack: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Technologies used: languages, frameworks, tools, platforms',
    },
    ai_ml_integration: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'AI/ML models, APIs, custom solutions',
    },
    collaboration_partners: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Team members, institutions, external partners',
    },
    challenges: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Challenges encountered and solutions implemented',
    },
    outcomes: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Quantitative and qualitative outcomes',
    },
    impact_metrics: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Engagement rates, learning gains, satisfaction scores',
    },
    student_feedback: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Student testimonials and feedback',
    },
    peer_reviews: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Professional peer review feedback',
    },
    lessons_learned: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lessons_learned_es: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description_es: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Main content in Markdown format',
    },
    content_es: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Spanish content in Markdown format',
    },
    portfolio_artifacts: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Links to case studies, videos, documentation',
    },
    media_assets: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Associated media files',
    },
    featured_image: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'media_assets',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM(
        'draft',
        'in_review',
        'peer_review',
        'revision',
        'approved',
        'published',
        'archived'
      ),
      defaultValue: 'draft',
    },
    publication_status: {
      type: DataTypes.ENUM('private', 'portfolio_only', 'public'),
      defaultValue: 'portfolio_only',
    },
    seo_title: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    seo_title_es: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    seo_description: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    seo_description_es: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    keywords_es: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: 'educational_projects',
    indexes: [
      { fields: ['slug'] },
      { fields: ['project_type'] },
      { fields: ['educational_level'] },
      { fields: ['status'] },
      { fields: ['publication_status'] },
      { fields: ['featured'] },
      { fields: ['published_at'] },
      { fields: ['created_by'] },
      { fields: ['subject_areas'], using: 'gin' },
      { fields: ['keywords'], using: 'gin' },
      { fields: ['pedagogical_approach'], using: 'gin' },
    ],
  });

  // Instance methods
  EducationalProject.prototype.getLocalizedContent = function(language = 'en') {
    return {
      title: language === 'es' && this.title_es ? this.title_es : this.title,
      description: language === 'es' && this.description_es ? this.description_es : this.description,
      content: language === 'es' && this.content_es ? this.content_es : this.content,
      seo_title: language === 'es' && this.seo_title_es ? this.seo_title_es : this.seo_title,
      seo_description: language === 'es' && this.seo_description_es ? this.seo_description_es : this.seo_description,
      keywords: language === 'es' && this.keywords_es.length > 0 ? this.keywords_es : this.keywords,
    };
  };

  EducationalProject.prototype.calculateImpactScore = function() {
    let score = 0;
    const metrics = this.impact_metrics || {};
    
    // Engagement metrics (0-30 points)
    if (metrics.engagement_rate) {
      score += Math.min(30, metrics.engagement_rate * 0.3);
    }
    
    // Learning outcomes (0-40 points)
    if (metrics.learning_gains) {
      score += Math.min(40, metrics.learning_gains * 0.4);
    }
    
    // Scale impact (0-20 points)
    const scale = this.context?.scale || 0;
    if (scale > 10000) score += 20;
    else if (scale > 1000) score += 15;
    else if (scale > 100) score += 10;
    else if (scale > 10) score += 5;
    
    // Innovation factor (0-10 points)
    if (this.ai_ml_integration && Object.keys(this.ai_ml_integration).length > 0) score += 5;
    if (this.technology_stack?.innovative_tools) score += 5;
    
    return Math.round(score);
  };

  EducationalProject.prototype.getReadingTime = function(language = 'en') {
    const content = language === 'es' && this.content_es ? this.content_es : this.content;
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  EducationalProject.prototype.publish = async function() {
    this.status = 'published';
    this.published_at = new Date();
    await this.save();
  };

  // Class methods
  EducationalProject.getFeatured = function(limit = 6) {
    return this.findAll({
      where: {
        featured: true,
        status: 'published',
        publication_status: ['portfolio_only', 'public'],
      },
      order: [['published_at', 'DESC']],
      limit,
    });
  };

  EducationalProject.getBySubjectArea = function(subjectArea, limit = 10) {
    return this.findAll({
      where: {
        subject_areas: { [sequelize.Op.contains]: [subjectArea] },
        status: 'published',
      },
      order: [['published_at', 'DESC']],
      limit,
    });
  };

  EducationalProject.getByEducationalLevel = function(level, limit = 10) {
    return this.findAll({
      where: {
        educational_level: { [sequelize.Op.contains]: [level] },
        status: 'published',
      },
      order: [['published_at', 'DESC']],
      limit,
    });
  };

  EducationalProject.search = function(query, options = {}) {
    const {
      projectType,
      educationalLevel,
      subjectAreas,
      language = 'en',
      limit = 20,
      offset = 0
    } = options;

    const where = {
      status: 'published',
      [sequelize.Op.or]: [
        { title: { [sequelize.Op.iLike]: `%${query}%` } },
        { description: { [sequelize.Op.iLike]: `%${query}%` } },
        { keywords: { [sequelize.Op.overlap]: [query] } },
      ],
    };

    if (language === 'es') {
      where[sequelize.Op.or].push(
        { title_es: { [sequelize.Op.iLike]: `%${query}%` } },
        { description_es: { [sequelize.Op.iLike]: `%${query}%` } },
        { keywords_es: { [sequelize.Op.overlap]: [query] } }
      );
    }

    if (projectType) where.project_type = projectType;
    if (educationalLevel) where.educational_level = { [sequelize.Op.contains]: [educationalLevel] };
    if (subjectAreas && subjectAreas.length > 0) {
      where.subject_areas = { [sequelize.Op.overlap]: subjectAreas };
    }

    return this.findAndCountAll({
      where,
      order: [['published_at', 'DESC']],
      limit,
      offset,
    });
  };

  // Associations
  EducationalProject.associate = (models) => {
    EducationalProject.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'author',
    });

    EducationalProject.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'editor',
    });

    EducationalProject.belongsTo(models.MediaAsset, {
      foreignKey: 'featured_image',
      as: 'featured_media',
    });

    EducationalProject.hasMany(models.WorkflowState, {
      foreignKey: 'content_id',
      as: 'workflows',
      scope: { content_type: 'educational_project' },
    });

    EducationalProject.belongsToMany(models.Skill, {
      through: 'educational_project_skills',
      foreignKey: 'project_id',
      otherKey: 'skill_id',
      as: 'skills',
    });

    EducationalProject.belongsToMany(models.Tag, {
      through: 'educational_project_tags',
      foreignKey: 'project_id',
      otherKey: 'tag_id',
      as: 'tags',
    });
  };

  return EducationalProject;
};