#!/usr/bin/env node

/**
 * Production Monitoring and Health Check Script
 * 
 * This script provides comprehensive monitoring for the production deployment
 * including health checks, performance monitoring, error tracking, and alerting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
require('dotenv').config();

class ProductionMonitor {
  constructor() {
    this.baseUrl = process.env.SITE_URL || process.env.PRODUCTION_URL;
    this.monitoringDir = path.join(__dirname, '..', '..', 'monitoring');
    this.logFile = path.join(this.monitoringDir, 'monitoring.log');
    this.metricsFile = path.join(this.monitoringDir, 'metrics.json');
    
    this.thresholds = {
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 2000, // 2 seconds
      uptime: parseFloat(process.env.UPTIME_THRESHOLD) || 99.9, // 99.9%
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 1.0, // 1%
      loadTime: parseInt(process.env.LOAD_TIME_THRESHOLD) || 3000, // 3 seconds
      availability: parseFloat(process.env.AVAILABILITY_THRESHOLD) || 99.5 // 99.5%
    };
    
    this.endpoints = [
      '/',
      '/api/health',
      '/admin',
      '/blog',
      '/projects',
      '/contact'
    ];
    
    this.ensureMonitoringDirectory();
  }

  ensureMonitoringDirectory() {
    if (!fs.existsSync(this.monitoringDir)) {
      fs.mkdirSync(this.monitoringDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        method: options.method || 'GET',
        timeout: options.timeout || 10000,
        headers: {
          'User-Agent': 'Portfolio-Monitor/1.0',
          ...options.headers
        }
      };
      
      const req = client.request(url, requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            success: true,
            statusCode: res.statusCode,
            responseTime,
            data,
            headers: res.headers,
            url
          });
        });
      });
      
      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: false,
          error: error.message,
          responseTime,
          url
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        resolve({
          success: false,
          error: 'Request timeout',
          responseTime,
          url
        });
      });
      
      req.end();
    });
  }

  async checkEndpoint(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    this.log(`Checking endpoint: ${endpoint}`);
    
    const result = await this.makeRequest(url);
    
    const status = {
      endpoint,
      url,
      timestamp: new Date().toISOString(),
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      error: result.error,
      healthy: result.success && result.statusCode >= 200 && result.statusCode < 400
    };
    
    // Check response time threshold
    if (result.responseTime > this.thresholds.responseTime) {
      status.warning = `Response time ${result.responseTime}ms exceeds threshold ${this.thresholds.responseTime}ms`;
    }
    
    // Additional checks for specific endpoints
    if (endpoint === '/api/health' && result.success) {
      try {
        const healthData = JSON.parse(result.data);
        status.healthData = healthData;
        status.healthy = status.healthy && healthData.status === 'healthy';
      } catch (error) {
        status.warning = 'Health endpoint returned invalid JSON';
        status.healthy = false;
      }
    }
    
    return status;
  }

  async performHealthCheck() {
    this.log('Starting comprehensive health check...');
    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      endpoints: [],
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        warnings: 0,
        avgResponseTime: 0,
        overallHealth: 'unknown'
      }
    };
    
    const checks = await Promise.all(
      this.endpoints.map(endpoint => this.checkEndpoint(endpoint))
    );
    
    results.endpoints = checks;
    results.summary.total = checks.length;
    results.summary.healthy = checks.filter(c => c.healthy).length;
    results.summary.unhealthy = checks.filter(c => !c.healthy).length;
    results.summary.warnings = checks.filter(c => c.warning).length;
    results.summary.avgResponseTime = Math.round(
      checks.reduce((sum, c) => sum + c.responseTime, 0) / checks.length
    );
    
    // Determine overall health
    const healthPercentage = (results.summary.healthy / results.summary.total) * 100;
    if (healthPercentage >= this.thresholds.availability) {
      results.summary.overallHealth = 'healthy';
    } else if (healthPercentage >= 80) {
      results.summary.overallHealth = 'degraded';
    } else {
      results.summary.overallHealth = 'unhealthy';
    }
    
    this.log(`Health check completed: ${results.summary.healthy}/${results.summary.total} endpoints healthy`);
    return results;
  }

  async checkSSLCertificate() {
    if (!this.baseUrl.startsWith('https://')) {
      return { warning: 'Site is not using HTTPS' };
    }
    
    this.log('Checking SSL certificate...');
    const url = new URL(this.baseUrl);
    
    return new Promise((resolve) => {
      const options = {
        host: url.hostname,
        port: 443,
        method: 'GET',
        rejectUnauthorized: false
      };
      
      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate(true);
        const now = new Date();
        const expiryDate = new Date(cert.valid_to);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        resolve({
          valid: res.socket.authorized,
          issuer: cert.issuer?.CN,
          subject: cert.subject?.CN,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry,
          fingerprint: cert.fingerprint,
          warning: daysUntilExpiry < 30 ? `SSL certificate expires in ${daysUntilExpiry} days` : null
        });
      });
      
      req.on('error', (error) => {
        resolve({
          error: `SSL check failed: ${error.message}`
        });
      });
      
      req.end();
    });
  }

  async checkDNS() {
    this.log('Checking DNS resolution...');
    const url = new URL(this.baseUrl);
    const domain = url.hostname;
    
    try {
      const { execSync } = require('child_process');
      const dnsResult = execSync(`nslookup ${domain}`, { encoding: 'utf8' });
      
      return {
        domain,
        resolved: dnsResult.includes('Address:') || dnsResult.includes('answer:'),
        details: dnsResult
      };
    } catch (error) {
      return {
        domain,
        resolved: false,
        error: error.message
      };
    }
  }

  async performSecurityCheck() {
    this.log('Performing security checks...');
    const securityHeaders = [
      'strict-transport-security',
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'content-security-policy',
      'referrer-policy'
    ];
    
    const result = await this.makeRequest(this.baseUrl);
    const checks = {
      https: this.baseUrl.startsWith('https://'),
      headers: {}
    };
    
    if (result.success) {
      securityHeaders.forEach(header => {
        checks.headers[header] = {
          present: result.headers.hasOwnProperty(header.toLowerCase()),
          value: result.headers[header.toLowerCase()] || null
        };
      });
    }
    
    // Check for common security issues
    checks.warnings = [];
    if (!checks.https) {
      checks.warnings.push('Site is not using HTTPS');
    }
    
    Object.entries(checks.headers).forEach(([header, info]) => {
      if (!info.present) {
        checks.warnings.push(`Missing security header: ${header}`);
      }
    });
    
    return checks;
  }

  async measurePageLoadPerformance() {
    this.log('Measuring page load performance...');
    
    // This is a simplified performance check
    // In a real implementation, you might use tools like Lighthouse API
    const performanceTests = await Promise.all([
      this.makeRequest(this.baseUrl),
      this.makeRequest(`${this.baseUrl}/css/main.css`),
      this.makeRequest(`${this.baseUrl}/js/main.js`)
    ]);
    
    const totalLoadTime = performanceTests.reduce((sum, test) => sum + test.responseTime, 0);
    
    return {
      htmlLoadTime: performanceTests[0].responseTime,
      cssLoadTime: performanceTests[1].responseTime,
      jsLoadTime: performanceTests[2].responseTime,
      totalLoadTime,
      warning: totalLoadTime > this.thresholds.loadTime ? 
        `Total load time ${totalLoadTime}ms exceeds threshold ${this.thresholds.loadTime}ms` : null
    };
  }

  async checkDatabaseConnectivity() {
    this.log('Checking database connectivity...');
    
    try {
      const result = await this.makeRequest(`${this.baseUrl}/api/health`);
      if (result.success) {
        const healthData = JSON.parse(result.data);
        return {
          connected: healthData.database?.connected || false,
          responseTime: healthData.database?.responseTime || null,
          error: healthData.database?.error || null
        };
      }
    } catch (error) {
      return {
        connected: false,
        error: 'Failed to check database connectivity'
      };
    }
  }

  async saveMetrics(metrics) {
    const timestamp = new Date().toISOString();
    const metricsData = {
      timestamp,
      ...metrics
    };
    
    // Append to metrics file
    let existingMetrics = [];
    if (fs.existsSync(this.metricsFile)) {
      try {
        existingMetrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
      } catch (error) {
        this.log('Error reading existing metrics file', 'WARN');
      }
    }
    
    existingMetrics.push(metricsData);
    
    // Keep only last 100 metrics entries
    if (existingMetrics.length > 100) {
      existingMetrics = existingMetrics.slice(-100);
    }
    
    fs.writeFileSync(this.metricsFile, JSON.stringify(existingMetrics, null, 2));
  }

  async sendAlert(alert) {
    this.log(`ALERT: ${alert.message}`, 'ALERT');
    
    const alertData = {
      timestamp: new Date().toISOString(),
      severity: alert.severity || 'warning',
      message: alert.message,
      details: alert.details,
      site: this.baseUrl
    };
    
    // Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alertData);
    }
    
    // Send to Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      await this.sendDiscordAlert(alertData);
    }
    
    // Save alert to file
    const alertFile = path.join(this.monitoringDir, `alert-${Date.now()}.json`);
    fs.writeFileSync(alertFile, JSON.stringify(alertData, null, 2));
  }

  async sendSlackAlert(alert) {
    const color = alert.severity === 'critical' ? 'danger' : 'warning';
    const payload = {
      text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
      attachments: [{
        color,
        fields: [
          { title: 'Site', value: alert.site, short: true },
          { title: 'Time', value: alert.timestamp, short: true },
          { title: 'Details', value: JSON.stringify(alert.details), short: false }
        ]
      }]
    };
    
    try {
      const { execSync } = require('child_process');
      execSync(`curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' ${process.env.SLACK_WEBHOOK_URL}`, { stdio: 'ignore' });
    } catch (error) {
      this.log(`Failed to send Slack alert: ${error.message}`, 'ERROR');
    }
  }

  async sendDiscordAlert(alert) {
    const payload = {
      content: `🚨 **${alert.severity.toUpperCase()}**: ${alert.message}\\n**Site**: ${alert.site}\\n**Time**: ${alert.timestamp}\\n**Details**: \\`\\`\\`json\\n${JSON.stringify(alert.details, null, 2)}\\n\\`\\`\\``
    };
    
    try {
      const { execSync } = require('child_process');
      execSync(`curl -X POST -H 'Content-Type: application/json' --data '${JSON.stringify(payload)}' ${process.env.DISCORD_WEBHOOK_URL}`, { stdio: 'ignore' });
    } catch (error) {
      this.log(`Failed to send Discord alert: ${error.message}`, 'ERROR');
    }
  }

  async runFullMonitoringCheck() {
    this.log('='.repeat(50));
    this.log('STARTING FULL MONITORING CHECK', 'INFO');
    this.log('='.repeat(50));
    
    const results = {
      timestamp: new Date().toISOString(),
      site: this.baseUrl,
      checks: {}
    };
    
    try {
      // Run all monitoring checks
      results.checks.health = await this.performHealthCheck();
      results.checks.ssl = await this.checkSSLCertificate();
      results.checks.dns = await this.checkDNS();
      results.checks.security = await this.performSecurityCheck();
      results.checks.performance = await this.measurePageLoadPerformance();
      results.checks.database = await this.checkDatabaseConnectivity();
      
      // Analyze results and generate alerts
      const alerts = this.analyzeResults(results);
      
      // Send alerts if any critical issues found
      for (const alert of alerts) {
        await this.sendAlert(alert);
      }
      
      // Save metrics
      await this.saveMetrics(results);
      
      // Generate summary
      const summary = this.generateSummary(results);
      this.log(`Monitoring check completed: ${summary}`);
      
      return results;
      
    } catch (error) {
      this.log(`Monitoring check failed: ${error.message}`, 'ERROR');
      await this.sendAlert({
        severity: 'critical',
        message: 'Monitoring system failure',
        details: { error: error.message }
      });
      throw error;
    }
  }

  analyzeResults(results) {
    const alerts = [];
    
    // Check overall health
    if (results.checks.health.summary.overallHealth === 'unhealthy') {
      alerts.push({
        severity: 'critical',
        message: 'Site is unhealthy',
        details: results.checks.health.summary
      });
    } else if (results.checks.health.summary.overallHealth === 'degraded') {
      alerts.push({
        severity: 'warning',
        message: 'Site performance is degraded',
        details: results.checks.health.summary
      });
    }
    
    // Check SSL certificate
    if (results.checks.ssl.warning) {
      alerts.push({
        severity: 'warning',
        message: 'SSL certificate issue',
        details: { warning: results.checks.ssl.warning }
      });
    }
    
    // Check DNS
    if (!results.checks.dns.resolved) {
      alerts.push({
        severity: 'critical',
        message: 'DNS resolution failed',
        details: results.checks.dns
      });
    }
    
    // Check security
    if (results.checks.security.warnings.length > 0) {
      alerts.push({
        severity: 'warning',
        message: 'Security configuration issues',
        details: { warnings: results.checks.security.warnings }
      });
    }
    
    // Check performance
    if (results.checks.performance.warning) {
      alerts.push({
        severity: 'warning',
        message: 'Performance threshold exceeded',
        details: { warning: results.checks.performance.warning }
      });
    }
    
    // Check database
    if (!results.checks.database.connected) {
      alerts.push({
        severity: 'critical',
        message: 'Database connectivity issue',
        details: results.checks.database
      });
    }
    
    return alerts;
  }

  generateSummary(results) {
    const health = results.checks.health.summary;
    const performance = results.checks.performance;
    const ssl = results.checks.ssl;
    
    return `${health.healthy}/${health.total} endpoints healthy, ` +
           `avg response time ${health.avgResponseTime}ms, ` +
           `page load ${performance.totalLoadTime}ms, ` +
           `SSL ${ssl.daysUntilExpiry ? ssl.daysUntilExpiry + ' days until expiry' : 'OK'}`;
  }
}

// CLI Interface
async function main() {
  const monitor = new ProductionMonitor();
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'health':
        const healthResults = await monitor.performHealthCheck();
        console.log(JSON.stringify(healthResults, null, 2));
        process.exit(healthResults.summary.overallHealth === 'healthy' ? 0 : 1);
        break;
        
      case 'ssl':
        const sslResults = await monitor.checkSSLCertificate();
        console.log(JSON.stringify(sslResults, null, 2));
        break;
        
      case 'security':
        const securityResults = await monitor.performSecurityCheck();
        console.log(JSON.stringify(securityResults, null, 2));
        break;
        
      case 'performance':
        const performanceResults = await monitor.measurePageLoadPerformance();
        console.log(JSON.stringify(performanceResults, null, 2));
        break;
        
      case 'full':
      case 'all':
        const fullResults = await monitor.runFullMonitoringCheck();
        console.log(JSON.stringify(fullResults, null, 2));
        break;
        
      default:
        console.log('Usage:');
        console.log('  node monitoring.js health       - Check endpoint health');
        console.log('  node monitoring.js ssl          - Check SSL certificate');
        console.log('  node monitoring.js security     - Check security configuration');
        console.log('  node monitoring.js performance  - Check page load performance');
        console.log('  node monitoring.js full         - Run all monitoring checks');
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProductionMonitor;