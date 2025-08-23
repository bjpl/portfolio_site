/**
 * Analytics API Routes
 * Website analytics and metrics endpoints
 */

const express = require('express');
const { query, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

const { Project, User, MediaAsset } = require('../../../models');
const { authenticateToken, requireRole, optionalAuth } = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Analytics data storage paths
const ANALYTICS_DIR = path.join(process.cwd(), '..', 'logs', 'analytics');
const DAILY_STATS_FILE = (date) => path.join(ANALYTICS_DIR, `${date}.json`);

// Ensure analytics directory exists
fs.mkdir(ANALYTICS_DIR, { recursive: true }).catch(err => {
  logger.warn('Failed to create analytics directory', { error: err.message });
});

// Validation helpers
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Utility functions for analytics data
const getCurrentDateString = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
};

const getDateRange = (period) => {
  const now = new Date();
  const ranges = {
    '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
    '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  };
  
  return ranges[period] || ranges['30d'];
};

// Analytics data storage functions
const readAnalyticsData = async (date) => {
  try {
    const filePath = DAILY_STATS_FILE(date);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        date,
        pageViews: {},
        projectViews: {},
        blogViews: {},
        uniqueVisitors: new Set(),
        referrers: {},
        countries: {},
        devices: {},
        browsers: {},
        totalVisits: 0,
        totalPageViews: 0,
        bounceRate: 0,
        avgSessionDuration: 0
      };
    }
    throw error;
  }
};

const writeAnalyticsData = async (date, data) => {
  try {
    const filePath = DAILY_STATS_FILE(date);
    
    // Convert Sets to Arrays for JSON serialization
    const serializedData = {
      ...data,
      uniqueVisitors: Array.from(data.uniqueVisitors)
    };
    
    await fs.writeFile(filePath, JSON.stringify(serializedData, null, 2));
  } catch (error) {
    logger.error('Failed to write analytics data', { error: error.message, date });
  }
};

const trackPageView = async (page, visitorId, referrer, country, device, browser) => {
  try {
    const today = getCurrentDateString();
    const data = await readAnalyticsData(today);
    
    // Track page views
    data.pageViews[page] = (data.pageViews[page] || 0) + 1;
    data.totalPageViews++;
    
    // Track unique visitors
    if (!data.uniqueVisitors.includes(visitorId)) {
      data.uniqueVisitors.push(visitorId);
    }
    
    // Track referrers
    if (referrer && referrer !== 'direct') {
      data.referrers[referrer] = (data.referrers[referrer] || 0) + 1;
    }
    
    // Track countries
    if (country) {
      data.countries[country] = (data.countries[country] || 0) + 1;
    }
    
    // Track devices
    if (device) {
      data.devices[device] = (data.devices[device] || 0) + 1;
    }
    
    // Track browsers
    if (browser) {
      data.browsers[browser] = (data.browsers[browser] || 0) + 1;
    }
    
    await writeAnalyticsData(today, data);
  } catch (error) {
    logger.error('Failed to track page view', { error: error.message });
  }
};

/**
 * @route POST /api/v1/analytics/track
 * @desc Track page view or event
 * @access Public
 */
