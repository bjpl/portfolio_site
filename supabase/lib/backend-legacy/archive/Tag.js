/**
 * Tag Model
 * Tagging system for content organization and categorization
 */

module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 100],
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
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        'technology',
        'skill',
        'industry',
        'methodology',
        'tool',
        'language',
        'framework',
        'topic',
        'project_type',
        'general',
        'other'
      ),
      allowNull: false,
      defaultValue: 'general',
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    parent_tag_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tags',
        key: 'id',
      },
      comment: 'For hierarchical tag structures',
    },
    hierarchy_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_system_tag: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    auto_suggest: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    seo_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    seo_description: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    synonyms: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Alternative names for this tag',
    },
    related_tags: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'IDs of related tags',
    },
    popularity_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    trending_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    first_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deprecated', 'merged'),
      defaultValue: 'active',
    },
    merged_into_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tags',
        key: 'id',
      },
      comment: 'Tag this was merged into',
    },
    external_references: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'External platform tag mappings (GitHub topics, etc.)',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'tags',
    indexes: [
      { fields: ['name'] },
      { fields: ['slug'] },
      { fields: ['category'] },
      { fields: ['parent_tag_id'] },
      { fields: ['hierarchy_level'] },
      { fields: ['usage_count'] },
      { fields: ['popularity_score'] },
      { fields: ['is_featured'] },
      { fields: ['is_system_tag'] },
      { fields: ['status'] },
      { fields: ['last_used_at'] },
      { fields: ['trending_score'] },
    ],
  });

  // Instance methods
  Tag.prototype.incrementUsage = async function() {
    this.usage_count += 1;
    this.last_used_at = new Date();
    
    if (!this.first_used_at) {
      this.first_used_at = new Date();
    }
    
    // Update popularity score based on recent usage
    this.updatePopularityScore();
    
    await this.save();
  };

  Tag.prototype.decrementUsage = async function() {
    if (this.usage_count > 0) {
      this.usage_count -= 1;
      this.updatePopularityScore();
      await this.save();
    }
  };

  Tag.prototype.updatePopularityScore = function() {
    // Simple popularity calculation based on usage count and recency
    const daysSinceLastUsed = this.last_used_at ? 
      Math.floor((new Date() - new Date(this.last_used_at)) / (1000 * 60 * 60 * 24)) : 
      365;
    
    // Higher usage count + recent usage = higher popularity
    const recencyFactor = Math.max(0, 1 - (daysSinceLastUsed / 365));
    this.popularity_score = Math.floor(this.usage_count * (1 + recencyFactor));
  };

  Tag.prototype.calculateTrendingScore = async function() {
    // Calculate trending based on recent usage growth
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // This would require usage tracking over time
    // For now, simple calculation based on recent usage
    const recentUsageFactor = this.last_used_at > thirtyDaysAgo ? 2 : 1;
    this.trending_score = (this.usage_count * recentUsageFactor) / 100;
    
    await this.save();
  };

  Tag.prototype.getFullName = function() {
    return this.display_name || this.name;
  };

  Tag.prototype.getHierarchyPath = async function() {
    const path = [this];
    let current = this;
    
    while (current.parent_tag_id) {
      current = await Tag.findByPk(current.parent_tag_id);
      if (current) {
        path.unshift(current);
      } else {
        break;
      }
    }
    
    return path;
  };

  Tag.prototype.getChildren = function() {
    return Tag.findAll({
      where: { parent_tag_id: this.id, status: 'active' },
      order: [['name', 'ASC']],
    });
  };

  Tag.prototype.getSiblings = function() {
    return Tag.findAll({
      where: { 
        parent_tag_id: this.parent_tag_id,
        id: { [sequelize.Op.ne]: this.id },
        status: 'active'
      },
      order: [['name', 'ASC']],
    });
  };

  Tag.prototype.getRelatedTags = async function(limit = 10) {
    if (this.related_tags.length === 0) return [];
    
    return await Tag.findAll({
      where: { 
        id: { [sequelize.Op.in]: this.related_tags },
        status: 'active'
      },
      order: [['popularity_score', 'DESC']],
      limit,
    });
  };

  Tag.prototype.mergeTo = async function(targetTag) {
    // Update all content using this tag to use the target tag
    await sequelize.query(`
      UPDATE project_tags 
      SET tag_id = :targetId 
      WHERE tag_id = :sourceId
    `, {
      replacements: { targetId: targetTag.id, sourceId: this.id }
    });

    // Mark this tag as merged
    this.status = 'merged';
    this.merged_into_id = targetTag.id;
    await this.save();

    // Update target tag usage count
    await targetTag.reload();
    await targetTag.incrementUsage();
  };

  Tag.prototype.addSynonym = async function(synonym) {
    if (!this.synonyms.includes(synonym.toLowerCase())) {
      this.synonyms = [...this.synonyms, synonym.toLowerCase()];
      this.changed('synonyms', true);
      await this.save();
    }
  };

  Tag.prototype.removeSynonym = async function(synonym) {
    this.synonyms = this.synonyms.filter(s => s !== synonym.toLowerCase());
    this.changed('synonyms', true);
    await this.save();
  };

  // Class methods
  Tag.getPopular = function(limit = 20) {
    return this.findAll({
      where: { status: 'active' },
      order: [['popularity_score', 'DESC'], ['usage_count', 'DESC']],
      limit,
    });
  };

  Tag.getTrending = function(limit = 10) {
    return this.findAll({
      where: { 
        status: 'active',
        trending_score: { [sequelize.Op.gt]: 0 }
      },
      order: [['trending_score', 'DESC']],
      limit,
    });
  };

  Tag.getFeatured = function() {
    return this.findAll({
      where: { is_featured: true, status: 'active' },
      order: [['popularity_score', 'DESC']],
    });
  };

  Tag.getByCategory = function(category) {
    return this.findAll({
      where: { category, status: 'active' },
      order: [['name', 'ASC']],
    });
  };

  Tag.getRootTags = function() {
    return this.findAll({
      where: { 
        parent_tag_id: null,
        status: 'active'
      },
      order: [['name', 'ASC']],
    });
  };

  Tag.searchTags = function(query, limit = 10) {
    return this.findAll({
      where: {
        [sequelize.Op.or]: [
          { name: { [sequelize.Op.iLike]: `%${query}%` } },
          { display_name: { [sequelize.Op.iLike]: `%${query}%` } },
          { synonyms: { [sequelize.Op.contains]: [query.toLowerCase()] } },
        ],
        status: 'active',
        auto_suggest: true,
      },
      order: [['popularity_score', 'DESC'], ['name', 'ASC']],
      limit,
    });
  };

  Tag.getUnusedTags = function() {
    return this.findAll({
      where: { 
        usage_count: 0,
        is_system_tag: false,
        status: 'active'
      },
      order: [['created_at', 'ASC']],
    });
  };

  Tag.getTagStats = async function() {
    const [totalTags, activeTags, categories, mostUsed, leastUsed] = await Promise.all([
      this.count(),
      this.count({ where: { status: 'active' } }),
      this.findAll({
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: { status: 'active' },
        group: 'category',
        raw: true,
      }),
      this.findOne({
        where: { status: 'active' },
        order: [['usage_count', 'DESC']],
      }),
      this.findOne({
        where: { status: 'active', usage_count: { [sequelize.Op.gt]: 0 } },
        order: [['usage_count', 'ASC']],
      }),
    ]);

    return {
      total_tags: totalTags,
      active_tags: activeTags,
      by_category: categories,
      most_used: mostUsed,
      least_used: leastUsed,
    };
  };

  Tag.findOrCreate = async function(tagName, category = 'general') {
    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const [tag, created] = await this.findOrCreate({
      where: { slug },
      defaults: {
        name: tagName,
        slug,
        category,
        first_used_at: new Date(),
      },
    });

    if (!created) {
      await tag.incrementUsage();
    }

    return tag;
  };

  // Associations
  Tag.associate = (models) => {
    Tag.belongsTo(models.Tag, {
      foreignKey: 'parent_tag_id',
      as: 'parent',
    });

    Tag.hasMany(models.Tag, {
      foreignKey: 'parent_tag_id',
      as: 'children',
    });

    Tag.belongsTo(models.Tag, {
      foreignKey: 'merged_into_id',
      as: 'merged_into',
    });

    Tag.belongsToMany(models.Project, {
      through: models.ProjectTag,
      foreignKey: 'tag_id',
      otherKey: 'project_id',
      as: 'projects',
    });

    Tag.hasMany(models.ProjectTag, {
      foreignKey: 'tag_id',
      as: 'project_tags',
    });
  };

  return Tag;
};