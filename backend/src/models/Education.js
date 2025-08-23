/**
 * Education Model
 * Educational background, degrees, certifications, and courses
 */

module.exports = (sequelize, DataTypes) => {
  const Education = sequelize.define('Education', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institution: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
      },
    },
    institution_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    institution_logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    degree_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    field_of_study: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    specialization: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    graduation_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    grade_type: {
      type: DataTypes.ENUM('gpa', 'percentage', 'classification', 'pass_fail', 'other'),
      allowNull: true,
    },
    grade_value: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    grade_scale: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    honors: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    activities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    coursework: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    thesis_title: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    thesis_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thesis_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    advisor: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    skills_acquired: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    projects: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    certifications: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    credential_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    credential_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    renewal_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: 'USD',
    },
    duration_hours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
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
    tableName: 'education',
    indexes: [
      { fields: ['institution'] },
      { fields: ['degree_type'] },
      { fields: ['field_of_study'] },
      { fields: ['is_current'] },
      { fields: ['is_completed'] },
      { fields: ['graduation_date'] },
      { fields: ['display_order'] },
      { fields: ['is_featured'] },
      { fields: ['status'] },
      { fields: ['expiry_date'] },
    ],
  });

  // Instance methods
  Education.prototype.getDuration = function() {
    if (!this.start_date) return null;
    
    const endDate = this.end_date || this.graduation_date;
    if (!endDate) return null;
    
    const startDate = new Date(this.start_date);
    const finishDate = new Date(endDate);
    const diffTime = Math.abs(finishDate - startDate);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    
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

  Education.prototype.getFormattedDateRange = function() {
    if (!this.start_date) return 'Date not specified';
    
    const startDate = new Date(this.start_date);
    const startStr = startDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (this.is_current) {
      return `${startStr} - Present`;
    }
    
    const endDate = this.end_date || this.graduation_date;
    if (endDate) {
      const finishDate = new Date(endDate);
      const endStr = finishDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      return `${startStr} - ${endStr}`;
    }
    
    return startStr;
  };

  Education.prototype.isExpired = function() {
    return this.expiry_date && new Date(this.expiry_date) < new Date();
  };

  Education.prototype.isNearingExpiry = function(daysThreshold = 90) {
    if (!this.expiry_date) return false;
    
    const expiryDate = new Date(this.expiry_date);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return expiryDate <= thresholdDate;
  };

  Education.prototype.getCredentialStatus = function() {
    if (this.isExpired()) return 'expired';
    if (this.isNearingExpiry()) return 'expiring_soon';
    if (this.is_current) return 'in_progress';
    if (this.is_completed) return 'completed';
    return 'active';
  };

  // Class methods
  Education.getByType = function(degreeType) {
    return this.findAll({
      where: { degree_type: degreeType, status: 'active' },
      order: [['display_order', 'ASC'], ['graduation_date', 'DESC']],
    });
  };

  Education.getFeatured = function() {
    return this.findAll({
      where: { is_featured: true, status: 'active' },
      order: [['display_order', 'ASC']],
    });
  };

  Education.getExpiringCertifications = function(daysThreshold = 90) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return this.findAll({
      where: {
        expiry_date: { [sequelize.Op.lte]: thresholdDate },
        renewal_required: true,
        status: 'active',
      },
      order: [['expiry_date', 'ASC']],
    });
  };

  // Associations
  Education.associate = (models) => {
    Education.hasMany(models.ContentVersion, {
      foreignKey: 'content_id',
      scope: { content_type: 'education' },
      as: 'versions',
    });

    Education.hasMany(models.WorkflowState, {
      foreignKey: 'content_id',
      scope: { content_type: 'education' },
      as: 'workflow_states',
    });
  };

  return Education;
};