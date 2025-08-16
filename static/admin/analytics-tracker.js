// Client-side Analytics Tracker
// This script should be included on website pages to track page views

(function() {
  'use strict';

  const ANALYTICS_API = 'http://localhost:3335/api/analytics/track';
  
  // Generate or retrieve session ID
  function getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Get screen resolution
  function getScreenResolution() {
    return `${screen.width}x${screen.height}`;
  }

  // Get browser language
  function getBrowserLanguage() {
    return navigator.language || navigator.userLanguage || 'en';
  }

  // Get page load time
  function getPageLoadTime() {
    if (window.performance && window.performance.timing) {
      const navigation = window.performance.timing;
      return navigation.loadEventEnd - navigation.navigationStart;
    }
    return null;
  }

  // Parse UTM parameters from URL
  function getUtmParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content')
    };
  }

  // Check if user agent appears to be a bot
  function isBot() {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
      /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
      /whatsapp/i, /telegram/i
    ];

    const userAgent = navigator.userAgent;
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  // Track page view
  function trackPageView() {
    // Don't track if it's a bot
    if (isBot()) {
      return;
    }

    const data = {
      page: window.location.pathname,
      title: document.title,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
      language: getBrowserLanguage(),
      screenResolution: getScreenResolution(),
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      loadTime: getPageLoadTime(),
      ...getUtmParameters()
    };

    // Remove null/undefined UTM parameters
    Object.keys(data).forEach(key => {
      if (data[key] === null || data[key] === undefined) {
        delete data[key];
      }
    });

    // Send data to analytics API
    sendAnalyticsData(data);
  }

  // Send analytics data to server
  function sendAnalyticsData(data) {
    // Use sendBeacon if available (more reliable for page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], {
        type: 'application/json'
      });
      navigator.sendBeacon(ANALYTICS_API, blob);
    } else {
      // Fallback to fetch with keepalive
      fetch(ANALYTICS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(error => {
        console.debug('Analytics tracking failed:', error);
      });
    }
  }

  // Track page view when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }

  // Track page views for single-page applications
  let currentUrl = window.location.href;
  
  // Listen for history changes (for SPAs)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function() {
    originalPushState.apply(history, arguments);
    setTimeout(checkUrlChange, 0);
  };

  history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    setTimeout(checkUrlChange, 0);
  };

  window.addEventListener('popstate', checkUrlChange);

  function checkUrlChange() {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      setTimeout(trackPageView, 100); // Small delay to let page update
    }
  }

  // Track page visibility changes (for session duration tracking)
  let pageVisibilityStart = Date.now();

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      // Page is now hidden - could track time spent on page
      const timeSpent = Date.now() - pageVisibilityStart;
      console.debug('Time spent on page:', timeSpent, 'ms');
    } else {
      // Page is now visible
      pageVisibilityStart = Date.now();
    }
  });

  // Export for manual tracking
  window.analyticsTracker = {
    track: trackPageView,
    trackCustomEvent: function(eventData) {
      const data = {
        ...eventData,
        sessionId: getSessionId(),
        timestamp: new Date().toISOString()
      };
      sendAnalyticsData(data);
    }
  };

})();