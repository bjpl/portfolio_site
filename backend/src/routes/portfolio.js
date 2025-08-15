const express = require('express');
const { body } = require('express-validator');

const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, validationRules, validators } = require('../middleware/validation');
const portfolioService = require('../services/portfolioService');
const logger = require('../utils/logger');

/**
 * Get portfolio owner's profile
 * GET /api/portfolio/profile
 */
router.get('/profile', optionalAuth, async (req, res) => {
  try {
    const profile = await portfolioService.getProfile();
    res.json(profile);
  } catch (error) {
    logger.error('Error fetching portfolio profile', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Update portfolio profile (admin only)
 * PUT /api/portfolio/profile
 */
router.put('/profile', authenticate, validate([validators.metadata]), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const profile = await portfolioService.updateProfile(req.body);
    logger.audit('PROFILE_UPDATE', req.user.id, { changes: req.body });
    res.json(profile);
  } catch (error) {
    logger.error('Error updating portfolio profile', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Get featured projects
 * GET /api/portfolio/projects/featured
 */
router.get('/projects/featured', async (req, res) => {
  try {
    const projects = await portfolioService.getFeaturedProjects();
    res.json(projects);
  } catch (error) {
    logger.error('Error fetching featured projects', error);
    res.status(500).json({ error: 'Failed to fetch featured projects' });
  }
});

/**
 * Get all projects with filtering
 * GET /api/portfolio/projects
 */
router.get('/projects', validate(validationRules.listContent), async (req, res) => {
  try {
    const { page = 1, limit = 12, category, technology, sortBy = 'date', sortOrder = 'desc' } = req.query;

    const projects = await portfolioService.getProjects({
      page,
      limit,
      category,
      technology,
      sortBy,
      sortOrder,
    });

    res.json(projects);
  } catch (error) {
    logger.error('Error fetching projects', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * Get single project by slug
 * GET /api/portfolio/projects/:slug
 */
router.get('/projects/:slug', validate([validators.slug]), async (req, res) => {
  try {
    const project = await portfolioService.getProjectBySlug(req.params.slug);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Track view
    await portfolioService.trackProjectView(req.params.slug, req.ip);

    res.json(project);
  } catch (error) {
    logger.error('Error fetching project', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * Create new project (admin/editor only)
 * POST /api/portfolio/projects
 */
router.post(
  '/projects',
  authenticate,
  validate([validators.title, validators.content, validators.metadata]),
  async (req, res) => {
    try {
      if (!['admin', 'editor'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const project = await portfolioService.createProject({
        ...req.body,
        authorId: req.user.id,
      });

      logger.audit('PROJECT_CREATE', req.user.id, { projectId: project.id });
      res.status(201).json(project);
    } catch (error) {
      logger.error('Error creating project', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

/**
 * Update project (admin/editor only)
 * PUT /api/portfolio/projects/:id
 */
router.put(
  '/projects/:id',
  authenticate,
  validate([validators.id, validators.title.optional(), validators.content.optional(), validators.metadata]),
  async (req, res) => {
    try {
      if (!['admin', 'editor'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const project = await portfolioService.updateProject(req.params.id, req.body);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      logger.audit('PROJECT_UPDATE', req.user.id, {
        projectId: req.params.id,
        changes: req.body,
      });

      res.json(project);
    } catch (error) {
      logger.error('Error updating project', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

/**
 * Delete project (admin only)
 * DELETE /api/portfolio/projects/:id
 */
router.delete('/projects/:id', authenticate, validate([validators.id]), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await portfolioService.deleteProject(req.params.id);

    logger.audit('PROJECT_DELETE', req.user.id, { projectId: req.params.id });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Error deleting project', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * Get skills/technologies
 * GET /api/portfolio/skills
 */
router.get('/skills', async (req, res) => {
  try {
    const skills = await portfolioService.getSkills();
    res.json(skills);
  } catch (error) {
    logger.error('Error fetching skills', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

/**
 * Get experience timeline
 * GET /api/portfolio/experience
 */
router.get('/experience', async (req, res) => {
  try {
    const experience = await portfolioService.getExperience();
    res.json(experience);
  } catch (error) {
    logger.error('Error fetching experience', error);
    res.status(500).json({ error: 'Failed to fetch experience' });
  }
});

/**
 * Get education
 * GET /api/portfolio/education
 */
router.get('/education', async (req, res) => {
  try {
    const education = await portfolioService.getEducation();
    res.json(education);
  } catch (error) {
    logger.error('Error fetching education', error);
    res.status(500).json({ error: 'Failed to fetch education' });
  }
});

/**
 * Get testimonials
 * GET /api/portfolio/testimonials
 */
router.get('/testimonials', async (req, res) => {
  try {
    const testimonials = await portfolioService.getTestimonials();
    res.json(testimonials);
  } catch (error) {
    logger.error('Error fetching testimonials', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

/**
 * Submit contact form
 * POST /api/portfolio/contact
 */
router.post(
  '/contact',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('subject').trim().isLength({ min: 2, max: 200 }).escape(),
    body('message').trim().isLength({ min: 10, max: 5000 }).escape(),
    body('website').optional().trim(), // Honeypot field
  ],
  async (req, res) => {
    try {
      // Check honeypot
      if (req.body.website) {
        logger.security('HONEYPOT_TRIGGERED', req, { form: 'contact' });
        return res.json({ message: 'Message sent successfully' }); // Fake success
      }

      const result = await portfolioService.submitContactForm({
        ...req.body,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ message: 'Message sent successfully' });
    } catch (error) {
      logger.error('Error submitting contact form', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

/**
 * Get portfolio statistics
 * GET /api/portfolio/stats
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const stats = await portfolioService.getStatistics(isAdmin);
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching portfolio stats', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Get recent blog posts
 * GET /api/portfolio/blog/recent
 */
router.get('/blog/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const posts = await portfolioService.getRecentBlogPosts(limit);
    res.json(posts);
  } catch (error) {
    logger.error('Error fetching recent blog posts', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

/**
 * Get achievements/certifications
 * GET /api/portfolio/achievements
 */
router.get('/achievements', async (req, res) => {
  try {
    const achievements = await portfolioService.getAchievements();
    res.json(achievements);
  } catch (error) {
    logger.error('Error fetching achievements', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * Download resume/CV
 * GET /api/portfolio/resume
 */
router.get('/resume', async (req, res) => {
  try {
    const format = req.query.format || 'pdf';
    const resumePath = await portfolioService.getResume(format);

    if (!resumePath) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.download(resumePath);
  } catch (error) {
    logger.error('Error downloading resume', error);
    res.status(500).json({ error: 'Failed to download resume' });
  }
});

module.exports = router;
