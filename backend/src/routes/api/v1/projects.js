/**
 * Projects API Routes
 * Public endpoints for portfolio projects
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { Project, ProjectTag, ProjectSkill, Tag, Skill } = require('../../../models');
const { optionalAuth, requireAdmin, requireRole } = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Rate limiting for project endpoints
const projectsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests to projects API',
    code: 'PROJECTS_RATE_LIMIT'
  }
});

router.use(projectsRateLimit);

// Validation helpers
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'title', 'featured', 'status']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
];

const validateFilters = [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('technology').optional().isString().withMessage('Technology must be a string'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search query too long')
];

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
 * @route GET /api/v1/projects
 * @desc Get all public projects with filtering and pagination
 * @access Public
 */
router.get('/', 
  validatePagination,
  validateFilters,
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        category,
        technology,
        featured,
        status = 'published',
        search
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};
      const include = [
        {
          model: Tag,
          through: { attributes: [] },
          required: false
        },
        {
          model: Skill,
          through: { attributes: [] },
          required: false
        }
      ];

      // Apply filters based on authentication
      if (!req.user || req.user.role !== 'admin') {
        where.status = 'published';
        where.isPublic = true;
      } else if (status) {
        where.status = status;
      }

      // Category filter
      if (category) {
        include[0].where = { name: { [Op.iLike]: `%${category}%` } };
        include[0].required = true;
      }

      // Technology/Skill filter
      if (technology) {
        include[1].where = { name: { [Op.iLike]: `%${technology}%` } };
        include[1].required = true;
      }

      // Featured filter
      if (featured !== undefined) {
        where.featured = featured === 'true';
      }

      // Search functionality
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { shortDescription: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: projects } = await Project.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true
      });

      // Transform projects for public response
      const transformedProjects = projects.map(project => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        shortDescription: project.shortDescription,
        description: project.description,
        imageUrl: project.imageUrl,
        thumbnailUrl: project.thumbnailUrl,
        demoUrl: project.demoUrl,
        githubUrl: project.githubUrl,
        featured: project.featured,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        tags: project.Tags?.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color
        })) || [],
        skills: project.Skills?.map(skill => ({
          id: skill.id,
          name: skill.name,
          category: skill.category,
          proficiency: skill.ProjectSkill?.proficiency
        })) || []
      }));

      res.json({
        projects: transformedProjects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit),
          hasNext: page * limit < count,
          hasPrev: page > 1
        },
        filters: {
          category,
          technology,
          featured: featured !== undefined ? featured === 'true' : undefined,
          status: req.user?.role === 'admin' ? status : 'published',
          search
        },
        meta: {
          totalPublished: await Project.count({ where: { status: 'published', isPublic: true } }),
          totalFeatured: await Project.count({ where: { featured: true, status: 'published', isPublic: true } })
        }
      });

    } catch (error) {
      logger.error('Failed to get projects', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });

      res.status(500).json({
        error: 'Failed to retrieve projects',
        code: 'PROJECTS_FETCH_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/projects/featured
 * @desc Get featured projects
 * @access Public
 */
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const projects = await Project.findAll({
      where: {
        featured: true,
        status: 'published',
        isPublic: true
      },
      include: [
        {
          model: Tag,
          through: { attributes: [] },
          required: false
        },
        {
          model: Skill,
          through: { attributes: [] },
          required: false
        }
      ],
      limit,
      order: [['createdAt', 'DESC']]
    });

    const transformedProjects = projects.map(project => ({
      id: project.id,
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription,
      imageUrl: project.imageUrl,
      thumbnailUrl: project.thumbnailUrl,
      demoUrl: project.demoUrl,
      githubUrl: project.githubUrl,
      createdAt: project.createdAt,
      tags: project.Tags?.map(tag => ({
        name: tag.name,
        color: tag.color
      })) || [],
      skills: project.Skills?.map(skill => skill.name) || []
    }));

    res.json({
      projects: transformedProjects,
      count: transformedProjects.length
    });

  } catch (error) {
    logger.error('Failed to get featured projects', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve featured projects',
      code: 'FEATURED_PROJECTS_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/projects/:identifier
 * @desc Get single project by ID or slug
 * @access Public
 */
router.get('/:identifier',
  [
    param('identifier').notEmpty().withMessage('Project identifier is required')
  ],
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const { identifier } = req.params;
      
      // Check if identifier is UUID or slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      const where = isUUID ? { id: identifier } : { slug: identifier };

      // Add public filters if not admin
      if (!req.user || req.user.role !== 'admin') {
        where.status = 'published';
        where.isPublic = true;
      }

      const project = await Project.findOne({
        where,
        include: [
          {
            model: Tag,
            through: { attributes: [] },
            required: false
          },
          {
            model: Skill,
            through: { 
              attributes: ['proficiency'],
              as: 'ProjectSkill'
            },
            required: false
          }
        ]
      });

      if (!project) {
        return res.status(404).json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      // Increment view count (async, don't wait)
      project.increment('viewCount').catch(err => {
        logger.warn('Failed to increment view count', { projectId: project.id, error: err.message });
      });

      const transformedProject = {
        id: project.id,
        title: project.title,
        slug: project.slug,
        description: project.description,
        shortDescription: project.shortDescription,
        content: project.content,
        imageUrl: project.imageUrl,
        thumbnailUrl: project.thumbnailUrl,
        galleryUrls: project.galleryUrls,
        demoUrl: project.demoUrl,
        githubUrl: project.githubUrl,
        documentationUrl: project.documentationUrl,
        featured: project.featured,
        status: project.status,
        viewCount: project.viewCount,
        startDate: project.startDate,
        endDate: project.endDate,
        client: project.client,
        role: project.role,
        teamSize: project.teamSize,
        budget: project.budget,
        duration: project.duration,
        challenges: project.challenges,
        solutions: project.solutions,
        lessons: project.lessons,
        technologies: project.technologies,
        features: project.features,
        metrics: project.metrics,
        testimonials: project.testimonials,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        tags: project.Tags?.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
          description: tag.description
        })) || [],
        skills: project.Skills?.map(skill => ({
          id: skill.id,
          name: skill.name,
          category: skill.category,
          proficiency: skill.ProjectSkill?.proficiency || 'intermediate',
          icon: skill.icon,
          color: skill.color
        })) || []
      };

      res.json({
        project: transformedProject
      });

    } catch (error) {
      logger.error('Failed to get project', {
        error: error.message,
        stack: error.stack,
        identifier: req.params.identifier
      });

      res.status(500).json({
        error: 'Failed to retrieve project',
        code: 'PROJECT_FETCH_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/projects/:id/related
 * @desc Get related projects based on tags and skills
 * @access Public
 */
router.get('/:id/related',
  [
    param('id').isUUID().withMessage('Valid project ID required')
  ],
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 4;

      // Get the source project
      const sourceProject = await Project.findByPk(id, {
        include: [
          { model: Tag, through: { attributes: [] } },
          { model: Skill, through: { attributes: [] } }
        ]
      });

      if (!sourceProject) {
        return res.status(404).json({
          error: 'Source project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      // Get tag and skill IDs
      const tagIds = sourceProject.Tags?.map(tag => tag.id) || [];
      const skillIds = sourceProject.Skills?.map(skill => skill.id) || [];

      // Find related projects
      const relatedProjects = await Project.findAll({
        where: {
          id: { [Op.ne]: id }, // Exclude source project
          status: 'published',
          isPublic: true
        },
        include: [
          {
            model: Tag,
            through: { attributes: [] },
            where: tagIds.length > 0 ? { id: { [Op.in]: tagIds } } : undefined,
            required: false
          },
          {
            model: Skill,
            through: { attributes: [] },
            where: skillIds.length > 0 ? { id: { [Op.in]: skillIds } } : undefined,
            required: false
          }
        ],
        limit,
        order: [['createdAt', 'DESC']],
        distinct: true
      });

      const transformedProjects = relatedProjects.map(project => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        shortDescription: project.shortDescription,
        imageUrl: project.imageUrl,
        thumbnailUrl: project.thumbnailUrl,
        demoUrl: project.demoUrl,
        githubUrl: project.githubUrl,
        createdAt: project.createdAt,
        tags: project.Tags?.slice(0, 3).map(tag => tag.name) || [],
        skills: project.Skills?.slice(0, 5).map(skill => skill.name) || []
      }));

      res.json({
        relatedProjects: transformedProjects,
        count: transformedProjects.length
      });

    } catch (error) {
      logger.error('Failed to get related projects', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id
      });

      res.status(500).json({
        error: 'Failed to retrieve related projects',
        code: 'RELATED_PROJECTS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/projects/stats
 * @desc Get project statistics
 * @access Public
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const [
      totalProjects,
      featuredCount,
      categoriesCount,
      skillsCount,
      recentCount
    ] = await Promise.all([
      Project.count({ where: { status: 'published', isPublic: true } }),
      Project.count({ where: { featured: true, status: 'published', isPublic: true } }),
      Tag.count(),
      Skill.count(),
      Project.count({
        where: {
          status: 'published',
          isPublic: true,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    res.json({
      stats: {
        totalProjects,
        featuredCount,
        categoriesCount,
        skillsCount,
        recentCount
      }
    });

  } catch (error) {
    logger.error('Failed to get project stats', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve project statistics',
      code: 'PROJECT_STATS_ERROR'
    });
  }
});

module.exports = router;