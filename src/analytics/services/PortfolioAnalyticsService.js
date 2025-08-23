/**
 * Portfolio Analytics Service
 * Core service for portfolio-specific analytics tracking and reporting
 */

const { Op } = require('sequelize');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const logger = require('../../utils/logger');

class PortfolioAnalyticsService {
  constructor(db) {
    this.db = db;
    this.AnalyticsEvent = db.AnalyticsEvent;
    this.VisitorSession = db.VisitorSession;
  }

  /**
   * Track visitor interest in projects
   */
  async trackProjectInterest(eventData) {
    const {
      sessionId,
      projectId,
      projectTitle,
      technologies,
      timeSpent,
      scrollDepth,
      userAgent,
      ip
    } = eventData;

    // Enrich with geo and device data
    const enrichedData = await this.enrichEventData({
      ...eventData,
      eventType: 'project_view',
      category: 'portfolio',
      action: 'view_project',
      label: projectTitle,
      contentType: 'project',
      contentId: projectId,
      projectInterest: {
        projectId,
        title: projectTitle,
        technologies: technologies || [],
        engagement: {
          timeSpent: timeSpent || 0,
          scrollDepth: scrollDepth || 0
        }
      },
      skillInterest: technologies || []
    });

    // Create analytics event
    const event = await this.AnalyticsEvent.create(enrichedData);

    // Update session data
    await this.updateSessionProjectInterest(sessionId, projectId, technologies);

    return event;
  }

  /**
   * Analyze employer/client behavior patterns
   */
  async trackEmployerBehavior(eventData) {
    const {
      sessionId,
      behaviorType,
      signals = {},
      userAgent,
      referrer
    } = eventData;

    // Detect employer signals
    const employerSignals = this.detectEmployerSignals({
      userAgent,
      referrer,
      behaviorType,
      ...signals
    });

    const enrichedData = await this.enrichEventData({
      ...eventData,
      eventType: 'employer_signal',
      category: 'recruitment',
      action: behaviorType,
      employerSignals,
      metadata: {
        confidence: employerSignals.confidence || 0,
        indicators: employerSignals.indicators || []
      }
    });

    const event = await this.AnalyticsEvent.create(enrichedData);

    // Update session employer scoring
    await this.updateSessionEmployerScore(sessionId, employerSignals);

    return event;
  }

  /**
   * Track content effectiveness metrics
   */
  async trackContentEngagement(eventData) {
    const {
      sessionId,
      contentType,
      contentId,
      engagementMetrics
    } = eventData;

    const {
      timeOnPage,
      scrollDepth,
      interactionCount,
      sharesCount = 0,
      downloadsCount = 0
    } = engagementMetrics;

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore({
      timeOnPage,
      scrollDepth,
      interactionCount,
      sharesCount,
      downloadsCount,
      contentType
    });

    const enrichedData = await this.enrichEventData({
      ...eventData,
      eventType: 'engagement',
      category: 'content',
      action: 'engagement_measured',
      contentType,
      contentId,
      value: engagementScore,
      timeOnPage,
      scrollDepth,
      metadata: {
        engagementScore,
        metrics: engagementMetrics
      }
    });

    return await this.AnalyticsEvent.create(enrichedData);
  }

  /**
   * Track conversion events
   */
  async trackConversion(eventData) {
    const {
      sessionId,
      conversionType,
      conversionValue = 0,
      additionalData = {}
    } = eventData;

    const enrichedData = await this.enrichEventData({
      ...eventData,
      eventType: 'conversion',
      category: 'conversion',
      action: conversionType,
      isConversion: true,
      conversionType,
      conversionValue,
      metadata: additionalData
    });

    const event = await this.AnalyticsEvent.create(enrichedData);

    // Update session conversions
    await this.updateSessionConversions(sessionId, {
      type: conversionType,
      value: conversionValue,
      timestamp: new Date(),
      eventId: event.id
    });

    // Trigger real-time notifications for high-value conversions
    if (conversionValue >= 100 || conversionType === 'contact_form') {
      await this.notifyHighValueConversion(event);
    }

    return event;
  }

