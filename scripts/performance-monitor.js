#!/usr/bin/env node

/**
 * Performance Monitor for Hugo Build Process
 * Tracks build metrics, identifies bottlenecks, and generates optimization reports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      buildTime: { start: 0, end: 0, total: 0 },
      phases: {},
      assets: { count: 0, totalSize: 0, byType: {} },
      cache: { hits: 0, misses: 0, efficiency: 0 },
      memory: { peak: 0, average: 0 },
      network: { requests: 0, totalTime: 0 },
      errors: [],
      warnings: []
    };
    
    this.thresholds = {
      buildTime: 60000, // 60 seconds
      assetSize: 1024 * 1024, // 1MB
      cacheEfficiency: 0.8 // 80%
    };
  }

  startMonitoring() {
    this.metrics.buildTime.start = Date.now();
    this.log('Performance monitoring started', 'info');
  }

  stopMonitoring() {
    this.metrics.buildTime.end = Date.now();
    this.metrics.buildTime.total = this.metrics.buildTime.end - this.metrics.buildTime.start;
    this.log(`Build completed in ${this.formatTime(this.metrics.buildTime.total)}`, 'success');
  }

  trackPhase(phaseName, callback) {
    const start = Date.now();
    this.log(`Starting phase: ${phaseName}`, 'info');
    
    try {
      const result = callback();
      const duration = Date.now() - start;
      
      this.metrics.phases[phaseName] = {
        duration,
        success: true,
        timestamp: new Date().toISOString()
      };
      
      this.log(`Phase '${phaseName}' completed in ${this.formatTime(duration)}`, 'success');
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.metrics.phases[phaseName] = {
        duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.metrics.errors.push({
        phase: phaseName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.log(`Phase '${phaseName}' failed after ${this.formatTime(duration)}: ${error.message}`, 'error');
      throw error;
    }
  }

  analyzeAssets() {
    this.log('Analyzing build assets...', 'info');
    
    const publicDir = 'public';
    if (!fs.existsSync(publicDir)) {
      this.log('Public directory not found, skipping asset analysis', 'warning');
      return;
    }

    const assets = this.walkDirectory(publicDir);
    
    this.metrics.assets.count = assets.length;
    this.metrics.assets.totalSize = assets.reduce((total, asset) => total + asset.size, 0);
    
    // Group by file type
    assets.forEach(asset => {
      const ext = path.extname(asset.path).toLowerCase();
      if (!this.metrics.assets.byType[ext]) {
        this.metrics.assets.byType[ext] = { count: 0, size: 0 };
      }
      this.metrics.assets.byType[ext].count++;
      this.metrics.assets.byType[ext].size += asset.size;
    });

    this.log(`Analyzed ${this.metrics.assets.count} assets (${this.formatBytes(this.metrics.assets.totalSize)})`, 'info');
    
    // Check for oversized assets
    const oversizedAssets = assets.filter(asset => asset.size > this.thresholds.assetSize);
    if (oversizedAssets.length > 0) {
      this.log(`Found ${oversizedAssets.length} oversized assets`, 'warning');
      oversizedAssets.forEach(asset => {
        this.log(`  - ${asset.path}: ${this.formatBytes(asset.size)}`, 'warning');
      });
    }
  }

  analyzeCachePerformance() {
    this.log('Analyzing cache performance...', 'info');
    
    const cacheDir = 'resources/_gen';
    if (!fs.existsSync(cacheDir)) {
      this.log('Cache directory not found', 'warning');
      return;
    }

    const cacheFiles = this.walkDirectory(cacheDir);
    this.metrics.cache.hits = cacheFiles.length;
    
    // Calculate cache efficiency (simplified)
    const totalAssets = this.metrics.assets.count;
    if (totalAssets > 0) {
      this.metrics.cache.efficiency = this.metrics.cache.hits / totalAssets;
    }

    this.log(`Cache efficiency: ${(this.metrics.cache.efficiency * 100).toFixed(2)}%`, 'info');
    
    if (this.metrics.cache.efficiency < this.thresholds.cacheEfficiency) {
      this.log('Cache efficiency is below threshold', 'warning');
    }
  }

  analyzeMemoryUsage() {
    try {
      const memUsage = process.memoryUsage();
      this.metrics.memory.peak = Math.max(this.metrics.memory.peak, memUsage.heapUsed);
      this.metrics.memory.average = memUsage.heapUsed;
      
      this.log(`Memory usage: ${this.formatBytes(memUsage.heapUsed)} (Peak: ${this.formatBytes(this.metrics.memory.peak)})`, 'info');
    } catch (error) {
      this.log(`Memory analysis failed: ${error.message}`, 'warning');
    }
  }

  identifyBottlenecks() {
    this.log('Identifying performance bottlenecks...', 'info');
    
    const bottlenecks = [];
    
    // Build time bottleneck
    if (this.metrics.buildTime.total > this.thresholds.buildTime) {
      bottlenecks.push({
        type: 'build_time',
        severity: 'high',
        message: `Build time (${this.formatTime(this.metrics.buildTime.total)}) exceeds threshold`,
        recommendation: 'Consider optimizing Hugo configuration, enabling caching, or reducing content complexity'
      });
    }
    
    // Phase bottlenecks
    const slowestPhases = Object.entries(this.metrics.phases)
      .sort(([, a], [, b]) => b.duration - a.duration)
      .slice(0, 3);
    
    slowestPhases.forEach(([phase, data]) => {
      if (data.duration > 10000) { // More than 10 seconds
        bottlenecks.push({
          type: 'slow_phase',
          severity: 'medium',
          message: `Phase '${phase}' is slow (${this.formatTime(data.duration)})`,
          recommendation: `Optimize ${phase} process or consider parallelization`
        });
      }
    });
    
    // Asset size bottlenecks
    const largeAssetTypes = Object.entries(this.metrics.assets.byType)
      .filter(([, data]) => data.size > this.thresholds.assetSize)
      .sort(([, a], [, b]) => b.size - a.size);
    
    largeAssetTypes.forEach(([ext, data]) => {
      bottlenecks.push({
        type: 'large_assets',
        severity: 'medium',
        message: `${ext} files are large (${this.formatBytes(data.size)})`,
        recommendation: `Consider optimizing ${ext} files with compression or different formats`
      });
    });
    
    // Cache efficiency bottleneck
    if (this.metrics.cache.efficiency < this.thresholds.cacheEfficiency) {
      bottlenecks.push({
        type: 'cache_inefficiency',
        severity: 'medium',
        message: `Cache efficiency is low (${(this.metrics.cache.efficiency * 100).toFixed(2)}%)`,
        recommendation: 'Review caching strategy and ensure proper cache configuration'
      });
    }
    
    this.logBottlenecks(bottlenecks);
    return bottlenecks;
  }

  generateOptimizationRecommendations() {
    const recommendations = [];
    
    // Hugo-specific optimizations
    recommendations.push({
      category: 'Hugo Configuration',
      items: [
        'Enable Hugo\'s built-in caching with proper cache directories',
        'Use Hugo\'s image processing features for automatic optimization',
        'Configure minification for HTML, CSS, and JS',
        'Enable garbage collection during builds (--gc flag)',
        'Use Hugo modules for better dependency management'
      ]
    });
    
    // Asset optimization
    recommendations.push({
      category: 'Asset Optimization',
      items: [
        'Implement WebP format for images with fallbacks',
        'Use CSS and JS bundling to reduce HTTP requests',
        'Enable Gzip/Brotli compression on Netlify',
        'Implement lazy loading for images and heavy content',
        'Use critical CSS inlining for above-the-fold content'
      ]
    });
    
    // Build process optimization
    recommendations.push({
      category: 'Build Process',
      items: [
        'Use parallel processing for asset optimization',
        'Implement incremental builds where possible',
        'Cache dependencies between builds',
        'Use Netlify\'s build cache for faster deployments',
        'Consider using Hugo\'s development server for local testing'
      ]
    });
    
    // Netlify-specific optimizations
    recommendations.push({
      category: 'Netlify Optimization',
      items: [
        'Configure Netlify\'s asset optimization features',
        'Use Netlify\'s CDN for global content delivery',
        'Implement proper cache headers for different asset types',
        'Use Netlify Functions for dynamic content',
        'Enable Netlify\'s form handling to reduce custom code'
      ]
    });
    
    return recommendations;
  }

  generateReport() {
    const bottlenecks = this.identifyBottlenecks();
    const recommendations = this.generateOptimizationRecommendations();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        buildTime: this.formatTime(this.metrics.buildTime.total),
        assetCount: this.metrics.assets.count,
        totalSize: this.formatBytes(this.metrics.assets.totalSize),
        cacheEfficiency: `${(this.metrics.cache.efficiency * 100).toFixed(2)}%`,
        memoryPeak: this.formatBytes(this.metrics.memory.peak),
        errorsCount: this.metrics.errors.length,
        warningsCount: this.metrics.warnings.length
      },
      metrics: this.metrics,
      bottlenecks,
      recommendations,
      scores: {
        performance: this.calculatePerformanceScore(),
        optimization: this.calculateOptimizationScore(),
        overall: this.calculateOverallScore()
      }
    };
    
    this.saveReport(report);
    this.logReportSummary(report);
    
    return report;
  }

  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct points for slow build time
    if (this.metrics.buildTime.total > this.thresholds.buildTime) {
      score -= 30;
    }
    
    // Deduct points for large assets
    if (this.metrics.assets.totalSize > this.thresholds.assetSize * 10) {
      score -= 20;
    }
    
    // Deduct points for low cache efficiency
    if (this.metrics.cache.efficiency < this.thresholds.cacheEfficiency) {
      score -= 25;
    }
    
    // Deduct points for errors
    score -= this.metrics.errors.length * 5;
    
    return Math.max(0, score);
  }

  calculateOptimizationScore() {
    let score = 100;
    
    // Check for optimization indicators
    const hasMinification = fs.existsSync('public') && this.checkMinification();
    const hasCaching = fs.existsSync('resources/_gen');
    const hasCompression = this.checkCompressionHeaders();
    
    if (!hasMinification) score -= 30;
    if (!hasCaching) score -= 20;
    if (!hasCompression) score -= 15;
    
    return Math.max(0, score);
  }

  calculateOverallScore() {
    const performanceScore = this.calculatePerformanceScore();
    const optimizationScore = this.calculateOptimizationScore();
    
    return Math.round((performanceScore + optimizationScore) / 2);
  }

  checkMinification() {
    // Simple check for minified CSS/JS files
    try {
      const cssFiles = this.findFiles('public', '.css');
      const jsFiles = this.findFiles('public', '.js');
      
      return cssFiles.some(file => this.isMinified(file)) || 
             jsFiles.some(file => this.isMinified(file));
    } catch (error) {
      return false;
    }
  }

  checkCompressionHeaders() {
    // Check if netlify.toml has compression settings
    try {
      const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
      return netlifyConfig.includes('gzip') || netlifyConfig.includes('compress');
    } catch (error) {
      return false;
    }
  }

  isMinified(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Simple heuristic: minified files typically have very long lines
      return lines.some(line => line.length > 500) || lines.length < 10;
    } catch (error) {
      return false;
    }
  }

  findFiles(dir, extension) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const walk = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (fullPath.endsWith(extension)) {
          files.push(fullPath);
        }
      });
    };
    
    walk(dir);
    return files;
  }

  walkDirectory(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const walk = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else {
          files.push({
            path: fullPath,
            size: stat.size,
            modified: stat.mtime
          });
        }
      });
    };
    
    walk(dir);
    return files;
  }

  saveReport(report) {
    const reportPath = 'build-performance-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Performance report saved to ${reportPath}`, 'success');
  }

  logBottlenecks(bottlenecks) {
    if (bottlenecks.length === 0) {
      this.log('No significant bottlenecks identified', 'success');
      return;
    }
    
    this.log(`Identified ${bottlenecks.length} performance bottlenecks:`, 'warning');
    
    bottlenecks.forEach((bottleneck, index) => {
      const color = bottleneck.severity === 'high' ? 'error' : 'warning';
      this.log(`${index + 1}. [${bottleneck.severity.toUpperCase()}] ${bottleneck.message}`, color);
      this.log(`   Recommendation: ${bottleneck.recommendation}`, 'info');
    });
  }

  logReportSummary(report) {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('BUILD PERFORMANCE REPORT SUMMARY', 'info');
    this.log('='.repeat(60), 'info');
    
    this.log(`Build Time: ${report.summary.buildTime}`, 'info');
    this.log(`Assets: ${report.summary.assetCount} (${report.summary.totalSize})`, 'info');
    this.log(`Cache Efficiency: ${report.summary.cacheEfficiency}`, 'info');
    this.log(`Memory Peak: ${report.summary.memoryPeak}`, 'info');
    this.log(`Errors: ${report.summary.errorsCount}`, 'info');
    this.log(`Warnings: ${report.summary.warningsCount}`, 'info');
    
    this.log('\nSCORES:', 'info');
    this.log(`Performance: ${report.scores.performance}/100`, 'info');
    this.log(`Optimization: ${report.scores.optimization}/100`, 'info');
    this.log(`Overall: ${report.scores.overall}/100`, 'info');
    
    const scoreColor = report.scores.overall >= 80 ? 'success' : 
                      report.scores.overall >= 60 ? 'warning' : 'error';
    this.log(`\nOverall Score: ${report.scores.overall}/100`, scoreColor);
    
    this.log('='.repeat(60), 'info');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    const timestamp = new Date().toISOString();
    console.log(`${colors[type](`[${type.toUpperCase()}]`)} ${timestamp}: ${message}`);
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  monitor.startMonitoring();
  
  // Simulate build process monitoring
  monitor.trackPhase('Asset Analysis', () => monitor.analyzeAssets());
  monitor.trackPhase('Cache Analysis', () => monitor.analyzeCachePerformance());
  monitor.trackPhase('Memory Analysis', () => monitor.analyzeMemoryUsage());
  
  monitor.stopMonitoring();
  monitor.generateReport();
}

module.exports = PerformanceMonitor;