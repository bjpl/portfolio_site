const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Portfolio = require('../../models/Portfolio');
const Project = require('../../models/Project');
const Experience = require('../../models/Experience');
const Education = require('../../models/Education');
const Skill = require('../../models/Skill');
const auth = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const cacheMiddleware = require('../../middleware/cache');
const { paginate } = require('../../middleware/pagination');
const searchService = require('../../services/searchService');
const logger = require('../../utils/logger');

const router = express.Router();

// Validation schemas
const createPortfolioValidation = [
  body('title').trim().notEmpty().isLength({ min: 1, max: 200 }),
  body('description').trim().notEmpty(),
  body('bio').optional().isString(),
  body('contact.email').optional().isEmail(),
  body('contact.phone').optional().isMobilePhone(),
  body('social.linkedin').optional().isURL(),
  body('social.github').optional().isURL(),
  body('social.twitter').optional().isURL(),
  body('theme.primaryColor').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  body('isPublic').optional().isBoolean()
];

const updatePortfolioValidation = [
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().notEmpty(),
  body('bio').optional().isString(),
  body('contact.email').optional().isEmail(),
  body('contact.phone').optional().isMobilePhone(),
  body('social.linkedin').optional().isURL(),
  body('social.github').optional().isURL(),
  body('social.twitter').optional().isURL(),
  body('theme.primaryColor').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  body('isPublic').optional().isBoolean()
];

/**
 * @swagger
 * /api/portfolios:
 *   get:
 *     summary: Get all public portfolios
 *     tags: [Portfolios]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of portfolios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 portfolios:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Portfolio'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', 
  cacheMiddleware(300), // 5 minutes
  paginate,
  async (req, res) => {
    try {
      const { page, limit, search, status } = req.query;
      
      const whereClause = { isPublic: true };
      if (status) {
        whereClause.status = status;
      }

      // Use search service if available
      if (search) {
        const searchResults = await searchService.search(search, {
          index: 'portfolios',
          from: (page - 1) * limit,
          size: limit,
          filters: whereClause
        });

        return res.json({
          portfolios: searchResults.hits,
          pagination: {
            page,
            limit,
            total: searchResults.total,
            totalPages: Math.ceil(searchResults.total / limit)
          }
        });
      }

      const { count, rows } = await Portfolio.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: 'projects',
            where: { isPublic: true },
            required: false,
            limit: 3,
            order: [['featured', 'DESC'], ['createdAt', 'DESC']]
          },
          {
            model: Skill,
            as: 'skills',
            through: { attributes: [] },
            limit: 10
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
        distinct: true
      });

      res.json({
        portfolios: rows.map(portfolio => portfolio.toPublicJSON()),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching portfolios:', error);
      res.status(500).json({
        error: 'Failed to fetch portfolios',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/portfolios/{id}:
 *   get:
 *     summary: Get portfolio by ID
 *     tags: [Portfolios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Portfolio details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PortfolioDetail'
 *       404:
 *         description: Portfolio not found
 */
