const express = require('express');
const BlogController = require('../controllers/BlogController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { validateBlog, validateBlogUpdate } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for blog endpoints
const blogCreateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 posts per hour
  message: { error: 'Too many blog posts created. Please try again later.' }
});

const blogUpdateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 updates per 15 minutes
  message: { error: 'Too many blog updates. Please try again later.' }
});

// Public routes
router.get('/', BlogController.getAllBlogs);
router.get('/stats', BlogController.getBlogStats);
router.get('/:slug', BlogController.getBlogBySlug);

// Protected routes - require authentication
router.post('/', 
  authenticateToken, 
  blogCreateLimit,
  validateBlog,
  BlogController.createBlog
);

router.put('/:id', 
  authenticateToken, 
  blogUpdateLimit,
  validateBlogUpdate,
  BlogController.updateBlog
);

router.delete('/:id', 
  authenticateToken, 
  BlogController.deleteBlog
);

// Version management
router.get('/:id/versions', 
  authenticateToken, 
  BlogController.getBlogVersions
);

router.post('/:id/versions/:versionId/restore', 
  authenticateToken, 
  BlogController.restoreBlogVersion
);

module.exports = router;