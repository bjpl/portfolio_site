const { Blog, BlogCategory, Comment, BlogVersion, User, Tag, MediaAsset } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const { marked } = require('marked');
const slugify = require('slugify');
const sanitizeHtml = require('sanitize-html');

class BlogController {
  // Get all blogs with filtering, sorting, and pagination
  async getAllBlogs(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'published',
        category,
        tag,
        search,
        language = 'en',
        sortBy = 'publishedAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { language };
      
      // Status filter
      if (status) {
        where.status = status;
      }

      // Search functionality
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } },
          { excerpt: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Build includes
      const include = [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email']
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

      // Category filter
      if (category) {
        include[2].where = { slug: category };
      }

      // Tag filter
      if (tag) {
        include[1].where = { slug: tag };
      }

      const { count, rows: blogs } = await Blog.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder]],
        distinct: true
      });

      res.json({
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching blogs:', error);
      res.status(500).json({ error: 'Failed to fetch blogs' });
    }
  }

  // Get single blog by slug
  async getBlogBySlug(req, res) {
    try {
      const { slug } = req.params;
      const { includeComments = false } = req.query;

      const include = [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email']
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

      if (includeComments === 'true') {
        include.push({
          model: Comment,
          as: 'comments',
          where: { status: 'approved' },
          required: false,
          include: [
            {
              model: Comment,
              as: 'replies',
              where: { status: 'approved' },
              required: false
            }
          ]
        });
      }

      const blog = await Blog.findOne({
        where: { slug, status: 'published' },
        include
      });

      if (!blog) {
        return res.status(404).json({ error: 'Blog not found' });
      }

      // Increment view count
      await blog.increment('viewCount');

      res.json(blog);
    } catch (error) {
      console.error('Error fetching blog:', error);
      res.status(500).json({ error: 'Failed to fetch blog' });
    }
  }

  // Create new blog
  async createBlog(req, res) {
    try {
      const {
        title,
        markdown,
        excerpt,
        status = 'draft',
        featuredImage,
        metaTitle,
        metaDescription,
        metaKeywords = [],
        canonicalUrl,
        commentsEnabled = true,
        language = 'en',
        categoryIds = [],
        tagIds = [],
        scheduledAt
      } = req.body;

      // Generate slug
      const slug = slugify(title, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });

      // Check slug uniqueness
      const existingBlog = await Blog.findOne({ where: { slug } });
      if (existingBlog) {
        return res.status(400).json({ error: 'A blog with this title already exists' });
      }

      // Convert markdown to HTML
      const content = marked(markdown);
      const sanitizedContent = sanitizeHtml(content);

      // Calculate read time (average 200 words per minute)
      const wordCount = markdown.split(/\s+/).length;
      const readTime = Math.ceil(wordCount / 200);

      const blogData = {
        title,
        slug,
        content: sanitizedContent,
        markdown,
        excerpt,
        status,
        featuredImage,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt,
        metaKeywords,
        canonicalUrl,
        readTime,
        commentsEnabled,
        language,
        authorId: req.user.id
      };

      // Set publish date if status is published
      if (status === 'published') {
        blogData.publishedAt = new Date();
      } else if (status === 'scheduled' && scheduledAt) {
        blogData.scheduledAt = new Date(scheduledAt);
      }

      const blog = await Blog.create(blogData);

      // Associate categories and tags
      if (categoryIds.length > 0) {
        await blog.setCategories(categoryIds);
      }
      if (tagIds.length > 0) {
        await blog.setTags(tagIds);
      }

      // Create initial version
      await BlogVersion.create({
        version: 1,
        title,
        content: sanitizedContent,
        markdown,
        changeNote: 'Initial version',
        blogId: blog.id,
        createdBy: req.user.id
      });

      const completeBlog = await Blog.findByPk(blog.id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] },
          { model: Tag, as: 'tags' },
          { model: BlogCategory, as: 'categories' }
        ]
      });

      res.status(201).json(completeBlog);
    } catch (error) {
      console.error('Error creating blog:', error);
      res.status(500).json({ error: 'Failed to create blog' });
    }
  }

  // Update blog
  async updateBlog(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const blog = await Blog.findByPk(id);
      if (!blog) {
        return res.status(404).json({ error: 'Blog not found' });
      }

      // Check permissions
      if (blog.authorId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to update this blog' });
      }

      // Handle slug updates
      if (updateData.title && updateData.title !== blog.title) {
        const newSlug = slugify(updateData.title, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
        
        const existingSlug = await Blog.findOne({ 
          where: { slug: newSlug, id: { [Op.ne]: id } } 
        });
        if (existingSlug) {
          return res.status(400).json({ error: 'A blog with this title already exists' });
        }
        updateData.slug = newSlug;
      }

      // Convert markdown to HTML if markdown is updated
      if (updateData.markdown) {
        updateData.content = sanitizeHtml(marked(updateData.markdown));
        
        // Recalculate read time
        const wordCount = updateData.markdown.split(/\s+/).length;
        updateData.readTime = Math.ceil(wordCount / 200);
      }

      // Handle status changes
      if (updateData.status === 'published' && blog.status !== 'published') {
        updateData.publishedAt = new Date();
      }

      // Create new version if content changed
      let versionCreated = false;
      if (updateData.title || updateData.markdown) {
        const lastVersion = await BlogVersion.findOne({
          where: { blogId: id },
          order: [['version', 'DESC']]
        });

        await BlogVersion.create({
          version: (lastVersion?.version || 0) + 1,
          title: updateData.title || blog.title,
          content: updateData.content || blog.content,
          markdown: updateData.markdown || blog.markdown,
          changeNote: updateData.changeNote || 'Content updated',
          blogId: id,
          createdBy: req.user.id
        });
        versionCreated = true;
      }

      await blog.update(updateData);

      // Update associations if provided
      if (updateData.categoryIds) {
        await blog.setCategories(updateData.categoryIds);
      }
      if (updateData.tagIds) {
        await blog.setTags(updateData.tagIds);
      }

      const updatedBlog = await Blog.findByPk(id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] },
          { model: Tag, as: 'tags' },
          { model: BlogCategory, as: 'categories' }
        ]
      });

      res.json({ blog: updatedBlog, versionCreated });
    } catch (error) {
      console.error('Error updating blog:', error);
      res.status(500).json({ error: 'Failed to update blog' });
    }
  }

  // Delete blog
  async deleteBlog(req, res) {
    try {
      const { id } = req.params;

      const blog = await Blog.findByPk(id);
      if (!blog) {
        return res.status(404).json({ error: 'Blog not found' });
      }

      // Check permissions
      if (blog.authorId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to delete this blog' });
      }

      await blog.destroy();
      res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
      console.error('Error deleting blog:', error);
      res.status(500).json({ error: 'Failed to delete blog' });
    }
  }

  // Get blog statistics
  async getBlogStats(req, res) {
    try {
      const { language = 'en' } = req.query;

      const stats = await Blog.findAll({
        where: { language },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });

      const totalViews = await Blog.sum('viewCount', { where: { language } });
      const totalBlogs = await Blog.count({ where: { language } });

      const formattedStats = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.dataValues.count);
        return acc;
      }, {});

      res.json({
        statusCounts: formattedStats,
        totalBlogs,
        totalViews: totalViews || 0
      });
    } catch (error) {
      console.error('Error fetching blog stats:', error);
      res.status(500).json({ error: 'Failed to fetch blog statistics' });
    }
  }

  // Get blog versions
  async getBlogVersions(req, res) {
    try {
      const { id } = req.params;

      const versions = await BlogVersion.findAll({
        where: { blogId: id },
        include: [
          { model: User, as: 'creator', attributes: ['id', 'username'] }
        ],
        order: [['version', 'DESC']]
      });

      res.json(versions);
    } catch (error) {
      console.error('Error fetching blog versions:', error);
      res.status(500).json({ error: 'Failed to fetch blog versions' });
    }
  }

  // Restore blog version
  async restoreBlogVersion(req, res) {
    try {
      const { id, versionId } = req.params;

      const blog = await Blog.findByPk(id);
      const version = await BlogVersion.findByPk(versionId);

      if (!blog || !version) {
        return res.status(404).json({ error: 'Blog or version not found' });
      }

      // Check permissions
      if (blog.authorId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await blog.update({
        title: version.title,
        content: version.content,
        markdown: version.markdown
      });

      res.json({ message: 'Version restored successfully' });
    } catch (error) {
      console.error('Error restoring version:', error);
      res.status(500).json({ error: 'Failed to restore version' });
    }
  }
}

module.exports = new BlogController();