router.post('/track',
  [
    query('page').optional().isString().isLength({ max: 255 }),
    query('event').optional().isString().isLength({ max: 100 }),
    query('project').optional().isUUID(),
    query('blog').optional().isString().isLength({ max: 255 })
  ],
  handleValidationErrors,
  optionalAuth,
  async (req, res) => {
    try {
      const {
        page = '/',
        event,
        project,
        blog
      } = req.query;

      // Extract visitor information
      const visitorId = req.headers['x-visitor-id'] || 
                       req.ip + '|' + (req.headers['user-agent'] || '').substring(0, 50);
      
      const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
      const userAgent = req.headers['user-agent'] || '';
      
      // Simple device detection
      const device = /mobile|android|iphone|ipad/i.test(userAgent) ? 'mobile' : 
                     /tablet|ipad/i.test(userAgent) ? 'tablet' : 'desktop';
      
      // Simple browser detection
      const browser = userAgent.includes('Chrome') ? 'Chrome' :
                      userAgent.includes('Firefox') ? 'Firefox' :
                      userAgent.includes('Safari') ? 'Safari' :
                      userAgent.includes('Edge') ? 'Edge' : 'Other';

      // Country detection would typically use a GeoIP service
      const country = 'Unknown'; // Placeholder

      // Track the page view
      await trackPageView(page, visitorId, referrer, country, device, browser);

      // Track specific content views
      if (project) {
        const projectRecord = await Project.findByPk(project);
        if (projectRecord) {
          await projectRecord.increment('viewCount');
          
          const today = getCurrentDateString();
          const data = await readAnalyticsData(today);
          data.projectViews[project] = (data.projectViews[project] || 0) + 1;
          await writeAnalyticsData(today, data);
        }
      }

      if (blog) {
        const today = getCurrentDateString();
        const data = await readAnalyticsData(today);
        data.blogViews[blog] = (data.blogViews[blog] || 0) + 1;
        await writeAnalyticsData(today, data);
      }

      // Track custom events
      if (event) {
        logger.info('Custom event tracked', {
          event,
          page,
          visitorId: visitorId.substring(0, 20) + '...',
          device,
          browser
        });
      }

      res.json({
        success: true,
        message: 'Tracking data recorded'
      });

    } catch (error) {
      logger.error('Analytics tracking failed', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        error: 'Tracking failed',
        code: 'TRACKING_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/analytics/overview
 * @desc Get analytics overview
 * @access Admin
 */
router.get('/overview',
  authenticateToken,
  requireRole(['admin']),
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    query('timezone').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { period = '30d', timezone = 'UTC' } = req.query;
      const startDate = getDateRange(period);
      const now = new Date();

      // Get database metrics
      const [
        totalProjects,
        totalBlogPosts,
        totalUsers,
        recentProjects,
        topProjects
      ] = await Promise.all([
        Project.count({ where: { status: 'published' } }),
        // Blog posts would be counted from filesystem or blog model
        0, // Placeholder
        User.count({ where: { isActive: true } }),
        Project.count({
          where: {
            createdAt: { [Op.gte]: startDate },
            status: 'published'
          }
        }),
        Project.findAll({
          where: { status: 'published' },
          order: [['viewCount', 'DESC']],
          limit: 10,
          attributes: ['id', 'title', 'slug', 'viewCount', 'createdAt']
        })
      ]);

      // Aggregate analytics data for the period
      let totalPageViews = 0;
      let uniqueVisitors = new Set();
      let topPages = {};
      let referrers = {};
      let countries = {};
      let devices = {};
      let browsers = {};

      // Read analytics files for the period
      const days = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
      for (let i = 0; i < days; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        try {
          const dayData = await readAnalyticsData(date);
          
          totalPageViews += dayData.totalPageViews || 0;
          
          if (Array.isArray(dayData.uniqueVisitors)) {
            dayData.uniqueVisitors.forEach(visitor => uniqueVisitors.add(visitor));
          }
          
          // Aggregate page views
          Object.entries(dayData.pageViews || {}).forEach(([page, views]) => {
            topPages[page] = (topPages[page] || 0) + views;
          });
          
          // Aggregate referrers
          Object.entries(dayData.referrers || {}).forEach(([ref, count]) => {
            referrers[ref] = (referrers[ref] || 0) + count;
          });
          
          // Aggregate other metrics
          Object.entries(dayData.countries || {}).forEach(([country, count]) => {
            countries[country] = (countries[country] || 0) + count;
          });
          
          Object.entries(dayData.devices || {}).forEach(([device, count]) => {
            devices[device] = (devices[device] || 0) + count;
          });
          
          Object.entries(dayData.browsers || {}).forEach(([browser, count]) => {
            browsers[browser] = (browsers[browser] || 0) + count;
          });
          
        } catch (error) {
          // Skip days with no data
          continue;
        }
      }

      // Sort and limit top items
      const sortEntries = (obj, limit = 10) => 
        Object.entries(obj)
          .sort(([,a], [,b]) => b - a)
          .slice(0, limit)
          .map(([key, value]) => ({ name: key, value }));

      const overview = {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        
        // Traffic metrics
        traffic: {
          totalPageViews,
          uniqueVisitors: uniqueVisitors.size,
          avgPageViewsPerVisitor: uniqueVisitors.size > 0 ? 
            Math.round((totalPageViews / uniqueVisitors.size) * 100) / 100 : 0,
          topPages: sortEntries(topPages, 10)
        },
        
        // Content metrics
        content: {
          totalProjects,
          totalBlogPosts,
          recentProjects,
          topProjects: topProjects.map(project => ({
            id: project.id,
            title: project.title,
            slug: project.slug,
            viewCount: project.viewCount,
            createdAt: project.createdAt
          }))
        },
        
        // User metrics
        users: {
          totalUsers,
          newUsersThisPeriod: await User.count({
            where: {
              createdAt: { [Op.gte]: startDate }
            }
          })
        },
        
        // Traffic sources
        sources: {
          referrers: sortEntries(referrers, 10),
          countries: sortEntries(countries, 10),
          devices: sortEntries(devices),
          browsers: sortEntries(browsers)
        }
      };

      res.json({ analytics: overview });

    } catch (error) {
      logger.error('Failed to get analytics overview', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get analytics overview',
        code: 'ANALYTICS_OVERVIEW_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/analytics/projects
 * @desc Get project-specific analytics
 * @access Admin
 */
router.get('/projects',
  authenticateToken,
  requireRole(['admin']),
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { period = '30d', limit = 20 } = req.query;
      const startDate = getDateRange(period);

      // Get project analytics
      const projects = await Project.findAll({
        where: {
          status: 'published',
          createdAt: { [Op.gte]: startDate }
        },
        order: [['viewCount', 'DESC']],
        limit: parseInt(limit),
        attributes: [
          'id', 'title', 'slug', 'viewCount', 'featured', 
          'createdAt', 'updatedAt'
        ],
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      // Aggregate project view data from analytics files
      const projectViews = {};
      const days = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        try {
          const dayData = await readAnalyticsData(date);
          Object.entries(dayData.projectViews || {}).forEach(([projectId, views]) => {
            projectViews[projectId] = (projectViews[projectId] || 0) + views;
          });
        } catch (error) {
          continue;
        }
      }

      const projectAnalytics = projects.map(project => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        featured: project.featured,
        author: project.author ? 
          `${project.author.firstName || ''} ${project.author.lastName || ''}`.trim() : 
          'Unknown',
        metrics: {
          totalViews: project.viewCount,
          periodViews: projectViews[project.id] || 0,
          viewsPerDay: Math.round((projectViews[project.id] || 0) / days * 10) / 10
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));

      res.json({
        projects: projectAnalytics,
        period,
        totalProjects: projectAnalytics.length,
        summary: {
          totalViews: projectAnalytics.reduce((sum, p) => sum + p.metrics.totalViews, 0),
          periodViews: projectAnalytics.reduce((sum, p) => sum + p.metrics.periodViews, 0),
          avgViewsPerProject: projectAnalytics.length > 0 ? 
            Math.round(projectAnalytics.reduce((sum, p) => sum + p.metrics.periodViews, 0) / projectAnalytics.length) : 0
        }
      });

    } catch (error) {
      logger.error('Failed to get project analytics', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get project analytics',
        code: 'PROJECT_ANALYTICS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/analytics/realtime
 * @desc Get real-time analytics data
 * @access Admin
 */
router.get('/realtime',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const today = getCurrentDateString();
      const data = await readAnalyticsData(today);

      // Get recent activity (last 24 hours)
      const realtimeData = {
        timestamp: new Date().toISOString(),
        today: {
          pageViews: data.totalPageViews || 0,
          uniqueVisitors: Array.isArray(data.uniqueVisitors) ? data.uniqueVisitors.length : 0,
          topPages: Object.entries(data.pageViews || {})
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([page, views]) => ({ page, views }))
        },
        currentStats: {
          totalProjects: await Project.count({ where: { status: 'published' } }),
          totalUsers: await User.count({ where: { isActive: true } }),
          totalMediaAssets: await MediaAsset.count()
        },
        recentActivity: {
          newProjects: await Project.count({
            where: {
              createdAt: {
                [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }),
          newUsers: await User.count({
            where: {
              createdAt: {
                [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          })
        }
      };

      res.json({ realtime: realtimeData });

    } catch (error) {
      logger.error('Failed to get realtime analytics', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get realtime analytics',
        code: 'REALTIME_ANALYTICS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/analytics/export
 * @desc Export analytics data
 * @access Admin
 */
router.get('/export',
  authenticateToken,
  requireRole(['admin']),
  [
    query('period').optional().isIn(['24h', '7d', '30d', '90d', '1y']),
    query('format').optional().isIn(['json', 'csv'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { period = '30d', format = 'json' } = req.query;
      const startDate = getDateRange(period);
      const endDate = new Date();

      // Collect all analytics data for the period
      const analyticsData = [];
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      for (let i = 0; i < days; i++) {
        const date = new Date(endDate - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        try {
          const dayData = await readAnalyticsData(date);
          analyticsData.push(dayData);
        } catch (error) {
          // Add empty data for days with no analytics
          analyticsData.push({
            date,
            totalPageViews: 0,
            uniqueVisitors: [],
            pageViews: {},
            projectViews: {},
            referrers: {}
          });
        }
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        data: analyticsData
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = ['Date', 'Page Views', 'Unique Visitors', 'Top Page', 'Top Referrer'];
        const csvRows = analyticsData.map(day => [
          day.date,
          day.totalPageViews || 0,
          Array.isArray(day.uniqueVisitors) ? day.uniqueVisitors.length : 0,
          Object.keys(day.pageViews || {})[0] || '',
          Object.keys(day.referrers || {})[0] || ''
        ]);

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${period}-${getCurrentDateString()}.csv"`);
        res.send(csvContent);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${period}-${getCurrentDateString()}.json"`);
        res.json(exportData);
      }

    } catch (error) {
      logger.error('Failed to export analytics', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to export analytics',
        code: 'ANALYTICS_EXPORT_ERROR'
      });
    }
  }
);

module.exports = router;