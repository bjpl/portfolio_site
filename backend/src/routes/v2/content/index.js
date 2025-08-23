/**
 * Content Management Routes
 * Comprehensive CRUD operations for all content types
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const contentService = require('../../../services/contentService');
const { authenticateToken, authorizeRole } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validation');
const { cacheMiddleware } = require('../../../middleware/cache');
const logger = require('../../../utils/logger');

const router = express.Router();

// Import content type specific routes
router.use('/blog', require('./blog'));
router.use('/portfolio', require('./portfolio'));
router.use('/tools', require('./tools'));
router.use('/teaching', require('./teaching'));
router.use('/pages', require('./pages'));

/**
 * @swagger
 * /api/v2/content:
 *   get:
 *     summary: Get content overview
 *     description: Returns overview of all content types with counts and recent items
 *     tags: [Content]
 *     parameters:
 *       - $ref: '#/components/parameters/Language'
 *     responses:
 *       200:
 *         description: Content overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     contentTypes:
 *                       type: object
 *                       properties:
 *                         blog:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             published:
 *                               type: integer
 *                             drafts:
 *                               type: integer
 *                         portfolio:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             featured:
 *                               type: integer
 *                 recent:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       type:
 *                         type: string
 *                       status:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    const { lang = 'en' } = req.query;
    
    const overview = await contentService.getContentOverview(lang);
    const recentItems = await contentService.getRecentContent(10, lang);
    
    res.json({
      overview,
      recent: recentItems,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching content overview:', error);
    res.status(500).json({
      error: 'Failed to fetch content overview',
      code: 'CONTENT_OVERVIEW_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/search:
 *   get:
 *     summary: Search content across all types
 *     description: Advanced search across all content types with filtering
 *     tags: [Content]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query
 *       - name: types
 *         in: query
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [blog, portfolio, tools, teaching, pages]
 *         style: form
 *         explode: false
 *         description: Content types to include
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, published, draft, archived]
 *           default: published
 *       - $ref: '#/components/parameters/Language'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResults'
 */
router.get('/search', [
  query('q').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('types').optional().isArray(),
  query('status').optional().isIn(['all', 'published', 'draft', 'archived']),
  query('lang').optional().isIn(['en', 'es']),
  validateRequest
], async (req, res) => {
  try {
    const {
      q: query,
      types = ['blog', 'portfolio', 'tools', 'teaching', 'pages'],
      status = 'published',
      lang = 'en',
      page = 1,
      limit = 20
    } = req.query;
    
    const searchOptions = {
      query,
      types: Array.isArray(types) ? types : [types],
      status,
      language: lang,
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    const results = await contentService.searchContent(searchOptions);
    
    res.json(results);
  } catch (error) {
    logger.error('Error searching content:', error);
    res.status(500).json({
      error: 'Content search failed',
      code: 'CONTENT_SEARCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Content]
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [blog, portfolio, tools, teaching]
 *       - $ref: '#/components/parameters/Language'
 *     responses:
 *       200:
 *         description: Categories list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/categories', cacheMiddleware(600), async (req, res) => {
  try {
    const { type, lang = 'en' } = req.query;
    
    const categories = await contentService.getCategories(type, lang);
    
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      code: 'CATEGORIES_FETCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/tags:
 *   get:
 *     summary: Get all tags
 *     tags: [Content]
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [blog, portfolio, tools, teaching]
 *       - $ref: '#/components/parameters/Language'
 *       - name: popular
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Return only popular tags
 *     responses:
 *       200:
 *         description: Tags list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 */
router.get('/tags', cacheMiddleware(600), async (req, res) => {
  try {
    const { type, lang = 'en', popular = false } = req.query;
    
    const tags = await contentService.getTags(type, lang, popular === 'true');
    
    res.json(tags);
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/bulk:
 *   post:
 *     summary: Bulk content operations
 *     description: Perform bulk operations on multiple content items
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operation, items]
 *             properties:
 *               operation:
 *                 type: string
 *                 enum: [publish, unpublish, archive, delete, update_category, update_tags]
 *               items:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of content IDs
 *               data:
 *                 type: object
 *                 description: Additional data for the operation
 *     responses:
 *       200:
 *         description: Bulk operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operation:
 *                   type: string
 *                 processed:
 *                   type: integer
 *                 successful:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post('/bulk', [
  authenticateToken,
  authorizeRole(['admin', 'editor']),
  body('operation').isIn(['publish', 'unpublish', 'archive', 'delete', 'update_category', 'update_tags']),
  body('items').isArray().isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const { operation, items, data } = req.body;
    const userId = req.user.id;
    
    const result = await contentService.bulkOperation(operation, items, data, userId);
    
    logger.info(`Bulk operation ${operation} completed by user ${userId}`, {
      processed: result.processed,
      successful: result.successful,
      failed: result.failed
    });
    
    res.json({
      operation,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in bulk operation:', error);
    res.status(500).json({
      error: 'Bulk operation failed',
      code: 'BULK_OPERATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/export:
 *   get:
 *     summary: Export content
 *     description: Export content in various formats
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, blog, portfolio, tools, teaching]
 *           default: all
 *       - name: format
 *         in: query
 *         schema:
 *           type: string
 *           enum: [json, csv, xml]
 *           default: json
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, published, draft]
 *           default: all
 *       - $ref: '#/components/parameters/Language'
 *     responses:
 *       200:
 *         description: Exported content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *           application/xml:
 *             schema:
 *               type: string
 */
router.get('/export', [
  authenticateToken,
  authorizeRole(['admin', 'editor']),
  query('type').optional().isIn(['all', 'blog', 'portfolio', 'tools', 'teaching']),
  query('format').optional().isIn(['json', 'csv', 'xml']),
  query('status').optional().isIn(['all', 'published', 'draft']),
  validateRequest
], async (req, res) => {
  try {
    const {
      type = 'all',
      format = 'json',
      status = 'all',
      lang = 'en'
    } = req.query;
    
    const exportOptions = { type, status, language: lang };
    const exportedData = await contentService.exportContent(exportOptions, format);
    
    // Set appropriate headers based on format
    const contentTypes = {
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml'
    };
    
    const filename = `content-export-${type}-${Date.now()}.${format}`;
    
    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'json') {
      res.json(exportedData);
    } else {
      res.send(exportedData);
    }
    
    logger.info(`Content export completed`, {
      type,
      format,
      status,
      language: lang,
      userId: req.user.id
    });
  } catch (error) {
    logger.error('Error exporting content:', error);
    res.status(500).json({
      error: 'Content export failed',
      code: 'CONTENT_EXPORT_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;