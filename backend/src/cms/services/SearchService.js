const { Blog, Project, User, Tag, BlogCategory, MediaAsset } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

class SearchService {
  constructor() {
    this.searchableFields = {
      blogs: ['title', 'content', 'excerpt'],
      projects: ['title', 'description', 'shortDescription', 'challenges', 'solutions'],
      media: ['filename', 'originalName', 'altText', 'caption']
    };
  }

  // Unified search across all content types
  async searchAll(query, options = {}) {
    const {
      limit = 20,
      offset = 0,
      contentTypes = ['blogs', 'projects', 'media'],
      language = 'en',
      filters = {}
    } = options;

    const results = {
      blogs: [],
      projects: [],
      media: [],
      total: 0
    };

    // Search blogs
    if (contentTypes.includes('blogs')) {
      const blogResults = await this.searchBlogs(query, {
        limit: Math.ceil(limit / contentTypes.length),
        offset,
        language,
        ...filters.blogs
      });
      results.blogs = blogResults.items;
      results.total += blogResults.total;
    }

    // Search projects
    if (contentTypes.includes('projects')) {
      const projectResults = await this.searchProjects(query, {
        limit: Math.ceil(limit / contentTypes.length),
        offset,
        ...filters.projects
      });
      results.projects = projectResults.items;
      results.total += projectResults.total;
    }

    // Search media
    if (contentTypes.includes('media')) {
      const mediaResults = await this.searchMedia(query, {
        limit: Math.ceil(limit / contentTypes.length),
        offset,
        ...filters.media
      });
      results.media = mediaResults.items;
      results.total += mediaResults.total;
    }

    return results;
  }

