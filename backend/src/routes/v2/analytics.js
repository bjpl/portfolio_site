/**
 * Analytics and Reporting API Routes
 * Comprehensive metrics collection and reporting system
 */

const express = require('express');
const { query, param, body } = require('express-validator');
const analyticsService = require('../../services/analyticsService');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { cacheMiddleware } = require('../../middleware/cache');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v2/analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     description: Returns comprehensive analytics overview with key metrics
 *     tags: [Analytics]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year, custom]
 *           default: month
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period
 *       - name: timezone
 *         in: query
 *         schema:
 *           type: string
 *           default: UTC
 *       - name: compare
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include comparison with previous period
 *     responses:
 *       200:
 *         description: Analytics overview
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsOverview'
 */
router.get('/overview', [
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year', 'custom']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('timezone').optional().isString(),
  query('compare').optional().isBoolean(),
  validateRequest
], cacheMiddleware(300), async (req, res) => {
  try {
    const {
      period = 'month',
      startDate,
      endDate,
      timezone = 'UTC',
      compare = false
    } = req.query;

    // Validate custom period dates
    if (period === 'custom' && (!startDate || !endDate)) {
      return res.status(400).json({
        error: 'Start date and end date are required for custom period',
        code: 'MISSING_DATE_RANGE',
        timestamp: new Date().toISOString()
      });
    }

    const analyticsOptions = {
      period,
      dateRange: period === 'custom' ? { start: startDate, end: endDate } : undefined,
      timezone,
      includeComparison: compare === 'true'
    };

    const overview = await analyticsService.getOverview(analyticsOptions);

    // Add cache headers
    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Analytics-Period': period,
      'X-Data-Freshness': overview.dataFreshness || 'real-time'
    });

    res.json(overview);
  } catch (error) {
    logger.error('Error fetching analytics overview:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics overview',
      code: 'ANALYTICS_OVERVIEW_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/traffic:
 *   get:
 *     summary: Get detailed traffic analytics
 *     tags: [Analytics]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: month
 *       - name: granularity
 *         in: query
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *           default: day
 *       - name: metrics
 *         in: query
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [views, visitors, sessions, bounce_rate, duration, pages_per_session]
 *         style: form
 *         explode: false
 *         description: Specific metrics to include
 *     responses:
 *       200:
 *         description: Traffic analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date-time
 *                     end:
 *                       type: string
 *                       format: date-time
 *                     granularity:
 *                       type: string
 *                 timeSeries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       views:
 *                         type: integer
 *                       visitors:
 *                         type: integer
 *                       sessions:
 *                         type: integer
 *                       bounceRate:
 *                         type: number
 *                       avgDuration:
 *                         type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalViews:
 *                       type: integer
 *                     uniqueVisitors:
 *                       type: integer
 *                     totalSessions:
 *                       type: integer
 *                     avgBounceRate:
 *                       type: number
 *                     avgSessionDuration:
 *                       type: number
 */
router.get('/traffic', [
  query('period').optional().isIn(['day', 'week', 'month']),
  query('granularity').optional().isIn(['hour', 'day', 'week']),
  query('metrics').optional().isArray(),
  validateRequest
], cacheMiddleware(300), async (req, res) => {
  try {
    const {
      period = 'month',
      granularity = 'day',
      metrics = ['views', 'visitors', 'sessions', 'bounce_rate', 'duration']
    } = req.query;

    const trafficData = await analyticsService.getTrafficAnalytics({
      period,
      granularity,
      metrics: Array.isArray(metrics) ? metrics : [metrics]
    });

    res.json(trafficData);
  } catch (error) {
    logger.error('Error fetching traffic analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch traffic analytics',
      code: 'TRAFFIC_ANALYTICS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/content:
 *   get:
 *     summary: Get content performance analytics
 *     tags: [Analytics]
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, blog, portfolio, tools, teaching, pages]
 *           default: all
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [views, engagement, shares, comments, bounce_rate]
 *           default: views
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Content performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalContent:
 *                       type: integer
 *                     totalViews:
 *                       type: integer
 *                     avgEngagement:
 *                       type: number
 *                     topPerforming:
 *                       type: integer
 *                 content:
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
 *                       url:
 *                         type: string
 *                       metrics:
 *                         $ref: '#/components/schemas/ContentMetrics'
 *                       trend:
 *                         type: object
 *                         properties:
 *                           direction:
 *                             type: string
 *                             enum: [up, down, stable]
 *                           percentage:
 *                             type: number
 */
router.get('/content', [
  query('type').optional().isIn(['all', 'blog', 'portfolio', 'tools', 'teaching', 'pages']),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('sort').optional().isIn(['views', 'engagement', 'shares', 'comments', 'bounce_rate']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateRequest
], cacheMiddleware(600), async (req, res) => {
  try {
    const {
      type = 'all',
      period = 'month',
      sort = 'views',
      limit = 20
    } = req.query;

    const contentAnalytics = await analyticsService.getContentPerformance({
      contentType: type === 'all' ? undefined : type,
      period,
      sortBy: sort,
      limit: parseInt(limit)
    });

    res.json(contentAnalytics);
  } catch (error) {
    logger.error('Error fetching content analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch content analytics',
      code: 'CONTENT_ANALYTICS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/content/{id}/metrics:
 *   get:
 *     summary: Get detailed metrics for specific content
 *     tags: [Analytics]
 *     parameters:
 *       - $ref: '#/components/parameters/ContentId'
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *       - name: includeHeatmap
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include scroll heatmap data
 *       - name: includeReferrers
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Content-specific metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContentMetrics'
 */
router.get('/content/:id/metrics', [
  param('id').isLength({ min: 1 }),
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  query('includeHeatmap').optional().isBoolean(),
  query('includeReferrers').optional().isBoolean(),
  validateRequest
], cacheMiddleware(300), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      period = 'month',
      includeHeatmap = false,
      includeReferrers = true
    } = req.query;

    const metrics = await analyticsService.getContentMetrics(id, {
      period,
      includeHeatmap: includeHeatmap === 'true',
      includeReferrers: includeReferrers === 'true'
    });

    if (!metrics) {
      return res.status(404).json({
        error: 'Content not found or no metrics available',
        code: 'CONTENT_METRICS_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching content metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch content metrics',
      code: 'CONTENT_METRICS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/audiences:
 *   get:
 *     summary: Get audience demographics and behavior
 *     tags: [Analytics]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *       - name: segment
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, new, returning, engaged]
 *           default: all
 *     responses:
 *       200:
 *         description: Audience analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     newUsers:
 *                       type: integer
 *                     returningUsers:
 *                       type: integer
 *                     userGrowth:
 *                       type: number
 *                 demographics:
 *                   type: object
 *                   properties:
 *                     countries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           code:
 *                             type: string
 *                           users:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     languages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           language:
 *                             type: string
 *                           users:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                 technology:
 *                   type: object
 *                   properties:
 *                     devices:
 *                       type: object
 *                       properties:
 *                         desktop:
 *                           type: integer
 *                         mobile:
 *                           type: integer
 *                         tablet:
 *                           type: integer
 *                     browsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           browser:
 *                             type: string
 *                           users:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     operatingSystems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           os:
 *                             type: string
 *                           users:
 *                             type: integer
 *                           percentage:
 *                             type: number
 */
router.get('/audiences', [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('segment').optional().isIn(['all', 'new', 'returning', 'engaged']),
  validateRequest
], cacheMiddleware(600), async (req, res) => {
  try {
    const {
      period = 'month',
      segment = 'all'
    } = req.query;

    const audienceData = await analyticsService.getAudienceAnalytics({
      period,
      segment
    });

    res.json(audienceData);
  } catch (error) {
    logger.error('Error fetching audience analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch audience analytics',
      code: 'AUDIENCE_ANALYTICS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/reports:
 *   get:
 *     summary: Generate and retrieve analytics reports
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: type
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [traffic, content-performance, audience, engagement, seo]
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year, custom]
 *           default: month
 *       - name: format
 *         in: query
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf, xlsx]
 *           default: json
 *       - name: email
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Email the report instead of returning it
 *       - name: schedule
 *         in: query
 *         schema:
 *           type: string
 *           enum: [once, daily, weekly, monthly]
 *           default: once
 *     responses:
 *       200:
 *         description: Generated report or report status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsReport'
 *           text/csv:
 *             schema:
 *               type: string
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/reports', [
  authenticateToken,
  query('type').isIn(['traffic', 'content-performance', 'audience', 'engagement', 'seo']),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year', 'custom']),
  query('format').optional().isIn(['json', 'csv', 'pdf', 'xlsx']),
  query('email').optional().isBoolean(),
  query('schedule').optional().isIn(['once', 'daily', 'weekly', 'monthly']),
  validateRequest
], async (req, res) => {
  try {
    const {
      type,
      period = 'month',
      format = 'json',
      email = false,
      schedule = 'once'
    } = req.query;

    const reportOptions = {
      type,
      period,
      format,
      userId: req.user.id,
      email: email === 'true',
      schedule
    };

    // For non-JSON formats or email reports, generate asynchronously
    if (format !== 'json' || email === 'true' || schedule !== 'once') {
      const reportJob = await analyticsService.generateReportAsync(reportOptions);
      
      return res.status(202).json({
        message: 'Report generation started',
        jobId: reportJob.id,
        status: 'processing',
        estimatedTime: analyticsService.getEstimatedReportTime(type, format),
        downloadUrl: `/api/v2/analytics/reports/${reportJob.id}/download`
      });
    }

    // For JSON reports, generate synchronously
    const report = await analyticsService.generateReport(reportOptions);

    res.json(report);
  } catch (error) {
    logger.error('Error generating analytics report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      code: 'REPORT_GENERATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/reports/{jobId}/download:
 *   get:
 *     summary: Download generated report
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Report not found or not ready
 */
router.get('/reports/:jobId/download', [
  authenticateToken,
  param('jobId').isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const reportFile = await analyticsService.downloadReport(jobId, userId);

    if (!reportFile) {
      return res.status(404).json({
        error: 'Report not found or not ready',
        code: 'REPORT_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', reportFile.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportFile.filename}"`);
    
    if (reportFile.mimeType === 'application/json') {
      res.json(reportFile.data);
    } else {
      res.send(reportFile.data);
    }
  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({
      error: 'Failed to download report',
      code: 'REPORT_DOWNLOAD_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/events:
 *   post:
 *     summary: Track custom analytics event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event, category]
 *             properties:
 *               event:
 *                 type: string
 *                 description: Event name
 *                 example: "button_click"
 *               category:
 *                 type: string
 *                 description: Event category
 *                 example: "engagement"
 *               label:
 *                 type: string
 *                 description: Event label
 *                 example: "contact_form"
 *               value:
 *                 type: number
 *                 description: Event value
 *               properties:
 *                 type: object
 *                 description: Additional event properties
 *               userId:
 *                 type: string
 *                 description: User ID (optional)
 *               sessionId:
 *                 type: string
 *                 description: Session ID
 *     responses:
 *       201:
 *         description: Event tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 eventId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/events', [
  body('event').isLength({ min: 1, max: 100 }).withMessage('Event name is required'),
  body('category').isLength({ min: 1, max: 50 }).withMessage('Event category is required'),
  body('label').optional().isLength({ max: 100 }),
  body('value').optional().isNumeric(),
  body('properties').optional().isObject(),
  body('userId').optional().isLength({ min: 1 }),
  body('sessionId').optional().isLength({ min: 1 }),
  validateRequest
], async (req, res) => {
  try {
    const {
      event,
      category,
      label,
      value,
      properties = {},
      userId,
      sessionId
    } = req.body;

    const eventData = {
      event,
      category,
      label,
      value,
      properties,
      userId,
      sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer'),
      timestamp: new Date()
    };

    const trackedEvent = await analyticsService.trackEvent(eventData);

    res.status(201).json({
      success: true,
      eventId: trackedEvent.id,
      timestamp: trackedEvent.timestamp
    });
  } catch (error) {
    logger.error('Error tracking analytics event:', error);
    res.status(500).json({
      error: 'Failed to track event',
      code: 'EVENT_TRACKING_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v2/analytics/realtime:
 *   get:
 *     summary: Get real-time analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: metrics
 *         in: query
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [active_users, page_views, events, sessions]
 *         style: form
 *         explode: false
 *         default: ["active_users", "page_views"]
 *     responses:
 *       200:
 *         description: Real-time analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 activeUsers:
 *                   type: integer
 *                 pageViews:
 *                   type: integer
 *                 events:
 *                   type: integer
 *                 sessions:
 *                   type: integer
 *                 topPages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       activeUsers:
 *                         type: integer
 *                 topReferrers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       source:
 *                         type: string
 *                       activeUsers:
 *                         type: integer
 */
router.get('/realtime', [
  authenticateToken,
  authorizeRole(['admin', 'editor']),
  query('metrics').optional().isArray(),
  validateRequest
], async (req, res) => {
  try {
    const {
      metrics = ['active_users', 'page_views']
    } = req.query;

    const realtimeData = await analyticsService.getRealtimeData({
      metrics: Array.isArray(metrics) ? metrics : [metrics]
    });

    // Set no-cache headers for real-time data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(realtimeData);
  } catch (error) {
    logger.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch real-time data',
      code: 'REALTIME_ANALYTICS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;