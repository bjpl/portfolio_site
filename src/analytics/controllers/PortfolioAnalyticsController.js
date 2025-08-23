/**
 * Portfolio Analytics Controller
 * Handles all portfolio-specific analytics endpoints
 */

const PortfolioAnalyticsService = require('../services/PortfolioAnalyticsService');
const logger = require('../../utils/logger');

class PortfolioAnalyticsController {
  constructor(db) {
    this.analyticsService = new PortfolioAnalyticsService(db);
  }

  /**
   * Track visitor project interest
   */
  trackProjectInterest = async (req, res) => {
    try {
      const {
        sessionId,
        projectId,
        projectTitle,
        technologies = [],
        timeSpent = 0,
        scrollDepth = 0,
        interactions = 0
      } = req.body;

      const eventData = {
        sessionId,
        projectId,
        projectTitle,
        technologies,
        timeSpent,
        scrollDepth,
        interactions,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer'),
        url: req.get('Referer') || req.body.url
      };

      const event = await this.analyticsService.trackProjectInterest(eventData);

      res.status(201).json({
        success: true,
        eventId: event.id,
        message: 'Project interest tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking project interest:', error);
      res.status(500).json({
        error: 'Failed to track project interest',
        message: error.message
      });
    }
  };

  /**
   * Get visitor interest analytics
   */
  getVisitorInterestAnalytics = async (req, res) => {
    try {
      const { period = '30d', projectId, technology } = req.query;

      const analytics = await this.analyticsService.getVisitorInterestAnalytics({
        period,
        projectId,
        technology
      });

      res.json(analytics);
    } catch (error) {
      logger.error('Error getting visitor interest analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch visitor interest analytics',
        message: error.message
      });
    }
  };

