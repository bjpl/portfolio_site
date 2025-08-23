/**
 * Analytics Event Model
 * Tracks all portfolio-specific user interactions and events
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Event identification
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true
    },
    
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true
    },
    
    // Event details
    eventType: {
      type: DataTypes.ENUM(
        'pageview', 'click', 'scroll', 'download', 'contact_form',
        'project_view', 'skill_interest', 'social_click', 'email_click',
        'resume_download', 'portfolio_share', 'technology_interest',
        'employer_signal', 'conversion', 'engagement'
      ),
      allowNull: false,
      index: true
    },
    
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true
    },
    
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    
    label: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    
    // Page and content context
    url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    
    path: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true
    },
    
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    contentType: {
      type: DataTypes.ENUM(
        'homepage', 'project', 'blog', 'tool', 'about', 'contact',
        'resume', 'portfolio', 'teaching', 'writing', 'photography'
      ),
      allowNull: true,
      index: true
    },
    
    contentId: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true
    },
    
    // Portfolio-specific data
    projectInterest: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Project categories/technologies of interest'
    },
    
    skillInterest: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Skills viewed or interacted with'
    },
    
    employerSignals: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Indicators of employer/recruiter behavior'
    },
    
    // Technical context
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    ip: {
      type: DataTypes.INET,
      allowNull: true
    },
    
    // Geographic data
    country: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true
    },
    
    region: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    timezone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Device and browser info
    device: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Device type, screen resolution, etc.'
    },
    
    browser: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Browser name, version, language'
    },
    
    // Session context
    timeOnPage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Time spent on page in seconds'
    },
    
    scrollDepth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum scroll depth percentage'
    },
    
    // Additional metadata
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional event-specific data'
    },
    
    // Conversion tracking
    isConversion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    
    conversionType: {
      type: DataTypes.ENUM(
        'contact_form', 'email_click', 'linkedin_click', 
        'resume_download', 'project_inquiry', 'collaboration_interest'
      ),
      allowNull: true
    },
    
    conversionValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
    
  }, {
    tableName: 'analytics_events',
    indexes: [
      {
        fields: ['sessionId', 'createdAt']
      },
      {
        fields: ['eventType', 'createdAt']
      },
      {
        fields: ['contentType', 'createdAt']
      },
      {
        fields: ['country', 'createdAt']
      },
      {
        fields: ['isConversion', 'createdAt']
      },
      {
        fields: ['path', 'createdAt']
      }
    ],
    
    // Add partition support for large datasets
    hooks: {
      afterCreate: async (event) => {
        // Log high-value events for immediate processing
        if (event.isConversion || event.employerSignals) {
          console.log('High-value analytics event:', {
            type: event.eventType,
            conversion: event.isConversion,
            signals: event.employerSignals
          });
        }
      }
    }
  });

  // Instance methods
  AnalyticsEvent.prototype.isEmployerBehavior = function() {
    const employerIndicators = [
      'linkedin.com/in/',
      'github.com',
      'stackoverflow.com',
      'company email domains',
      'recruiter behavior patterns'
    ];
    
    return this.employerSignals && 
           Object.keys(this.employerSignals).length > 0;
  };
  
  AnalyticsEvent.prototype.getEngagementScore = function() {
    let score = 0;
    
    // Base engagement
    score += this.timeOnPage ? Math.min(this.timeOnPage / 60, 10) : 0;
    score += this.scrollDepth ? (this.scrollDepth / 100) * 5 : 0;
    
    // Event-specific scoring
    const eventScores = {
      'project_view': 3,
      'skill_interest': 2,
      'contact_form': 10,
      'resume_download': 8,
      'social_click': 4,
      'email_click': 6
    };
    
    score += eventScores[this.eventType] || 1;
    
    // Conversion bonus
    if (this.isConversion) {
      score += 15;
    }
    
    return Math.min(score, 25); // Cap at 25
  };

  return AnalyticsEvent;
};