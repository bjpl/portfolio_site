/**
 * Portfolio-Specific Analytics Tracker
 * Enhanced client-side tracking for portfolio visitor behavior
 */

class PortfolioAnalytics {
  constructor(options = {}) {
    this.config = {
      endpoint: '/api/v2/analytics/portfolio',
      trackingEnabled: true,
      debug: options.debug || false,
      realTimeUpdates: true,
      ...options
    };

    this.session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      pageViews: {},
      projectInterests: [],
      skillInterests: new Set(),
      employerSignals: {},
      conversions: [],
      engagementScore: 0
    };

    this.init();
  }

  init() {
    if (!this.config.trackingEnabled) return;

    this.setupProjectTracking();
    this.setupEmployerDetection();
    this.setupConversionTracking();
    this.setupContentEngagement();
    this.setupGeographicTracking();
    this.startRealTimeTracking();

    if (this.config.debug) {
      console.log('Portfolio Analytics initialized:', this.session);
    }
  }

  /**
   * Track visitor interest in projects
   */
  setupProjectTracking() {
    // Track project page views
    if (this.isProjectPage()) {
      this.trackProjectView();
    }

    // Track project interactions
    this.setupProjectInteractionTracking();
    
    // Track technology interests
    this.setupTechnologyTracking();
  }

  isProjectPage() {
    return window.location.pathname.includes('/projects/') ||
           window.location.pathname.includes('/portfolio/') ||
           document.querySelector('[data-project-id]');
  }

  trackProjectView() {
    const projectData = this.extractProjectData();
    
    if (projectData) {
      const startTime = Date.now();
      let maxScroll = 0;
      let interactions = 0;

      // Track scrolling within project
      const scrollHandler = () => {
        const scrollPercent = this.getScrollPercent();
        maxScroll = Math.max(maxScroll, scrollPercent);
      };

      // Track interactions within project
      const interactionHandler = () => {
        interactions++;
      };

      window.addEventListener('scroll', scrollHandler);
      document.addEventListener('click', interactionHandler);

      // Send data when leaving project
      const cleanup = () => {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        
        this.sendProjectInterest({
          ...projectData,
          timeSpent,
          scrollDepth: maxScroll,
          interactions
        });

        window.removeEventListener('scroll', scrollHandler);
        document.removeEventListener('click', interactionHandler);
      };

      // Send data on page unload or visibility change
      window.addEventListener('beforeunload', cleanup);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cleanup();
      });

      // Auto-send after 30 seconds for long visits
      setTimeout(() => {
        if (!document.hidden) {
          const timeSpent = Math.round((Date.now() - startTime) / 1000);
          this.sendProjectInterest({
            ...projectData,
            timeSpent,
            scrollDepth: maxScroll,
            interactions
          });
        }
      }, 30000);
    }
  }

  extractProjectData() {
    // Try different methods to extract project data
    let projectId, projectTitle, technologies = [];

    // Method 1: Data attributes
    const projectElement = document.querySelector('[data-project-id]');
    if (projectElement) {
      projectId = projectElement.dataset.projectId;
      projectTitle = projectElement.dataset.projectTitle || document.title;
      technologies = projectElement.dataset.technologies ? 
        projectElement.dataset.technologies.split(',') : [];
    }

    // Method 2: URL parsing
    if (!projectId) {
      const urlMatch = window.location.pathname.match(/\/projects?\/([^\/]+)/);
      if (urlMatch) {
        projectId = urlMatch[1];
        projectTitle = document.title;
      }
    }

    // Method 3: Extract from page content
    if (!technologies.length) {
      technologies = this.extractTechnologiesFromContent();
    }

    return projectId ? { projectId, projectTitle, technologies } : null;
  }

  extractTechnologiesFromContent() {
    const technologies = new Set();
    const techKeywords = [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node',
      'python', 'django', 'flask', 'fastapi', 'java', 'spring',
      'c#', 'dotnet', 'php', 'laravel', 'ruby', 'rails',
      'go', 'rust', 'swift', 'kotlin', 'dart', 'flutter',
      'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
      'git', 'github', 'gitlab', 'jenkins', 'ci/cd', 'webpack',
      'nextjs', 'nuxtjs', 'svelte', 'graphql', 'rest', 'api'
    ];

    const content = document.body.textContent.toLowerCase();
    
    techKeywords.forEach(tech => {
      if (content.includes(tech)) {
        technologies.add(tech);
      }
    });

    // Also check for tags or skills elements
    document.querySelectorAll('[data-skill], [data-tech], .skill-tag, .tech-tag').forEach(el => {
      const skill = el.textContent.trim().toLowerCase();
      if (skill) technologies.add(skill);
    });

    return Array.from(technologies);
  }

  async sendProjectInterest(data) {
    try {
      await this.sendAnalytics('/track/project-interest', {
        sessionId: this.session.id,
        ...data
      });

      this.session.projectInterests.push(data);
      data.technologies.forEach(tech => this.session.skillInterests.add(tech));
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to send project interest:', error);
      }
    }
  }

  /**
   * Detect and track employer/recruiter behavior
   */
  setupEmployerDetection() {
    // Check referrer for professional sources
    this.detectProfessionalReferrer();

    // Track resume/CV interactions
    this.trackResumeInteractions();

    // Monitor contact form behavior
    this.trackContactBehavior();

    // Detect rapid project browsing (employer pattern)
    this.detectRapidBrowsing();

    // Track LinkedIn profile visits
    this.trackLinkedInClicks();
  }

  detectProfessionalReferrer() {
    const referrer = document.referrer.toLowerCase();
    const professionalDomains = [
      'linkedin.com', 'indeed.com', 'glassdoor.com', 
      'stackoverflow.com', 'github.com', 'angel.co'
    ];

    const professionalSource = professionalDomains.find(domain => 
      referrer.includes(domain)
    );

    if (professionalSource) {
      this.session.employerSignals.professionalReferral = professionalSource;
      this.trackEmployerBehavior('professional_referral', {
        source: professionalSource,
        confidence: 40
      });
    }
  }

  trackResumeInteractions() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      
      if (target && this.isResumeLink(target)) {
        this.session.employerSignals.resumeInterest = true;
        this.trackEmployerBehavior('resume_download', {
          link: target.href,
          confidence: 70
        });

        // High-value conversion
        this.trackConversion('resume_download', 50);
      }
    });
  }

  isResumeLink(element) {
    const href = element.href?.toLowerCase() || '';
    const text = element.textContent?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    
    const resumeIndicators = ['resume', 'cv', 'curriculum'];
    
    return resumeIndicators.some(indicator => 
      href.includes(indicator) || 
      text.includes(indicator) || 
      className.includes(indicator)
    ) || href.includes('.pdf');
  }

  trackContactBehavior() {
    // Track contact form interactions
    document.addEventListener('focus', (event) => {
      if (this.isContactForm(event.target)) {
        this.session.employerSignals.contactFormStarted = true;
        this.trackEmployerBehavior('contact_form_start', {
          field: event.target.name || event.target.id,
          confidence: 60
        });
      }
    });

    // Track contact form submissions
    document.addEventListener('submit', (event) => {
      if (this.isContactForm(event.target)) {
        this.trackConversion('contact_form', 100);
        this.trackEmployerBehavior('contact_form_submit', {
          confidence: 90
        });
      }
    });
  }

  isContactForm(element) {
    const form = element.closest('form');
    if (!form) return false;
    
    const formIndicators = ['contact', 'hire', 'inquiry', 'message'];
    const formClass = form.className.toLowerCase();
    const formId = form.id?.toLowerCase() || '';
    
    return formIndicators.some(indicator => 
      formClass.includes(indicator) || formId.includes(indicator)
    );
  }

  detectRapidBrowsing() {
    let projectViewCount = 0;
    let lastProjectView = 0;
    const rapidThreshold = 30000; // 30 seconds

    const observer = new MutationObserver(() => {
      if (this.isProjectPage()) {
        const now = Date.now();
        
        if (now - lastProjectView < rapidThreshold) {
          projectViewCount++;
          
          if (projectViewCount >= 3) {
            this.session.employerSignals.rapidBrowsing = true;
            this.trackEmployerBehavior('rapid_project_browsing', {
              projectCount: projectViewCount,
              confidence: 50
            });
          }
        } else {
          projectViewCount = 1;
        }
        
        lastProjectView = now;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  trackLinkedInClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      
      if (target && target.href?.includes('linkedin.com')) {
        this.trackConversion('linkedin_click', 30);
        this.trackEmployerBehavior('linkedin_profile_visit', {
          confidence: 40
        });
      }
    });
  }

  async trackEmployerBehavior(behaviorType, signals = {}) {
    try {
      await this.sendAnalytics('/track/employer-behavior', {
        sessionId: this.session.id,
        behaviorType,
        signals,
        metadata: {
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }
      });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to track employer behavior:', error);
      }
    }
  }

  /**
   * Track conversion events
   */
  setupConversionTracking() {
    // Email clicks
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      
      if (target && target.href?.startsWith('mailto:')) {
        this.trackConversion('email_click', 40);
      }
    });

    // Phone clicks
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      
      if (target && target.href?.startsWith('tel:')) {
        this.trackConversion('phone_click', 35);
      }
    });

    // Social media clicks
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      
      if (target && this.isSocialMediaLink(target)) {
        const platform = this.getSocialPlatform(target.href);
        this.trackConversion('social_click', 20, { platform });
      }
    });

    // Download tracking
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      
      if (target && this.isDownloadLink(target)) {
        const fileType = this.getFileType(target.href);
        this.trackConversion('download', 30, { fileType });
      }
    });
  }

  isSocialMediaLink(element) {
    const socialDomains = [
      'twitter.com', 'facebook.com', 'instagram.com',
      'linkedin.com', 'github.com', 'youtube.com'
    ];
    
    return socialDomains.some(domain => element.href?.includes(domain));
  }

  getSocialPlatform(url) {
    const platforms = {
      'twitter.com': 'twitter',
      'facebook.com': 'facebook',
      'instagram.com': 'instagram',
      'linkedin.com': 'linkedin',
      'github.com': 'github',
      'youtube.com': 'youtube'
    };
    
    return Object.keys(platforms).find(domain => 
      url.includes(domain)
    ) || 'unknown';
  }

  isDownloadLink(element) {
    const downloadExtensions = ['.pdf', '.doc', '.docx', '.zip', '.rar'];
    const href = element.href?.toLowerCase() || '';
    
    return downloadExtensions.some(ext => href.includes(ext)) ||
           element.download !== undefined;
  }

  getFileType(url) {
    const match = url.match(/\.([^.?]+)(?:\?|$)/);
    return match ? match[1] : 'unknown';
  }

  async trackConversion(conversionType, conversionValue = 0, additionalData = {}) {
    try {
      const conversion = {
        type: conversionType,
        value: conversionValue,
        timestamp: Date.now(),
        ...additionalData
      };

      this.session.conversions.push(conversion);

      await this.sendAnalytics('/track/conversion', {
        sessionId: this.session.id,
        conversionType,
        conversionValue,
        additionalData
      });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to track conversion:', error);
      }
    }
  }

  /**
   * Track content engagement
   */
  setupContentEngagement() {
    let startTime = Date.now();
    let maxScroll = 0;
    let interactionCount = 0;

    // Track scrolling
    const scrollHandler = () => {
      const scrollPercent = this.getScrollPercent();
      maxScroll = Math.max(maxScroll, scrollPercent);
    };

    // Track interactions
    const interactionHandler = () => {
      interactionCount++;
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    document.addEventListener('click', interactionHandler);
    document.addEventListener('keydown', interactionHandler);

    // Send engagement data periodically
    setInterval(() => {
      if (!document.hidden) {
        this.sendContentEngagement({
          timeOnPage: Math.round((Date.now() - startTime) / 1000),
          scrollDepth: maxScroll,
          interactionCount
        });
      }
    }, 30000);

    // Send final data on unload
    window.addEventListener('beforeunload', () => {
      this.sendContentEngagement({
        timeOnPage: Math.round((Date.now() - startTime) / 1000),
        scrollDepth: maxScroll,
        interactionCount,
        final: true
      });
    });
  }

  async sendContentEngagement(metrics) {
    try {
      await this.sendAnalytics('/track/content-engagement', {
        sessionId: this.session.id,
        contentType: this.getContentType(),
        contentId: this.getContentId(),
        engagementMetrics: metrics,
        url: window.location.href
      });
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to send content engagement:', error);
      }
    }
  }

  getContentType() {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('/project')) return 'project';
    if (path.includes('/blog')) return 'blog';
    if (path.includes('/tool')) return 'tool';
    if (path.includes('/about') || path.includes('/me')) return 'about';
    if (path.includes('/contact')) return 'contact';
    if (path.includes('/resume') || path.includes('/cv')) return 'resume';
    if (path.includes('/portfolio')) return 'portfolio';
    if (path.includes('/teaching')) return 'teaching';
    if (path.includes('/writing')) return 'writing';
    if (path === '/') return 'homepage';
    
    return 'page';
  }

  getContentId() {
    // Try to extract content ID from URL or page
    const urlMatch = window.location.pathname.match(/\/([^\/]+)$/);
    return urlMatch ? urlMatch[1] : 'unknown';
  }

  /**
   * Geographic tracking for relocation insights
   */
  setupGeographicTracking() {
    // This would typically be handled server-side via IP geolocation
    // But we can send timezone and language preferences
    
    const geoData = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: navigator.languages
    };

    this.sendAnalytics('/track/geographic', {
      sessionId: this.session.id,
      geoData
    });
  }

  /**
   * Real-time tracking updates
   */
  startRealTimeTracking() {
    if (!this.config.realTimeUpdates) return;

    // Send heartbeat every 30 seconds
    setInterval(() => {
      if (!document.hidden) {
        this.sendHeartbeat();
      }
    }, 30000);

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      this.sendAnalytics('/track/visibility', {
        sessionId: this.session.id,
        visible: !document.hidden,
        timestamp: Date.now()
      });
    });
  }

  async sendHeartbeat() {
    try {
      await this.sendAnalytics('/track/heartbeat', {
        sessionId: this.session.id,
        timestamp: Date.now(),
        url: window.location.href,
        engagementScore: this.calculateEngagementScore()
      });
    } catch (error) {
      // Silent fail for heartbeats
    }
  }

  calculateEngagementScore() {
    const duration = Date.now() - this.session.startTime;
    const pageViews = Object.keys(this.session.pageViews).length;
    const projectInterests = this.session.projectInterests.length;
    const conversions = this.session.conversions.length;

    // Simple engagement scoring
    let score = 0;
    score += Math.min(duration / (1000 * 60), 20); // Time bonus (max 20)
    score += pageViews * 5; // Page view bonus
    score += projectInterests * 10; // Project interest bonus
    score += conversions * 25; // Conversion bonus

    return Math.min(score, 100);
  }

  /**
   * Utility methods
   */
  getScrollPercent() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    return Math.round((scrollTop / scrollHeight) * 100) || 0;
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async sendAnalytics(endpoint, data) {
    if (!this.config.trackingEnabled) return;

    const url = this.config.endpoint + endpoint;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (this.config.debug) {
        console.error('Analytics request failed:', error);
      }
      throw error;
    }
  }

  /**
   * Public API
   */
  trackCustomEvent(eventType, data = {}) {
    return this.sendAnalytics('/track/custom', {
      sessionId: this.session.id,
      eventType,
      data,
      timestamp: Date.now()
    });
  }

  getSessionData() {
    return { ...this.session };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Auto-initialize if not in a module environment
if (typeof window !== 'undefined' && !window.PortfolioAnalytics) {
  window.PortfolioAnalytics = PortfolioAnalytics;
  
  // Auto-start tracking
  const analytics = new PortfolioAnalytics({
    debug: window.location.hostname === 'localhost'
  });
  
  window.portfolioAnalytics = analytics;
}

export default PortfolioAnalytics;