  /**
   * Track employer/client behavior
   */
  trackEmployerBehavior = async (req, res) => {
    try {
      const {
        sessionId,
        behaviorType,
        signals = {},
        metadata = {}
      } = req.body;

      const eventData = {
        sessionId,
        behaviorType,
        signals: {
          ...signals,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referer')
        },
        metadata,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer')
      };

      const event = await this.analyticsService.trackEmployerBehavior(eventData);

      res.status(201).json({
        success: true,
        eventId: event.id,
        employerScore: event.employerSignals?.confidence || 0,
        message: 'Employer behavior tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking employer behavior:', error);
      res.status(500).json({
        error: 'Failed to track employer behavior',
        message: error.message
      });
    }
  };

  /**
   * Get employer/client behavior analysis
   */
  getEmployerAnalysis = async (req, res) => {
    try {
      const { period = '30d', minScore = 50 } = req.query;

      const analysis = await this.analyticsService.getEmployerBehaviorAnalysis({
        period,
        minScore: parseInt(minScore)
      });

      res.json(analysis);
    } catch (error) {
      logger.error('Error getting employer analysis:', error);
      res.status(500).json({
        error: 'Failed to fetch employer analysis',
        message: error.message
      });
    }
  };

  /**
   * Track content effectiveness
   */
  trackContentEngagement = async (req, res) => {
    try {
      const {
        sessionId,
        contentType,
        contentId,
        engagementMetrics
      } = req.body;

      const eventData = {
        sessionId,
        contentType,
        contentId,
        engagementMetrics,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer'),
        url: req.body.url || req.get('Referer')
      };

      const event = await this.analyticsService.trackContentEngagement(eventData);

      res.status(201).json({
        success: true,
        eventId: event.id,
        engagementScore: event.value,
        message: 'Content engagement tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking content engagement:', error);
      res.status(500).json({
        error: 'Failed to track content engagement',
        message: error.message
      });
    }
  };

  /**
   * Get content effectiveness metrics
   */
  getContentEffectiveness = async (req, res) => {
    try {
      const { 
        period = '30d', 
        contentType, 
        sortBy = 'engagement',
        limit = 20 
      } = req.query;

      const metrics = await this.analyticsService.getContentEffectivenessMetrics({
        period,
        contentType,
        sortBy,
        limit: parseInt(limit)
      });

      res.json(metrics);
    } catch (error) {
      logger.error('Error getting content effectiveness:', error);
      res.status(500).json({
        error: 'Failed to fetch content effectiveness metrics',
        message: error.message
      });
    }
  };

  /**
   * Track conversion events
   */
  trackConversion = async (req, res) => {
    try {
      const {
        sessionId,
        conversionType,
        conversionValue = 0,
        additionalData = {}
      } = req.body;

      const eventData = {
        sessionId,
        conversionType,
        conversionValue,
        additionalData,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        referrer: req.get('Referer'),
        url: req.body.url || req.get('Referer')
      };

      const event = await this.analyticsService.trackConversion(eventData);

      res.status(201).json({
        success: true,
        eventId: event.id,
        conversionValue: event.conversionValue,
        message: 'Conversion tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking conversion:', error);
      res.status(500).json({
        error: 'Failed to track conversion',
        message: error.message
      });
    }
  };

  /**
   * Get conversion tracking data
   */
  getConversionTracking = async (req, res) => {
    try {
      const { 
        period = '30d', 
        conversionType,
        includeValue = true 
      } = req.query;

      const tracking = await this.analyticsService.getConversionTracking({
        period,
        conversionType,
        includeValue: includeValue === 'true'
      });

      res.json(tracking);
    } catch (error) {
      logger.error('Error getting conversion tracking:', error);
      res.status(500).json({
        error: 'Failed to fetch conversion tracking',
        message: error.message
      });
    }
  };

  /**
   * Get geographic visitor analysis
   */
  getGeographicAnalysis = async (req, res) => {
    try {
      const { 
        period = '30d',
        includeRelocation = true,
        minVisitors = 1
      } = req.query;

      const analysis = await this.analyticsService.getGeographicAnalysis({
        period,
        includeRelocation: includeRelocation === 'true',
        minVisitors: parseInt(minVisitors)
      });

      res.json(analysis);
    } catch (error) {
      logger.error('Error getting geographic analysis:', error);
      res.status(500).json({
        error: 'Failed to fetch geographic analysis',
        message: error.message
      });
    }
  };

  /**
   * Get technology trend analysis
   */
  getTechnologyTrends = async (req, res) => {
    try {
      const { 
        period = '30d',
        minInteractions = 5,
        includeEmerging = true
      } = req.query;

      const trends = await this.analyticsService.getTechnologyTrendAnalysis({
        period,
        minInteractions: parseInt(minInteractions),
        includeEmerging: includeEmerging === 'true'
      });

      res.json(trends);
    } catch (error) {
      logger.error('Error getting technology trends:', error);
      res.status(500).json({
        error: 'Failed to fetch technology trends',
        message: error.message
      });
    }
  };

  /**
   * Generate downloadable portfolio report
   */
  generatePortfolioReport = async (req, res) => {
    try {
      const {
        type,
        format = 'json',
        period = '30d',
        email
      } = req.query;

      if (!type) {
        return res.status(400).json({
          error: 'Report type is required',
          availableTypes: [
            'visitor-interest',
            'employer-analysis', 
            'content-effectiveness',
            'conversion-tracking',
            'geographic-analysis',
            'technology-trends'
          ]
        });
      }

      const report = await this.analyticsService.generatePortfolioReport(type, {
        format,
        period,
        email
      });

      if (format === 'json') {
        res.json(report);
      } else {
        // For non-JSON formats, set appropriate headers
        const mimeTypes = {
          csv: 'text/csv',
          pdf: 'application/pdf',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

        const filename = `portfolio-${type}-${period}.${format}`;
        
        res.setHeader('Content-Type', mimeTypes[format] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.send(report);
      }
    } catch (error) {
      logger.error('Error generating portfolio report:', error);
      res.status(500).json({
        error: 'Failed to generate portfolio report',
        message: error.message
      });
    }
  };

  /**
   * Get real-time engagement data
   */
  getRealtimeEngagement = async (req, res) => {
    try {
      const engagement = await this.analyticsService.getRealtimeEngagement();

      // Set no-cache headers for real-time data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(engagement);
    } catch (error) {
      logger.error('Error getting realtime engagement:', error);
      res.status(500).json({
        error: 'Failed to fetch realtime engagement',
        message: error.message
      });
    }
  };

  /**
   * Get portfolio dashboard overview
   */
  getPortfolioDashboard = async (req, res) => {
    try {
      const { period = '30d' } = req.query;

      // Fetch multiple analytics in parallel
      const [
        visitorInterest,
        employerAnalysis,
        contentEffectiveness,
        conversionData,
        geographicData,
        technologyTrends,
        realtimeData
      ] = await Promise.all([
        this.analyticsService.getVisitorInterestAnalytics({ period }),
        this.analyticsService.getEmployerBehaviorAnalysis({ period }),
        this.analyticsService.getContentEffectivenessMetrics({ period, limit: 10 }),
        this.analyticsService.getConversionTracking({ period }),
        this.analyticsService.getGeographicAnalysis({ period }),
        this.analyticsService.getTechnologyTrendAnalysis({ period }),
        this.analyticsService.getRealtimeEngagement()
      ]);

      const dashboard = {
        period: {
          range: period,
          timestamp: new Date()
        },
        overview: {
          visitorInterest: {
            totalProjects: visitorInterest.summary?.totalProjects || 0,
            avgEngagement: visitorInterest.summary?.avgEngagement || 0,
            topProjects: visitorInterest.projects?.slice(0, 5) || []
          },
          employerActivity: {
            potentialEmployers: employerAnalysis.summary?.highScoreSessions || 0,
            conversionRate: conversionData.summary?.conversionRate || 0,
            topSignals: employerAnalysis.topSignals?.slice(0, 3) || []
          },
          contentPerformance: {
            topContent: contentEffectiveness.content?.slice(0, 5) || [],
            avgEngagementScore: contentEffectiveness.summary?.avgEngagement || 0
          },
          geographic: {
            totalCountries: geographicData.summary?.totalCountries || 0,
            topMarkets: geographicData.countries?.slice(0, 3) || [],
            internationalPercentage: geographicData.summary?.internationalPercentage || 0
          },
          technology: {
            trendingTechnologies: technologyTrends.emergingTechnologies?.slice(0, 5) || [],
            totalTechnologies: technologyTrends.summary?.totalTechnologies || 0
          }
        },
        realtime: realtimeData,
        lastUpdated: new Date()
      };

      res.json(dashboard);
    } catch (error) {
      logger.error('Error getting portfolio dashboard:', error);
      res.status(500).json({
        error: 'Failed to fetch portfolio dashboard',
        message: error.message
      });
    }
  };
}

module.exports = PortfolioAnalyticsController;