const { Blog, BlogVersion, User, Tag, BlogCategory, Comment } = require('../../models');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');
const slugify = require('slugify');

class BlogService {
  // Generate blog slug with uniqueness check
  async generateSlug(title, excludeId = null) {
    let baseSlug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingBlog = await Blog.findOne({
        where: { 
          slug,
          ...(excludeId && { id: { [Op.ne]: excludeId } })
        }
      });

      if (!existingBlog) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // Process markdown content
  processMarkdown(markdown) {
    // Configure marked with security settings
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      headerPrefix: 'heading-'
    });

    const html = marked(markdown);
    
    // Sanitize HTML to prevent XSS
    return sanitizeHtml(html, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's',
        'blockquote', 'code', 'pre',
        'ul', 'ol', 'li',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span'
      ],
      allowedAttributes: {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'code': ['class'],
        'pre': ['class'],
        'blockquote': ['cite'],
        '*': ['id', 'class']
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {
        img: ['http', 'https', 'data']
      }
    });
  }

  // Calculate reading time
  calculateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  // Extract excerpt from content
  extractExcerpt(content, maxLength = 300) {
    // Remove HTML tags
    const textContent = content.replace(/<[^>]*>/g, '');
    
    if (textContent.length <= maxLength) {
      return textContent;
    }

    // Find the last complete sentence within maxLength
    const truncated = textContent.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.6) {
      return truncated.substring(0, lastSentence + 1);
    }

    // If no good sentence break, find last word
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.substring(0, lastSpace) + '...';
  }

  // Schedule blog publication
  async schedulePublication(blogId, scheduledAt) {
    const blog = await Blog.findByPk(blogId);
    if (!blog) {
      throw new Error('Blog not found');
    }

    if (new Date(scheduledAt) <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    await blog.update({
      status: 'scheduled',
      scheduledAt: new Date(scheduledAt)
    });

    return blog;
  }

  // Process scheduled publications
  async processScheduledPublications() {
    const now = new Date();
    
    const scheduledBlogs = await Blog.findAll({
      where: {
        status: 'scheduled',
        scheduledAt: {
          [Op.lte]: now
        }
      }
    });

    for (const blog of scheduledBlogs) {
      await blog.update({
        status: 'published',
        publishedAt: now,
        scheduledAt: null
      });
      
      console.log(`Published scheduled blog: ${blog.title}`);
    }

    return scheduledBlogs.length;
  }

  // Get related blogs
  async getRelatedBlogs(blogId, limit = 5) {
    const blog = await Blog.findByPk(blogId, {
      include: [
        { model: Tag, as: 'tags' },
        { model: BlogCategory, as: 'categories' }
      ]
    });

    if (!blog) {
      return [];
    }

    const tagIds = blog.tags.map(tag => tag.id);
    const categoryIds = blog.categories.map(cat => cat.id);

    // Find blogs with matching tags or categories
    const relatedBlogs = await Blog.findAll({
      where: {
        id: { [Op.ne]: blogId },
        status: 'published',
        language: blog.language
      },
      include: [
        {
          model: Tag,
          as: 'tags',
          where: tagIds.length > 0 ? { id: { [Op.in]: tagIds } } : undefined,
          required: false
        },
        {
          model: BlogCategory,
          as: 'categories',
          where: categoryIds.length > 0 ? { id: { [Op.in]: categoryIds } } : undefined,
          required: false
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username']
        }
      ],
      limit,
      order: [['publishedAt', 'DESC']]
    });

    return relatedBlogs;
  }

  // Get blog statistics
  async getBlogStatistics(blogId) {
    const blog = await Blog.findByPk(blogId);
    if (!blog) {
      throw new Error('Blog not found');
    }

    const commentCount = await Comment.count({
      where: { 
        blogId,
        status: 'approved'
      }
    });

    const approvedComments = await Comment.count({
      where: { 
        blogId,
        status: 'approved'
      }
    });

    const pendingComments = await Comment.count({
      where: { 
        blogId,
        status: 'pending'
      }
    });

    return {
      viewCount: blog.viewCount,
      commentCount,
      approvedComments,
      pendingComments,
      publishedAt: blog.publishedAt,
      lastUpdated: blog.updatedAt
    };
  }

  // Bulk update blog status
  async bulkUpdateStatus(blogIds, status, userId) {
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const updateData = { status };
    if (status === 'published') {
      updateData.publishedAt = new Date();
    }

    const [updatedCount] = await Blog.update(updateData, {
      where: { id: { [Op.in]: blogIds } }
    });

    // Log bulk update
    await AuditLog.create({
      userId,
      action: 'bulk_blog_update',
      resource: 'Blog',
      details: {
        blogIds,
        newStatus: status,
        count: updatedCount
      }
    });

    return updatedCount;
  }

  // Generate SEO metadata
  generateSEOMetadata(blog) {
    const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
    
    return {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt || this.extractExcerpt(blog.content),
      keywords: blog.metaKeywords || [],
      canonicalUrl: blog.canonicalUrl || `${baseUrl}/blog/${blog.slug}`,
      ogTitle: blog.metaTitle || blog.title,
      ogDescription: blog.metaDescription || blog.excerpt,
      ogImage: blog.featuredImage,
      ogUrl: `${baseUrl}/blog/${blog.slug}`,
      twitterCard: 'summary_large_image',
      twitterTitle: blog.metaTitle || blog.title,
      twitterDescription: blog.metaDescription || blog.excerpt,
      twitterImage: blog.featuredImage
    };
  }

  // Search blogs
  async searchBlogs(query, options = {}) {
    const {
      limit = 10,
      offset = 0,
      language = 'en',
      category,
      tags,
      dateFrom,
      dateTo
    } = options;

    const whereConditions = {
      status: 'published',
      language,
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { content: { [Op.iLike]: `%${query}%` } },
        { excerpt: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (dateFrom || dateTo) {
      whereConditions.publishedAt = {};
      if (dateFrom) whereConditions.publishedAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereConditions.publishedAt[Op.lte] = new Date(dateTo);
    }

    const include = [
      { model: User, as: 'author', attributes: ['id', 'username'] },
      { model: Tag, as: 'tags', attributes: ['id', 'name', 'slug'] },
      { model: BlogCategory, as: 'categories', attributes: ['id', 'name', 'slug'] }
    ];

    if (category) {
      include[2].where = { slug: category };
    }

    if (tags && tags.length > 0) {
      include[1].where = { slug: { [Op.in]: tags } };
    }

    const { count, rows: blogs } = await Blog.findAndCountAll({
      where: whereConditions,
      include,
      limit,
      offset,
      order: [
        // Relevance scoring could be added here
        ['publishedAt', 'DESC']
      ]
    });

    return {
      blogs,
      total: count,
      hasMore: offset + limit < count
    };
  }
}

module.exports = new BlogService();