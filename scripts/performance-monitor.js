#!/usr/bin/env node

/**
 * Performance Monitoring Setup
 * Comprehensive performance tracking and optimization for Hugo + Supabase deployment
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class PerformanceMonitor {
  constructor(options = {}) {
    this.config = {
      url: process.env.DEPLOYED_URL || 'https://vocal-pony-24e3de.netlify.app',
      interval: options.interval || 300000, // 5 minutes
      metrics: {
        lighthouse: true,
        webVitals: true,
        loadTime: true,
        resourceTiming: true,
        apiPerformance: true
      },
      thresholds: {
        performance: 80,
        accessibility: 90,
        bestPractices: 80,
        seo: 90,
        loadTime: 2000, // ms
        fcp: 2000, // First Contentful Paint
        lcp: 2500, // Largest Contentful Paint
        fid: 100, // First Input Delay
        cls: 0.1, // Cumulative Layout Shift
        ttfb: 500 // Time to First Byte
      },
      alerting: {
        webhook: process.env.PERFORMANCE_WEBHOOK_URL,
        email: process.env.PERFORMANCE_ALERT_EMAIL
      },
      storage: {
        datadog: {
          apiKey: process.env.DATADOG_API_KEY,
          appKey: process.env.DATADOG_APP_KEY,
          site: process.env.DATADOG_SITE || 'datadoghq.com'
        },
        local: {
          enabled: true,
          directory: './performance-data'
        }
      },
      ...options
    };
    
    this.isRunning = false;
    this.intervalId = null;
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      metric: chalk.cyan
    };
    
    const timestamp = new Date().toISOString();
    // Performance monitor logging has been disabled for production
  }

  async measureLoadTime() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(this.config.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'PerformanceMonitor/1.0',
          'Cache-Control': 'no-cache'
        }
      });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      return {
        loadTime,
        status: response.status,
        responseSize: response.headers['content-length'] || 0,
        timestamp: new Date().toISOString(),
        url: this.config.url
      };
    } catch (error) {
      return {
        loadTime: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        url: this.config.url
      };
    }
  }

  async measureWebVitals() {
    try {
      // Use Lighthouse CI to get Web Vitals
      const { execSync } = require('child_process');
      
      const lighthouse = execSync(
        `npx lighthouse ${this.config.url} --output=json --quiet --chrome-flags="--headless --no-sandbox"`,
        { encoding: 'utf-8', timeout: 60000 }
      );
      
      const report = JSON.parse(lighthouse);
      const audits = report.lhr.audits;
      
      return {
        performance: Math.round(report.lhr.categories.performance.score * 100),
        accessibility: Math.round(report.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(report.lhr.categories['best-practices'].score * 100),
        seo: Math.round(report.lhr.categories.seo.score * 100),
        fcp: audits['first-contentful-paint']?.numericValue || null,
        lcp: audits['largest-contentful-paint']?.numericValue || null,
        fid: audits['max-potential-fid']?.numericValue || null,
        cls: audits['cumulative-layout-shift']?.numericValue || null,
        ttfb: audits['server-response-time']?.numericValue || null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.log(`Lighthouse measurement failed: ${error.message}`, 'error');
      return null;
    }
  }

  async measureAPIPerformance() {
    const apiEndpoints = [
      '/api/health',
      '/api/auth/me',
      '/sitemap.xml',
      '/robots.txt'
    ];
    
    const results = [];
    
    for (const endpoint of apiEndpoints) {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${this.config.url}${endpoint}`, {
          timeout: 10000,
          validateStatus: status => status < 500
        });
        
        const endTime = Date.now();
        
        results.push({
          endpoint,
          responseTime: endTime - startTime,
          status: response.status,
          success: true,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          endpoint,
          responseTime: null,
          status: null,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  async measureResourceTiming() {
    try {
      const puppeteer = require('puppeteer');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Enable performance timing
      await page.evaluateOnNewDocument(() => {
        window.performanceData = {
          resources: [],
          navigation: null
        };
        
        // Capture resource timing
        new PerformanceObserver((list) => {
          window.performanceData.resources.push(...list.getEntries());
        }).observe({ entryTypes: ['resource'] });
        
        // Capture navigation timing
        new PerformanceObserver((list) => {
          window.performanceData.navigation = list.getEntries()[0];
        }).observe({ entryTypes: ['navigation'] });
      });
      
      await page.goto(this.config.url, { waitUntil: 'networkidle2' });
      
      // Wait for performance data collection
      await page.waitForTimeout(2000);
      
      const performanceData = await page.evaluate(() => window.performanceData);
      
      await browser.close();
      
      return {
        resourceCount: performanceData.resources.length,
        totalResourceSize: performanceData.resources.reduce((sum, resource) => 
          sum + (resource.transferSize || 0), 0),
        slowestResource: performanceData.resources.reduce((slowest, resource) => 
          (resource.duration > (slowest?.duration || 0)) ? resource : slowest, null),
        navigationTiming: performanceData.navigation,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.log(`Resource timing measurement failed: ${error.message}`, 'error');
      return null;
    }
  }

  async collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      url: this.config.url
    };
    
    this.log('Collecting performance metrics...', 'info');
    
    // Measure load time
    if (this.config.metrics.loadTime) {
      const loadTimeData = await this.measureLoadTime();
      metrics.loadTime = loadTimeData;
      
      if (loadTimeData.loadTime) {
        this.log(`Load time: ${loadTimeData.loadTime}ms`, 'metric');
      }
    }
    
    // Measure Web Vitals
    if (this.config.metrics.webVitals) {
      const webVitals = await this.measureWebVitals();
      if (webVitals) {
        metrics.webVitals = webVitals;
        this.log(`Performance score: ${webVitals.performance}/100`, 'metric');
        this.log(`Accessibility score: ${webVitals.accessibility}/100`, 'metric');
      }
    }
    
    // Measure API performance
    if (this.config.metrics.apiPerformance) {
      const apiMetrics = await this.measureAPIPerformance();
      metrics.apiPerformance = apiMetrics;
      
      const avgResponseTime = apiMetrics
        .filter(m => m.success)
        .reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.filter(m => m.success).length;
      
      this.log(`Average API response time: ${Math.round(avgResponseTime)}ms`, 'metric');
    }
    
    // Measure resource timing
    if (this.config.metrics.resourceTiming) {
      const resourceTiming = await this.measureResourceTiming();
      if (resourceTiming) {
        metrics.resourceTiming = resourceTiming;
        this.log(`Resources loaded: ${resourceTiming.resourceCount}`, 'metric');
      }
    }
    
    return metrics;
  }

  analyzeMetrics(metrics) {
    const issues = [];
    const warnings = [];
    const recommendations = [];
    
    // Check load time
    if (metrics.loadTime?.loadTime > this.config.thresholds.loadTime) {
      issues.push({
        type: 'load_time',
        severity: 'high',
        message: `Load time (${metrics.loadTime.loadTime}ms) exceeds threshold (${this.config.thresholds.loadTime}ms)`,
        value: metrics.loadTime.loadTime,
        threshold: this.config.thresholds.loadTime
      });
    }
    
    // Check Web Vitals
    if (metrics.webVitals) {
      const vitals = metrics.webVitals;
      
      if (vitals.performance < this.config.thresholds.performance) {
        issues.push({
          type: 'performance_score',
          severity: 'high',
          message: `Performance score (${vitals.performance}) is below threshold (${this.config.thresholds.performance})`,
          value: vitals.performance,
          threshold: this.config.thresholds.performance
        });
      }
      
      if (vitals.fcp > this.config.thresholds.fcp) {
        warnings.push({
          type: 'first_contentful_paint',
          message: `First Contentful Paint (${vitals.fcp}ms) is slow`,
          value: vitals.fcp,
          threshold: this.config.thresholds.fcp
        });
        recommendations.push('Consider optimizing critical rendering path and reducing render-blocking resources');
      }
      
      if (vitals.lcp > this.config.thresholds.lcp) {
        issues.push({
          type: 'largest_contentful_paint',
          severity: 'medium',
          message: `Largest Contentful Paint (${vitals.lcp}ms) is slow`,
          value: vitals.lcp,
          threshold: this.config.thresholds.lcp
        });
        recommendations.push('Optimize largest content element loading (images, text blocks)');
      }
      
      if (vitals.cls > this.config.thresholds.cls) {
        issues.push({
          type: 'cumulative_layout_shift',
          severity: 'medium',
          message: `Cumulative Layout Shift (${vitals.cls}) exceeds threshold`,
          value: vitals.cls,
          threshold: this.config.thresholds.cls
        });
        recommendations.push('Add size attributes to images and reserve space for dynamic content');
      }
    }
    
    // Check API performance
    if (metrics.apiPerformance) {
      const failedAPIs = metrics.apiPerformance.filter(api => !api.success);
      const slowAPIs = metrics.apiPerformance.filter(api => api.success && api.responseTime > 1000);
      
      if (failedAPIs.length > 0) {
        issues.push({
          type: 'api_failures',
          severity: 'high',
          message: `${failedAPIs.length} API endpoints are failing`,
          endpoints: failedAPIs.map(api => api.endpoint)
        });
      }
      
      if (slowAPIs.length > 0) {
        warnings.push({
          type: 'slow_apis',
          message: `${slowAPIs.length} API endpoints are slow (>1s)`,
          endpoints: slowAPIs.map(api => ({ endpoint: api.endpoint, time: api.responseTime }))
        });
      }
    }
    
    return { issues, warnings, recommendations };
  }

  async storeMetrics(metrics, analysis) {
    const data = {
      metrics,
      analysis,
      timestamp: metrics.timestamp
    };
    
    // Store locally
    if (this.config.storage.local.enabled) {
      try {
        await fs.mkdir(this.config.storage.local.directory, { recursive: true });
        
        const filename = `metrics-${Date.now()}.json`;
        const filepath = path.join(this.config.storage.local.directory, filename);
        
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        this.log(`Metrics stored locally: ${filepath}`, 'success');
      } catch (error) {
        this.log(`Failed to store metrics locally: ${error.message}`, 'error');
      }
    }
    
    // Send to Datadog
    if (this.config.storage.datadog.apiKey) {
      await this.sendToDatadog(metrics);
    }
    
    // Store aggregated daily summary
    await this.updateDailySummary(metrics, analysis);
  }

  async sendToDatadog(metrics) {
    try {
      const datadogMetrics = [];
      
      if (metrics.loadTime?.loadTime) {
        datadogMetrics.push({
          metric: 'portfolio.load_time',
          points: [[Math.floor(Date.now() / 1000), metrics.loadTime.loadTime]],
          tags: [`url:${this.config.url}`, 'environment:production']
        });
      }
      
      if (metrics.webVitals) {
        const vitals = metrics.webVitals;
        ['performance', 'accessibility', 'bestPractices', 'seo'].forEach(metric => {
          if (vitals[metric] !== null) {
            datadogMetrics.push({
              metric: `portfolio.lighthouse.${metric}`,
              points: [[Math.floor(Date.now() / 1000), vitals[metric]]],
              tags: [`url:${this.config.url}`, 'environment:production']
            });
          }
        });
        
        ['fcp', 'lcp', 'fid', 'cls', 'ttfb'].forEach(metric => {
          if (vitals[metric] !== null) {
            datadogMetrics.push({
              metric: `portfolio.web_vitals.${metric}`,
              points: [[Math.floor(Date.now() / 1000), vitals[metric]]],
              tags: [`url:${this.config.url}`, 'environment:production']
            });
          }
        });
      }
      
      if (datadogMetrics.length > 0) {
        await axios.post(
          `https://api.${this.config.storage.datadog.site}/api/v1/metrics`,
          { series: datadogMetrics },
          {
            headers: {
              'Content-Type': 'application/json',
              'DD-API-KEY': this.config.storage.datadog.apiKey
            }
          }
        );
        
        this.log(`Sent ${datadogMetrics.length} metrics to Datadog`, 'success');
      }
    } catch (error) {
      this.log(`Failed to send metrics to Datadog: ${error.message}`, 'error');
    }
  }

  async updateDailySummary(metrics, analysis) {
    const today = new Date().toISOString().split('T')[0];
    const summaryPath = path.join(this.config.storage.local.directory, `daily-${today}.json`);
    
    try {
      let summary = {};
      
      try {
        const existingData = await fs.readFile(summaryPath, 'utf8');
        summary = JSON.parse(existingData);
      } catch {
        // File doesn't exist, start fresh
        summary = {
          date: today,
          measurements: 0,
          loadTimes: [],
          performanceScores: [],
          issues: [],
          warnings: []
        };
      }
      
      summary.measurements++;
      summary.lastUpdate = new Date().toISOString();
      
      if (metrics.loadTime?.loadTime) {
        summary.loadTimes.push(metrics.loadTime.loadTime);
      }
      
      if (metrics.webVitals?.performance) {
        summary.performanceScores.push(metrics.webVitals.performance);
      }
      
      summary.issues.push(...analysis.issues);
      summary.warnings.push(...analysis.warnings);
      
      // Calculate averages
      summary.avgLoadTime = summary.loadTimes.length > 0 ? 
        Math.round(summary.loadTimes.reduce((a, b) => a + b, 0) / summary.loadTimes.length) : null;
      
      summary.avgPerformanceScore = summary.performanceScores.length > 0 ?
        Math.round(summary.performanceScores.reduce((a, b) => a + b, 0) / summary.performanceScores.length) : null;
      
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    } catch (error) {
      this.log(`Failed to update daily summary: ${error.message}`, 'error');
    }
  }

  async sendAlert(analysis) {
    const criticalIssues = analysis.issues.filter(issue => issue.severity === 'high');
    
    if (criticalIssues.length === 0) {
      return;
    }
    
    const alertData = {
      timestamp: new Date().toISOString(),
      url: this.config.url,
      criticalIssues,
      warnings: analysis.warnings,
      recommendations: analysis.recommendations
    };
    
    // Send webhook alert
    if (this.config.alerting.webhook) {
      try {
        await axios.post(this.config.alerting.webhook, {
          text: `🚨 Performance Alert: ${criticalIssues.length} critical issues detected on ${this.config.url}`,
          attachments: [{
            color: 'danger',
            fields: criticalIssues.map(issue => ({
              title: issue.type,
              value: issue.message,
              short: false
            }))
          }]
        });
        
        this.log('Alert sent via webhook', 'warning');
      } catch (error) {
        this.log(`Failed to send webhook alert: ${error.message}`, 'error');
      }
    }
    
    this.log(`Performance alert: ${criticalIssues.length} critical issues detected`, 'error');
  }

  async runOnce() {
    try {
      this.log('Starting performance measurement...', 'info');
      
      const metrics = await this.collectMetrics();
      const analysis = this.analyzeMetrics(metrics);
      
      await this.storeMetrics(metrics, analysis);
      
      if (analysis.issues.length > 0) {
        this.log(`Found ${analysis.issues.length} performance issues`, 'warning');
        await this.sendAlert(analysis);
      }
      
      if (analysis.warnings.length > 0) {
        this.log(`Found ${analysis.warnings.length} performance warnings`, 'warning');
      }
      
      this.log('Performance measurement completed', 'success');
      
      return { metrics, analysis };
    } catch (error) {
      this.log(`Performance measurement failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      this.log('Performance monitor is already running', 'warning');
      return;
    }
    
    this.isRunning = true;
    this.log(`Starting continuous performance monitoring (interval: ${this.config.interval / 1000}s)`, 'info');
    
    // Run immediately
    await this.runOnce();
    
    // Set up interval
    this.intervalId = setInterval(async () => {
      try {
        await this.runOnce();
      } catch (error) {
        this.log(`Monitoring cycle failed: ${error.message}`, 'error');
      }
    }, this.config.interval);
  }

  stop() {
    if (!this.isRunning) {
      this.log('Performance monitor is not running', 'warning');
      return;
    }
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.log('Performance monitoring stopped', 'info');
  }

  async generateReport(days = 7) {
    this.log(`Generating performance report for the last ${days} days...`, 'info');
    
    const reportData = {
      period: `${days} days`,
      generatedAt: new Date().toISOString(),
      url: this.config.url,
      summary: {},
      trends: {},
      recommendations: []
    };
    
    try {
      const summaryFiles = [];
      const now = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const summaryPath = path.join(this.config.storage.local.directory, `daily-${dateStr}.json`);
        
        try {
          const data = await fs.readFile(summaryPath, 'utf8');
          summaryFiles.push(JSON.parse(data));
        } catch {
          // File doesn't exist for this date
        }
      }
      
      if (summaryFiles.length > 0) {
        // Calculate overall summary
        const allLoadTimes = summaryFiles.flatMap(s => s.loadTimes || []);
        const allPerfScores = summaryFiles.flatMap(s => s.performanceScores || []);
        
        reportData.summary = {
          totalMeasurements: summaryFiles.reduce((sum, s) => sum + s.measurements, 0),
          avgLoadTime: allLoadTimes.length > 0 ? 
            Math.round(allLoadTimes.reduce((a, b) => a + b, 0) / allLoadTimes.length) : null,
          avgPerformanceScore: allPerfScores.length > 0 ?
            Math.round(allPerfScores.reduce((a, b) => a + b, 0) / allPerfScores.length) : null,
          totalIssues: summaryFiles.reduce((sum, s) => sum + s.issues.length, 0),
          totalWarnings: summaryFiles.reduce((sum, s) => sum + s.warnings.length, 0)
        };
      }
      
      const reportPath = path.join(this.config.storage.local.directory, `performance-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      
      this.log(`Performance report generated: ${reportPath}`, 'success');
      return reportData;
    } catch (error) {
      this.log(`Failed to generate report: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'once':
      monitor.runOnce()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(chalk.red('❌ Performance measurement failed:'), error.message);
          process.exit(1);
        });
      break;
      
    case 'start':
      monitor.start()
        .catch((error) => {
          console.error(chalk.red('❌ Performance monitoring failed:'), error.message);
          process.exit(1);
        });
      break;
      
    case 'report':
      const days = parseInt(process.argv[3]) || 7;
      monitor.generateReport(days)
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(chalk.red('❌ Report generation failed:'), error.message);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node performance-monitor.js once    - Run single measurement');
      console.log('  node performance-monitor.js start   - Start continuous monitoring');
      console.log('  node performance-monitor.js report [days] - Generate performance report');
      break;
  }
}

module.exports = PerformanceMonitor;