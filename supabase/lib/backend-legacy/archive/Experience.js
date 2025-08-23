/**
 * Experience Model
 * Professional work experience and career history
 */

module.exports = (sequelize, DataTypes) => {
  const Experience = sequelize.define('Experience', {
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
    company: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
      },
    },
    company_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    company_logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    employment_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.ENUM('on_site', 'remote', 'hybrid'),
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    responsibilities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    achievements: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    technologies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
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
    team_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    reports_to: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    direct_reports: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    salary_range: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: 'USD',
    },
    key_projects: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    skills_gained: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    references: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    reason_for_leaving: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'hidden', 'archived'),
      defaultValue: 'active',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'experiences',
    indexes: [
      { fields: ['company'] },
      { fields: ['title'] },
      { fields: ['employment_type'] },
      { fields: ['is_current'] },
      { fields: ['start_date'] },
      { fields: ['end_date'] },
      { fields: ['display_order'] },
      { fields: ['is_featured'] },
      { fields: ['status'] },
    ],
  });

  // Instance methods
  Experience.prototype.getDuration = function() {
    const endDate = this.end_date ? new Date(this.end_date) : new Date();
    const startDate = new Date(this.start_date);
    const diffTime = Math.abs(endDate - startDate);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
    
    if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    }
    
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    
    let duration = `${years} year${years !== 1 ? 's' : ''}`;
    if (months > 0) {
      duration += ` ${months} month${months !== 1 ? 's' : ''}`;
    }
    
    return duration;
  };

  Experience.prototype.getDurationInMonths = function() {
    const endDate = this.end_date ? new Date(this.end_date) : new Date();
    const startDate = new Date(this.start_date);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  };

  Experience.prototype.getFormattedDateRange = function() {
    const startDate = new Date(this.start_date);
    const startStr = startDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (this.is_current) {
      return `${startStr} - Present`;
    }
    
    if (this.end_date) {
      const endDate = new Date(this.end_date);
      const endStr = endDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      return `${startStr} - ${endStr}`;
    }
    
    return startStr;
  };

  Experience.prototype.isCurrentPosition = function() {
    return this.is_current && (!this.end_date || new Date(this.end_date) > new Date());
  };

  // Class methods
  Experience.getCurrentExperiences = function() {
    return this.findAll({
      where: { is_current: true, status: 'active' },
      order: [['start_date', 'DESC']],
    });
  };

  Experience.getFeatured = function() {
    return this.findAll({
      where: { is_featured: true, status: 'active' },
      order: [['display_order', 'ASC'], ['start_date', 'DESC']],
    });
  };

  // Associations
  Experience.associate = (models) => {
    Experience.hasMany(models.ContentVersion, {
      foreignKey: 'content_id',
      scope: { content_type: 'experience' },
      as: 'versions',
    });

    Experience.hasMany(models.WorkflowState, {
      foreignKey: 'content_id',
      scope: { content_type: 'experience' },
      as: 'workflow_states',
    });
  };

  return Experience;
};