/**
 * Visitor Session Model
 * Aggregates session-level analytics data for portfolio visitors
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VisitorSession = sequelize.define('VisitorSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      index: true
    },
    
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true
    },
    
    // Session timing
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      index: true
    },
    
    endTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Session duration in seconds'
    },
    
    // Page views and navigation
    pageViews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    uniquePages: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    entryPage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    exitPage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Engagement metrics
    totalScrollDepth: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Average scroll depth across all pages'
    },
    
    totalEngagementTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Active engagement time in seconds'
    },
    
    interactionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total interactions (clicks, scrolls, etc.)'
    },
    
    // Portfolio-specific interests
    projectsViewed: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of project IDs viewed'
    },
    
    skillsInterested: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Technologies/skills shown interest in'
    },
    
    contentInterests: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Time spent on different content types'
    },
    
    // Employer/recruiter behavior indicators
    employerBehaviorScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Likelihood of being an employer/recruiter'
    },
    
    recruitmentSignals: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Specific indicators of recruitment interest'
    },
    
    // Geographic and technical info
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
    
    // Device and browser
    deviceInfo: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    
    browserInfo: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    
    // Traffic source
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    trafficSource: {
      type: DataTypes.ENUM(
        'direct', 'search', 'social', 'referral', 'email', 'linkedin',
        'github', 'job_board', 'recruiter', 'company_website'
      ),
      allowNull: true,
      index: true
    },
    
    sourceDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional details about traffic source'
    },
    
    // Conversion tracking
    conversions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of conversion events in this session'
    },
    
    conversionValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total conversion value for session'
    },
    
    // Session quality indicators
    bounceRate: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether session was a bounce'
    },
    
    qualityScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Overall session quality score'
    },
    
    // Return visitor tracking
    isReturnVisitor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    previousVisits: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    lastVisitDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
    
  }, {
    tableName: 'visitor_sessions',
    indexes: [
      {
        fields: ['startTime', 'country']
      },
      {
        fields: ['trafficSource', 'startTime']
      },
      {
        fields: ['employerBehaviorScore']
      },
      {
        fields: ['qualityScore']
      },
      {
        fields: ['isReturnVisitor', 'startTime']
      }
    ]
  });

  // Instance methods
  VisitorSession.prototype.calculateQualityScore = function() {
    let score = 0;
    
    // Duration scoring (max 30 points)
    if (this.duration) {
      score += Math.min(this.duration / 60, 30);
    }
    
    // Page views scoring (max 25 points)
    score += Math.min(this.pageViews * 5, 25);
    
    // Engagement scoring (max 25 points)
    score += Math.min(this.interactionCount, 25);
    
    // Conversion scoring (max 20 points)
    score += this.conversions.length * 10;
    
    this.qualityScore = Math.min(score, 100);
    return this.qualityScore;
  };
  
  VisitorSession.prototype.calculateEmployerScore = function() {
    let score = 0;
    const signals = this.recruitmentSignals || {};
    
    // LinkedIn referral
    if (this.trafficSource === 'linkedin') score += 20;
    
    // Professional domains in referrer
    const professionalDomains = ['linkedin', 'indeed', 'glassdoor', 'stackoverflow'];
    if (this.referrer && professionalDomains.some(domain => 
        this.referrer.includes(domain))) {
      score += 15;
    }
    
    // Specific page patterns
    if (this.projectsViewed.length >= 3) score += 15;
    if (signals.viewedResume) score += 25;
    if (signals.contactFormStarted) score += 30;
    if (signals.emailClicked) score += 20;
    
    // Time and engagement patterns
    if (this.duration && this.duration > 300) score += 10; // 5+ minutes
    if (this.pageViews >= 5) score += 10;
    
    this.employerBehaviorScore = Math.min(score, 100);
    return this.employerBehaviorScore;
  };
  
  VisitorSession.prototype.updateBounceRate = function() {
    this.bounceRate = this.pageViews <= 1 && (!this.duration || this.duration < 30);
  };

  return VisitorSession;
};