  // Search blogs with advanced filtering
  async searchBlogs(query, options = {}) {
    const {
      limit = 10,
      offset = 0,
      language = 'en',
      status = 'published',
      category,
      tags,
      author,
      dateFrom,
      dateTo,
      sortBy = 'relevance'
    } = options;

    const whereConditions = {
      status,
      language
    };

    // Full-text search conditions
    if (query) {
      whereConditions[Op.or] = this.searchableFields.blogs.map(field => ({
        [field]: { [Op.iLike]: `%${query}%` }
      }));
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereConditions.publishedAt = {};
      if (dateFrom) whereConditions.publishedAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereConditions.publishedAt[Op.lte] = new Date(dateTo);
    }

    const include = [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'firstName', 'lastName']
      },
      {
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: BlogCategory,
        as: 'categories',
        attributes: ['id', 'name', 'slug', 'color']
      }
    ];

    // Filter by category
    if (category) {
      include[2].where = { slug: category };
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      include[1].where = { slug: { [Op.in]: tags } };
    }

    // Filter by author
    if (author) {
      include[0].where = { username: author };
    }

    // Determine sort order
    let order;
    switch (sortBy) {
      case 'date':
        order = [['publishedAt', 'DESC']];
        break;
      case 'views':
        order = [['viewCount', 'DESC']];
        break;
      case 'title':
        order = [['title', 'ASC']];
        break;
      default:
        // Relevance scoring (basic implementation)
        order = query ? 
          [[literal('CASE WHEN title ILIKE \'%' + query + '%\' THEN 1 ELSE 2 END'), 'ASC'], ['publishedAt', 'DESC']] :
          [['publishedAt', 'DESC']];
    }

    const { count, rows: items } = await Blog.findAndCountAll({
      where: whereConditions,
      include,
      limit,
      offset,
      order,
      distinct: true
    });

    return {
      items: items.map(this.formatBlogResult),
      total: count,
      hasMore: offset + limit < count
    };
  }

  // Search projects
  async searchProjects(query, options = {}) {
    const {
      limit = 10,
      offset = 0,
      status = 'published',
      category,
      technologies,
      featured,
      sortBy = 'relevance'
    } = options;

    const whereConditions = { status };

    if (query) {
      whereConditions[Op.or] = this.searchableFields.projects.map(field => ({
        [field]: { [Op.iLike]: `%${query}%` }
      }));
    }

    if (category) {
      whereConditions.category = category;
    }

    if (featured !== undefined) {
      whereConditions.isFeatured = featured;
    }

    const include = [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username']
      },
      {
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name', 'slug']
      },
      {
        model: Skill,
        as: 'skills',
        attributes: ['id', 'name', 'category']
      }
    ];

    if (technologies && technologies.length > 0) {
      include[2].where = { slug: { [Op.in]: technologies } };
    }

    let order;
    switch (sortBy) {
      case 'date':
        order = [['createdAt', 'DESC']];
        break;
      case 'views':
        order = [['viewCount', 'DESC']];
        break;
      case 'title':
        order = [['title', 'ASC']];
        break;
      default:
        order = query ? 
          [[literal('CASE WHEN title ILIKE \'%' + query + '%\' THEN 1 ELSE 2 END'), 'ASC'], ['createdAt', 'DESC']] :
          [['createdAt', 'DESC']];
    }

    const { count, rows: items } = await Project.findAndCountAll({
      where: whereConditions,
      include,
      limit,
      offset,
      order,
      distinct: true
    });

    return {
      items: items.map(this.formatProjectResult),
      total: count,
      hasMore: offset + limit < count
    };
  }

  // Search media assets
  async searchMedia(query, options = {}) {
    const {
      limit = 10,
      offset = 0,
      category,
      mimeType,
      sortBy = 'relevance'
    } = options;

    const whereConditions = {};

    if (query) {
      whereConditions[Op.or] = this.searchableFields.media.map(field => ({
        [field]: { [Op.iLike]: `%${query}%` }
      }));
    }

    if (category) {
      whereConditions.category = category;
    }

    if (mimeType) {
      whereConditions.mimeType = { [Op.iLike]: `${mimeType}%` };
    }

    const include = [
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'username']
      }
    ];

    let order;
    switch (sortBy) {
      case 'date':
        order = [['createdAt', 'DESC']];
        break;
      case 'size':
        order = [['fileSize', 'DESC']];
        break;
      case 'name':
        order = [['originalName', 'ASC']];
        break;
      default:
        order = query ? 
          [[literal('CASE WHEN original_name ILIKE \'%' + query + '%\' THEN 1 ELSE 2 END'), 'ASC'], ['createdAt', 'DESC']] :
          [['createdAt', 'DESC']];
    }

    const { count, rows: items } = await MediaAsset.findAndCountAll({
      where: whereConditions,
      include,
      limit,
      offset,
      order
    });

    return {
      items: items.map(this.formatMediaResult),
      total: count,
      hasMore: offset + limit < count
    };
  }

  // Get search suggestions
  async getSearchSuggestions(query, limit = 10) {
    const suggestions = [];

    // Get blog title suggestions
    const blogTitles = await Blog.findAll({
      where: {
        title: { [Op.iLike]: `%${query}%` },
        status: 'published'
      },
      attributes: ['title'],
      limit: limit / 3,
      order: [['viewCount', 'DESC']]
    });

    suggestions.push(...blogTitles.map(b => ({
      text: b.title,
      type: 'blog',
      category: 'Blog Posts'
    })));

    // Get project title suggestions
    const projectTitles = await Project.findAll({
      where: {
        title: { [Op.iLike]: `%${query}%` },
        status: 'published'
      },
      attributes: ['title'],
      limit: limit / 3,
      order: [['viewCount', 'DESC']]
    });

    suggestions.push(...projectTitles.map(p => ({
      text: p.title,
      type: 'project',
      category: 'Projects'
    })));

    // Get tag suggestions
    const tags = await Tag.findAll({
      where: {
        name: { [Op.iLike]: `%${query}%` }
      },
      attributes: ['name'],
      limit: limit / 3,
      order: [['name', 'ASC']]
    });

    suggestions.push(...tags.map(t => ({
      text: t.name,
      type: 'tag',
      category: 'Tags'
    })));

    return suggestions.slice(0, limit);
  }

  // Get popular search terms
  async getPopularSearches(limit = 10) {
    // This would typically be implemented with a search analytics table
    // For now, we'll return popular tags as a placeholder
    const popularTags = await Tag.findAll({
      include: [
        {
          model: Blog,
          as: 'blogs',
          where: { status: 'published' },
          attributes: []
        }
      ],
      attributes: [
        'name',
        [fn('COUNT', col('blogs.id')), 'usage_count']
      ],
      group: ['Tag.id', 'Tag.name'],
      order: [[literal('usage_count'), 'DESC']],
      limit
    });

    return popularTags.map(tag => ({
      term: tag.name,
      count: parseInt(tag.dataValues.usage_count),
      type: 'tag'
    }));
  }

  // Format search results
  formatBlogResult(blog) {
    return {
      id: blog.id,
      type: 'blog',
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      publishedAt: blog.publishedAt,
      viewCount: blog.viewCount,
      featuredImage: blog.featuredImage,
      author: blog.author ? {
        username: blog.author.username,
        name: `${blog.author.firstName} ${blog.author.lastName}`.trim()
      } : null,
      tags: blog.tags?.map(tag => ({
        name: tag.name,
        slug: tag.slug
      })) || [],
      categories: blog.categories?.map(cat => ({
        name: cat.name,
        slug: cat.slug,
        color: cat.color
      })) || []
    };
  }

  formatProjectResult(project) {
    return {
      id: project.id,
      type: 'project',
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription,
      category: project.category,
      isFeatured: project.isFeatured,
      viewCount: project.viewCount,
      githubUrl: project.githubUrl,
      demoUrl: project.demoUrl,
      publishedAt: project.publishedAt,
      author: project.author ? {
        username: project.author.username
      } : null,
      tags: project.tags?.map(tag => ({
        name: tag.name,
        slug: tag.slug
      })) || [],
      skills: project.skills?.map(skill => ({
        name: skill.name,
        category: skill.category
      })) || []
    };
  }

  formatMediaResult(media) {
    return {
      id: media.id,
      type: 'media',
      filename: media.filename,
      originalName: media.originalName,
      url: media.url,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      category: media.category,
      altText: media.altText,
      caption: media.caption,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt,
      uploader: media.uploader ? {
        username: media.uploader.username
      } : null
    };
  }

  // Build search index for better performance
  async buildSearchIndex() {
    // This would typically create/update full-text search indexes
    // Implementation depends on database (PostgreSQL full-text search, Elasticsearch, etc.)
    console.log('Building search index...');
    
    // Placeholder for index building logic
    const blogCount = await Blog.count({ where: { status: 'published' } });
    const projectCount = await Project.count({ where: { status: 'published' } });
    const mediaCount = await MediaAsset.count();
    
    console.log(`Indexed ${blogCount} blogs, ${projectCount} projects, ${mediaCount} media assets`);
    
    return {
      blogs: blogCount,
      projects: projectCount,
      media: mediaCount,
      total: blogCount + projectCount + mediaCount
    };
  }
}

module.exports = new SearchService();