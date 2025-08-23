/**
 * Project Controller
 * Handles all project-related API operations
 */

const { Project, Tag, Skill, User, MediaAsset } = require('../../models');
const { Op } = require('sequelize');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const { paginate, parseFilters } = require('../../utils/pagination');
const { clearCache } = require('../../services/cache');
const logger = require('../../utils/logger');

class ProjectController {
  /**
   * Get all projects with filtering and pagination
   */
  static async getAll(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type: projectType,
        featured,
        search,
        tags,
        skills,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      // Build where clause
      const where = {};
      
      // Only show published projects to public users
      if (!req.user || !req.user.hasRole(['admin', 'editor'])) {
        where.status = 'published';
        where.visibility = 'public';
      } else if (status) {
        where.status = status;
      }

      if (projectType) {
        where.projectType = projectType;
      }

      if (featured !== undefined) {
        where.featured = featured === 'true';
      }

      // Search functionality
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Build includes
      const include = [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }
        },
        {
          model: Skill,
          as: 'skills',
          through: { attributes: [] }
        }
      ];

      // Filter by tags
      if (tags) {
        const tagSlugs = tags.split(',');
        include.push({
          model: Tag,
          as: 'tagFilter',
          where: { slug: { [Op.in]: tagSlugs } },
          through: { attributes: [] },
          required: true
        });
      }

      // Filter by skills
      if (skills) {
        const skillSlugs = skills.split(',');
        include.push({
          model: Skill,
          as: 'skillFilter',
          where: { slug: { [Op.in]: skillSlugs } },
          through: { attributes: [] },
          required: true
        });
      }

      // Get projects with pagination
      const { data, pagination } = await paginate(Project, {
        where,
        include,
        order: [[sortBy, sortOrder.toUpperCase()]],
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data,
        pagination
      });

    } catch (error) {
      logger.error('Error getting projects:', error);
      next(error);
    }
  }

  /**
   * Get featured projects
   */
  static async getFeatured(req, res, next) {
    try {
      const { limit = 5 } = req.query;

      const projects = await Project.findAll({
        where: {
          status: 'published',
          visibility: 'public',
          featured: true
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
          },
          {
            model: Tag,
            as: 'tags',
            through: { attributes: [] }
          },
          {
            model: Skill,
            as: 'skills',
            through: { attributes: [] }
          }
        ],
        order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: projects
      });

    } catch (error) {
      logger.error('Error getting featured projects:', error);
      next(error);
    }
  }

  /**
   * Get project statistics
   */
  static async getStats(req, res, next) {
    try {
      const stats = {
        total: await Project.count(),
        published: await Project.count({ where: { status: 'published' } }),
        draft: await Project.count({ where: { status: 'draft' } }),
        featured: await Project.count({ where: { featured: true } }),
        byType: {},
        totalViews: 0
      };

      // Get counts by project type
      const typeStats = await Project.findAll({
        attributes: [
          'projectType',
          [Project.sequelize.fn('COUNT', Project.sequelize.col('id')), 'count']
        ],
        group: ['projectType'],
        raw: true
      });

      typeStats.forEach(stat => {
        stats.byType[stat.projectType] = parseInt(stat.count);
      });

      // Get total views
      const viewsResult = await Project.findOne({
        attributes: [
          [Project.sequelize.fn('SUM', Project.sequelize.col('viewCount')), 'totalViews']
        ],
        raw: true
      });

      stats.totalViews = parseInt(viewsResult.totalViews) || 0;

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting project stats:', error);
      next(error);
    }
  }

  /**
   * Get project by slug
   */
  static async getBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const isAuthorized = req.user && req.user.hasRole(['admin', 'editor']);

      const where = { slug };
      if (!isAuthorized) {
        where.status = 'published';
        where.visibility = 'public';
      }

      const project = await Project.findOne({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: Tag,
            as: 'tags',
            through: { attributes: [] }
          },
          {
            model: Skill,
            as: 'skills',
            through: { attributes: [] }
          },
          {
            model: MediaAsset,
            as: 'media',
            through: { attributes: [] }
          }
        ]
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Increment view count for public requests
      if (!req.user) {
        await project.incrementView();
      }

      res.json({
        success: true,
        data: project
      });

    } catch (error) {
      logger.error('Error getting project by slug:', error);
      next(error);
    }
  }

  /**
   * Create a new project
   */
  static async create(req, res, next) {
    try {
      const projectData = {
        ...req.body,
        userId: req.user.id
      };

      // Auto-generate slug if not provided
      if (!projectData.slug) {
        projectData.slug = projectData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
      }

      const project = await Project.create(projectData);

      // Associate tags and skills
      if (req.body.tags && req.body.tags.length > 0) {
        const tags = await Tag.findAll({
          where: { slug: { [Op.in]: req.body.tags } }
        });
        await project.setTags(tags);
      }

      if (req.body.skills && req.body.skills.length > 0) {
        const skills = await Skill.findAll({
          where: { slug: { [Op.in]: req.body.skills } }
        });
        await project.setSkills(skills);
      }

      // Clear relevant caches
      await clearCache('projects:*');

      // Reload with associations
      await project.reload({
        include: [
          { model: Tag, as: 'tags', through: { attributes: [] } },
          { model: Skill, as: 'skills', through: { attributes: [] } }
        ]
      });

      logger.info(`Project created: ${project.id} by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });

    } catch (error) {
      logger.error('Error creating project:', error);
      next(error);
    }
  }

  /**
   * Update a project
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const project = await Project.findByPk(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Check permissions
      if (!req.user.hasRole(['admin', 'editor']) && project.userId !== req.user.id) {
        throw new ValidationError('You can only update your own projects');
      }

      await project.update(updates);

      // Update associations if provided
      if (updates.tags !== undefined) {
        const tags = await Tag.findAll({
          where: { slug: { [Op.in]: updates.tags || [] } }
        });
        await project.setTags(tags);
      }

      if (updates.skills !== undefined) {
        const skills = await Skill.findAll({
          where: { slug: { [Op.in]: updates.skills || [] } }
        });
        await project.setSkills(skills);
      }

      // Clear caches
      await clearCache('projects:*');

      // Reload with associations
      await project.reload({
        include: [
          { model: Tag, as: 'tags', through: { attributes: [] } },
          { model: Skill, as: 'skills', through: { attributes: [] } }
        ]
      });

      logger.info(`Project updated: ${id} by user ${req.user.id}`);

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully'
      });

    } catch (error) {
      logger.error('Error updating project:', error);
      next(error);
    }
  }

  /**
   * Delete a project
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Check permissions
      if (!req.user.hasRole(['admin', 'editor']) && project.userId !== req.user.id) {
        throw new ValidationError('You can only delete your own projects');
      }

      await project.destroy();

      // Clear caches
      await clearCache('projects:*');

      logger.info(`Project deleted: ${id} by user ${req.user.id}`);

      res.status(204).send();

    } catch (error) {
      logger.error('Error deleting project:', error);
      next(error);
    }
  }

  /**
   * Publish a project
   */
  static async publish(req, res, next) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Check permissions
      if (!req.user.hasRole(['admin', 'editor']) && project.userId !== req.user.id) {
        throw new ValidationError('You can only publish your own projects');
      }

      await project.publish();
      await clearCache('projects:*');

      logger.info(`Project published: ${id} by user ${req.user.id}`);

      res.json({
        success: true,
        data: project,
        message: 'Project published successfully'
      });

    } catch (error) {
      logger.error('Error publishing project:', error);
      next(error);
    }
  }

  /**
   * Unpublish a project
   */
  static async unpublish(req, res, next) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Check permissions
      if (!req.user.hasRole(['admin', 'editor']) && project.userId !== req.user.id) {
        throw new ValidationError('You can only unpublish your own projects');
      }

      await project.unpublish();
      await clearCache('projects:*');

      logger.info(`Project unpublished: ${id} by user ${req.user.id}`);

      res.json({
        success: true,
        data: project,
        message: 'Project unpublished successfully'
      });

    } catch (error) {
      logger.error('Error unpublishing project:', error);
      next(error);
    }
  }

  /**
   * Feature a project
   */
  static async feature(req, res, next) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await project.update({ featured: true });
      await clearCache('projects:*');

      logger.info(`Project featured: ${id} by user ${req.user.id}`);

      res.json({
        success: true,
        data: project,
        message: 'Project featured successfully'
      });

    } catch (error) {
      logger.error('Error featuring project:', error);
      next(error);
    }
  }

  /**
   * Unfeature a project
   */
  static async unfeature(req, res, next) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      await project.update({ featured: false });
      await clearCache('projects:*');

      logger.info(`Project unfeatured: ${id} by user ${req.user.id}`);

      res.json({
        success: true,
        data: project,
        message: 'Project unfeatured successfully'
      });

    } catch (error) {
      logger.error('Error unfeaturing project:', error);
      next(error);
    }
  }

  /**
   * Clone a project
   */
  static async clone(req, res, next) {
    try {
      const { id } = req.params;

      const originalProject = await Project.findByPk(id, {
        include: [
          { model: Tag, as: 'tags', through: { attributes: [] } },
          { model: Skill, as: 'skills', through: { attributes: [] } }
        ]
      });

      if (!originalProject) {
        throw new NotFoundError('Project not found');
      }

      // Clone project data
      const clonedData = {
        ...originalProject.toJSON(),
        id: undefined,
        slug: `${originalProject.slug}-copy-${Date.now()}`,
        title: `${originalProject.title} (Copy)`,
        status: 'draft',
        featured: false,
        viewCount: 0,
        userId: req.user.id,
        createdAt: undefined,
        updatedAt: undefined
      };

      const clonedProject = await Project.create(clonedData);

      // Clone associations
      if (originalProject.tags && originalProject.tags.length > 0) {
        await clonedProject.setTags(originalProject.tags);
      }

      if (originalProject.skills && originalProject.skills.length > 0) {
        await clonedProject.setSkills(originalProject.skills);
      }

      // Reload with associations
      await clonedProject.reload({
        include: [
          { model: Tag, as: 'tags', through: { attributes: [] } },
          { model: Skill, as: 'skills', through: { attributes: [] } }
        ]
      });

      logger.info(`Project cloned: ${id} -> ${clonedProject.id} by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        data: clonedProject,
        message: 'Project cloned successfully'
      });

    } catch (error) {
      logger.error('Error cloning project:', error);
      next(error);
    }
  }

  /**
   * Increment project view count
   */
  static async incrementView(req, res, next) {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      if (project.status !== 'published' || project.visibility !== 'public') {
        throw new NotFoundError('Project not found');
      }

      await project.incrementView();

      res.json({
        success: true,
        data: { viewCount: project.viewCount },
        message: 'View count incremented'
      });

    } catch (error) {
      logger.error('Error incrementing view count:', error);
      next(error);
    }
  }
}

module.exports = ProjectController;