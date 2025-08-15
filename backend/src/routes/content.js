const express = require('express');

const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const matter = require('gray-matter');

const { authenticate, optionalAuth, editorOnly } = require('../middleware/auth');
const { apiRateLimiter } = require('../middleware/security');
const { validate, validationRules, validators, sanitizeMarkdown } = require('../middleware/validation');
const cacheService = require('../services/cache');
const contentService = require('../services/contentService');
const logger = require('../utils/logger');

/**
 * Get content from all sections
 * GET /api/content
 */
router.get('/', apiRateLimiter, validate(validationRules.listContent), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      section,
      subsection,
      language = 'en',
      draft = false,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const content = await contentService.getContent({
      page,
      limit,
      section,
      subsection,
      language,
      draft,
      search,
      sortBy,
      sortOrder,
    });

    res.json(content);
  } catch (error) {
    logger.error('Error fetching content', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

/**
 * Get content from Learn section
 * GET /api/content/learn
 */
router.get('/learn', apiRateLimiter, optionalAuth, async (req, res) => {
  try {
    const { subsection, limit = 10 } = req.query;
    const cacheKey = `content:learn:${subsection || 'all'}:${limit}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const content = await contentService.getLearnContent(subsection, limit);

    await cacheService.set(cacheKey, content, 600); // Cache for 10 minutes
    res.json(content);
  } catch (error) {
    logger.error('Error fetching learn content', error);
    res.status(500).json({ error: 'Failed to fetch learn content' });
  }
});

/**
 * Get content from Make section (creative works)
 * GET /api/content/make
 */
router.get('/make', apiRateLimiter, async (req, res) => {
  try {
    const { subsection, type, limit = 12 } = req.query;
    const cacheKey = `content:make:${subsection || 'all'}:${type || 'all'}:${limit}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const content = await contentService.getMakeContent(subsection, type, limit);

    await cacheService.set(cacheKey, content, 600);
    res.json(content);
  } catch (error) {
    logger.error('Error fetching make content', error);
    res.status(500).json({ error: 'Failed to fetch creative works' });
  }
});

/**
 * Get content from Meet section (about/portfolio)
 * GET /api/content/meet
 */
router.get('/meet', apiRateLimiter, async (req, res) => {
  try {
    const { subsection } = req.query;
    const cacheKey = `content:meet:${subsection || 'all'}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const content = await contentService.getMeetContent(subsection);

    await cacheService.set(cacheKey, content, 1800); // Cache for 30 minutes
    res.json(content);
  } catch (error) {
    logger.error('Error fetching meet content', error);
    res.status(500).json({ error: 'Failed to fetch about content' });
  }
});

/**
 * Get content from Think section (blog/thoughts)
 * GET /api/content/think
 */
router.get('/think', apiRateLimiter, validate(validationRules.listContent), async (req, res) => {
  try {
    const { subsection, page = 1, limit = 10, tag, search } = req.query;

    const content = await contentService.getThinkContent({
      subsection,
      page,
      limit,
      tag,
      search,
    });

    res.json(content);
  } catch (error) {
    logger.error('Error fetching think content', error);
    res.status(500).json({ error: 'Failed to fetch blog content' });
  }
});

/**
 * Get single content item by path
 * GET /api/content/item/:section/:subsection/:slug
 */
router.get('/item/:section/:subsection/:slug', apiRateLimiter, optionalAuth, async (req, res) => {
  try {
    const { section, subsection, slug } = req.params;
    const { language = 'en' } = req.query;

    // Validate section
    if (!['learn', 'make', 'meet', 'think'].includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const content = await contentService.getContentItem(section, subsection, slug, language);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Track view
    await contentService.trackContentView(section, subsection, slug, req.ip);

    // Add edit capabilities for authenticated users
    if (req.user && ['admin', 'editor'].includes(req.user.role)) {
      content.canEdit = true;
      content.editUrl = `/api/content/item/${section}/${subsection}/${slug}/edit`;
    }

    res.json(content);
  } catch (error) {
    logger.error('Error fetching content item', error);
    res.status(500).json({ error: 'Failed to fetch content item' });
  }
});

/**
 * Create new content (editor/admin only)
 * POST /api/content
 */
router.post('/', editorOnly, validate(validationRules.createContent), async (req, res) => {
  try {
    const content = await contentService.createContent({
      ...req.body,
      authorId: req.user.id,
      authorName: req.user.username,
    });

    logger.audit('CONTENT_CREATE', req.user.id, {
      section: req.body.section,
      subsection: req.body.subsection,
      title: req.body.title,
    });

    // Clear cache for the section
    await cacheService.del(`content:${req.body.section}:*`);

    res.status(201).json(content);
  } catch (error) {
    logger.error('Error creating content', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

/**
 * Update content (editor/admin only)
 * PUT /api/content/item/:section/:subsection/:slug
 */
router.put(
  '/item/:section/:subsection/:slug',
  editorOnly,
  validate(validationRules.updateContent),
  async (req, res) => {
    try {
      const { section, subsection, slug } = req.params;

      const content = await contentService.updateContent(section, subsection, slug, {
        ...req.body,
        lastEditedBy: req.user.id,
        lastEditedAt: new Date(),
      });

      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }

      logger.audit('CONTENT_UPDATE', req.user.id, {
        section,
        subsection,
        slug,
        changes: Object.keys(req.body),
      });

      // Clear cache
      await cacheService.del(`content:${section}:*`);
      await cacheService.del(`content:item:${section}:${subsection}:${slug}`);

      res.json(content);
    } catch (error) {
      logger.error('Error updating content', error);
      res.status(500).json({ error: 'Failed to update content' });
    }
  }
);

/**
 * Delete content (admin only)
 * DELETE /api/content/item/:section/:subsection/:slug
 */
router.delete('/item/:section/:subsection/:slug', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { section, subsection, slug } = req.params;

    await contentService.deleteContent(section, subsection, slug);

    logger.audit('CONTENT_DELETE', req.user.id, {
      section,
      subsection,
      slug,
    });

    // Clear cache
    await cacheService.del(`content:${section}:*`);

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    logger.error('Error deleting content', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

/**
 * Get content statistics
 * GET /api/content/stats
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const stats = await contentService.getContentStats(isAdmin);
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching content stats', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Search across all content
 * GET /api/content/search
 */
router.get('/search', apiRateLimiter, validate([validators.search]), async (req, res) => {
  try {
    const { search, limit = 20 } = req.query;

    if (!search || search.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = await contentService.searchContent(search, limit);
    res.json(results);
  } catch (error) {
    logger.error('Error searching content', error);
    res.status(500).json({ error: 'Failed to search content' });
  }
});

/**
 * Get content tags
 * GET /api/content/tags
 */
router.get('/tags', async (req, res) => {
  try {
    const { section } = req.query;
    const cacheKey = `content:tags:${section || 'all'}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const tags = await contentService.getContentTags(section);

    await cacheService.set(cacheKey, tags, 3600); // Cache for 1 hour
    res.json(tags);
  } catch (error) {
    logger.error('Error fetching tags', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * Get content categories
 * GET /api/content/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const { section } = req.query;
    const cacheKey = `content:categories:${section || 'all'}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const categories = await contentService.getContentCategories(section);

    await cacheService.set(cacheKey, categories, 3600);
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Get related content
 * GET /api/content/related/:section/:subsection/:slug
 */
router.get('/related/:section/:subsection/:slug', apiRateLimiter, async (req, res) => {
  try {
    const { section, subsection, slug } = req.params;
    const { limit = 5 } = req.query;

    const related = await contentService.getRelatedContent(section, subsection, slug, limit);
    res.json(related);
  } catch (error) {
    logger.error('Error fetching related content', error);
    res.status(500).json({ error: 'Failed to fetch related content' });
  }
});

/**
 * Toggle content publish status (editor/admin)
 * POST /api/content/item/:section/:subsection/:slug/publish
 */
router.post('/item/:section/:subsection/:slug/publish', editorOnly, async (req, res) => {
  try {
    const { section, subsection, slug } = req.params;
    const { published = true } = req.body;

    const content = await contentService.togglePublishStatus(section, subsection, slug, published);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    logger.audit('CONTENT_PUBLISH_TOGGLE', req.user.id, {
      section,
      subsection,
      slug,
      published,
    });

    // Clear cache
    await cacheService.del(`content:${section}:*`);

    res.json(content);
  } catch (error) {
    logger.error('Error toggling publish status', error);
    res.status(500).json({ error: 'Failed to update publish status' });
  }
});

module.exports = router;
