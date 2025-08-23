const express = require('express');
const HugoIntegrationMiddleware = require('../middleware/hugoIntegration');
const router = express.Router();

// Initialize Hugo integration middleware
const hugoIntegration = new HugoIntegrationMiddleware();

// Apply middleware to all routes
router.use(hugoIntegration.injectHugoStatus());
router.use(hugoIntegration.validateFrontMatter());

// Get route handlers
const handlers = hugoIntegration.getRouteHandlers();

/**
 * @route GET /api/hugo/status
 * @description Get Hugo build and integration status
 */
router.get('/status', handlers.getBuildStatus);

/**
 * @route GET /api/hugo/health
 * @description Get Hugo integration health status
 */
router.get('/health', handlers.getHealthStatus);

/**
 * @route POST /api/hugo/build
 * @description Trigger manual Hugo build
 * @body {object} options - Build options (draft, minify, etc.)
 */
router.post('/build', handlers.triggerBuild);

/**
 * @route POST /api/hugo/server/start
 * @description Start Hugo development server
 * @body {object} options - Server options (port, bind, etc.)
 */
router.post('/server/start', handlers.startDevServer);

/**
 * @route POST /api/hugo/server/stop
 * @description Stop Hugo development server
 */
router.post('/server/stop', handlers.stopDevServer);

/**
 * @route POST /api/hugo/preview/:path
 * @description Preview specific content
 * @param {string} path - Content path to preview
 * @body {object} options - Preview options
 */
router.post('/preview/:path(*)', handlers.previewContent);

/**
 * @route POST /api/hugo/validate
 * @description Validate Hugo front matter
 * @body {object} frontMatter - Front matter to validate
 * @body {string} path - Content path (optional)
 */
router.post('/validate', handlers.validateFrontMatter);

/**
 * @route GET /api/hugo/environment
 * @description Get Hugo environment information
 */
router.get('/environment', async (req, res) => {
  try {
    const hugoService = hugoIntegration.hugoIntegration.hugoService;
    const envInfo = await hugoService.getEnvironmentInfo();
    
    res.json({
      success: envInfo.success,
      data: envInfo,
      message: envInfo.success ? 'Hugo environment ready' : 'Hugo environment issue'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/hugo/content/stats
 * @description Get content statistics from Hugo
 */
router.get('/content/stats', async (req, res) => {
  try {
    const hugoService = hugoIntegration.hugoIntegration.hugoService;
    const stats = await hugoService.getContentStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Content statistics retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/hugo/content/recent
 * @description Get recently modified content
 * @query {number} limit - Number of items to return (default: 5)
 */
router.get('/content/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const hugoService = hugoIntegration.hugoIntegration.hugoService;
    const recent = await hugoService.getRecentContent(limit);
    
    res.json({
      success: true,
      data: recent,
      message: 'Recent content retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/hugo/content/create
 * @description Create new Hugo content
 * @body {string} section - Content section (e.g., 'blog', 'tools')
 * @body {string} subsection - Content subsection (optional)
 * @body {string} title - Content title
 * @body {string} language - Language code (default: 'en')
 */
router.post('/content/create', async (req, res) => {
  try {
    const { section, subsection, title, language = 'en' } = req.body;
    
    if (!section || !title) {
      return res.status(400).json({
        success: false,
        error: 'Section and title are required'
      });
    }

    const hugoService = hugoIntegration.hugoIntegration.hugoService;
    const result = await hugoService.createContent(section, subsection || '', title, language);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Content created successfully' : 'Content creation failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/hugo/sitemap
 * @description Generate and return sitemap information
 */
router.get('/sitemap', async (req, res) => {
  try {
    const hugoService = hugoIntegration.hugoIntegration.hugoService;
    const sitemap = await hugoService.generateSitemap();
    
    res.json({
      success: sitemap.success,
      data: sitemap,
      message: sitemap.success ? 'Sitemap generated' : 'Sitemap generation failed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Hugo API Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Export router and integration instance for cleanup
router.hugoIntegration = hugoIntegration;

module.exports = router;