/**
 * ProjectSkill Model
 * Junction table for Project-Skill many-to-many relationship
 */

module.exports = (sequelize, DataTypes) => {
  const ProjectSkill = sequelize.define('ProjectSkill', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
    },
    skill_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'skills',
        key: 'id',
      },
    },
    proficiency_level: {
      type: DataTypes.ENUM('basic', 'intermediate', 'advanced', 'expert'),
      allowNull: false,
      defaultValue: 'intermediate',
    },
    usage_intensity: {
      type: DataTypes.ENUM('light', 'moderate', 'heavy', 'core'),
      allowNull: false,
      defaultValue: 'moderate',
      comment: 'How heavily this skill was used in the project',
    },
    skill_role: {
      type: DataTypes.ENUM(
        'primary_technology',
        'supporting_technology',
        'framework',
        'library',
        'tool',
        'methodology',
        'soft_skill',
        'other'
      ),
      allowNull: false,
      defaultValue: 'supporting_technology',
    },
    importance_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 10,
      },
      comment: 'How important this skill was to project success (1-10)',
    },
    learning_outcome: {
      type: DataTypes.ENUM(
        'no_learning',
        'reinforced_existing',
        'learned_new_aspects',
        'significant_improvement',
        'mastery_achieved'
      ),
      allowNull: true,
      comment: 'What was learned about this skill during the project',
    },
    experience_gained_months: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
      validate: {
        min: 0,
        max: 120,
      },
      comment: 'Months of experience gained with this skill',
    },
    specific_features_used: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Specific features, APIs, or aspects of the skill used',
    },
    challenges_faced: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Challenges encountered with this skill',
    },
    solutions_developed: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Solutions or workarounds developed',
    },
    version_used: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Version of the technology/tool used',
    },
    context_of_use: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'How and why this skill was used in the project',
    },
    alternatives_considered: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Alternative skills/technologies that were considered',
    },
    would_use_again: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Whether you would use this skill again for similar projects',
    },
    recommendation_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
      comment: 'How highly you would recommend this skill (1-5 stars)',
    },
    added_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    added_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    source: {
      type: DataTypes.ENUM('manual', 'project_analysis', 'resume_import', 'ai_detected'),
      defaultValue: 'manual',
    },
    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
      comment: 'AI confidence score for auto-detected skills',
    },
    is_highlighted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether to highlight this skill when showcasing the project',
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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
    tableName: 'project_skills',
    indexes: [
      { fields: ['project_id'] },
      { fields: ['skill_id'] },
      { fields: ['proficiency_level'] },
      { fields: ['usage_intensity'] },
      { fields: ['skill_role'] },
      { fields: ['importance_score'] },
      { fields: ['is_highlighted'] },
      { fields: ['source'] },
      { fields: ['project_id', 'skill_id'], unique: true },
    ],
  });

  // Instance methods
  ProjectSkill.prototype.getImportanceLevel = function() {
    if (this.importance_score >= 9) return 'critical';
    if (this.importance_score >= 7) return 'high';
    if (this.importance_score >= 5) return 'medium';
    if (this.importance_score >= 3) return 'low';
    return 'minimal';
  };

  ProjectSkill.prototype.isPrimarySkill = function() {
    return this.skill_role === 'primary_technology' || this.importance_score >= 8;
  };

  ProjectSkill.prototype.getUsageDescription = function() {
    const intensity = this.usage_intensity;
    const role = this.skill_role;
    
    const descriptions = {
      'core': 'Core technology used extensively throughout the project',
      'heavy': 'Heavily used for major features and functionality',
      'moderate': 'Used regularly for various project components',
      'light': 'Used occasionally for specific features or tasks'
    };
    
    return descriptions[intensity] || 'Used in the project';
  };

  ProjectSkill.prototype.getLearningDescription = function() {
    const outcomes = {
      'mastery_achieved': 'Achieved mastery through extensive use',
      'significant_improvement': 'Significantly improved skills and understanding',
      'learned_new_aspects': 'Learned new aspects and features',
      'reinforced_existing': 'Reinforced existing knowledge and skills',
      'no_learning': 'Applied existing knowledge'
    };
    
    return outcomes[this.learning_outcome] || '';
  };

  ProjectSkill.prototype.updateFromProject = async function(projectData) {
    // Update skill association based on project requirements
    if (projectData.duration_months) {
      this.experience_gained_months = projectData.duration_months;
    }
    
    await this.save();
  };

  ProjectSkill.prototype.highlight = async function() {
    this.is_highlighted = true;
    await this.save();
  };

  ProjectSkill.prototype.unhighlight = async function() {
    this.is_highlighted = false;
    await this.save();
  };

  // Class methods
  ProjectSkill.getSkillsByProject = function(projectId) {
    return this.findAll({
      where: { project_id: projectId },
      order: [
        ['is_highlighted', 'DESC'],
        ['importance_score', 'DESC'],
        ['proficiency_level', 'DESC'],
        ['display_order', 'ASC']
      ],
      include: [{
        model: sequelize.models.Skill,
        as: 'skill',
      }],
    });
  };

  ProjectSkill.getProjectsBySkill = function(skillId, limit = null) {
    const options = {
      where: { skill_id: skillId },
      order: [['importance_score', 'DESC'], ['added_at', 'DESC']],
      include: [{
        model: sequelize.models.Project,
        as: 'project',
      }],
    };
    
    if (limit) {
      options.limit = limit;
    }
    
    return this.findAll(options);
  };

  ProjectSkill.getPrimarySkillsByProject = function(projectId) {
    return this.findAll({
      where: { 
        project_id: projectId,
        [sequelize.Op.or]: [
          { skill_role: 'primary_technology' },
          { importance_score: { [sequelize.Op.gte]: 8 } }
        ]
      },
      order: [['importance_score', 'DESC']],
      include: [{
        model: sequelize.models.Skill,
        as: 'skill',
      }],
    });
  };

  ProjectSkill.getHighlightedSkills = function(projectId) {
    return this.findAll({
      where: { 
        project_id: projectId,
        is_highlighted: true 
      },
      order: [['importance_score', 'DESC'], ['display_order', 'ASC']],
      include: [{
        model: sequelize.models.Skill,
        as: 'skill',
      }],
    });
  };

  ProjectSkill.getSkillUsageStats = async function(skillId) {
    const stats = await this.findAll({
      where: { skill_id: skillId },
      attributes: [
        'proficiency_level',
        'usage_intensity',
        'skill_role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('importance_score')), 'avg_importance'],
        [sequelize.fn('SUM', sequelize.col('experience_gained_months')), 'total_experience'],
      ],
      group: ['proficiency_level', 'usage_intensity', 'skill_role'],
      raw: true,
    });

    const totalProjects = await this.count({ where: { skill_id: skillId } });
    const avgImportance = await this.findOne({
      where: { skill_id: skillId },
      attributes: [[sequelize.fn('AVG', sequelize.col('importance_score')), 'avg_importance']],
      raw: true,
    });

    return {
      total_projects: totalProjects,
      average_importance: parseFloat(avgImportance.avg_importance || 0),
      usage_breakdown: stats,
    };
  };

  ProjectSkill.getTopSkillsByUsage = function(limit = 10) {
    return this.findAll({
      attributes: [
        'skill_id',
        [sequelize.fn('COUNT', sequelize.col('project_id')), 'project_count'],
        [sequelize.fn('AVG', sequelize.col('importance_score')), 'avg_importance'],
        [sequelize.fn('SUM', sequelize.col('experience_gained_months')), 'total_experience'],
      ],
      group: ['skill_id'],
      order: [
        [sequelize.fn('COUNT', sequelize.col('project_id')), 'DESC'],
        [sequelize.fn('AVG', sequelize.col('importance_score')), 'DESC']
      ],
      limit,
      include: [{
        model: sequelize.models.Skill,
        as: 'skill',
      }],
    });
  };

  ProjectSkill.getSkillEvolution = function(skillId) {
    return this.findAll({
      where: { skill_id: skillId },
      order: [['added_at', 'ASC']],
      include: [{
        model: sequelize.models.Project,
        as: 'project',
        attributes: ['id', 'title', 'start_date', 'end_date'],
      }],
    });
  };

  // Associations
  ProjectSkill.associate = (models) => {
    ProjectSkill.belongsTo(models.Project, {
      foreignKey: 'project_id',
      as: 'project',
    });

    ProjectSkill.belongsTo(models.Skill, {
      foreignKey: 'skill_id',
      as: 'skill',
    });

    ProjectSkill.belongsTo(models.User, {
      foreignKey: 'added_by',
      as: 'adder',
    });
  };

  return ProjectSkill;
};