router.get('/:id',
  param('id').isUUID(),
  cacheMiddleware(600), // 10 minutes
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const portfolio = await Portfolio.findByPk(req.params.id, {
        include: [
          {
            model: Project,
            as: 'projects',
            where: { isPublic: true },
            required: false,
            include: [
              {
                model: Skill,
                as: 'skills',
                through: { attributes: [] }
              }
            ],
            order: [['featured', 'DESC'], ['sortOrder', 'ASC'], ['createdAt', 'DESC']]
          },
          {
            model: Experience,
            as: 'experiences',
            where: { isPublic: true },
            required: false,
            include: [
              {
                model: Skill,
                as: 'skills',
                through: { attributes: [] }
              }
            ],
            order: [['current', 'DESC'], ['startDate', 'DESC']]
          },
          {
            model: Education,
            as: 'education',
            where: { isPublic: true },
            required: false,
            order: [['current', 'DESC'], ['startDate', 'DESC']]
          },
          {
            model: Skill,
            as: 'skills',
            through: { attributes: [] },
            where: { isActive: true },
            required: false,
            order: [['sortOrder', 'ASC'], ['name', 'ASC']]
          }
        ]
      });

      if (!portfolio || !portfolio.isPublic) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      // Group skills by category
      const skillsByCategory = {};
      if (portfolio.skills) {
        portfolio.skills.forEach(skill => {
          if (!skillsByCategory[skill.category]) {
            skillsByCategory[skill.category] = [];
          }
          skillsByCategory[skill.category].push(skill.toPublicJSON());
        });
      }

      res.json({
        ...portfolio.toPublicJSON(),
        projects: portfolio.projects?.map(project => ({
          ...project.toPublicJSON(),
          skills: project.skills?.map(skill => skill.toPublicJSON())
        })),
        experiences: portfolio.experiences?.map(experience => ({
          ...experience.toPublicJSON(),
          skills: experience.skills?.map(skill => skill.toPublicJSON()),
          duration: experience.getFormattedDuration()
        })),
        education: portfolio.education?.map(education => education.toPublicJSON()),
        skillsByCategory
      });
    } catch (error) {
      logger.error('Error fetching portfolio:', error);
      res.status(500).json({
        error: 'Failed to fetch portfolio',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/portfolios/{slug}:
 *   get:
 *     summary: Get portfolio by slug
 *     tags: [Portfolios]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio details
 *       404:
 *         description: Portfolio not found
 */
router.get('/slug/:slug',
  param('slug').isSlug(),
  cacheMiddleware(600),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const portfolio = await Portfolio.findOne({
        where: { 
          slug: req.params.slug,
          isPublic: true,
          status: 'published'
        },
        include: [
          {
            model: Project,
            as: 'projects',
            where: { isPublic: true },
            required: false,
            include: [
              {
                model: Skill,
                as: 'skills',
                through: { attributes: [] }
              }
            ],
            order: [['featured', 'DESC'], ['sortOrder', 'ASC']]
          },
          {
            model: Experience,
            as: 'experiences',
            where: { isPublic: true },
            required: false,
            include: [
              {
                model: Skill,
                as: 'skills',
                through: { attributes: [] }
              }
            ],
            order: [['current', 'DESC'], ['startDate', 'DESC']]
          },
          {
            model: Education,
            as: 'education',
            where: { isPublic: true },
            required: false,
            order: [['current', 'DESC'], ['startDate', 'DESC']]
          },
          {
            model: Skill,
            as: 'skills',
            through: { attributes: [] }
          }
        ]
      });

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      res.json({
        ...portfolio.toPublicJSON(),
        projects: portfolio.projects?.map(project => project.toPublicJSON()),
        experiences: portfolio.experiences?.map(experience => experience.toPublicJSON()),
        education: portfolio.education?.map(education => education.toPublicJSON()),
        skills: portfolio.skills?.map(skill => skill.toPublicJSON())
      });
    } catch (error) {
      logger.error('Error fetching portfolio by slug:', error);
      res.status(500).json({
        error: 'Failed to fetch portfolio',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/portfolios:
 *   post:
 *     summary: Create a new portfolio
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePortfolio'
 *     responses:
 *       201:
 *         description: Portfolio created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',
  auth,
  rbac(['author', 'editor', 'admin']),
  createPortfolioValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user already has a portfolio
      const existingPortfolio = await Portfolio.findOne({
        where: { userId: req.user.id }
      });

      if (existingPortfolio && req.user.role !== 'admin') {
        return res.status(400).json({
          error: 'User already has a portfolio'
        });
      }

      const portfolioData = {
        ...req.body,
        userId: req.user.id,
        status: req.body.status || 'draft'
      };

      const portfolio = await Portfolio.create(portfolioData);

      // Create version
      await portfolio.createVersion(portfolioData, req.user.id);

      // Index in search service
      await searchService.indexDocument('portfolios', portfolio.id, {
        ...portfolio.toPublicJSON(),
        userId: portfolio.userId
      });

      logger.info(`Portfolio created: ${portfolio.id}`, { userId: req.user.id });

      res.status(201).json(portfolio.toPublicJSON());
    } catch (error) {
      logger.error('Error creating portfolio:', error);
      res.status(500).json({
        error: 'Failed to create portfolio',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/portfolios/{id}:
 *   put:
 *     summary: Update portfolio
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePortfolio'
 *     responses:
 *       200:
 *         description: Portfolio updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Portfolio not found
 */
router.put('/:id',
  auth,
  rbac(['author', 'editor', 'admin']),
  updatePortfolioValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const portfolio = await Portfolio.findByPk(req.params.id);

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      // Check ownership or admin privileges
      if (portfolio.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const oldData = portfolio.toJSON();
      await portfolio.update(req.body);

      // Create version with changes
      await portfolio.createVersion(req.body, req.user.id);

      // Update search index
      await searchService.updateDocument('portfolios', portfolio.id, {
        ...portfolio.toPublicJSON(),
        userId: portfolio.userId
      });

      logger.info(`Portfolio updated: ${portfolio.id}`, { userId: req.user.id });

      res.json(portfolio.toPublicJSON());
    } catch (error) {
      logger.error('Error updating portfolio:', error);
      res.status(500).json({
        error: 'Failed to update portfolio',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/portfolios/{id}:
 *   delete:
 *     summary: Delete portfolio
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Portfolio deleted successfully
 *       404:
 *         description: Portfolio not found
 */
router.delete('/:id',
  auth,
  rbac(['author', 'editor', 'admin']),
  param('id').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const portfolio = await Portfolio.findByPk(req.params.id);

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      // Check ownership or admin privileges
      if (portfolio.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      await portfolio.destroy();

      // Remove from search index
      await searchService.deleteDocument('portfolios', portfolio.id);

      logger.info(`Portfolio deleted: ${portfolio.id}`, { userId: req.user.id });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting portfolio:', error);
      res.status(500).json({
        error: 'Failed to delete portfolio',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/portfolios/{id}/publish:
 *   post:
 *     summary: Publish portfolio
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Portfolio published successfully
 */
router.post('/:id/publish',
  auth,
  rbac(['author', 'editor', 'admin']),
  param('id').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const portfolio = await Portfolio.findByPk(req.params.id);

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      if (portfolio.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      await portfolio.update({
        status: 'published',
        isPublic: true,
        publishedAt: new Date()
      });

      // Update search index
      await searchService.updateDocument('portfolios', portfolio.id, {
        ...portfolio.toPublicJSON(),
        userId: portfolio.userId
      });

      logger.info(`Portfolio published: ${portfolio.id}`, { userId: req.user.id });

      res.json({
        message: 'Portfolio published successfully',
        portfolio: portfolio.toPublicJSON()
      });
    } catch (error) {
      logger.error('Error publishing portfolio:', error);
      res.status(500).json({
        error: 'Failed to publish portfolio',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/portfolios/{id}/unpublish:
 *   post:
 *     summary: Unpublish portfolio
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/unpublish',
  auth,
  rbac(['author', 'editor', 'admin']),
  param('id').isUUID(),
  async (req, res) => {
    try {
      const portfolio = await Portfolio.findByPk(req.params.id);

      if (!portfolio) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      if (portfolio.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      await portfolio.update({
        status: 'draft',
        isPublic: false
      });

      logger.info(`Portfolio unpublished: ${portfolio.id}`, { userId: req.user.id });

      res.json({
        message: 'Portfolio unpublished successfully',
        portfolio: portfolio.toPublicJSON()
      });
    } catch (error) {
      logger.error('Error unpublishing portfolio:', error);
      res.status(500).json({
        error: 'Failed to unpublish portfolio',
        message: error.message
      });
    }
  }
);

module.exports = router;