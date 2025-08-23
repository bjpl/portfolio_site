const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Project extends Model {
  static associate(models) {
    // Project belongs to portfolio
    this.belongsTo(models.Portfolio, {
      foreignKey: 'portfolioId',
      as: 'portfolio'
    });

    // Project has many skills through ProjectSkill
    this.belongsToMany(models.Skill, {
      through: 'ProjectSkill',
      foreignKey: 'projectId',
      otherKey: 'skillId',
      as: 'skills'
    });

    // Project has many media files
    this.hasMany(models.MediaFile, {
      foreignKey: 'entityId',
      constraints: false,
      scope: {
        entityType: 'project'
      },
      as: 'media'
    });

    // Project has many content versions
    this.hasMany(models.ContentVersion, {
      foreignKey: 'entityId',
      constraints: false,
      scope: {
        entityType: 'project'
      },
      as: 'versions'
    });
  }

  // Instance methods
  toPublicJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      shortDescription: this.shortDescription,
      content: this.content,
      technologies: this.technologies,
      category: this.category,
      status: this.status,
      priority: this.priority,
      startDate: this.startDate,
      endDate: this.endDate,
      links: this.links,
      images: this.images,
      featured: this.featured,
      isPublic: this.isPublic,
      seoTitle: this.seoTitle,
      seoDescription: this.seoDescription,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  async createVersion(changes, userId) {
    const { ContentVersion } = require('./ContentVersion');
    return ContentVersion.create({
      entityType: 'project',
      entityId: this.id,
      version: await this.getNextVersion(),
      changes: changes,
      createdBy: userId,
      metadata: {
        title: this.title,
        description: this.description
      }
    });
  }

  async getNextVersion() {
    const { ContentVersion } = require('./ContentVersion');
    const latest = await ContentVersion.findOne({
      where: {
        entityType: 'project',
        entityId: this.id
      },
      order: [['version', 'DESC']]
    });
    return (latest?.version || 0) + 1;
  }
}

Project.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  portfolioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'portfolios',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isAlphanumeric: true,
      len: [3, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  shortDescription: {
    type: DataTypes.STRING(500),
    validate: {
      len: [0, 500]
    }
  },
  content: {
    type: DataTypes.TEXT('long')
  },
  technologies: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['web', 'mobile', 'desktop', 'api', 'library', 'tool', 'other']]
    }
  },
  status: {
    type: DataTypes.ENUM('planning', 'in-progress', 'completed', 'on-hold', 'cancelled'),
    defaultValue: 'planning'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  startDate: {
    type: DataTypes.DATE
  },
  endDate: {
    type: DataTypes.DATE
  },
  links: {
    type: DataTypes.JSON,
    defaultValue: {
      live: null,
      demo: null,
      github: null,
      documentation: null
    }
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: {
      thumbnail: null,
      gallery: [],
      featured: null
    }
  },
  metrics: {
    type: DataTypes.JSON,
    defaultValue: {
      views: 0,
      likes: 0,
      downloads: 0,
      stars: 0
    }
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  seoTitle: {
    type: DataTypes.STRING,
    validate: {
      len: [0, 60]
    }
  },
  seoDescription: {
    type: DataTypes.STRING,
    validate: {
      len: [0, 160]
    }
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'Project',
  tableName: 'projects',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['portfolioId']
    },
    {
      fields: ['slug']
    },
    {
      fields: ['category']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['featured']
    },
    {
      fields: ['isPublic']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['sortOrder']
    },
    {
      unique: true,
      fields: ['portfolioId', 'slug']
    }
  ],
  hooks: {
    beforeCreate: async (project) => {
      if (!project.slug) {
        project.slug = project.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
    }
  }
});

module.exports = Project;