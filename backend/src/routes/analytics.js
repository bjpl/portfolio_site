const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const db = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Track page view
 * POST /api/analytics/track
 */
router.post('/track',
  [
    body('page').notEmpty().trim(),
    body('title').optional().trim(),
    body('referrer').optional().trim(),
    body('userAgent').optional().trim(),
    body('language').optional().trim(),
    body('screenResolution').optional().trim(),
    body('timestamp').optional().isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const {
        page,
        title,
        referrer,
        userAgent,
        language = 'en',
        screenResolution,
        timestamp = new Date()
      } = req.body;

      // Extract device info from user agent
      const deviceInfo = parseUserAgent(userAgent || req.headers['user-agent']);

      // Create analytics entry
      await db.Analytics.create({
        page,
        title,
        referrer,
        userAgent: userAgent || req.headers['user-agent'],
        ipAddress: getClientIP(req),
        language,
        screenResolution,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        operatingSystem: deviceInfo.os,
        country: 'Unknown', // Would integrate with IP geolocation service
        timestamp: new Date(timestamp),
        sessionId: req.headers['x-session-id'] || generateSessionId(),
        userId: req.user?.id || null
      });

      res.status(201).json({ message: 'Page view tracked' });

    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get analytics overview
 * GET /api/analytics/overview
 */
router.get('/overview',
  authenticate,
  requireRole(['admin', 'editor']),
  [
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  async (req, res) => {
    try {
      const { timeRange = '30d', startDate, endDate } = req.query;

      // Calculate date range
      const dateRange = getDateRange(timeRange, startDate, endDate);

      // Get basic stats
      const totalViews = await db.Analytics.count({
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        }
      });

      const uniqueVisitors = await db.Analytics.count({
        distinct: true,
        col: 'sessionId',
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        }
      });

      // Calculate bounce rate (single page sessions)
      const totalSessions = await db.Analytics.findAll({
        attributes: ['sessionId', [db.sequelize.fn('COUNT', db.sequelize.col('sessionId')), 'pageCount']],
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: ['sessionId'],
        raw: true
      });

      const singlePageSessions = totalSessions.filter(session => session.pageCount === 1).length;
      const bounceRate = totalSessions.length > 0 ? (singlePageSessions / totalSessions.length * 100).toFixed(1) : 0;

      // Calculate average session duration
      const sessionDurations = await calculateSessionDurations(dateRange);
      const avgSessionDuration = sessionDurations.length > 0 
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length 
        : 0;

      // Get previous period for comparison
      const prevDateRange = getPreviousDateRange(timeRange, dateRange);
      const prevTotalViews = await db.Analytics.count({
        where: {
          timestamp: {
            [Op.between]: [prevDateRange.start, prevDateRange.end]
          }
        }
      });

      const prevUniqueVisitors = await db.Analytics.count({
        distinct: true,
        col: 'sessionId',
        where: {
          timestamp: {
            [Op.between]: [prevDateRange.start, prevDateRange.end]
          }
        }
      });

      res.json({
        overview: {
          totalViews,
          uniqueVisitors,
          bounceRate: parseFloat(bounceRate),
          avgSessionDuration: formatDuration(avgSessionDuration),
          period: timeRange,
          dateRange: {
            start: dateRange.start,
            end: dateRange.end
          }
        },
        comparison: {
          viewsChange: calculatePercentageChange(totalViews, prevTotalViews),
          visitorsChange: calculatePercentageChange(uniqueVisitors, prevUniqueVisitors)
        }
      });

    } catch (error) {
      console.error('Analytics overview error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get page analytics
 * GET /api/analytics/pages
 */
router.get('/pages',
  authenticate,
  requireRole(['admin', 'editor']),
  [
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res) => {
    try {
      const { timeRange = '30d', limit = 20 } = req.query;
      const dateRange = getDateRange(timeRange);

      const pageStats = await db.Analytics.findAll({
        attributes: [
          'page',
          'title',
          [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'views'],
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('sessionId'))), 'uniqueViews']
        ],
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: ['page', 'title'],
        order: [[db.sequelize.fn('COUNT', db.sequelize.col('*')), 'DESC']],
        limit: parseInt(limit),
        raw: true
      });

      // Calculate percentage of total traffic for each page
      const totalViews = pageStats.reduce((sum, page) => sum + parseInt(page.views), 0);
      const enrichedStats = pageStats.map(page => ({
        ...page,
        views: parseInt(page.views),
        uniqueViews: parseInt(page.uniqueViews),
        percentage: totalViews > 0 ? ((parseInt(page.views) / totalViews) * 100).toFixed(1) : 0
      }));

      res.json({ pages: enrichedStats, totalViews });

    } catch (error) {
      console.error('Page analytics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get traffic sources
 * GET /api/analytics/sources
 */
router.get('/sources',
  authenticate,
  requireRole(['admin', 'editor']),
  [query('timeRange').optional().isIn(['7d', '30d', '90d', '1y'])],
  validate,
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const dateRange = getDateRange(timeRange);

      const sources = await db.Analytics.findAll({
        attributes: [
          [db.sequelize.fn('COALESCE', db.sequelize.col('referrer'), 'Direct'), 'source'],
          [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'visits'],
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('sessionId'))), 'uniqueVisitors']
        ],
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: [db.sequelize.fn('COALESCE', db.sequelize.col('referrer'), 'Direct')],
        order: [[db.sequelize.fn('COUNT', db.sequelize.col('*')), 'DESC']],
        limit: 10,
        raw: true
      });

      // Categorize sources
      const categorizedSources = sources.map(source => ({
        ...source,
        visits: parseInt(source.visits),
        uniqueVisitors: parseInt(source.uniqueVisitors),
        category: categorizeReferrer(source.source)
      }));

      res.json({ sources: categorizedSources });

    } catch (error) {
      console.error('Traffic sources error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get device and browser analytics
 * GET /api/analytics/devices
 */
router.get('/devices',
  authenticate,
  requireRole(['admin', 'editor']),
  [query('timeRange').optional().isIn(['7d', '30d', '90d', '1y'])],
  validate,
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const dateRange = getDateRange(timeRange);

      // Device types
      const deviceTypes = await db.Analytics.findAll({
        attributes: [
          'deviceType',
          [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'count']
        ],
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: ['deviceType'],
        order: [[db.sequelize.fn('COUNT', db.sequelize.col('*')), 'DESC']],
        raw: true
      });

      // Browsers
      const browsers = await db.Analytics.findAll({
        attributes: [
          'browser',
          [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'count']
        ],
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: ['browser'],
        order: [[db.sequelize.fn('COUNT', db.sequelize.col('*')), 'DESC']],
        limit: 10,
        raw: true
      });

      // Operating systems
      const operatingSystems = await db.Analytics.findAll({
        attributes: [
          'operatingSystem',
          [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'count']
        ],
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: ['operatingSystem'],
        order: [[db.sequelize.fn('COUNT', db.sequelize.col('*')), 'DESC']],
        limit: 10,
        raw: true
      });

      const totalVisits = await db.Analytics.count({
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        }
      });

      // Calculate percentages
      const formatStats = (stats) => stats.map(stat => ({
        ...stat,
        count: parseInt(stat.count),
        percentage: totalVisits > 0 ? ((parseInt(stat.count) / totalVisits) * 100).toFixed(1) : 0
      }));

      res.json({
        deviceTypes: formatStats(deviceTypes),
        browsers: formatStats(browsers),
        operatingSystems: formatStats(operatingSystems),
        totalVisits
      });

    } catch (error) {
      console.error('Device analytics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get geographic analytics
 * GET /api/analytics/geography
 */
router.get('/geography',
  authenticate,
  requireRole(['admin', 'editor']),
  [query('timeRange').optional().isIn(['7d', '30d', '90d', '1y'])],
  validate,
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const dateRange = getDateRange(timeRange);

      const countries = await db.Analytics.findAll({
        attributes: [
          'country',
          [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'visits'],
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('sessionId'))), 'uniqueVisitors']
        ],
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: ['country'],
        order: [[db.sequelize.fn('COUNT', db.sequelize.col('*')), 'DESC']],
        limit: 20,
        raw: true
      });

      const totalVisits = countries.reduce((sum, country) => sum + parseInt(country.visits), 0);

      const enrichedCountries = countries.map(country => ({
        ...country,
        visits: parseInt(country.visits),
        uniqueVisitors: parseInt(country.uniqueVisitors),
        percentage: totalVisits > 0 ? ((parseInt(country.visits) / totalVisits) * 100).toFixed(1) : 0
      }));

      res.json({ countries: enrichedCountries, totalVisits });

    } catch (error) {
      console.error('Geography analytics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get time-based analytics for charts
 * GET /api/analytics/timeseries
 */
router.get('/timeseries',
  authenticate,
  requireRole(['admin', 'editor']),
  [
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']),
    query('metric').optional().isIn(['views', 'visitors', 'sessions'])
  ],
  validate,
  async (req, res) => {
    try {
      const { timeRange = '30d', metric = 'views' } = req.query;
      const dateRange = getDateRange(timeRange);

      // Determine grouping based on time range
      const groupFormat = getTimeGroupFormat(timeRange);

      let query;
      if (metric === 'visitors') {
        query = {
          attributes: [
            [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('timestamp'), groupFormat), 'date'],
            [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('sessionId'))), 'value']
          ]
        };
      } else {
        query = {
          attributes: [
            [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('timestamp'), groupFormat), 'date'],
            [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'value']
          ]
        };
      }

      const timeseries = await db.Analytics.findAll({
        ...query,
        where: {
          timestamp: {
            [Op.between]: [dateRange.start, dateRange.end]
          }
        },
        group: [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('timestamp'), groupFormat)],
        order: [[db.sequelize.fn('DATE_FORMAT', db.sequelize.col('timestamp'), groupFormat), 'ASC']],
        raw: true
      });

      const formattedData = timeseries.map(point => ({
        date: point.date,
        value: parseInt(point.value)
      }));

      res.json({
        data: formattedData,
        metric,
        timeRange,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        }
      });

    } catch (error) {
      console.error('Timeseries analytics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Helper functions
function parseUserAgent(userAgent) {
  if (!userAgent) return { deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' };

  const ua = userAgent.toLowerCase();
  
  // Device type detection
  let deviceType = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'Tablet';
  }

  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';

  // OS detection
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { deviceType, browser, os };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'Unknown';
}

function generateSessionId() {
  return require('crypto').randomBytes(16).toString('hex');
}

function getDateRange(timeRange, startDate, endDate) {
  const end = endDate ? new Date(endDate) : new Date();
  let start;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (timeRange) {
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  return { start, end };
}

function getPreviousDateRange(timeRange, currentRange) {
  const duration = currentRange.end.getTime() - currentRange.start.getTime();
  return {
    start: new Date(currentRange.start.getTime() - duration),
    end: new Date(currentRange.start.getTime())
  };
}

function getTimeGroupFormat(timeRange) {
  switch (timeRange) {
    case '7d':
      return '%Y-%m-%d %H:00:00'; // Hourly for 7 days
    case '30d':
      return '%Y-%m-%d'; // Daily for 30 days
    case '90d':
    case '1y':
      return '%Y-%u'; // Weekly for 90 days and 1 year
    default:
      return '%Y-%m-%d';
  }
}

function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function categorizeReferrer(referrer) {
  if (!referrer || referrer === 'Direct') return 'Direct';
  
  const domain = referrer.toLowerCase();
  if (domain.includes('google')) return 'Search';
  if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('linkedin')) return 'Social';
  if (domain.includes('github')) return 'Code Repository';
  return 'Other';
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

async function calculateSessionDurations(dateRange) {
  // Simplified session duration calculation
  // In a real implementation, you'd track session start/end times more precisely
  const sessions = await db.Analytics.findAll({
    attributes: [
      'sessionId',
      [db.sequelize.fn('MIN', db.sequelize.col('timestamp')), 'startTime'],
      [db.sequelize.fn('MAX', db.sequelize.col('timestamp')), 'endTime'],
      [db.sequelize.fn('COUNT', db.sequelize.col('*')), 'pageViews']
    ],
    where: {
      timestamp: {
        [Op.between]: [dateRange.start, dateRange.end]
      }
    },
    group: ['sessionId'],
    having: db.sequelize.literal('COUNT(*) > 1'), // Only multi-page sessions
    raw: true
  });

  return sessions.map(session => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    return Math.max(0, (end.getTime() - start.getTime()) / 1000); // Duration in seconds
  });
}

module.exports = router;