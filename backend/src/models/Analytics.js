const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Analytics = sequelize.define('Analytics', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    page: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
      comment: 'The page URL that was visited'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Page title'
    },
    referrer: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true,
      comment: 'Where the visitor came from'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true,
      comment: 'Visitor IP address (hashed for privacy)'
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
      comment: 'Unique session identifier'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User ID if logged in'
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'en',
      comment: 'Browser language'
    },
    screenResolution: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Screen resolution (e.g., 1920x1080)'
    },
    deviceType: {
      type: DataTypes.ENUM('Desktop', 'Mobile', 'Tablet', 'Unknown'),
      allowNull: false,
      defaultValue: 'Unknown',
      index: true,
      comment: 'Type of device used'
    },
    browser: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true,
      comment: 'Browser name'
    },
    operatingSystem: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true,
      comment: 'Operating system'
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true,
      comment: 'Country based on IP geolocation'
    },
    region: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Region/state based on IP geolocation'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'City based on IP geolocation'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      index: true,
      comment: 'When the page view occurred'
    },
    loadTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Page load time in milliseconds'
    },
    isBot: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      index: true,
      comment: 'Whether this appears to be a bot/crawler'
    },
    utm_source: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'UTM campaign source'
    },
    utm_medium: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'UTM campaign medium'
    },
    utm_campaign: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'UTM campaign name'
    },
    utm_term: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'UTM campaign term'
    },
    utm_content: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'UTM campaign content'
    }
  }, {
    tableName: 'analytics',
    timestamps: true,
    indexes: [
      {
        name: 'idx_analytics_page_timestamp',
        fields: ['page', 'timestamp']
      },
      {
        name: 'idx_analytics_session_timestamp',
        fields: ['sessionId', 'timestamp']
      },
      {
        name: 'idx_analytics_timestamp',
        fields: ['timestamp']
      },
      {
        name: 'idx_analytics_country_timestamp',
        fields: ['country', 'timestamp']
      },
      {
        name: 'idx_analytics_device_timestamp',
        fields: ['deviceType', 'timestamp']
      }
    ],
    comment: 'Web analytics data for tracking page views and user behavior'
  });

  // Instance methods
  Analytics.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      page: this.page,
      title: this.title,
      deviceType: this.deviceType,
      browser: this.browser,
      operatingSystem: this.operatingSystem,
      country: this.country,
      timestamp: this.timestamp,
      language: this.language
    };
  };

  // Static methods
  Analytics.getTopPages = async function(timeRange = '30d', limit = 10) {
    const dateRange = getDateRange(timeRange);
    
    return this.findAll({
      attributes: [
        'page',
        'title',
        [sequelize.fn('COUNT', sequelize.col('*')), 'views'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionId'))), 'uniqueViews']
      ],
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        },
        isBot: false
      },
      group: ['page', 'title'],
      order: [[sequelize.fn('COUNT', sequelize.col('*')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });
  };

  Analytics.getTrafficSources = async function(timeRange = '30d', limit = 10) {
    const dateRange = getDateRange(timeRange);
    
    return this.findAll({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.col('referrer'), 'Direct'), 'source'],
        [sequelize.fn('COUNT', sequelize.col('*')), 'visits'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionId'))), 'uniqueVisitors']
      ],
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        },
        isBot: false
      },
      group: [sequelize.fn('COALESCE', sequelize.col('referrer'), 'Direct')],
      order: [[sequelize.fn('COUNT', sequelize.col('*')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });
  };

  Analytics.getDeviceStats = async function(timeRange = '30d') {
    const dateRange = getDateRange(timeRange);
    
    return this.findAll({
      attributes: [
        'deviceType',
        [sequelize.fn('COUNT', sequelize.col('*')), 'count']
      ],
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        },
        isBot: false
      },
      group: ['deviceType'],
      order: [[sequelize.fn('COUNT', sequelize.col('*')), 'DESC']],
      raw: true
    });
  };

  Analytics.getGeographicStats = async function(timeRange = '30d', limit = 20) {
    const dateRange = getDateRange(timeRange);
    
    return this.findAll({
      attributes: [
        'country',
        [sequelize.fn('COUNT', sequelize.col('*')), 'visits'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionId'))), 'uniqueVisitors']
      ],
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        },
        isBot: false,
        country: {
          [sequelize.Sequelize.Op.not]: null
        }
      },
      group: ['country'],
      order: [[sequelize.fn('COUNT', sequelize.col('*')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });
  };

  Analytics.getBounceRate = async function(timeRange = '30d') {
    const dateRange = getDateRange(timeRange);
    
    // Get session page counts
    const sessionStats = await this.findAll({
      attributes: [
        'sessionId',
        [sequelize.fn('COUNT', sequelize.col('*')), 'pageViews']
      ],
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        },
        isBot: false
      },
      group: ['sessionId'],
      raw: true
    });

    const totalSessions = sessionStats.length;
    const bounceSessions = sessionStats.filter(session => parseInt(session.pageViews) === 1).length;
    
    return totalSessions > 0 ? (bounceSessions / totalSessions * 100).toFixed(2) : 0;
  };

  // Helper function to get date range
  function getDateRange(timeRange) {
    const end = new Date();
    let start;

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

    return { start, end };
  }

  return Analytics;
};