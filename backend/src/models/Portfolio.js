const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Portfolio extends Model {
  static associate(models) {
    // Portfolio has many projects
    this.hasMany(models.Project, {
      foreignKey: 'portfolioId',
      as: 'projects'
    });

    // Portfolio has many skills through PortfolioSkill
    this.belongsToMany(models.Skill, {
      through: 'PortfolioSkill',
      foreignKey: 'portfolioId',
      otherKey: 'skillId',
      as: 'skills'
    });

    // Portfolio has many experiences
    this.hasMany(models.Experience, {
      foreignKey: 'portfolioId',
      as: 'experiences'
    });

    // Portfolio has many education records
    this.hasMany(models.Education, {
      foreignKey: 'portfolioId',
      as: 'education'
    });

    // Portfolio has many content versions
    this.hasMany(models.ContentVersion, {
      foreignKey: 'entityId',
      constraints: false,
      scope: {
        entityType: 'portfolio'
      },
      as: 'versions'
    });

    // Portfolio belongs to user
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'owner'
    });
  }

  // Instance methods
  toPublicJSON() {
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      description: this.description,
      bio: this.bio,
      contact: this.contact,
      social: this.social,
      theme: this.theme,
      layout: this.layout,
      isPublic: this.isPublic,
      customDomain: this.customDomain,
      seoTitle: this.seoTitle,
      seoDescription: this.seoDescription,
      analytics: this.analytics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this.publishedAt
    };
  }

  async createVersion(changes, userId) {
    const { ContentVersion } = require('./ContentVersion');
    return ContentVersion.create({
      entityType: 'portfolio',
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
        entityType: 'portfolio',
        entityId: this.id
      },
      order: [['version', 'DESC']]
    });
    return (latest?.version || 0) + 1;
  }
}

Portfolio.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
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
  subtitle: {
    type: DataTypes.STRING,
    validate: {
      len: [0, 300]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT
  },
  contact: {
    type: DataTypes.JSON,
    defaultValue: {
      email: null,
      phone: null,
      address: null,
      website: null
    }
  },
  social: {
    type: DataTypes.JSON,
    defaultValue: {
      linkedin: null,
      github: null,
      twitter: null,
      instagram: null,
      facebook: null,
      youtube: null,
      website: null
    }
  },
  theme: {
    type: DataTypes.JSON,
    defaultValue: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      accentColor: '#10B981',
      backgroundColor: '#FFFFFF',
      textColor: '#111827',
      fontFamily: 'Inter'
    }
  },
  layout: {
    type: DataTypes.JSON,
    defaultValue: {
      template: 'modern',
      sections: ['hero', 'about', 'skills', 'projects', 'experience', 'contact'],
      customCSS: null
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    validate: {
      isAlphanumeric: true,
      len: [3, 50]
    }
  },
  customDomain: {
    type: DataTypes.STRING,
    unique: true,
    validate: {
      isUrl: true
    }
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
  analytics: {
    type: DataTypes.JSON,
    defaultValue: {
      googleAnalytics: null,
      googleTagManager: null,
      facebookPixel: null
    }
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      allowComments: true,
      requireApproval: true,
      enableCaptcha: true,
      maintenanceMode: false
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft'
  },
  publishedAt: {
    type: DataTypes.DATE
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'Portfolio',
  tableName: 'portfolios',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['slug']
    },
    {
      fields: ['isPublic']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: async (portfolio) => {
      if (!portfolio.slug) {
        portfolio.slug = portfolio.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
    },
    beforeUpdate: async (portfolio) => {
      if (portfolio.changed('status') && portfolio.status === 'published' && !portfolio.publishedAt) {
        portfolio.publishedAt = new Date();
      }
    }
  }
});

module.exports = Portfolio;