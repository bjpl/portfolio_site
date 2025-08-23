const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Skill extends Model {
  static associate(models) {
    // Skill belongs to many portfolios through PortfolioSkill
    this.belongsToMany(models.Portfolio, {
      through: 'PortfolioSkill',
      foreignKey: 'skillId',
      otherKey: 'portfolioId',
      as: 'portfolios'
    });

    // Skill belongs to many projects through ProjectSkill
    this.belongsToMany(models.Project, {
      through: 'ProjectSkill',
      foreignKey: 'skillId',
      otherKey: 'projectId',
      as: 'projects'
    });

    // Skill belongs to many experiences through ExperienceSkill
    this.belongsToMany(models.Experience, {
      through: 'ExperienceSkill',
      foreignKey: 'skillId',
      otherKey: 'experienceId',
      as: 'experiences'
    });

    // Self-referencing association for skill hierarchy
    this.belongsTo(models.Skill, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    this.hasMany(models.Skill, {
      foreignKey: 'parentId',
      as: 'children'
    });
  }

  // Instance methods
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      type: this.type,
      proficiencyLevel: this.proficiencyLevel,
      description: this.description,
      icon: this.icon,
      color: this.color,
      website: this.website,
      isActive: this.isActive,
      sortOrder: this.sortOrder,
      metadata: this.metadata
    };
  }

  // Static methods
  static async getSkillsByCategory() {
    const skills = await this.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    const grouped = {};
    skills.forEach(skill => {
      if (!grouped[skill.category]) {
        grouped[skill.category] = [];
      }
      grouped[skill.category].push(skill.toPublicJSON());
    });

    return grouped;
  }

  static async getPopularSkills(limit = 10) {
    const skills = await this.findAll({
      where: { isActive: true },
      include: [
        {
          model: this.sequelize.models.Project,
          as: 'projects',
          attributes: ['id']
        },
        {
          model: this.sequelize.models.Portfolio,
          as: 'portfolios',
          attributes: ['id']
        }
      ],
      order: [['usageCount', 'DESC']],
      limit
    });

    return skills.map(skill => ({
      ...skill.toPublicJSON(),
      projectCount: skill.projects?.length || 0,
      portfolioCount: skill.portfolios?.length || 0
    }));
  }
}

Skill.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    validate: {
      isAlphanumeric: true,
      len: [1, 100]
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['programming', 'framework', 'database', 'tool', 'language', 'soft-skill', 'certification', 'other']]
    }
  },
  type: {
    type: DataTypes.ENUM('technical', 'soft', 'language', 'certification'),
    defaultValue: 'technical'
  },
  proficiencyLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    defaultValue: 'intermediate'
  },
  description: {
    type: DataTypes.TEXT
  },
  icon: {
    type: DataTypes.STRING,
    validate: {
      isUrl: true
    }
  },
  color: {
    type: DataTypes.STRING,
    validate: {
      is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    }
  },
  website: {
    type: DataTypes.STRING,
    validate: {
      isUrl: true
    }
  },
  parentId: {
    type: DataTypes.UUID,
    references: {
      model: 'skills',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {
      tags: [],
      aliases: [],
      version: null,
      yearLearned: null,
      certifications: []
    }
  }
}, {
  sequelize,
  modelName: 'Skill',
  tableName: 'skills',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['slug']
    },
    {
      fields: ['category']
    },
    {
      fields: ['type']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['sortOrder']
    },
    {
      fields: ['usageCount']
    },
    {
      fields: ['parentId']
    }
  ],
  hooks: {
    beforeCreate: async (skill) => {
      if (!skill.slug) {
        skill.slug = skill.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
    },
    beforeUpdate: async (skill) => {
      if (skill.changed('name') && !skill.changed('slug')) {
        skill.slug = skill.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
    }
  }
});

module.exports = Skill;