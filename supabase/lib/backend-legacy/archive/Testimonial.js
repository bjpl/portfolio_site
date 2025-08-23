/**
 * Testimonial Model
 * Client testimonials and recommendations
 */

module.exports = (sequelize, DataTypes) => {
  const Testimonial = sequelize.define('Testimonial', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    author_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
      },
    },
    author_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    author_company: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    author_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    author_linkedin: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    author_photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    company_logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [10, 2000],
      },
    },
    short_content: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    testimonial_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.ENUM(
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
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    work_period: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    skills_mentioned: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    source_platform: {
      type: DataTypes.ENUM(
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
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    received_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'rejected', 'archived'),
      defaultValue: 'pending',
    },
    verification_status: {
      type: DataTypes.ENUM('unverified', 'verified', 'disputed'),
      defaultValue: 'unverified',
    },
    verification_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'en',
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    company_size: {
      type: DataTypes.ENUM(
        'startup_1_10',
        'small_11_50',
        'medium_51_200',
        'large_201_1000',
        'enterprise_1000_plus'
      ),
      allowNull: true,
    },
    video_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    audio_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    consent_given: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    consent_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usage_permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        website: false,
        marketing: false,
        social_media: false,
        proposals: false,
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'testimonials',
    indexes: [
      { fields: ['author_name'] },
      { fields: ['author_company'] },
      { fields: ['testimonial_type'] },
      { fields: ['relationship'] },
      { fields: ['is_featured'] },
      { fields: ['is_public'] },
      { fields: ['status'] },
      { fields: ['verification_status'] },
      { fields: ['received_date'] },
      { fields: ['display_order'] },
      { fields: ['rating'] },
    ],
  });

  // Instance methods
  Testimonial.prototype.getShortContent = function(maxLength = 150) {
    if (this.short_content) {
      return this.short_content;
    }
    
    if (this.content.length <= maxLength) {
      return this.content;
    }
    
    return this.content.substring(0, maxLength).trim() + '...';
  };

  Testimonial.prototype.getWordCount = function() {
    return this.content.split(/\s+/).length;
  };

  Testimonial.prototype.hasVideoContent = function() {
    return !!(this.video_url || this.audio_url);
  };

  Testimonial.prototype.canBeUsedFor = function(purpose) {
    const permissions = this.usage_permissions;
    return this.consent_given && permissions && permissions[purpose] === true;
  };

  Testimonial.prototype.getAuthorInfo = function() {
    const parts = [];
    
    if (this.author_title) parts.push(this.author_title);
    if (this.author_company) parts.push(this.author_company);
    
    return parts.length > 0 ? parts.join(' at ') : null;
  };

  Testimonial.prototype.isVerified = function() {
    return this.verification_status === 'verified';
  };

  // Class methods
  Testimonial.getFeatured = function() {
    return this.findAll({
      where: { 
        is_featured: true, 
        is_public: true, 
        status: 'active' 
      },
      order: [['display_order', 'ASC'], ['received_date', 'DESC']],
    });
  };

  Testimonial.getByRating = function(minRating = 4) {
    return this.findAll({
      where: { 
        rating: { [sequelize.Op.gte]: minRating },
        is_public: true,
        status: 'active'
      },
      order: [['rating', 'DESC'], ['received_date', 'DESC']],
    });
  };

  Testimonial.getByType = function(testimonialType) {
    return this.findAll({
      where: { 
        testimonial_type: testimonialType,
        is_public: true,
        status: 'active'
      },
      order: [['received_date', 'DESC']],
    });
  };

  Testimonial.getForMarketing = function() {
    return this.findAll({
      where: {
        'usage_permissions.marketing': true,
        consent_given: true,
        is_public: true,
        status: 'active',
      },
      order: [['rating', 'DESC'], ['received_date', 'DESC']],
    });
  };

  // Associations
  Testimonial.associate = (models) => {
    Testimonial.hasMany(models.ContentVersion, {
      foreignKey: 'content_id',
      scope: { content_type: 'testimonial' },
      as: 'versions',
    });

    Testimonial.hasMany(models.WorkflowState, {
      foreignKey: 'content_id',
      scope: { content_type: 'testimonial' },
      as: 'workflow_states',
    });
  };

  return Testimonial;
};