  /**
   * Generate geographic visitor analysis
   */
  async getGeographicAnalysis(options = {}) {
    const { period = '30d', includeRelocation = true } = options;
    const dateRange = this.getDateRange(period);

    const countryData = await this.AnalyticsEvent.findAll({
      attributes: [
        'country',
        [this.db.sequelize.fn('COUNT', this.db.sequelize.col('sessionId')), 'sessions'],
        [this.db.sequelize.fn('COUNT', this.db.sequelize.col('id')), 'events'],
        [this.db.sequelize.fn('AVG', this.db.sequelize.col('timeOnPage')), 'avgTime'],
        [this.db.sequelize.fn('COUNT', this.db.sequelize.literal(
          'CASE WHEN "isConversion" = true THEN 1 END'
        )), 'conversions']
      ],
      where: {
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end]
        },
        country: {
          [Op.not]: null
        }
      },
      group: ['country'],
      order: [[this.db.sequelize.literal('sessions'), 'DESC']],
      raw: true
    });

    // Add relocation insights if requested
    let relocationInsights = {};
    if (includeRelocation) {
      relocationInsights = await this.generateRelocationInsights(countryData);
    }

    return {
      period: {
        start: dateRange.start,
        end: dateRange.end
      },
      countries: countryData.map(country => ({
        ...country,
        conversionRate: country.conversions / country.sessions,
        engagementScore: this.calculateCountryEngagement(country)
      })),
      relocationInsights,
      summary: {
        totalCountries: countryData.length,
        topMarkets: countryData.slice(0, 5).map(c => c.country),
        internationalPercentage: this.calculateInternationalPercentage(countryData)
      }
    };
  }

  /**
   * Analyze technology trends from visitor interests
   */
  async getTechnologyTrendAnalysis(options = {}) {
    const { period = '30d' } = options;
    const dateRange = this.getDateRange(period);

    const skillInterests = await this.AnalyticsEvent.findAll({
      where: {
        createdAt: {
          [Op.between]: [dateRange.start, dateRange.end]
        },
        skillInterest: {
          [Op.not]: null
        }
      },
      attributes: ['skillInterest', 'createdAt', 'sessionId'],
      raw: true
    });

    // Aggregate skill data
    const skillTrends = this.aggregateSkillTrends(skillInterests);
    const trendAnalysis = this.analyzeTrendDirections(skillTrends);

    return {
      period: {
        start: dateRange.start,
        end: dateRange.end
      },
      trends: trendAnalysis,
      topTechnologies: skillTrends
        .sort((a, b) => b.totalInterest - a.totalInterest)
        .slice(0, 20),
      emergingTechnologies: trendAnalysis
        .filter(tech => tech.growthRate > 50)
        .slice(0, 10),
      summary: {
        totalTechnologies: skillTrends.length,
        avgGrowthRate: trendAnalysis.reduce((sum, tech) => 
          sum + tech.growthRate, 0) / trendAnalysis.length
      }
    };
  }

  /**
   * Generate downloadable portfolio reports
   */
  async generatePortfolioReport(reportType, options = {}) {
    const { format = 'json', period = '30d', email } = options;

    let reportData;
    switch (reportType) {
      case 'visitor-interest':
        reportData = await this.generateVisitorInterestReport(period);
        break;
      case 'employer-analysis':
        reportData = await this.generateEmployerAnalysisReport(period);
        break;
      case 'content-effectiveness':
        reportData = await this.generateContentEffectivenessReport(period);
        break;
      case 'conversion-tracking':
        reportData = await this.generateConversionReport(period);
        break;
      case 'geographic-analysis':
        reportData = await this.getGeographicAnalysis({ period });
        break;
      case 'technology-trends':
        reportData = await this.getTechnologyTrendAnalysis({ period });
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Format report based on requested format
    const formattedReport = await this.formatReport(reportData, format, reportType);

    // Send email if requested
    if (email) {
      await this.emailReport(email, formattedReport, reportType);
    }

    return formattedReport;
  }

  /**
   * Get real-time engagement notifications
   */
  async getRealtimeEngagement() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentEvents = await this.AnalyticsEvent.findAll({
      where: {
        createdAt: {
          [Op.gte]: fiveMinutesAgo
        }
      },
      include: [
        {
          model: this.VisitorSession,
          attributes: ['employerBehaviorScore', 'qualityScore']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Identify high-value interactions
    const highValueEvents = recentEvents.filter(event => 
      event.isConversion || 
      event.employerSignals ||
      (event.VisitorSession && event.VisitorSession.employerBehaviorScore > 70)
    );

    return {
      timestamp: new Date(),
      activeUsers: await this.getActiveUsersCount(),
      recentEvents: recentEvents.slice(0, 10),
      highValueInteractions: highValueEvents,
      alerts: this.generateRealTimeAlerts(highValueEvents)
    };
  }

  // Helper methods

  async enrichEventData(eventData) {
    const { ip, userAgent, referrer } = eventData;

    // Geographic enrichment
    const geoData = ip ? geoip.lookup(ip) : null;
    
    // User agent parsing
    const uaResult = userAgent ? UAParser(userAgent) : {};

    return {
      ...eventData,
      country: geoData?.country || null,
      region: geoData?.region || null,
      city: geoData?.city || null,
      timezone: geoData?.timezone || null,
      device: {
        type: uaResult.device?.type || 'desktop',
        vendor: uaResult.device?.vendor,
        model: uaResult.device?.model,
        screen: eventData.screenResolution
      },
      browser: {
        name: uaResult.browser?.name,
        version: uaResult.browser?.version,
        engine: uaResult.engine?.name
      },
      trafficSource: this.determineTrafficSource(referrer),
      timestamp: new Date()
    };
  }

  detectEmployerSignals(data) {
    const { userAgent, referrer, behaviorType } = data;
    const signals = { indicators: [], confidence: 0 };

    // LinkedIn indicators
    if (referrer && referrer.includes('linkedin.com')) {
      signals.indicators.push('linkedin_referral');
      signals.confidence += 30;
    }

    // Professional domain referrals
    const professionalDomains = ['indeed', 'glassdoor', 'stackoverflow', 'github'];
    if (referrer && professionalDomains.some(domain => referrer.includes(domain))) {
      signals.indicators.push('professional_referral');
      signals.confidence += 20;
    }

    // Recruiter behavior patterns
    if (behaviorType === 'resume_download') {
      signals.indicators.push('resume_interest');
      signals.confidence += 40;
    }

    if (behaviorType === 'contact_form_start') {
      signals.indicators.push('contact_intent');
      signals.confidence += 35;
    }

    // Multiple project views in short time
    if (behaviorType === 'rapid_project_browsing') {
      signals.indicators.push('portfolio_review');
      signals.confidence += 25;
    }

    return {
      ...signals,
      confidence: Math.min(signals.confidence, 100)
    };
  }

  calculateEngagementScore(metrics) {
    const {
      timeOnPage = 0,
      scrollDepth = 0,
      interactionCount = 0,
      sharesCount = 0,
      downloadsCount = 0,
      contentType
    } = metrics;

    let score = 0;

    // Time-based scoring
    score += Math.min(timeOnPage / 60, 10) * 2; // Max 20 points

    // Scroll depth scoring
    score += (scrollDepth / 100) * 15; // Max 15 points

    // Interaction scoring
    score += Math.min(interactionCount, 10) * 2; // Max 20 points

    // Social engagement
    score += sharesCount * 10; // 10 points per share

    // Downloads (high value)
    score += downloadsCount * 15; // 15 points per download

    // Content type multipliers
    const multipliers = {
      'project': 1.2,
      'resume': 1.5,
      'contact': 1.3,
      'portfolio': 1.1
    };

    score *= multipliers[contentType] || 1.0;

    return Math.min(score, 100);
  }

  determineTrafficSource(referrer) {
    if (!referrer) return 'direct';

    const socialDomains = ['facebook', 'twitter', 'linkedin', 'instagram'];
    const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo'];
    const jobBoards = ['indeed', 'glassdoor', 'monster', 'ziprecruiter'];

    const domain = referrer.toLowerCase();

    if (socialDomains.some(social => domain.includes(social))) {
      return 'social';
    }
    if (searchEngines.some(search => domain.includes(search))) {
      return 'search';
    }
    if (jobBoards.some(job => domain.includes(job))) {
      return 'job_board';
    }
    if (domain.includes('linkedin')) {
      return 'linkedin';
    }
    if (domain.includes('github')) {
      return 'github';
    }

    return 'referral';
  }

  getDateRange(period) {
    const end = new Date();
    let start;

    switch (period) {
      case '7d':
        start = new Date(end - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(end - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  async updateSessionProjectInterest(sessionId, projectId, technologies) {
    const session = await this.VisitorSession.findOne({
      where: { sessionId }
    });

    if (session) {
      const projects = Array.isArray(session.projectsViewed) 
        ? session.projectsViewed 
        : [];
      
      if (!projects.includes(projectId)) {
        projects.push(projectId);
      }

      const skills = Array.isArray(session.skillsInterested) 
        ? session.skillsInterested 
        : [];
      
      const newSkills = technologies.filter(tech => !skills.includes(tech));
      skills.push(...newSkills);

      await session.update({
        projectsViewed: projects,
        skillsInterested: skills
      });
    }
  }

  async updateSessionEmployerScore(sessionId, employerSignals) {
    const session = await this.VisitorSession.findOne({
      where: { sessionId }
    });

    if (session) {
      const currentSignals = session.recruitmentSignals || {};
      const updatedSignals = {
        ...currentSignals,
        ...employerSignals,
        lastUpdate: new Date()
      };

      await session.update({
        recruitmentSignals: updatedSignals
      });

      // Recalculate employer behavior score
      await session.calculateEmployerScore();
      await session.save();
    }
  }

  async notifyHighValueConversion(event) {
    // Implementation for real-time notifications
    // Could integrate with WebSockets, email, Slack, etc.
    logger.info('High-value conversion detected:', {
      eventId: event.id,
      type: event.conversionType,
      value: event.conversionValue,
      country: event.country,
      timestamp: event.createdAt
    });
  }
}

module.exports = PortfolioAnalyticsService;