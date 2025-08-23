/**
 * API Performance Monitor
 * Tracks API performance, health, and user experience metrics
 */

class APIMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      performance: new Map(),
      health: new Map(),
      errors: [],
      userExperience: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        demoModeActivations: 0
      }
    };
    
    this.startTime = Date.now();
    this.setupPerformanceObserver();
    this.startReporting();
  }

  /**
   * Record API request metrics
   */
  recordRequest(endpoint, method, startTime, endTime, success, error = null) {
    const duration = endTime - startTime;
    const request = {
      endpoint,
      method,
      startTime,
      endTime,
      duration,
      success,
      error: error ? error.message : null,
      timestamp: Date.now()
    };

    // Store request
    this.metrics.requests.push(request);
    
    // Update user experience metrics
    this.metrics.userExperience.totalRequests++;
    if (success) {
      this.metrics.userExperience.successfulRequests++;
    } else {
      this.metrics.userExperience.failedRequests++;
      this.recordError(error, endpoint);
    }

    // Update average response time
    this.updateAverageResponseTime(duration);
    
    // Update endpoint performance
    this.updateEndpointPerformance(endpoint, duration, success);
    
    // Trim old requests (keep last 100)
    if (this.metrics.requests.length > 100) {
      this.metrics.requests = this.metrics.requests.slice(-100);
    }

    console.log(`📊 Request recorded: ${endpoint} ${duration}ms ${success ? '✅' : '❌'}`);
  }

  /**
   * Record error details
   */
  recordError(error, context = 'unknown') {
    if (!error) return;
    
    const errorRecord = {
      message: error.message,
      context,
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.metrics.errors.push(errorRecord);
    
    // Trim old errors (keep last 50)
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
  }

  /**
   * Record demo mode activation
   */
  recordDemoModeActivation(reason = 'network_error') {
    this.metrics.userExperience.demoModeActivations++;
    console.log(`🎭 Demo mode activated: ${reason}`);
    
    // Record as special event
    this.recordEvent('demo_mode_activated', { reason });
  }

  /**
   * Record health check result
   */
  recordHealthCheck(endpoint, healthy, responseTime = null) {
    const key = endpoint;
    
    if (!this.metrics.health.has(key)) {
      this.metrics.health.set(key, {
        checks: [],
        uptime: 0,
        downtime: 0,
        totalChecks: 0
      });
    }

    const health = this.metrics.health.get(key);
    health.checks.push({
      timestamp: Date.now(),
      healthy,
      responseTime
    });
    
    health.totalChecks++;
    if (healthy) {
      health.uptime++;
    } else {
      health.downtime++;
    }

    // Keep last 50 checks per endpoint
    if (health.checks.length > 50) {
      health.checks = health.checks.slice(-50);
    }
  }

  /**
   * Record custom event
   */
  recordEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      data,
      timestamp: Date.now(),
      url: window.location.href
    };

    if (!this.metrics.events) {
      this.metrics.events = [];
    }
    
    this.metrics.events.push(event);
    
    // Trim old events
    if (this.metrics.events.length > 100) {
      this.metrics.events = this.metrics.events.slice(-100);
    }
  }

  /**
   * Update average response time
   */
  updateAverageResponseTime(duration) {
    const ux = this.metrics.userExperience;
    const total = ux.averageResponseTime * (ux.totalRequests - 1) + duration;
    ux.averageResponseTime = total / ux.totalRequests;
  }

  /**
   * Update endpoint-specific performance metrics
   */
  updateEndpointPerformance(endpoint, duration, success) {
    if (!this.metrics.performance.has(endpoint)) {
      this.metrics.performance.set(endpoint, {
        requests: 0,
        totalTime: 0,
        successCount: 0,
        errorCount: 0,
        minTime: duration,
        maxTime: duration
      });
    }

    const perf = this.metrics.performance.get(endpoint);
    perf.requests++;
    perf.totalTime += duration;
    perf.minTime = Math.min(perf.minTime, duration);
    perf.maxTime = Math.max(perf.maxTime, duration);
    
    if (success) {
      perf.successCount++;
    } else {
      perf.errorCount++;
    }
  }

  /**
   * Setup performance observer for web vitals
   */
  setupPerformanceObserver() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.recordEvent('navigation', {
                loadTime: entry.loadEventEnd - entry.loadEventStart,
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                responseTime: entry.responseEnd - entry.requestStart
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const ux = this.metrics.userExperience;
    const uptime = Date.now() - this.startTime;
    
    return {
      overview: {
        uptime,
        totalRequests: ux.totalRequests,
        successRate: ux.totalRequests > 0 ? (ux.successfulRequests / ux.totalRequests * 100).toFixed(2) : 0,
        averageResponseTime: Math.round(ux.averageResponseTime),
        demoModeActivations: ux.demoModeActivations
      },
      
      endpoints: Array.from(this.metrics.performance.entries()).map(([endpoint, data]) => ({
        endpoint,
        requests: data.requests,
        averageTime: Math.round(data.totalTime / data.requests),
        minTime: data.minTime,
        maxTime: data.maxTime,
        successRate: data.requests > 0 ? (data.successCount / data.requests * 100).toFixed(2) : 0
      })),
      
      health: Array.from(this.metrics.health.entries()).map(([endpoint, data]) => ({
        endpoint,
        uptime: data.totalChecks > 0 ? (data.uptime / data.totalChecks * 100).toFixed(2) : 0,
        totalChecks: data.totalChecks,
        lastCheck: data.checks[data.checks.length - 1]
      })),
      
      recentErrors: this.metrics.errors.slice(-10)
    };
  }

  /**
   * Get dashboard data
   */
  getDashboardData() {
    const report = this.getPerformanceReport();
    const recentRequests = this.metrics.requests.slice(-20);
    
    return {
      ...report,
      recentRequests: recentRequests.map(req => ({
        endpoint: req.endpoint,
        duration: req.duration,
        success: req.success,
        timestamp: req.timestamp
      })),
      
      chartData: {
        responseTime: recentRequests.map(req => ({
          time: new Date(req.timestamp).toLocaleTimeString(),
          duration: req.duration
        })),
        
        successRate: this.calculateSuccessRateOverTime(),
        
        endpointDistribution: this.getEndpointDistribution()
      }
    };
  }

  /**
   * Calculate success rate over time
   */
  calculateSuccessRateOverTime() {
    const intervals = [];
    const now = Date.now();
    const intervalSize = 5 * 60 * 1000; // 5 minutes
    
    for (let i = 11; i >= 0; i--) {
      const endTime = now - (i * intervalSize);
      const startTime = endTime - intervalSize;
      
      const requests = this.metrics.requests.filter(req => 
        req.timestamp >= startTime && req.timestamp < endTime
      );
      
      const successRate = requests.length > 0 
        ? (requests.filter(req => req.success).length / requests.length * 100)
        : 100;
      
      intervals.push({
        time: new Date(endTime).toLocaleTimeString(),
        rate: successRate
      });
    }
    
    return intervals;
  }

  /**
   * Get endpoint usage distribution
   */
  getEndpointDistribution() {
    const distribution = {};
    
    this.metrics.requests.forEach(req => {
      distribution[req.endpoint] = (distribution[req.endpoint] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([endpoint, count]) => ({
      endpoint,
      count,
      percentage: (count / this.metrics.requests.length * 100).toFixed(1)
    }));
  }

  /**
   * Export metrics data
   */
  exportMetrics() {
    const exportData = {
      timestamp: Date.now(),
      startTime: this.startTime,
      metrics: {
        ...this.metrics,
        performance: Object.fromEntries(this.metrics.performance),
        health: Object.fromEntries(this.metrics.health)
      },
      report: this.getPerformanceReport()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = {
      requests: [],
      performance: new Map(),
      health: new Map(),
      errors: [],
      userExperience: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        demoModeActivations: 0
      }
    };
    
    this.startTime = Date.now();
    console.log('📊 Metrics cleared');
  }

  /**
   * Start periodic reporting
   */
  startReporting() {
    // Report metrics every 5 minutes
    setInterval(() => {
      const report = this.getPerformanceReport();
      console.log('📊 Performance Report:', report.overview);
    }, 5 * 60 * 1000);
    
    // Log errors immediately but not too frequently
    let lastErrorLog = 0;
    setInterval(() => {
      const recentErrors = this.metrics.errors.filter(
        error => error.timestamp > lastErrorLog
      );
      
      if (recentErrors.length > 0) {
        console.warn(`🚨 ${recentErrors.length} new errors recorded`);
        lastErrorLog = Date.now();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Create monitoring dashboard element
   */
  createDashboard() {
    const dashboard = document.createElement('div');
    dashboard.id = 'api-monitor-dashboard';
    dashboard.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      width: 300px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10001;
      max-height: 80vh;
      overflow-y: auto;
      display: none;
    `;
    
    this.updateDashboard(dashboard);
    document.body.appendChild(dashboard);
    
    // Update dashboard every 5 seconds
    setInterval(() => this.updateDashboard(dashboard), 5000);
    
    return dashboard;
  }

  /**
   * Update dashboard content
   */
  updateDashboard(dashboard) {
    const data = this.getDashboardData();
    
    dashboard.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">
        📊 API Monitor Dashboard
        <button onclick="this.parentElement.parentElement.style.display='none'" 
                style="float: right; background: none; border: none; color: white; cursor: pointer;">✕</button>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Overview:</strong><br>
        Requests: ${data.overview.totalRequests}<br>
        Success Rate: ${data.overview.successRate}%<br>
        Avg Response: ${data.overview.averageResponseTime}ms<br>
        Demo Activations: ${data.overview.demoModeActivations}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Endpoints:</strong><br>
        ${data.endpoints.map(ep => 
          `${ep.endpoint}: ${ep.averageTime}ms (${ep.successRate}%)`
        ).join('<br>')}
      </div>
      
      <div>
        <strong>Recent Errors:</strong><br>
        ${data.recentErrors.slice(0, 3).map(err => 
          `${new Date(err.timestamp).toLocaleTimeString()}: ${err.message}`
        ).join('<br>') || 'None'}
      </div>
    `;
  }

  /**
   * Toggle dashboard visibility
   */
  toggleDashboard() {
    let dashboard = document.getElementById('api-monitor-dashboard');
    if (!dashboard) {
      dashboard = this.createDashboard();
    }
    
    dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
  }
}

// Create global monitor instance
window.apiMonitor = new APIMonitor();

// Keyboard shortcut to toggle dashboard (Ctrl+Shift+M)
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'M') {
    event.preventDefault();
    window.apiMonitor.toggleDashboard();
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIMonitor;
}