/**
 * Projects API Routes
 * RESTful API endpoints for portfolio project management
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const ProjectController = require('../../controllers/api/ProjectController');
const { authenticate, authorize } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { cacheMiddleware } = require('../../middleware/cache');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for project endpoints
const projectRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests to projects API'
});

router.use(projectRateLimit);

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       required:
 *         - title
 *         - description
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the project
 *         title:
 *           type: string
 *           maxLength: 255
 *           description: Project title
 *         slug:
 *           type: string
 *           maxLength: 255
 *           description: URL-friendly identifier
 *         description:
 *           type: string
 *           description: Brief project description
 *         content:
 *           type: string
 *           description: Detailed project content (Markdown supported)
 *         featuredImage:
 *           type: string
 *           format: uri
 *           description: Main project image URL
 *         galleryImages:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: Additional project images
 *         projectUrl:
 *           type: string
 *           format: uri
 *           description: Live project URL
 *         repositoryUrl:
 *           type: string
 *           format: uri
 *           description: Source code repository URL
 *         demoUrl:
 *           type: string
 *           format: uri
 *           description: Demo/preview URL
 *         clientName:
 *           type: string
 *           description: Client or company name
 *         projectType:
 *           type: string
 *           enum: [web, mobile, desktop, api, other]
 *           description: Type of project
 *         status:
 *           type: string
 *           enum: [draft, published, archived, featured]
 *           description: Project status
 *         visibility:
 *           type: string
 *           enum: [public, private, unlisted]
 *           description: Project visibility
 *         startDate:
 *           type: string
 *           format: date
 *           description: Project start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Project completion date
 *         featured:
 *           type: boolean
 *           description: Whether project is featured
 *         sortOrder:
 *           type: integer
 *           description: Display order
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Tag'
 *           description: Project tags
 *         skills:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Skill'
 *           description: Technologies/skills used
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
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
 *         description: Number of projects per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived, featured]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by project type
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter featured projects
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tag slugs
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Comma-separated list of skill slugs
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'published', 'archived', 'featured']),
    query('featured').optional().isBoolean(),
    query('search').optional().isLength({ max: 255 }),
    query('tags').optional().isString(),
    query('skills').optional().isString()
  ],
  validateRequest,
  cacheMiddleware(300), // 5 minutes cache
  ProjectController.getAll
);

/**
 * @swagger
 * /api/projects/featured:
 *   get:
 *     summary: Get featured projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Number of featured projects to return
 *     responses:
 *       200:
 *         description: List of featured projects
 */
router.get('/featured',
  [query('limit').optional().isInt({ min: 1, max: 20 })],
  validateRequest,
  cacheMiddleware(600), // 10 minutes cache
  ProjectController.getFeatured
);

/**
 * @swagger
 * /api/projects/stats:
 *   get:
 *     summary: Get project statistics
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Project statistics
 */
router.get('/stats',
  cacheMiddleware(1800), // 30 minutes cache
  ProjectController.getStats
);

/**
 * @swagger
 * /api/projects/{slug}:
 *   get:
 *     summary: Get project by slug
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Project slug
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.get('/:slug',
  [param('slug').isSlug()],
  validateRequest,
  cacheMiddleware(600), // 10 minutes cache
  ProjectController.getBySlug
);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               projectType:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Authentication required
 */
router.post('/',
  authenticate,
  authorize(['admin', 'editor', 'author']),
  [
    body('title').notEmpty().isLength({ max: 255 }),
    body('slug').optional().isSlug(),
    body('description').notEmpty(),
    body('content').optional().isString(),
    body('featuredImage').optional().isURL(),
    body('galleryImages').optional().isArray(),
    body('projectUrl').optional().isURL(),
    body('repositoryUrl').optional().isURL(),
    body('demoUrl').optional().isURL(),
    body('clientName').optional().isLength({ max: 255 }),
    body('projectType').optional().isIn(['web', 'mobile', 'desktop', 'api', 'other']),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('visibility').optional().isIn(['public', 'private', 'unlisted']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('featured').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('skills').optional().isArray()
  ],
  validateRequest,
  ProjectController.create
);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
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
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 */
router.put('/:id',
  authenticate,
  authorize(['admin', 'editor', 'author']),
  [
    param('id').isUUID(),
    body('title').optional().isLength({ max: 255 }),
    body('slug').optional().isSlug(),
    body('description').optional().isString(),
    body('content').optional().isString(),
    body('status').optional().isIn(['draft', 'published', 'archived']),
    body('visibility').optional().isIn(['public', 'private', 'unlisted']),
    body('featured').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('skills').optional().isArray()
  ],
  validateRequest,
  ProjectController.update
);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
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
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 */
router.delete('/:id',
  authenticate,
  authorize(['admin', 'editor']),
  [param('id').isUUID()],
  validateRequest,
  ProjectController.delete
);

/**
 * @swagger
 * /api/projects/{id}/publish:
 *   post:
 *     summary: Publish a project
 *     tags: [Projects]
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
 *         description: Project published successfully
 */
router.post('/:id/publish',
  authenticate,
  authorize(['admin', 'editor', 'author']),
  [param('id').isUUID()],
  validateRequest,
  ProjectController.publish
);

/**
 * @swagger
 * /api/projects/{id}/unpublish:
 *   post:
 *     summary: Unpublish a project
 *     tags: [Projects]
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
 *         description: Project unpublished successfully
 */
router.post('/:id/unpublish',
  authenticate,
  authorize(['admin', 'editor', 'author']),
  [param('id').isUUID()],
  validateRequest,
  ProjectController.unpublish
);

/**
 * @swagger
 * /api/projects/{id}/feature:
 *   post:
 *     summary: Feature a project
 *     tags: [Projects]
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
 *         description: Project featured successfully
 */
router.post('/:id/feature',
  authenticate,
  authorize(['admin', 'editor']),
  [param('id').isUUID()],
  validateRequest,
  ProjectController.feature
);

/**
 * @swagger
 * /api/projects/{id}/unfeature:
 *   post:
 *     summary: Unfeature a project
 *     tags: [Projects]
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
 *         description: Project unfeatured successfully
 */
router.post('/:id/unfeature',
  authenticate,
  authorize(['admin', 'editor']),
  [param('id').isUUID()],
  validateRequest,
  ProjectController.unfeature
);

/**
 * @swagger
 * /api/projects/{id}/clone:
 *   post:
 *     summary: Clone a project
 *     tags: [Projects]
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
 *       201:
 *         description: Project cloned successfully
 */
router.post('/:id/clone',
  authenticate,
  authorize(['admin', 'editor', 'author']),
  [param('id').isUUID()],
  validateRequest,
  ProjectController.clone
);

/**
 * @swagger
 * /api/projects/{id}/view:
 *   post:
 *     summary: Increment project view count
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: View count incremented
 */
router.post('/:id/view',
  [param('id').isUUID()],
  validateRequest,
  ProjectController.incrementView
);

module.exports = router;