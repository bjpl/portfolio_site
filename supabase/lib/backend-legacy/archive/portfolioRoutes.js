const express = require('express');
const PortfolioController = require('../controllers/PortfolioController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { validateProject, validateProjectUpdate } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting
const projectCreateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 projects per hour
  message: { error: 'Too many projects created. Please try again later.' }
});

// Public routes
router.get('/', PortfolioController.getAllProjects);
router.get('/featured', PortfolioController.getFeaturedProjects);
router.get('/stats', PortfolioController.getProjectStats);
router.get('/:slug', PortfolioController.getProjectBySlug);

// Protected routes
router.post('/', 
  authenticateToken, 
  projectCreateLimit,
  validateProject,
  PortfolioController.createProject
);

router.put('/:id', 
  authenticateToken, 
  validateProjectUpdate,
  PortfolioController.updateProject
);

router.delete('/:id', 
  authenticateToken, 
  PortfolioController.deleteProject
);

router.post('/:id/toggle-featured', 
  authenticateToken, 
  PortfolioController.toggleFeatured
);

module.exports = router;