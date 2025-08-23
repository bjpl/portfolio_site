/**
 * Skill Matrix Model
 * Evidence-based skill tracking with validation and proficiency levels
 */

module.exports = (sequelize, DataTypes) => {
  const SkillMatrix = sequelize.define('SkillMatrix', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    skill_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    skill_name_es: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    skill_category: {
      type: DataTypes.ENUM(
        'technical',
        'pedagogical',
        'language',
        'creative',
        'leadership',
        'research',
        'communication',
        'analytical',
        'interpersonal',
        'cultural'
      ),
      allowNull: false,
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Programming Languages, Frameworks, Assessment Design, etc.',
    },
    proficiency_level: {
      type: DataTypes.ENUM(
        'novice',          // Learning fundamentals
        'advanced_beginner', // Can perform basic tasks with guidance
        'competent',       // Can work independently on routine tasks
        'proficient',      // Can adapt knowledge to new situations
        'expert'           // Can innovate and teach others
      ),
      allowNull: false,
    },
    proficiency_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 100,
      },
      comment: '1-100 score based on evidence and validation',
    },
    self_assessment_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 100,
      },
    },
    years_experience: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    last_used: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this skill was last actively used',
    },
    learning_status: {
      type: DataTypes.ENUM(
        'actively_learning',
        'maintaining',
        'advancing',
        'teaching',
        'dormant',
        'rusty'
      ),
      defaultValue: 'maintaining',
    },
    evidence: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of evidence objects: projects, certifications, testimonials',
    },
    certifications: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Formal certifications and credentials',
    },
    portfolio_projects: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Related project IDs demonstrating this skill',
    },
    peer_validations: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Peer endorsements and validations',
    },
    student_feedback: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Student feedback related to this skill',
    },
    professional_references: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Professional references who can attest to this skill',
    },
    learning_plan: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Plan for skill development and advancement',
    },
    milestones: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Learning and achievement milestones',
    },
    related_skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Related and complementary skills',
    },
    tools_technologies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Specific tools, technologies, or platforms',
    },
    contexts_used: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Contexts where skill has been applied',
    },
    impact_examples: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Specific examples of impact using this skill',
    },
    teaching_experience: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Experience teaching or mentoring others in this skill',
    },
    continuous_learning: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Ongoing learning activities and resources',
    },
    market_demand: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'very_high'),
      allowNull: true,
      comment: 'Market demand for this skill',
    },
    strategic_importance: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      comment: 'Strategic importance to career goals',
    },
    visibility_level: {
      type: DataTypes.ENUM('private', 'portfolio_only', 'public'),
      defaultValue: 'portfolio_only',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Feature this skill prominently',
    },
    validation_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Score based on external validation',
    },
    confidence_level: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Self-assessed confidence level',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'skill_matrix',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['skill_category'] },
      { fields: ['proficiency_level'] },
      { fields: ['proficiency_score'] },
      { fields: ['learning_status'] },
      { fields: ['strategic_importance'] },
      { fields: ['featured'] },
      { fields: ['last_used'] },
      { fields: ['user_id', 'skill_category'] },
      { fields: ['user_id', 'featured'] },
      { fields: ['tools_technologies'], using: 'gin' },
      { fields: ['related_skills'], using: 'gin' },
    ],
    validate: {
      proficiencyScoreAlignment() {
        // Validate proficiency score aligns with level
        const levelRanges = {
          'novice': [1, 25],
          'advanced_beginner': [20, 45],
          'competent': [40, 65],
          'proficient': [60, 85],
          'expert': [80, 100]
        };
        
        const [min, max] = levelRanges[this.proficiency_level] || [1, 100];
        if (this.proficiency_score < min || this.proficiency_score > max) {
          throw new Error(`Proficiency score ${this.proficiency_score} doesn't align with level ${this.proficiency_level}`);
        }
      }
    }
  });

  // Instance methods
  SkillMatrix.prototype.getLocalizedContent = function(language = 'en') {
    return {
      skill_name: language === 'es' && this.skill_name_es ? this.skill_name_es : this.skill_name,
    };
  };

  SkillMatrix.prototype.calculateValidationScore = function() {
    let score = 0;
    const weights = {
      certifications: 30,
      peer_validations: 25,
      professional_references: 20,
      student_feedback: 15,
      portfolio_projects: 10
    };

    // Certifications score
    if (this.certifications && this.certifications.length > 0) {
      score += weights.certifications;
    }

    // Peer validations
    if (this.peer_validations && this.peer_validations.length > 0) {
      const peerScore = Math.min(25, this.peer_validations.length * 5);
      score += peerScore;
    }

    // Professional references
    if (this.professional_references && this.professional_references.length > 0) {
      const refScore = Math.min(20, this.professional_references.length * 7);
      score += refScore;
    }

    // Student feedback
    if (this.student_feedback && this.student_feedback.length > 0) {
      const avgRating = this.student_feedback.reduce((acc, feedback) => acc + (feedback.rating || 0), 0) / this.student_feedback.length;
      score += (avgRating / 5) * weights.student_feedback;
    }

    // Portfolio projects
    if (this.portfolio_projects && this.portfolio_projects.length > 0) {
      score += Math.min(weights.portfolio_projects, this.portfolio_projects.length * 2);
    }

    this.validation_score = Math.round(score);
    return this.validation_score;
  };

  SkillMatrix.prototype.addEvidence = async function(evidence) {
    const evidenceEntry = {
      id: require('uuid').v4(),
      ...evidence,
      added_date: new Date(),
    };
    
    this.evidence = [...(this.evidence || []), evidenceEntry];
    this.changed('evidence', true);
    await this.save();
  };

  SkillMatrix.prototype.addPeerValidation = async function(validation) {
    const validationEntry = {
      id: require('uuid').v4(),
      ...validation,
      validation_date: new Date(),
    };
    
    this.peer_validations = [...(this.peer_validations || []), validationEntry];
    this.changed('peer_validations', true);
    
    // Recalculate validation score
    this.calculateValidationScore();
    await this.save();
  };

  SkillMatrix.prototype.updateLearningPlan = async function(plan) {
    this.learning_plan = {
      ...this.learning_plan,
      ...plan,
      updated_date: new Date(),
    };
    
    this.changed('learning_plan', true);
    await this.save();
  };

  SkillMatrix.prototype.addMilestone = async function(milestone) {
    const milestoneEntry = {
      id: require('uuid').v4(),
      ...milestone,
      achieved_date: new Date(),
    };
    
    this.milestones = [...(this.milestones || []), milestoneEntry];
    this.changed('milestones', true);
    await this.save();
  };

  SkillMatrix.prototype.getSkillAge = function() {
    if (!this.last_used) return null;
    
    const now = new Date();
    const lastUsed = new Date(this.last_used);
    const diffTime = Math.abs(now - lastUsed);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return 'current';
    if (diffDays <= 90) return 'recent';
    if (diffDays <= 365) return 'developing_rust';
    return 'rusty';
  };

  SkillMatrix.prototype.getGrowthTrajectory = function() {
    const milestones = this.milestones || [];
    if (milestones.length < 2) return 'insufficient_data';
    
    const sortedMilestones = milestones
      .filter(m => m.proficiency_score)
      .sort((a, b) => new Date(a.achieved_date) - new Date(b.achieved_date));
    
    if (sortedMilestones.length < 2) return 'insufficient_data';
    
    const recent = sortedMilestones.slice(-3);
    const trend = recent[recent.length - 1].proficiency_score - recent[0].proficiency_score;
    
    if (trend > 10) return 'accelerating';
    if (trend > 0) return 'growing';
    if (trend === 0) return 'stable';
    return 'declining';
  };

  // Class methods
  SkillMatrix.getByCategory = function(userId, category) {
    return this.findAll({
      where: {
        user_id: userId,
        skill_category: category,
      },
      order: [['proficiency_score', 'DESC']],
    });
  };

  SkillMatrix.getFeaturedSkills = function(userId, limit = 6) {
    return this.findAll({
      where: {
        user_id: userId,
        featured: true,
        visibility_level: ['portfolio_only', 'public'],
      },
      order: [['proficiency_score', 'DESC']],
      limit,
    });
  };

  SkillMatrix.getSkillsNeedingAttention = function(userId) {
    return this.findAll({
      where: {
        user_id: userId,
        [sequelize.Op.or]: [
          { learning_status: 'rusty' },
          { 
            last_used: {
              [sequelize.Op.lt]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
            }
          },
          {
            [sequelize.Op.and]: [
              { strategic_importance: ['high', 'critical'] },
              { proficiency_score: { [sequelize.Op.lt]: 70 } }
            ]
          }
        ]
      },
      order: [['strategic_importance', 'DESC'], ['proficiency_score', 'ASC']],
    });
  };

  SkillMatrix.getSkillOverview = async function(userId) {
    const skills = await this.findAll({
      where: { user_id: userId },
    });

    const overview = {
      total_skills: skills.length,
      by_category: {},
      by_proficiency: {},
      average_proficiency: 0,
      featured_count: 0,
      needs_attention: 0,
    };

    let totalScore = 0;

    skills.forEach(skill => {
      // By category
      overview.by_category[skill.skill_category] = (overview.by_category[skill.skill_category] || 0) + 1;
      
      // By proficiency level
      overview.by_proficiency[skill.proficiency_level] = (overview.by_proficiency[skill.proficiency_level] || 0) + 1;
      
      // Featured count
      if (skill.featured) overview.featured_count++;
      
      // Needs attention
      if (skill.learning_status === 'rusty' || skill.getSkillAge() === 'rusty') {
        overview.needs_attention++;
      }
      
      totalScore += skill.proficiency_score;
    });

    overview.average_proficiency = skills.length > 0 ? Math.round(totalScore / skills.length) : 0;

    return overview;
  };

  // Associations
  SkillMatrix.associate = (models) => {
    SkillMatrix.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  // Hooks
  SkillMatrix.beforeSave(async (skill, options) => {
    // Update validation score
    skill.calculateValidationScore();
    
    // Update learning status based on last_used
    if (skill.last_used) {
      const skillAge = skill.getSkillAge();
      if (skillAge === 'rusty' && skill.learning_status !== 'actively_learning') {
        skill.learning_status = 'rusty';
      }
    }
  });

  return SkillMatrix;
};