/**
 * Blog Content Routes
 * CRUD operations for blog posts with advanced features
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const contentService = require('../../../services/contentService');
const { authenticateToken, authorizeRole } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validation');
const { cacheMiddleware, clearCache } = require('../../../middleware/cache');
const webhookService = require('../../../services/webhookService');
const logger = require('../../../utils/logger');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * @swagger
 * /api/v2/content/blog:
 *   get:
 *     summary: List blog posts
 *     description: Retrieve paginated list of blog posts with advanced filtering
 *     tags: [Content - Blog]
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Language'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, draft, published, archived]
 *           default: published
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
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
 *       - name: dateFrom
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: dateTo
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [date, title, views, updated]
 *           default: date
 *       - name: order
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Blog posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBlogPosts'
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['all', 'draft', 'published', 'archived']),
  query('lang').optional().isIn(['en', 'es']),
  query('featured').optional().isBoolean(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('sort').optional().isIn(['date', 'title', 'views', 'updated']),
  query('order').optional().isIn(['asc', 'desc']),
  validateRequest
], cacheMiddleware(300), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'published',
      lang = 'en',
      category,
      tag,
      author,
      featured,
      dateFrom,
      dateTo,
      sort = 'date',
      order = 'desc'
    } = req.query;

    const filters = {
      status,
      language: lang,
      category,
      tags: tag ? (Array.isArray(tag) ? tag : [tag]) : undefined,
      author,
      featured: featured ? featured === 'true' : undefined,
      dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : undefined,
      sort,
      order
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await contentService.getBlogPosts(filters, options);
    
    // Add cache headers
    res.set({
      'Cache-Control': 'public, max-age=300',
      'ETag': `"${Buffer.from(JSON.stringify(result)).toString('base64')}"`
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching blog posts:', error);
    res.status(500).json({
      error: 'Failed to fetch blog posts',
      code: 'BLOG_FETCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/blog:
 *   post:
 *     summary: Create new blog post
 *     tags: [Content - Blog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBlogPostRequest'
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateBlogPostMultipart'
 *     responses:
 *       201:
 *         description: Blog post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogPost'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', [
  authenticateToken,
  authorizeRole(['admin', 'editor']),
  upload.single('featuredImage'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be under 200 characters'),
  body('content').isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('status').isIn(['draft', 'published']).withMessage('Status must be draft or published'),
  body('language').optional().isIn(['en', 'es']),
  body('categories').optional().isArray(),
  body('tags').optional().isArray(),
  body('publishedAt').optional().isISO8601(),
  body('seo.metaTitle').optional().isLength({ max: 60 }),
  body('seo.metaDescription').optional().isLength({ max: 160 }),
  validateRequest
], async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      status,
      language = 'en',
      categories = [],
      tags = [],
      publishedAt,
      seo
    } = req.body;

    // Process featured image if uploaded
    let featuredImageUrl = null;
    if (req.file) {
      const optimizedImage = await sharp(req.file.buffer)
        .resize(1200, 630, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const filename = `blog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const uploadPath = path.join(process.env.UPLOAD_DIR || 'uploads', 'images', filename);
      
      await sharp(optimizedImage).toFile(uploadPath);
      featuredImageUrl = `/uploads/images/${filename}`;
    }

    const blogPostData = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      excerpt,
      content,
      status,
      language,
      categories,
      tags,
      featuredImage: featuredImageUrl,
      publishedAt: publishedAt ? new Date(publishedAt) : (status === 'published' ? new Date() : null),
      seo: seo || {},
      authorId: req.user.id
    };

    const blogPost = await contentService.createBlogPost(blogPostData);
    
    // Clear relevant caches
    clearCache(`blog_*`);
    clearCache(`content_*`);
    
    // Trigger webhook
    await webhookService.trigger('content.created', {
      type: 'blog',
      item: blogPost,
      user: req.user
    });

    logger.info(`Blog post created: ${blogPost.id}`, {
      title: blogPost.title,
      userId: req.user.id,
      status: blogPost.status
    });

    res.status(201).json(blogPost);
  } catch (error) {
    logger.error('Error creating blog post:', error);
    
    if (error.code === 'DUPLICATE_SLUG') {
      return res.status(409).json({
        error: 'A blog post with this slug already exists',
        code: 'DUPLICATE_SLUG',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to create blog post',
      code: 'BLOG_CREATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/blog/{id}:
 *   get:
 *     summary: Get blog post by ID
 *     tags: [Content - Blog]
 *     parameters:
 *       - $ref: '#/components/parameters/ContentId'
 *       - $ref: '#/components/parameters/Language'
 *       - name: includeMetrics
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include view metrics and analytics
 *       - name: format
 *         in: query
 *         schema:
 *           type: string
 *           enum: [json, markdown, html]
 *           default: json
 *     responses:
 *       200:
 *         description: Blog post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogPost'
 *           text/markdown:
 *             schema:
 *               type: string
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', [
  param('id').isLength({ min: 1 }),
  query('lang').optional().isIn(['en', 'es']),
  query('includeMetrics').optional().isBoolean(),
  query('format').optional().isIn(['json', 'markdown', 'html']),
  validateRequest
], cacheMiddleware(600), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      lang = 'en', 
      includeMetrics = false,
      format = 'json'
    } = req.query;

    const blogPost = await contentService.getBlogPostById(id, {
      language: lang,
      includeMetrics: includeMetrics === 'true'
    });

    if (!blogPost) {
      return res.status(404).json({
        error: 'Blog post not found',
        code: 'BLOG_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Track view (async, don't await)
    contentService.trackView('blog', id, req.ip, req.headers['user-agent'])
      .catch(error => logger.warn('Failed to track view:', error));

    // Return different formats
    switch (format) {
      case 'markdown':
        res.set('Content-Type', 'text/markdown');
        return res.send(await contentService.getBlogPostMarkdown(blogPost));
      
      case 'html':
        res.set('Content-Type', 'text/html');
        return res.send(await contentService.getBlogPostHTML(blogPost));
      
      default:
        return res.json(blogPost);
    }
  } catch (error) {
    logger.error('Error fetching blog post:', error);
    res.status(500).json({
      error: 'Failed to fetch blog post',
      code: 'BLOG_FETCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/blog/{id}:
 *   put:
 *     summary: Update blog post
 *     tags: [Content - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ContentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBlogPostRequest'
 *     responses:
 *       200:
 *         description: Blog post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogPost'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'editor']),
  param('id').isLength({ min: 1 }),
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('content').optional().isLength({ min: 10 }),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('categories').optional().isArray(),
  body('tags').optional().isArray(),
  body('publishedAt').optional().isISO8601(),
  body('seo.metaTitle').optional().isLength({ max: 60 }),
  body('seo.metaDescription').optional().isLength({ max: 160 }),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if blog post exists
    const existingPost = await contentService.getBlogPostById(id);
    if (!existingPost) {
      return res.status(404).json({
        error: 'Blog post not found',
        code: 'BLOG_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Check permissions (editors can only edit their own posts)
    if (req.user.role === 'editor' && existingPost.authorId !== req.user.id) {
      return res.status(403).json({
        error: 'You can only edit your own blog posts',
        code: 'INSUFFICIENT_PERMISSIONS',
        timestamp: new Date().toISOString()
      });
    }

    // Add updater info
    updateData.updatedBy = req.user.id;
    updateData.updatedAt = new Date();

    // Handle status changes
    if (updateData.status === 'published' && existingPost.status !== 'published') {
      updateData.publishedAt = updateData.publishedAt || new Date();
    }

    const updatedBlogPost = await contentService.updateBlogPost(id, updateData);
    
    // Clear caches
    clearCache(`blog_${id}`);
    clearCache(`blog_*`);
    clearCache(`content_*`);
    
    // Trigger webhook
    await webhookService.trigger('content.updated', {
      type: 'blog',
      item: updatedBlogPost,
      changes: updateData,
      user: req.user
    });

    logger.info(`Blog post updated: ${id}`, {
      changes: Object.keys(updateData),
      userId: req.user.id
    });

    res.json(updatedBlogPost);
  } catch (error) {
    logger.error('Error updating blog post:', error);
    
    if (error.code === 'DUPLICATE_SLUG') {
      return res.status(409).json({
        error: 'A blog post with this slug already exists',
        code: 'DUPLICATE_SLUG',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to update blog post',
      code: 'BLOG_UPDATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/blog/{id}:
 *   delete:
 *     summary: Delete blog post
 *     tags: [Content - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ContentId'
 *     responses:
 *       204:
 *         description: Blog post deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', [
  authenticateToken,
  authorizeRole(['admin']), // Only admins can delete
  param('id').isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;

    const existingPost = await contentService.getBlogPostById(id);
    if (!existingPost) {
      return res.status(404).json({
        error: 'Blog post not found',
        code: 'BLOG_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    await contentService.deleteBlogPost(id);
    
    // Clear caches
    clearCache(`blog_${id}`);
    clearCache(`blog_*`);
    clearCache(`content_*`);
    
    // Trigger webhook
    await webhookService.trigger('content.deleted', {
      type: 'blog',
      item: existingPost,
      user: req.user
    });

    logger.info(`Blog post deleted: ${id}`, {
      title: existingPost.title,
      userId: req.user.id
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting blog post:', error);
    res.status(500).json({
      error: 'Failed to delete blog post',
      code: 'BLOG_DELETE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/content/blog/{id}/duplicate:
 *   post:
 *     summary: Duplicate blog post
 *     tags: [Content - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ContentId'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New title for the duplicated post
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Blog post duplicated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlogPost'
 */
router.post('/:id/duplicate', [
  authenticateToken,
  authorizeRole(['admin', 'editor']),
  param('id').isLength({ min: 1 }),
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('status').optional().isIn(['draft', 'published']),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status = 'draft' } = req.body;

    const originalPost = await contentService.getBlogPostById(id);
    if (!originalPost) {
      return res.status(404).json({
        error: 'Blog post not found',
        code: 'BLOG_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    const duplicatedPost = await contentService.duplicateBlogPost(id, {
      title: title || `Copy of ${originalPost.title}`,
      status,
      authorId: req.user.id
    });

    clearCache(`blog_*`);
    clearCache(`content_*`);

    logger.info(`Blog post duplicated: ${id} -> ${duplicatedPost.id}`, {
      originalTitle: originalPost.title,
      newTitle: duplicatedPost.title,
      userId: req.user.id
    });

    res.status(201).json(duplicatedPost);
  } catch (error) {
    logger.error('Error duplicating blog post:', error);
    res.status(500).json({
      error: 'Failed to duplicate blog post',
      code: 'BLOG_DUPLICATE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;