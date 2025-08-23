/**
 * Category Model
 * Handles hierarchical categories for content organization
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z0-9-]+$/
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    icon: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'usage_count'
    },
    // SEO Fields
    metaTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'meta_title'
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'meta_description'
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['slug']
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['is_active', 'sort_order']
      },
      {
        fields: ['usage_count']
      }
    ],
    hooks: {
      beforeValidate: (category) => {
        // Auto-generate slug from name if not provided
        if (!category.slug && category.name) {
          category.slug = category.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        }
      }
    }
  });

  // Class methods
  Category.getRootCategories = function() {
    return this.findAll({
      where: {
        parentId: null,
        isActive: true
      },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });
  };

  Category.getHierarchy = function() {
    return this.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      include: [{
        model: this,
        as: 'children',
        required: false
      }]
    });
  };

  Category.getBySlug = function(slug) {
    return this.findOne({
      where: { slug, isActive: true }
    });
  };

  Category.getMostUsed = function(limit = 10) {
    return this.findAll({
      where: { isActive: true },
      order: [['usageCount', 'DESC']],
      limit
    });
  };

  // Instance methods
  Category.prototype.incrementUsage = async function() {
    await this.increment('usageCount');
    return this.reload();
  };

  Category.prototype.decrementUsage = async function() {
    if (this.usageCount > 0) {
      await this.decrement('usageCount');
      return this.reload();
    }
    return this;
  };

  Category.prototype.getAncestors = async function() {
    const ancestors = [];
    let current = this;
    
    while (current.parentId) {
      const parent = await Category.findByPk(current.parentId);
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }
    
    return ancestors;
  };

  Category.prototype.getDescendants = async function() {
    const descendants = [];
    const children = await this.getChildren();
    
    for (const child of children) {
      descendants.push(child);
      const grandChildren = await child.getDescendants();
      descendants.push(...grandChildren);
    }
    
    return descendants;
  };

  Category.prototype.getBreadcrumb = async function() {
    const ancestors = await this.getAncestors();
    return [...ancestors, this];
  };

  Category.prototype.getPath = async function() {
    const breadcrumb = await this.getBreadcrumb();
    return breadcrumb.map(cat => cat.slug).join('/');
  };

  // Associations
  Category.associate = function(models) {
    // Self-referencing relationship for hierarchy
    Category.belongsTo(Category, {
      foreignKey: 'parentId',
      as: 'parent'
    });

    Category.hasMany(Category, {
      foreignKey: 'parentId',
      as: 'children'
    });

    // Content relationships
    Category.belongsToMany(models.BlogPost, {
      through: 'BlogPostCategory',
      foreignKey: 'categoryId',
      otherKey: 'blogPostId',
      as: 'blogPosts'
    });

    Category.belongsToMany(models.Project, {
      through: 'ProjectCategory',
      foreignKey: 'categoryId',
      otherKey: 'projectId',
      as: 'projects'
    });
  };

  return Category;
};