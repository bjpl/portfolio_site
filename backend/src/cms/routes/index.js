const express = require('express');
const blogRoutes = require('./blogRoutes');
const portfolioRoutes = require('./portfolioRoutes');
const mediaRoutes = require('./mediaRoutes');
const adminRoutes = require('./adminRoutes');
const commentRoutes = require('./commentRoutes');
const categoryRoutes = require('./categoryRoutes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'CMS API'
  });
});

// API routes
router.use('/blogs', blogRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/media', mediaRoutes);
router.use('/admin', adminRoutes);
router.use('/comments', commentRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;