const { Project, User, Tag, Skill, MediaAsset } = require('../../models');
const { Op, fn, col } = require('sequelize');
const slugify = require('slugify');

class PortfolioController {
  // Get all projects with filtering and pagination
  async getAllProjects(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'published',
        featured,
        technology,
        category,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Status filter
      if (status) {
        where.status = status;
      }

      // Featured filter
      if (featured !== undefined) {
        where.isFeatured = featured === 'true';
      }

      // Category filter
      if (category) {
        where.category = category;
      }

      // Search functionality
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { shortDescription: { [Op.iLike]: `%${search}%` } }
        ];
      }

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
          model: Skill,
          as: 'skills',
          attributes: ['id', 'name', 'category', 'proficiency']
        },
        {
          model: MediaAsset,
          as: 'media',
          attributes: ['id', 'filename', 'url', 'altText', 'category']
        }
      ];

      // Technology filter
      if (technology) {
        include[2].where = { slug: technology };
      }

      const { count, rows: projects } = await Project.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder]],
        distinct: true
      });

      res.json({
        projects,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  // Get single project by slug
  async getProjectBySlug(req, res) {
    try {
      const { slug } = req.params;

      const project = await Project.findOne({
        where: { slug, status: 'published' },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'email']
          },
          {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name', 'slug', 'color']
          },
          {
            model: Skill,
            as: 'skills',
            attributes: ['id', 'name', 'category', 'proficiency', 'icon']
          },
          {
            model: MediaAsset,
            as: 'media',
            attributes: ['id', 'filename', 'url', 'altText', 'category', 'width', 'height']
          }
        ]
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Increment view count
      await project.increment('viewCount');

      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  // Create new project
  async createProject(req, res) {
    try {
      const {
        title,
        shortDescription,
        description,
        category,
        status = 'draft',
        isFeatured = false,
        projectUrl,
        githubUrl,
        demoUrl,
        startDate,
        endDate,
        clientName,
        teamSize,
        myRole,
        challenges,
        solutions,
        outcomes,
        metaTitle,
        metaDescription,
        metaKeywords = [],
        tagIds = [],
        skillIds = [],
        mediaIds = []
      } = req.body;

      // Generate slug
      const slug = slugify(title, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });

      // Check slug uniqueness
      const existingProject = await Project.findOne({ where: { slug } });
      if (existingProject) {
        return res.status(400).json({ error: 'A project with this title already exists' });
      }

      const projectData = {
        title,
        slug,
        shortDescription,
        description,
        category,
        status,
        isFeatured,
        projectUrl,
        githubUrl,
        demoUrl,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        clientName,
        teamSize,
        myRole,
        challenges,
        solutions,
        outcomes,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || shortDescription,
        metaKeywords,
        authorId: req.user.id
      };

      // Set publish date if status is published
      if (status === 'published') {
        projectData.publishedAt = new Date();
      }

      const project = await Project.create(projectData);

      // Associate tags, skills, and media
      if (tagIds.length > 0) {
        await project.setTags(tagIds);
      }
      if (skillIds.length > 0) {
        await project.setSkills(skillIds);
      }
      if (mediaIds.length > 0) {
        await project.setMedia(mediaIds);
      }

      const completeProject = await Project.findByPk(project.id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] },
          { model: Tag, as: 'tags' },
          { model: Skill, as: 'skills' },
          { model: MediaAsset, as: 'media' }
        ]
      });

      res.status(201).json(completeProject);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  // Update project
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permissions
      if (project.authorId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to update this project' });
      }

      // Handle slug updates
      if (updateData.title && updateData.title !== project.title) {
        const newSlug = slugify(updateData.title, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
        
        const existingSlug = await Project.findOne({ 
          where: { slug: newSlug, id: { [Op.ne]: id } } 
        });
        if (existingSlug) {
          return res.status(400).json({ error: 'A project with this title already exists' });
        }
        updateData.slug = newSlug;
      }

      // Handle status changes
      if (updateData.status === 'published' && project.status !== 'published') {
        updateData.publishedAt = new Date();
      }

      // Handle date fields
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      await project.update(updateData);

      // Update associations if provided
      if (updateData.tagIds) {
        await project.setTags(updateData.tagIds);
      }
      if (updateData.skillIds) {
        await project.setSkills(updateData.skillIds);
      }
      if (updateData.mediaIds) {
        await project.setMedia(updateData.mediaIds);
      }

      const updatedProject = await Project.findByPk(id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username'] },
          { model: Tag, as: 'tags' },
          { model: Skill, as: 'skills' },
          { model: MediaAsset, as: 'media' }
        ]
      });

      res.json(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  // Delete project
  async deleteProject(req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permissions
      if (project.authorId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to delete this project' });
      }

      await project.destroy();
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  // Get project statistics
  async getProjectStats(req, res) {
    try {
      const stats = await Project.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status']
      });

      const categoryStats = await Project.findAll({
        attributes: [
          'category',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['category']
      });

      const totalViews = await Project.sum('viewCount');
      const totalProjects = await Project.count();
      const featuredCount = await Project.count({ where: { isFeatured: true } });

      const formattedStats = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.dataValues.count);
        return acc;
      }, {});

      const formattedCategoryStats = categoryStats.reduce((acc, stat) => {
        acc[stat.category] = parseInt(stat.dataValues.count);
        return acc;
      }, {});

      res.json({
        statusCounts: formattedStats,
        categoryCounts: formattedCategoryStats,
        totalProjects,
        featuredCount,
        totalViews: totalViews || 0
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({ error: 'Failed to fetch project statistics' });
    }
  }

  // Toggle featured status
  async toggleFeatured(req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check permissions
      if (project.authorId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await project.update({ isFeatured: !project.isFeatured });
      res.json({ message: 'Featured status updated', isFeatured: project.isFeatured });
    } catch (error) {
      console.error('Error updating featured status:', error);
      res.status(500).json({ error: 'Failed to update featured status' });
    }
  }

  // Get featured projects
  async getFeaturedProjects(req, res) {
    try {
      const { limit = 6 } = req.query;

      const projects = await Project.findAll({
        where: { 
          status: 'published',
          isFeatured: true
        },
        include: [
          {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name', 'slug', 'color']
          },
          {
            model: Skill,
            as: 'skills',
            attributes: ['id', 'name', 'category', 'icon']
          },
          {
            model: MediaAsset,
            as: 'media',
            attributes: ['id', 'filename', 'url', 'altText'],
            limit: 1
          }
        ],
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      res.json(projects);
    } catch (error) {
      console.error('Error fetching featured projects:', error);
      res.status(500).json({ error: 'Failed to fetch featured projects' });
    }
  }
}

module.exports = new PortfolioController();