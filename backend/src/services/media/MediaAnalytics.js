const EventEmitter = require('events');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

/**
 * Media Usage Analytics Service
 * Tracks media performance, usage patterns, and optimization opportunities
 */
class MediaAnalytics extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      dbPath: options.dbPath || path.join(process.cwd(), 'backend', 'data', 'analytics.db'),
      retentionDays: options.retentionDays || 365,
      aggregationInterval: options.aggregationInterval || 3600000, // 1 hour
      enableRealTime: options.enableRealTime || true,
      ...options
    };

    this.db = null;
    this.metrics = new Map();
    this.aggregationTimer = null;
    
    this.init();
  }

  async init() {
    try {
      await this.initializeDatabase();
      await this.startAggregation();
      
      logger.info('MediaAnalytics initialized successfully');
      this.emit('ready');
    } catch (error) {
      logger.error('Failed to initialize MediaAnalytics', error);
      this.emit('error', error);
    }
  }

  async initializeDatabase() {
    await fs.mkdir(path.dirname(this.config.dbPath), { recursive: true });
    
    this.db = await open({
      filename: this.config.dbPath,
      driver: sqlite3.Database
    });

    // Create analytics tables
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id INTEGER NOT NULL,
        user_id TEXT,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        viewport_width INTEGER,
        viewport_height INTEGER,
        device_type TEXT,
        browser TEXT,
        os TEXT,
        country TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        view_duration INTEGER, -- in milliseconds
        load_time INTEGER, -- in milliseconds
        bytes_transferred INTEGER,
        format_served TEXT,
        cdn_hit BOOLEAN DEFAULT FALSE
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id INTEGER NOT NULL,
        user_id TEXT,
        download_type TEXT, -- original, variant, thumbnail
        variant_preset TEXT,
        file_size INTEGER,
        download_time INTEGER,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_id INTEGER NOT NULL,
        metric_type TEXT NOT NULL, -- load_time, bytes_saved, conversion_rate
        metric_value REAL NOT NULL,
        context TEXT, -- JSON with additional context
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS hourly_aggregates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hour_bucket DATETIME NOT NULL,
        media_id INTEGER,
        total_views INTEGER DEFAULT 0,
        total_downloads INTEGER DEFAULT 0,
        total_bytes_served INTEGER DEFAULT 0,
        avg_load_time REAL DEFAULT 0,
        unique_viewers INTEGER DEFAULT 0,
        bounce_rate REAL DEFAULT 0,
        top_formats TEXT, -- JSON array
        top_devices TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_aggregates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_bucket DATE NOT NULL,
        media_id INTEGER,
        total_views INTEGER DEFAULT 0,
        total_downloads INTEGER DEFAULT 0,
        total_bytes_served INTEGER DEFAULT 0,
        avg_load_time REAL DEFAULT 0,
        unique_viewers INTEGER DEFAULT 0,
        bounce_rate REAL DEFAULT 0,
        conversion_rate REAL DEFAULT 0,
        top_referrers TEXT, -- JSON array
        geographic_data TEXT, -- JSON object
        device_breakdown TEXT, -- JSON object
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_views_media_timestamp ON media_views(media_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_downloads_media_timestamp ON media_downloads(media_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_performance_media_type ON media_performance(media_id, metric_type);
      CREATE INDEX IF NOT EXISTS idx_hourly_bucket ON hourly_aggregates(hour_bucket);
      CREATE INDEX IF NOT EXISTS idx_daily_bucket ON daily_aggregates(date_bucket);
    `);
  }

  /**
   * Track media view event
   */
  async trackView(mediaId, metadata = {}) {
    try {
      const viewData = {
        mediaId,
        userId: metadata.userId || null,
        sessionId: metadata.sessionId || null,
        ipAddress: this.anonymizeIP(metadata.ipAddress),
        userAgent: metadata.userAgent || null,
        referrer: metadata.referrer || null,
        viewportWidth: metadata.viewportWidth || null,
        viewportHeight: metadata.viewportHeight || null,
        deviceType: this.detectDeviceType(metadata.userAgent),
        browser: this.detectBrowser(metadata.userAgent),
        os: this.detectOS(metadata.userAgent),
        country: metadata.country || null,
        viewDuration: metadata.viewDuration || null,
        loadTime: metadata.loadTime || null,
        bytesTransferred: metadata.bytesTransferred || null,
        formatServed: metadata.formatServed || null,
        cdnHit: metadata.cdnHit || false
      };

      await this.db.run(`
        INSERT INTO media_views (
          media_id, user_id, session_id, ip_address, user_agent, referrer,
          viewport_width, viewport_height, device_type, browser, os, country,
          view_duration, load_time, bytes_transferred, format_served, cdn_hit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        viewData.mediaId, viewData.userId, viewData.sessionId, viewData.ipAddress,
        viewData.userAgent, viewData.referrer, viewData.viewportWidth,
        viewData.viewportHeight, viewData.deviceType, viewData.browser,
        viewData.os, viewData.country, viewData.viewDuration, viewData.loadTime,
        viewData.bytesTransferred, viewData.formatServed, viewData.cdnHit
      ]);

      // Real-time metrics update
      if (this.config.enableRealTime) {
        this.updateRealTimeMetrics('view', mediaId, viewData);
      }

      this.emit('view', { mediaId, ...viewData });

    } catch (error) {
      logger.error('Failed to track view', { mediaId, error });
    }
  }

  /**
   * Track media download event
   */
  async trackDownload(mediaId, metadata = {}) {
    try {
      await this.db.run(`
        INSERT INTO media_downloads (
          media_id, user_id, download_type, variant_preset, file_size,
          download_time, success, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        mediaId,
        metadata.userId || null,
        metadata.downloadType || 'original',
        metadata.variantPreset || null,
        metadata.fileSize || null,
        metadata.downloadTime || null,
        metadata.success !== false,
        metadata.errorMessage || null
      ]);

      this.emit('download', { mediaId, ...metadata });

    } catch (error) {
      logger.error('Failed to track download', { mediaId, error });
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(mediaId, metricType, value, context = {}) {
    try {
      await this.db.run(`
        INSERT INTO media_performance (media_id, metric_type, metric_value, context)
        VALUES (?, ?, ?, ?)
      `, [mediaId, metricType, value, JSON.stringify(context)]);

      this.emit('performance', { mediaId, metricType, value, context });

    } catch (error) {
      logger.error('Failed to track performance', { mediaId, metricType, error });
    }
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getDashboardData(timeframe = '7d', mediaId = null) {
    const timeCondition = this.getTimeCondition(timeframe);
    const mediaCondition = mediaId ? 'AND media_id = ?' : '';
    const params = mediaId ? [mediaId] : [];

    const [
      overview,
      topMedia,
      deviceBreakdown,
      formatPerformance,
      geographicData,
      performanceMetrics,
      conversionFunnel
    ] = await Promise.all([
      this.getOverviewStats(timeCondition, mediaCondition, params),
      this.getTopMedia(timeCondition, mediaCondition, params),
      this.getDeviceBreakdown(timeCondition, mediaCondition, params),
      this.getFormatPerformance(timeCondition, mediaCondition, params),
      this.getGeographicData(timeCondition, mediaCondition, params),
      this.getPerformanceMetrics(timeCondition, mediaCondition, params),
      this.getConversionFunnel(timeCondition, mediaCondition, params)
    ]);

    return {
      timeframe,
      mediaId,
      overview,
      topMedia,
      deviceBreakdown,
      formatPerformance,
      geographicData,
      performanceMetrics,
      conversionFunnel,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get overview statistics
   */
  async getOverviewStats(timeCondition, mediaCondition, params) {
    const viewsQuery = `
      SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT media_id) as media_viewed,
        AVG(load_time) as avg_load_time,
        SUM(bytes_transferred) as total_bytes_served
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
    `;

    const downloadsQuery = `
      SELECT 
        COUNT(*) as total_downloads,
        SUM(file_size) as total_download_bytes,
        AVG(download_time) as avg_download_time,
        COUNT(*) FILTER (WHERE success = 1) as successful_downloads
      FROM media_downloads 
      WHERE ${timeCondition} ${mediaCondition}
    `;

    const [viewStats, downloadStats] = await Promise.all([
      this.db.get(viewsQuery, params),
      this.db.get(downloadsQuery, params)
    ]);

    // Calculate derived metrics
    const bounceRate = await this.calculateBounceRate(timeCondition, mediaCondition, params);
    const conversionRate = viewStats.total_views > 0 
      ? (downloadStats.total_downloads / viewStats.total_views) * 100 
      : 0;

    return {
      totalViews: viewStats.total_views || 0,
      uniqueSessions: viewStats.unique_sessions || 0,
      mediaViewed: viewStats.media_viewed || 0,
      totalDownloads: downloadStats.total_downloads || 0,
      avgLoadTime: Math.round(viewStats.avg_load_time || 0),
      totalBytesServed: viewStats.total_bytes_served || 0,
      totalDownloadBytes: downloadStats.total_download_bytes || 0,
      avgDownloadTime: Math.round(downloadStats.avg_download_time || 0),
      successfulDownloads: downloadStats.successful_downloads || 0,
      bounceRate: Math.round(bounceRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }

  /**
   * Get top performing media
   */
  async getTopMedia(timeCondition, mediaCondition, params, limit = 10) {
    const query = `
      SELECT 
        media_id,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_viewers,
        AVG(load_time) as avg_load_time,
        SUM(bytes_transferred) as bytes_served,
        COUNT(*) FILTER (WHERE view_duration > 1000) as engaged_views
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
      GROUP BY media_id
      ORDER BY views DESC
      LIMIT ${limit}
    `;

    const results = await this.db.all(query, params);

    return results.map(row => ({
      mediaId: row.media_id,
      views: row.views,
      uniqueViewers: row.unique_viewers,
      avgLoadTime: Math.round(row.avg_load_time || 0),
      bytesServed: row.bytes_served || 0,
      engagedViews: row.engaged_views,
      engagementRate: row.views > 0 ? Math.round((row.engaged_views / row.views) * 100) : 0
    }));
  }

  /**
   * Get device breakdown analytics
   */
  async getDeviceBreakdown(timeCondition, mediaCondition, params) {
    const deviceQuery = `
      SELECT 
        device_type,
        COUNT(*) as views,
        AVG(load_time) as avg_load_time,
        AVG(view_duration) as avg_view_duration
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
      AND device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY views DESC
    `;

    const browserQuery = `
      SELECT 
        browser,
        COUNT(*) as views,
        AVG(load_time) as avg_load_time
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
      AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY views DESC
      LIMIT 10
    `;

    const osQuery = `
      SELECT 
        os,
        COUNT(*) as views,
        AVG(load_time) as avg_load_time
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
      AND os IS NOT NULL
      GROUP BY os
      ORDER BY views DESC
      LIMIT 10
    `;

    const [devices, browsers, operatingSystems] = await Promise.all([
      this.db.all(deviceQuery, params),
      this.db.all(browserQuery, params),
      this.db.all(osQuery, params)
    ]);

    return { devices, browsers, operatingSystems };
  }

  /**
   * Get format performance analytics
   */
  async getFormatPerformance(timeCondition, mediaCondition, params) {
    const query = `
      SELECT 
        format_served,
        COUNT(*) as views,
        AVG(load_time) as avg_load_time,
        AVG(bytes_transferred) as avg_bytes,
        COUNT(*) FILTER (WHERE load_time < 1000) as fast_loads
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
      AND format_served IS NOT NULL
      GROUP BY format_served
      ORDER BY views DESC
    `;

    const results = await this.db.all(query, params);

    return results.map(row => ({
      format: row.format_served,
      views: row.views,
      avgLoadTime: Math.round(row.avg_load_time || 0),
      avgBytes: Math.round(row.avg_bytes || 0),
      fastLoads: row.fast_loads,
      performanceScore: row.views > 0 ? Math.round((row.fast_loads / row.views) * 100) : 0
    }));
  }

  /**
   * Get geographic data
   */
  async getGeographicData(timeCondition, mediaCondition, params) {
    const query = `
      SELECT 
        country,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_visitors,
        AVG(load_time) as avg_load_time
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
      AND country IS NOT NULL
      GROUP BY country
      ORDER BY views DESC
      LIMIT 20
    `;

    return await this.db.all(query, params);
  }

  /**
   * Get performance metrics trends
   */
  async getPerformanceMetrics(timeCondition, mediaCondition, params) {
    const query = `
      SELECT 
        metric_type,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as sample_count
      FROM media_performance 
      WHERE ${timeCondition} ${mediaCondition}
      GROUP BY metric_type
    `;

    return await this.db.all(query, params);
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(timeCondition, mediaCondition, params) {
    // Views -> Engaged Views -> Downloads
    const funnelQuery = `
      SELECT 
        COUNT(*) as total_views,
        COUNT(*) FILTER (WHERE view_duration > 1000) as engaged_views,
        COUNT(*) FILTER (WHERE view_duration > 5000) as deep_engagement
      FROM media_views 
      WHERE ${timeCondition} ${mediaCondition}
    `;

    const downloadQuery = `
      SELECT COUNT(*) as downloads
      FROM media_downloads d
      WHERE ${timeCondition.replace('timestamp', 'd.timestamp')} ${mediaCondition.replace('media_id', 'd.media_id')}
    `;

    const [viewFunnel, downloadData] = await Promise.all([
      this.db.get(funnelQuery, params),
      this.db.get(downloadQuery, params)
    ]);

    const totalViews = viewFunnel.total_views || 0;
    const engagedViews = viewFunnel.engaged_views || 0;
    const deepEngagement = viewFunnel.deep_engagement || 0;
    const downloads = downloadData.downloads || 0;

    return {
      stages: [
        { name: 'Views', count: totalViews, rate: 100 },
        { 
          name: 'Engaged Views', 
          count: engagedViews, 
          rate: totalViews > 0 ? Math.round((engagedViews / totalViews) * 100) : 0 
        },
        { 
          name: 'Deep Engagement', 
          count: deepEngagement, 
          rate: totalViews > 0 ? Math.round((deepEngagement / totalViews) * 100) : 0 
        },
        { 
          name: 'Downloads', 
          count: downloads, 
          rate: totalViews > 0 ? Math.round((downloads / totalViews) * 100) : 0 
        }
      ]
    };
  }

  /**
   * Get time-series data for charts
   */
  async getTimeSeriesData(timeframe = '7d', interval = 'hour', mediaId = null) {\n    const { startDate, groupBy } = this.getTimeSeriesConfig(timeframe, interval);\n    const mediaCondition = mediaId ? 'AND media_id = ?' : '';\n    const params = mediaId ? [startDate, mediaId] : [startDate];\n\n    const query = `\n      SELECT \n        ${groupBy} as time_bucket,\n        COUNT(*) as views,\n        COUNT(DISTINCT session_id) as unique_sessions,\n        AVG(load_time) as avg_load_time,\n        SUM(bytes_transferred) as bytes_served\n      FROM media_views \n      WHERE timestamp >= ? ${mediaCondition}\n      GROUP BY ${groupBy}\n      ORDER BY time_bucket\n    `;\n\n    return await this.db.all(query, params);\n  }\n\n  /**\n   * Get real-time metrics\n   */\n  getRealTimeMetrics() {\n    return Array.from(this.metrics.entries()).map(([key, value]) => ({\n      metric: key,\n      ...value\n    }));\n  }\n\n  /**\n   * Generate optimization recommendations\n   */\n  async getOptimizationRecommendations(mediaId = null) {\n    const recommendations = [];\n\n    // Analyze load times\n    const slowLoadingMedia = await this.findSlowLoadingMedia(mediaId);\n    if (slowLoadingMedia.length > 0) {\n      recommendations.push({\n        type: 'performance',\n        priority: 'high',\n        title: 'Optimize slow-loading media',\n        description: `${slowLoadingMedia.length} media files have load times > 3 seconds`,\n        mediaIds: slowLoadingMedia.map(m => m.media_id),\n        suggestion: 'Consider compressing images or generating additional variants'\n      });\n    }\n\n    // Analyze format usage\n    const formatAnalysis = await this.analyzeFormatUsage(mediaId);\n    if (formatAnalysis.modernFormatUsage < 50) {\n      recommendations.push({\n        type: 'format',\n        priority: 'medium',\n        title: 'Increase modern format usage',\n        description: `Only ${formatAnalysis.modernFormatUsage}% of views use modern formats`,\n        suggestion: 'Generate WebP and AVIF variants for better compression'\n      });\n    }\n\n    // Analyze device performance\n    const devicePerformance = await this.analyzeDevicePerformance(mediaId);\n    if (devicePerformance.mobileLoadTime > 2000) {\n      recommendations.push({\n        type: 'mobile',\n        priority: 'high',\n        title: 'Optimize for mobile devices',\n        description: `Mobile load time is ${devicePerformance.mobileLoadTime}ms`,\n        suggestion: 'Create mobile-optimized variants and implement lazy loading'\n      });\n    }\n\n    // Analyze storage efficiency\n    const storageAnalysis = await this.analyzeStorageEfficiency(mediaId);\n    if (storageAnalysis.unusedVariants > 20) {\n      recommendations.push({\n        type: 'storage',\n        priority: 'low',\n        title: 'Clean up unused variants',\n        description: `${storageAnalysis.unusedVariants} variants haven't been accessed recently`,\n        suggestion: 'Remove or archive unused media variants to save storage'\n      });\n    }\n\n    return recommendations;\n  }\n\n  /**\n   * Export analytics data\n   */\n  async exportData(format = 'json', timeframe = '30d', mediaId = null) {\n    const data = await this.getDashboardData(timeframe, mediaId);\n    \n    switch (format) {\n      case 'csv':\n        return this.convertToCSV(data);\n      case 'json':\n        return JSON.stringify(data, null, 2);\n      default:\n        return data;\n    }\n  }\n\n  /**\n   * Helper methods\n   */\n  updateRealTimeMetrics(type, mediaId, data) {\n    const key = `${type}_${mediaId}`;\n    const current = this.metrics.get(key) || { count: 0, lastUpdate: Date.now() };\n    \n    this.metrics.set(key, {\n      count: current.count + 1,\n      lastUpdate: Date.now(),\n      lastData: data\n    });\n  }\n\n  async startAggregation() {\n    if (this.aggregationTimer) {\n      clearInterval(this.aggregationTimer);\n    }\n\n    this.aggregationTimer = setInterval(async () => {\n      try {\n        await this.aggregateHourlyData();\n        await this.aggregateDailyData();\n        await this.cleanupOldData();\n      } catch (error) {\n        logger.error('Aggregation failed', error);\n      }\n    }, this.config.aggregationInterval);\n  }\n\n  async aggregateHourlyData() {\n    // Aggregate raw data into hourly buckets\n    const query = `\n      INSERT OR REPLACE INTO hourly_aggregates (\n        hour_bucket, media_id, total_views, total_downloads, total_bytes_served,\n        avg_load_time, unique_viewers\n      )\n      SELECT \n        datetime(timestamp, 'start of hour') as hour_bucket,\n        media_id,\n        COUNT(*) as total_views,\n        0 as total_downloads, -- Will be updated separately\n        SUM(bytes_transferred) as total_bytes_served,\n        AVG(load_time) as avg_load_time,\n        COUNT(DISTINCT session_id) as unique_viewers\n      FROM media_views \n      WHERE timestamp >= datetime('now', '-2 hours')\n      GROUP BY hour_bucket, media_id\n    `;\n\n    await this.db.run(query);\n  }\n\n  async aggregateDailyData() {\n    // Aggregate hourly data into daily buckets\n    const query = `\n      INSERT OR REPLACE INTO daily_aggregates (\n        date_bucket, media_id, total_views, avg_load_time, unique_viewers\n      )\n      SELECT \n        date(hour_bucket) as date_bucket,\n        media_id,\n        SUM(total_views) as total_views,\n        AVG(avg_load_time) as avg_load_time,\n        SUM(unique_viewers) as unique_viewers\n      FROM hourly_aggregates \n      WHERE hour_bucket >= date('now', '-2 days')\n      GROUP BY date_bucket, media_id\n    `;\n\n    await this.db.run(query);\n  }\n\n  async cleanupOldData() {\n    const cutoffDate = new Date();\n    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);\n    \n    await this.db.run(\n      'DELETE FROM media_views WHERE timestamp < ?',\n      cutoffDate.toISOString()\n    );\n    \n    await this.db.run(\n      'DELETE FROM media_downloads WHERE timestamp < ?',\n      cutoffDate.toISOString()\n    );\n  }\n\n  getTimeCondition(timeframe) {\n    const conditions = {\n      '1h': \"timestamp >= datetime('now', '-1 hour')\",\n      '24h': \"timestamp >= datetime('now', '-1 day')\",\n      '7d': \"timestamp >= datetime('now', '-7 days')\",\n      '30d': \"timestamp >= datetime('now', '-30 days')\",\n      '90d': \"timestamp >= datetime('now', '-90 days')\",\n      '1y': \"timestamp >= datetime('now', '-1 year')\"\n    };\n    \n    return conditions[timeframe] || conditions['7d'];\n  }\n\n  getTimeSeriesConfig(timeframe, interval) {\n    const configs = {\n      '24h': {\n        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),\n        groupBy: \"strftime('%Y-%m-%d %H:00:00', timestamp)\"\n      },\n      '7d': {\n        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),\n        groupBy: \"strftime('%Y-%m-%d', timestamp)\"\n      },\n      '30d': {\n        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),\n        groupBy: \"strftime('%Y-%m-%d', timestamp)\"\n      }\n    };\n    \n    return configs[timeframe] || configs['7d'];\n  }\n\n  anonymizeIP(ip) {\n    if (!ip) return null;\n    \n    // Simple IP anonymization - zero out last octet\n    return ip.replace(/\\.[0-9]+$/, '.0');\n  }\n\n  detectDeviceType(userAgent) {\n    if (!userAgent) return 'unknown';\n    \n    const ua = userAgent.toLowerCase();\n    if (/mobile|android|iphone|ipad|phone/i.test(ua)) return 'mobile';\n    if (/tablet|ipad/i.test(ua)) return 'tablet';\n    return 'desktop';\n  }\n\n  detectBrowser(userAgent) {\n    if (!userAgent) return 'unknown';\n    \n    const ua = userAgent.toLowerCase();\n    if (ua.includes('chrome')) return 'chrome';\n    if (ua.includes('firefox')) return 'firefox';\n    if (ua.includes('safari')) return 'safari';\n    if (ua.includes('edge')) return 'edge';\n    if (ua.includes('opera')) return 'opera';\n    return 'other';\n  }\n\n  detectOS(userAgent) {\n    if (!userAgent) return 'unknown';\n    \n    const ua = userAgent.toLowerCase();\n    if (ua.includes('windows')) return 'windows';\n    if (ua.includes('mac')) return 'macos';\n    if (ua.includes('linux')) return 'linux';\n    if (ua.includes('android')) return 'android';\n    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'ios';\n    return 'other';\n  }\n\n  async calculateBounceRate(timeCondition, mediaCondition, params) {\n    const query = `\n      SELECT \n        COUNT(*) as total_sessions,\n        COUNT(*) FILTER (WHERE view_count = 1) as bounced_sessions\n      FROM (\n        SELECT \n          session_id,\n          COUNT(*) as view_count\n        FROM media_views \n        WHERE ${timeCondition} ${mediaCondition}\n        AND session_id IS NOT NULL\n        GROUP BY session_id\n      )\n    `;\n    \n    const result = await this.db.get(query, params);\n    \n    return result.total_sessions > 0 \n      ? result.bounced_sessions / result.total_sessions \n      : 0;\n  }\n\n  async findSlowLoadingMedia(mediaId) {\n    const condition = mediaId ? 'AND media_id = ?' : '';\n    const params = mediaId ? [mediaId] : [];\n    \n    return await this.db.all(`\n      SELECT \n        media_id,\n        AVG(load_time) as avg_load_time,\n        COUNT(*) as view_count\n      FROM media_views \n      WHERE load_time > 3000 ${condition}\n      GROUP BY media_id\n      HAVING view_count > 10\n      ORDER BY avg_load_time DESC\n    `, params);\n  }\n\n  async analyzeFormatUsage(mediaId) {\n    const condition = mediaId ? 'AND media_id = ?' : '';\n    const params = mediaId ? [mediaId] : [];\n    \n    const result = await this.db.get(`\n      SELECT \n        COUNT(*) as total_views,\n        COUNT(*) FILTER (WHERE format_served IN ('webp', 'avif')) as modern_format_views\n      FROM media_views \n      WHERE format_served IS NOT NULL ${condition}\n    `, params);\n    \n    return {\n      modernFormatUsage: result.total_views > 0 \n        ? Math.round((result.modern_format_views / result.total_views) * 100)\n        : 0\n    };\n  }\n\n  async analyzeDevicePerformance(mediaId) {\n    const condition = mediaId ? 'AND media_id = ?' : '';\n    const params = mediaId ? [mediaId] : [];\n    \n    const result = await this.db.get(`\n      SELECT AVG(load_time) as mobile_load_time\n      FROM media_views \n      WHERE device_type = 'mobile' ${condition}\n    `, params);\n    \n    return {\n      mobileLoadTime: Math.round(result.mobile_load_time || 0)\n    };\n  }\n\n  async analyzeStorageEfficiency(mediaId) {\n    // This would require additional logic to track variant usage\n    return { unusedVariants: 0 };\n  }\n\n  convertToCSV(data) {\n    // Simple CSV conversion - could be enhanced\n    const rows = [];\n    \n    // Add headers\n    rows.push('Metric,Value');\n    \n    // Add overview data\n    Object.entries(data.overview).forEach(([key, value]) => {\n      rows.push(`${key},${value}`);\n    });\n    \n    return rows.join('\\n');\n  }\n\n  async close() {\n    if (this.aggregationTimer) {\n      clearInterval(this.aggregationTimer);\n    }\n    \n    if (this.db) {\n      await this.db.close();\n    }\n    \n    this.removeAllListeners();\n  }\n}\n\nmodule.exports = MediaAnalytics;