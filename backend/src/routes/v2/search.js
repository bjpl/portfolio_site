/**
 * Advanced Search and Filtering Routes
 * Full-text search with faceted filtering and suggestions
 */

const express = require('express');
const { query } = require('express-validator');
const searchService = require('../../services/searchService');
const { validateRequest } = require('../../middleware/validation');
const { cacheMiddleware } = require('../../middleware/cache');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v2/search:
 *   get:
 *     summary: Global content search
 *     description: |
 *       Advanced search across all content types with full-text search capabilities.
 *       Supports faceted filtering, highlighting, and relevance scoring.
 *     tags: [Search]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (supports operators like +, -, "", *)
 *         example: "language learning +technology -boring"
 *       - name: type
 *         in: query
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [blog, portfolio, tools, teaching, pages]
 *         style: form
 *         explode: false
 *         description: Content types to search
 *         example: ["blog", "portfolio"]
 *       - name: language
 *         in: query
 *         schema:
 *           type: string
 *           enum: [en, es, all]
 *           default: all
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, published, draft]
 *           default: published
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [relevance, date, title, views, updated]
 *           default: relevance
 *       - name: order
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - name: dateRange
 *         in: query
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, all]
 *           default: all
 *       - name: category
 *         in: query
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: false
 *       - name: tag
 *         in: query
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: false
 *       - name: author
 *         in: query
 *         schema:
 *           type: string
 *       - name: featured
 *         in: query
 *         schema:
 *           type: boolean
 *       - name: highlight
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include highlighted snippets in results
 *       - name: facets
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include facet counts for filtering
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Search results with facets and highlights
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResults'
 *       400:
 *         description: Invalid search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', [
  query('q').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('type').optional().isArray(),
  query('language').optional().isIn(['en', 'es', 'all']),
  query('status').optional().isIn(['all', 'published', 'draft']),
  query('sort').optional().isIn(['relevance', 'date', 'title', 'views', 'updated']),
  query('order').optional().isIn(['asc', 'desc']),
  query('dateRange').optional().isIn(['week', 'month', 'quarter', 'year', 'all']),
  query('highlight').optional().isBoolean(),
  query('facets').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], async (req, res) => {
  try {
    const {
      q: query,
      type = ['blog', 'portfolio', 'tools', 'teaching', 'pages'],
      language = 'all',
      status = 'published',
      sort = 'relevance',
      order = 'desc',
      dateRange = 'all',
      category,
      tag,
      author,
      featured,
      highlight = true,
      facets = true,
      page = 1,
      limit = 20
    } = req.query;

    const searchOptions = {
      query: query.trim(),
      filters: {
        types: Array.isArray(type) ? type : [type],
        language: language === 'all' ? undefined : language,
        status: status === 'all' ? undefined : status,
        categories: category ? (Array.isArray(category) ? category : [category]) : undefined,
        tags: tag ? (Array.isArray(tag) ? tag : [tag]) : undefined,
        author,
        featured: featured ? featured === 'true' : undefined,
        dateRange: dateRange === 'all' ? undefined : dateRange
      },
      sort: {
        field: sort,
        order
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      },
      options: {
        highlight: highlight === 'true',
        facets: facets === 'true',
        includeAnalytics: false
      }
    };

    // Cache based on search parameters
    const cacheKey = `search_${Buffer.from(JSON.stringify(searchOptions)).toString('base64')}`;
    
    const results = await searchService.search(searchOptions);
    
    // Add search analytics (async)
    searchService.trackSearch(query, results.total, req.ip)
      .catch(error => logger.warn('Failed to track search:', error));

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Search-Total': results.total.toString(),
      'X-Search-Time': results.searchTime ? `${results.searchTime}ms` : undefined
    });

    res.json(results);
  } catch (error) {
    logger.error('Search error:', error);
    
    if (error.code === 'INVALID_SEARCH_QUERY') {
      return res.status(400).json({
        error: 'Invalid search query syntax',
        code: 'INVALID_SEARCH_QUERY',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Search failed',
      code: 'SEARCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/search/suggestions:
 *   get:
 *     summary: Get search suggestions and auto-complete
 *     tags: [Search]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Partial search query
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [content, tag, category, author]
 *           default: content
 *         description: Type of suggestions to return
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *       - name: language
 *         in: query
 *         schema:
 *           type: string
 *           enum: [en, es, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [content, tag, category, author]
 *                       count:
 *                         type: integer
 *                       score:
 *                         type: number
 *                 popular:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       count:
 *                         type: integer
 */
router.get('/suggestions', [
  query('q').isLength({ min: 1 }).withMessage('Query parameter is required'),
  query('type').optional().isIn(['content', 'tag', 'category', 'author']),
  query('limit').optional().isInt({ min: 1, max: 20 }),
  query('language').optional().isIn(['en', 'es', 'all']),
  validateRequest
], cacheMiddleware(600), async (req, res) => {
  try {
    const {
      q: query,
      type = 'content',
      limit = 10,
      language = 'all'
    } = req.query;

    const suggestions = await searchService.getSuggestions({
      query: query.trim(),
      type,
      limit: parseInt(limit),
      language: language === 'all' ? undefined : language
    });

    res.json(suggestions);
  } catch (error) {
    logger.error('Error getting search suggestions:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      code: 'SUGGESTIONS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/search/popular:
 *   get:
 *     summary: Get popular search terms
 *     tags: [Search]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - name: language
 *         in: query
 *         schema:
 *           type: string
 *           enum: [en, es, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Popular search terms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: string
 *                 popular:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       term:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       trend:
 *                         type: string
 *                         enum: [up, down, stable]
 *                 trending:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       term:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       growth:
 *                         type: number
 */
router.get('/popular', [
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('language').optional().isIn(['en', 'es', 'all']),
  validateRequest
], cacheMiddleware(3600), async (req, res) => {
  try {
    const {
      period = 'month',
      limit = 20,
      language = 'all'
    } = req.query;

    const popularTerms = await searchService.getPopularSearchTerms({
      period,
      limit: parseInt(limit),
      language: language === 'all' ? undefined : language
    });

    res.json(popularTerms);
  } catch (error) {
    logger.error('Error getting popular search terms:', error);
    res.status(500).json({
      error: 'Failed to get popular terms',
      code: 'POPULAR_TERMS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/search/similar:
 *   get:
 *     summary: Find similar content
 *     tags: [Search]
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Content ID to find similar items for
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [blog, portfolio, tools, teaching, pages]
 *         description: Content type of the reference item
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *       - name: algorithm
 *         in: query
 *         schema:
 *           type: string
 *           enum: [tags, content, hybrid]
 *           default: hybrid
 *         description: Similarity algorithm to use
 *     responses:
 *       200:
 *         description: Similar content items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reference:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     type:
 *                       type: string
 *                 similar:
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
 *                       similarity:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 1
 *                       url:
 *                         type: string
 *                       excerpt:
 *                         type: string
 */
router.get('/similar', [
  query('id').isLength({ min: 1 }).withMessage('Content ID is required'),
  query('type').optional().isIn(['blog', 'portfolio', 'tools', 'teaching', 'pages']),
  query('limit').optional().isInt({ min: 1, max: 20 }),
  query('algorithm').optional().isIn(['tags', 'content', 'hybrid']),
  validateRequest
], cacheMiddleware(1800), async (req, res) => {
  try {
    const {
      id,
      type,
      limit = 5,
      algorithm = 'hybrid'
    } = req.query;

    const similarContent = await searchService.findSimilarContent({
      contentId: id,
      contentType: type,
      limit: parseInt(limit),
      algorithm
    });

    res.json(similarContent);
  } catch (error) {
    logger.error('Error finding similar content:', error);
    
    if (error.code === 'CONTENT_NOT_FOUND') {
      return res.status(404).json({
        error: 'Reference content not found',
        code: 'CONTENT_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to find similar content',
      code: 'SIMILAR_CONTENT_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/search/facets:
 *   get:
 *     summary: Get available search facets
 *     description: Returns all available facets for filtering search results
 *     tags: [Search]
 *     parameters:
 *       - name: q
 *         in: query
 *         schema:
 *           type: string
 *         description: Optional query to get facets specific to search results
 *       - name: type
 *         in: query
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [blog, portfolio, tools, teaching, pages]
 *         style: form
 *         explode: false
 *       - name: language
 *         in: query
 *         schema:
 *           type: string
 *           enum: [en, es, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Available facets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 types:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       label:
 *                         type: string
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       color:
 *                         type: string
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 authors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 */
router.get('/facets', [
  query('q').optional().isLength({ min: 1 }),
  query('type').optional().isArray(),
  query('language').optional().isIn(['en', 'es', 'all']),
  validateRequest
], cacheMiddleware(1800), async (req, res) => {
  try {
    const {
      q: query,
      type,
      language = 'all'
    } = req.query;

    const facets = await searchService.getFacets({
      query,
      types: type ? (Array.isArray(type) ? type : [type]) : undefined,
      language: language === 'all' ? undefined : language
    });

    res.json(facets);
  } catch (error) {
    logger.error('Error getting search facets:', error);
    res.status(500).json({
      error: 'Failed to get facets',
      code: 'FACETS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/search/index/rebuild:
 *   post:
 *     summary: Rebuild search index
 *     description: Manually trigger a complete rebuild of the search index
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Index rebuild started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 estimatedTime:
 *                   type: string
 */
router.post('/index/rebuild', [
  // Authentication required - only admins can rebuild index
  // authenticateToken,
  // authorizeRole(['admin']),
], async (req, res) => {
  try {
    // const userId = req.user.id;
    const jobId = await searchService.rebuildIndex();

    // logger.info(`Search index rebuild initiated by user ${userId}`, { jobId });

    res.status(202).json({
      message: 'Search index rebuild started',
      jobId,
      estimatedTime: '5-15 minutes',
      status: 'in_progress'
    });
  } catch (error) {
    logger.error('Error rebuilding search index:', error);
    res.status(500).json({
      error: 'Failed to rebuild search index',
      code: 'INDEX_REBUILD_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;