/**
 * Admin API Routes
 * Protected endpoints for admin operations
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { 
  Project, 
  User, 
  Tag, 
  Skill, 
  MediaAsset, 
  AuditLog 
} = require('../../../models');
const { 
  authenticateToken, 
  requireAdmin, 
  requireRole 
} = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);

// Validation helpers
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route GET /api/v1/admin/dashboard
 * @desc Get admin dashboard data
 * @access Admin
 */
router.get('/dashboard', requireAdmin(), async (req, res) => {
  try {
    const [
      totalProjects,
      publishedProjects,
      draftProjects,
      featuredProjects,
      totalUsers,
      activeUsers,
      totalMediaAssets,
      totalTags,
      totalSkills,
      recentUsers,
      recentProjects,
      systemStats
    ] = await Promise.all([
      Project.count(),
      Project.count({ where: { status: 'published' } }),
      Project.count({ where: { status: 'draft' } }),
      Project.count({ where: { featured: true } }),
      User.count(),
      User.count({ where: { isActive: true } }),
      MediaAsset.count(),
      Tag.count(),
      Skill.count(),
      User.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt']
      }),
      Project.findAll({
        limit: 5,
        order: [['updatedAt', 'DESC']],
        attributes: ['id', 'title', 'status', 'featured', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['firstName', 'lastName']
          }
        ]
      }),
      {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        cpuUsage: process.cpuUsage()
      }
    ]);

    const dashboardData = {
      overview: {
        projects: {
          total: totalProjects,
          published: publishedProjects,
          draft: draftProjects,
          featured: featuredProjects
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        content: {
          mediaAssets: totalMediaAssets,
          tags: totalTags,
          skills: totalSkills
        }
      },
      recent: {
        users: recentUsers.map(user => ({
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        })),
        projects: recentProjects.map(project => ({
          id: project.id,
          title: project.title,
          status: project.status,
          featured: project.featured,
          author: project.author ? `${project.author.firstName || ''} ${project.author.lastName || ''}`.trim() : 'Unknown',
          updatedAt: project.updatedAt
        }))
      },
      system: {
        uptime: Math.floor(systemStats.uptime),
        memoryUsage: {
          used: Math.round(systemStats.memory.heapUsed / 1024 / 1024),
          total: Math.round(systemStats.memory.heapTotal / 1024 / 1024),
          percentage: Math.round((systemStats.memory.heapUsed / systemStats.memory.heapTotal) * 100)
        },
        environment: {
          nodeVersion: systemStats.nodeVersion,
          platform: systemStats.platform
        }
      },
      timestamp: new Date().toISOString()
    };

    logger.info('Admin dashboard accessed', {
      adminId: req.user.id,
      adminEmail: req.user.email
    });

    res.json(dashboardData);

  } catch (error) {
    logger.error('Failed to get admin dashboard data', {
      error: error.message,
      stack: error.stack,
      adminId: req.user.id
    });

    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      code: 'DASHBOARD_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/admin/projects
 * @desc Get all projects for admin management
 * @access Admin
 */
router.get('/projects',
  requireRole(['admin', 'editor']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'published', 'archived']),
    query('featured').optional().isBoolean(),
    query('search').optional().isString().isLength({ max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        featured,
        search,
        sortBy = 'updatedAt',
        sortOrder = 'DESC'
      } = req.query;

      const where = {};
      const offset = (page - 1) * limit;

      // Apply filters
      if (status) where.status = status;
      if (featured !== undefined) where.featured = featured === 'true';
      
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: projects } = await Project.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Tag,
            through: { attributes: [] },
            attributes: ['id', 'name', 'color']
          },
          {
            model: Skill,
            through: { attributes: [] },
            attributes: ['id', 'name', 'category']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true
      });

      const transformedProjects = projects.map(project => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        description: project.description,
        shortDescription: project.shortDescription,
        status: project.status,
        featured: project.featured,
        isPublic: project.isPublic,
        viewCount: project.viewCount,
        author: project.author ? {
          id: project.author.id,
          name: `${project.author.firstName || ''} ${project.author.lastName || ''}`.trim(),
          email: project.author.email
        } : null,
        tags: project.Tags?.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color
        })) || [],
        skills: project.Skills?.map(skill => ({
          id: skill.id,
          name: skill.name,
          category: skill.category
        })) || [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));

      res.json({
        projects: transformedProjects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        },
        stats: {
          total: count,
          published: await Project.count({ where: { status: 'published' } }),
          draft: await Project.count({ where: { status: 'draft' } }),
          featured: await Project.count({ where: { featured: true } })
        }
      });

    } catch (error) {
      logger.error('Failed to get admin projects', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id
      });

      res.status(500).json({
        error: 'Failed to retrieve projects',
        code: 'ADMIN_PROJECTS_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/v1/admin/projects
 * @desc Create new project
 * @access Admin/Editor
 */
router.post('/projects',
  requireRole(['admin', 'editor']),
  [
    body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be under 255 characters'),
    body('slug').optional().trim().isSlug().withMessage('Slug must be URL-friendly'),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('shortDescription').optional().trim().isLength({ max: 500 }),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('featured').optional().isBoolean(),
    body('isPublic').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('skills').optional().isArray(),
    body('imageUrl').optional().isURL(),
    body('demoUrl').optional().isURL(),
    body('githubUrl').optional().isURL()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        title,
        slug,
        description,
        shortDescription,
        content,
        status = 'draft',
        featured = false,
        isPublic = true,
        imageUrl,
        thumbnailUrl,
        demoUrl,
        githubUrl,
        documentationUrl,
        tags = [],
        skills = [],
        ...additionalData
      } = req.body;

      // Generate slug if not provided
      const finalSlug = slug || title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);

      // Check if slug is unique
      const existingProject = await Project.findOne({ where: { slug: finalSlug } });
      if (existingProject) {
        return res.status(400).json({
          error: 'A project with this slug already exists',
          code: 'SLUG_EXISTS'
        });
      }

      const project = await Project.create({
        title,
        slug: finalSlug,
        description,
        shortDescription,
        content,
        status,
        featured,
        isPublic,
        imageUrl,
        thumbnailUrl,
        demoUrl,
        githubUrl,
        documentationUrl,
        authorId: req.user.id,
        ...additionalData
      });

      // Associate tags
      if (tags.length > 0) {
        const tagInstances = await Promise.all(
          tags.map(async (tagName) => {
            const [tag] = await Tag.findOrCreate({
              where: { name: tagName.trim() },
              defaults: { 
                name: tagName.trim(),
                slug: tagName.trim().toLowerCase().replace(/\s+/g, '-')
              }
            });
            return tag;
          })
        );
        await project.setTags(tagInstances);
      }

      // Associate skills
      if (skills.length > 0) {
        const skillInstances = await Promise.all(
          skills.map(async (skillData) => {
            let skillName = typeof skillData === 'string' ? skillData : skillData.name;
            const [skill] = await Skill.findOrCreate({
              where: { name: skillName.trim() },
              defaults: {
                name: skillName.trim(),
                category: typeof skillData === 'object' ? skillData.category : 'development'
              }
            });
            return skill;
          })
        );
        await project.setSkills(skillInstances);
      }

      // Fetch complete project with associations
      const createdProject = await Project.findByPk(project.id, {
        include: [
          { model: Tag, through: { attributes: [] } },
          { model: Skill, through: { attributes: [] } },
          { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      logger.info('Project created', {
        projectId: project.id,
        title: project.title,
        adminId: req.user.id
      });

      res.status(201).json({
        message: 'Project created successfully',
        project: createdProject
      });

    } catch (error) {
      logger.error('Failed to create project', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        title: req.body.title
      });

      res.status(500).json({
        error: 'Failed to create project',
        code: 'PROJECT_CREATE_ERROR'
      });
    }
  }
);

/**
 * @route PUT /api/v1/admin/projects/:id
 * @desc Update project
 * @access Admin/Editor
 */
router.put('/projects/:id',
  requireRole(['admin', 'editor']),
  [
    param('id').isUUID().withMessage('Valid project ID required'),
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('slug').optional().trim().isSlug(),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('shortDescription').optional().trim().isLength({ max: 500 }),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('featured').optional().isBoolean(),
    body('isPublic').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('skills').optional().isArray(),
    body('imageUrl').optional().isURL(),
    body('demoUrl').optional().isURL(),
    body('githubUrl').optional().isURL()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      // Check if slug is unique (if being updated)
      if (updateData.slug && updateData.slug !== project.slug) {
        const existingProject = await Project.findOne({
          where: { slug: updateData.slug, id: { [Op.ne]: id } }
        });
        if (existingProject) {
          return res.status(400).json({
            error: 'A project with this slug already exists',
            code: 'SLUG_EXISTS'
          });
        }
      }

      // Update project
      await project.update(updateData);

      // Update tags if provided
      if (updateData.tags) {
        const tagInstances = await Promise.all(
          updateData.tags.map(async (tagName) => {
            const [tag] = await Tag.findOrCreate({
              where: { name: tagName.trim() },
              defaults: {
                name: tagName.trim(),
                slug: tagName.trim().toLowerCase().replace(/\s+/g, '-')
              }
            });
            return tag;
          })
        );
        await project.setTags(tagInstances);
      }

      // Update skills if provided
      if (updateData.skills) {
        const skillInstances = await Promise.all(
          updateData.skills.map(async (skillData) => {
            let skillName = typeof skillData === 'string' ? skillData : skillData.name;
            const [skill] = await Skill.findOrCreate({
              where: { name: skillName.trim() },
              defaults: {
                name: skillName.trim(),
                category: typeof skillData === 'object' ? skillData.category : 'development'
              }
            });
            return skill;
          })
        );
        await project.setSkills(skillInstances);
      }

      // Fetch updated project with associations
      const updatedProject = await Project.findByPk(id, {
        include: [
          { model: Tag, through: { attributes: [] } },
          { model: Skill, through: { attributes: [] } },
          { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });

      logger.info('Project updated', {
        projectId: id,
        title: project.title,
        adminId: req.user.id,
        changes: Object.keys(updateData)
      });

      res.json({
        message: 'Project updated successfully',
        project: updatedProject
      });

    } catch (error) {
      logger.error('Failed to update project', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        adminId: req.user.id
      });

      res.status(500).json({
        error: 'Failed to update project',
        code: 'PROJECT_UPDATE_ERROR'
      });
    }
  }
);

/**
 * @route DELETE /api/v1/admin/projects/:id
 * @desc Delete project
 * @access Admin
 */
router.delete('/projects/:id',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid project ID required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      // Soft delete (if model supports it) or hard delete
      await project.destroy();

      logger.info('Project deleted', {
        projectId: id,
        title: project.title,
        adminId: req.user.id
      });

      res.json({
        message: 'Project deleted successfully'
      });

    } catch (error) {
      logger.error('Failed to delete project', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        adminId: req.user.id
      });

      res.status(500).json({
        error: 'Failed to delete project',
        code: 'PROJECT_DELETE_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/admin/users
 * @desc Get all users for admin management
 * @access Admin
 */
router.get('/users',
  requireAdmin(),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['viewer', 'author', 'editor', 'admin']),
    query('status').optional().isIn(['active', 'inactive', 'locked']),
    query('search').optional().isString().isLength({ max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const where = {};
      const offset = (page - 1) * limit;

      // Apply filters
      if (role) where.role = role;
      
      if (status === 'active') {
        where.isActive = true;
        where.lockoutUntil = { [Op.or]: [null, { [Op.lt]: new Date() }] };
      } else if (status === 'inactive') {
        where.isActive = false;
      } else if (status === 'locked') {
        where.lockoutUntil = { [Op.gt]: new Date() };
      }

      if (search) {
        where[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: users } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]]
      });

      const transformedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        loginAttempts: user.loginAttempts,
        lockoutUntil: user.lockoutUntil,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json({
        users: transformedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        },
        stats: {
          total: count,
          active: await User.count({ where: { isActive: true } }),
          admins: await User.count({ where: { role: 'admin' } }),
          locked: await User.count({ where: { lockoutUntil: { [Op.gt]: new Date() } } })
        }
      });

    } catch (error) {
      logger.error('Failed to get admin users', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id
      });

      res.status(500).json({
        error: 'Failed to retrieve users',
        code: 'ADMIN_USERS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/admin/analytics
 * @desc Get analytics data
 * @access Admin
 */
router.get('/analytics',
  requireAdmin(),
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    query('metric').optional().isIn(['views', 'users', 'projects', 'all'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { period = '30d', metric = 'all' } = req.query;

      // Calculate date range
      const now = new Date();
      const periodDays = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };

      const startDate = new Date(now.getTime() - (periodDays[period] * 24 * 60 * 60 * 1000));

      const analytics = {
        period,
        startDate,
        endDate: now,
        metrics: {}
      };

      // Project metrics
      if (metric === 'all' || metric === 'projects') {
        const [totalProjects, publishedProjects, featuredProjects, recentProjects] = await Promise.all([
          Project.count(),
          Project.count({ where: { status: 'published' } }),
          Project.count({ where: { featured: true, status: 'published' } }),
          Project.count({
            where: {
              createdAt: { [Op.gte]: startDate }
            }
          })
        ]);

        analytics.metrics.projects = {
          total: totalProjects,
          published: publishedProjects,
          featured: featuredProjects,
          created: recentProjects,
          publishRate: totalProjects > 0 ? Math.round((publishedProjects / totalProjects) * 100) : 0
        };
      }

      // User metrics
      if (metric === 'all' || metric === 'users') {
        const [totalUsers, activeUsers, newUsers, adminUsers] = await Promise.all([
          User.count(),
          User.count({ where: { isActive: true } }),
          User.count({
            where: {
              createdAt: { [Op.gte]: startDate }
            }
          }),
          User.count({ where: { role: 'admin' } })
        ]);

        analytics.metrics.users = {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          admins: adminUsers,
          activeRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
        };
      }

      // Content metrics
      if (metric === 'all') {
        const [totalTags, totalSkills, totalMediaAssets] = await Promise.all([
          Tag.count(),
          Skill.count(),
          MediaAsset.count()
        ]);

        analytics.metrics.content = {
          tags: totalTags,
          skills: totalSkills,
          mediaAssets: totalMediaAssets
        };
      }

      res.json(analytics);

    } catch (error) {
      logger.error('Failed to get analytics data', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id
      });

      res.status(500).json({
        error: 'Failed to retrieve analytics data',
        code: 'ANALYTICS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/admin/audit-logs
 * @desc Get audit logs
 * @access Admin
 */
router.get('/audit-logs',
  requireAdmin(),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('eventType').optional().isString(),
    query('userId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        eventType,
        userId,
        startDate,
        endDate
      } = req.query;

      const where = {};
      const offset = (page - 1) * limit;

      if (eventType) where.eventType = eventType;
      if (userId) where.userId = userId;
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp[Op.gte] = new Date(startDate);
        if (endDate) where.timestamp[Op.lte] = new Date(endDate);
      }

      const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['timestamp', 'DESC']]
      });

      res.json({
        auditLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Failed to get audit logs', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id
      });

      res.status(500).json({
        error: 'Failed to retrieve audit logs',
        code: 'AUDIT_LOGS_ERROR'
      });
    }
  }
);

module.exports = router;