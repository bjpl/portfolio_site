// tools/performance/budget.js

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

const execAsync = promisify(exec);

class PerformanceBudget {
  constructor() {
    this.budget = {
      // File size budgets (in bytes)
      sizes: {
        html: {
          max: 15000,        // 15KB per HTML file
          warning: 12000     // Warning at 12KB
        },
        css: {
          max: 50000,        // 50KB total CSS
          warning: 40000     // Warning at 40KB
        },
        js: {
          max: 100000,       // 100KB total JS
          warning: 80000     // Warning at 80KB
        },
        images: {
          max: 200000,       // 200KB per image
          warning: 150000    // Warning at 150KB
        },
        fonts: {
          max: 300000,       // 300KB total fonts
          warning: 250000    // Warning at 250KB
        },
        total: {
          max: 500000,       // 500KB total page weight
          warning: 400000    // Warning at 400KB
        }
      },
      
      // Performance metrics (in milliseconds)
      metrics: {
        fcp: {              // First Contentful Paint
          max: 1800,
          warning: 1500
        },
        lcp: {              // Largest Contentful Paint
          max: 2500,
          warning: 2000
        },
        fid: {              // First Input Delay
          max: 100,
          warning: 50
        },
        cls: {              // Cumulative Layout Shift
          max: 0.1,
          warning: 0.05
        },
        ttfb: {             // Time to First Byte
          max: 600,
          warning: 400
        },
        tti: {              // Time to Interactive
          max: 3800,
          warning: 3000
        },
        tbt: {              // Total Blocking Time
          max: 300,
          warning: 200
        }
      },
      
      // Lighthouse scores (0-100)
      lighthouse: {
        performance: {
          min: 90,
          warning: 95
        },
        accessibility: {
          min: 95,
          warning: 98
        },
        bestPractices: {
          min: 90,
          warning: 95
        },
        seo: {
          min: 90,
          warning: 95
        },
        pwa: {
          min: 80,
          warning: 90
        }
      },
      
      // Resource counts
      requests: {
        total: {
          max: 50,
          warning: 40
        },
        css: {
          max: 5,
          warning: 3
        },
        js: {
          max: 10,
          warning: 8
        },
        images: {
          max: 30,
          warning: 25
        },
        fonts: {
          max: 5,
          warning: 3
        }
      }
    };
  }

  async checkBudget(buildDir = 'public') {
    const spinner = ora('Checking performance budget...').start();
    const results = {
      passed: true,
      warnings: [],
      failures: [],
      details: {}
    };

    try {
      // Check file sizes
      const sizeResults = await this.checkFileSizes(buildDir);
      results.details.sizes = sizeResults;
      
      // Check Lighthouse metrics (if server is running)
      const lighthouseResults = await this.checkLighthouse();
      if (lighthouseResults) {
        results.details.lighthouse = lighthouseResults;
      }
      
      // Check resource counts
      const resourceResults = await this.checkResourceCounts(buildDir);
      results.details.resources = resourceResults;
      
      // Check critical CSS
      const criticalCssResults = await this.checkCriticalCSS(buildDir);
      results.details.criticalCss = criticalCssResults;
      
      // Check image optimization
      const imageResults = await this.checkImageOptimization(buildDir);
      results.details.images = imageResults;
      
      // Compile results
      this.compileResults(results);
      
      // Generate report
      await this.generateReport(results);
      
      // Print report
      this.printReport(results);
      
      spinner.succeed(
        results.passed 
          ? chalk.green('✓ Performance budget check passed')
          : chalk.red('✗ Performance budget check failed')
      );
      
      return results;
      
    } catch (error) {
      spinner.fail(chalk.red(`✗ Performance budget check failed: ${error.message}`));
      throw error;
    }
  }

  async checkFileSizes(buildDir) {
    const results = {
      html: { current: 0, files: [] },
      css: { current: 0, files: [] },
      js: { current: 0, files: [] },
      images: { current: 0, files: [] },
      fonts: { current: 0, files: [] },
      total: { current: 0 }
    };

    // Scan build directory
    const files = await this.getAllFiles(buildDir);
    
    for (const file of files) {
      const stats = await fs.stat(file);
      const size = stats.size;
      const ext = path.extname(file).toLowerCase();
      const relativePath = path.relative(buildDir, file);
      
      results.total.current += size;
      
      if (ext === '.html') {
        results.html.current += size;
        results.html.files.push({ path: relativePath, size });
      } else if (ext === '.css') {
        results.css.current += size;
        results.css.files.push({ path: relativePath, size });
      } else if (['.js', '.mjs'].includes(ext)) {
        results.js.current += size;
        results.js.files.push({ path: relativePath, size });
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'].includes(ext)) {
        results.images.current += size;
        results.images.files.push({ path: relativePath, size });
      } else if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
        results.fonts.current += size;
        results.fonts.files.push({ path: relativePath, size });
      }
    }

    // Sort files by size for reporting
    Object.keys(results).forEach(key => {
      if (results[key].files) {
        results[key].files.sort((a, b) => b.size - a.size);
      }
    });

    return results;
  }

  async checkLighthouse() {
    try {
      // Check if lighthouse is installed
      try {
        await execAsync('lighthouse --version');
      } catch {
        console.warn(chalk.yellow('⚠ Lighthouse not installed. Run: npm install -g lighthouse'));
        return null;
      }
      
      // Check if server is running
      const http = require('http');
      const serverRunning = await new Promise(resolve => {
        http.get('http://localhost:1313', res => {
          resolve(res.statusCode === 200);
        }).on('error', () => {
          resolve(false);
        });
      });
      
      if (!serverRunning) {
        console.warn(chalk.yellow('⚠ Hugo server not running. Start with: hugo server'));
        return null;
      }
      
      // Run Lighthouse
      console.log(chalk.cyan('  Running Lighthouse audit...'));
      const { stdout } = await execAsync(
        'lighthouse http://localhost:1313 --output=json --quiet --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo'
      );
      
      const report = JSON.parse(stdout);
      
      return {
        scores: {
          performance: Math.round(report.categories.performance.score * 100),
          accessibility: Math.round(report.categories.accessibility.score * 100),
          bestPractices: Math.round(report.categories['best-practices'].score * 100),
          seo: Math.round(report.categories.seo.score * 100)
        },
        metrics: {
          fcp: report.audits['first-contentful-paint'].numericValue,
          lcp: report.audits['largest-contentful-paint'].numericValue,
          cls: report.audits['cumulative-layout-shift'].numericValue,
          tbt: report.audits['total-blocking-time'].numericValue,
          tti: report.audits['interactive'].numericValue
        },
        opportunities: this.extractOpportunities(report)
      };
    } catch (error) {
      console.warn(chalk.yellow('⚠ Could not run Lighthouse checks: ' + error.message));
      return null;
    }
  }

  extractOpportunities(report) {
    const opportunities = [];
    const audits = report.audits;
    
    // Check for optimization opportunities
    const opportunityAudits = [
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'uses-responsive-images',
      'unminified-css',
      'unminified-javascript',
      'efficiently-encode-images',
      'uses-text-compression'
    ];
    
    opportunityAudits.forEach(auditName => {
      if (audits[auditName] && audits[auditName].score < 0.9) {
        opportunities.push({
          title: audits[auditName].title,
          description: audits[auditName].description,
          savings: audits[auditName].details?.overallSavingsMs || 0
        });
      }
    });
    
    return opportunities.sort((a, b) => b.savings - a.savings);
  }

  async checkResourceCounts(buildDir) {
    const results = {
      total: 0,
      css: 0,
      js: 0,
      images: 0,
      fonts: 0
    };

    const files = await this.getAllFiles(buildDir);
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      
      results.total++;
      
      if (ext === '.css') {
        results.css++;
      } else if (['.js', '.mjs'].includes(ext)) {
        results.js++;
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'].includes(ext)) {
        results.images++;
      } else if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
        results.fonts++;
      }
    }

    return results;
  }

  async checkCriticalCSS(buildDir) {
    const results = {
      hasCriticalCSS: false,
      inlineStyles: [],
      externalStyles: []
    };
    
    try {
      // Check index.html for critical CSS
      const indexPath = path.join(buildDir, 'index.html');
      const html = await fs.readFile(indexPath, 'utf-8');
      
      // Check for inline styles
      const inlineStyleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
      results.hasCriticalCSS = inlineStyleMatches.length > 0;
      results.inlineStyles = inlineStyleMatches.map(style => ({
        size: style.length,
        content: style.substring(0, 100) + '...'
      }));
      
      // Check for external stylesheets
      const linkMatches = html.match(/<link[^>]*rel="stylesheet"[^>]*>/gi) || [];
      results.externalStyles = linkMatches.map(link => {
        const hrefMatch = link.match(/href="([^"]+)"/);
        return hrefMatch ? hrefMatch[1] : 'unknown';
      });
      
    } catch (error) {
      console.warn(chalk.yellow('⚠ Could not check critical CSS'));
    }
    
    return results;
  }

  async checkImageOptimization(buildDir) {
    const results = {
      totalImages: 0,
      optimized: 0,
      needsOptimization: [],
      formats: {}
    };
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
    const files = await this.getAllFiles(buildDir);
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      
      if (imageExtensions.includes(ext)) {
        results.totalImages++;
        
        // Count formats
        results.formats[ext] = (results.formats[ext] || 0) + 1;
        
        // Check size
        const stats = await fs.stat(file);
        const sizeKB = stats.size / 1024;
        
        // Flag large images
        if (sizeKB > 200) {
          results.needsOptimization.push({
            path: path.relative(buildDir, file),
            size: stats.size,
            format: ext
          });
        }
        
        // Check if WebP/AVIF versions exist
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
          const webpPath = file.replace(ext, '.webp');
          const avifPath = file.replace(ext, '.avif');
          
          if (require('fs').existsSync(webpPath) || require('fs').existsSync(avifPath)) {
            results.optimized++;
          }
        }
      }
    }
    
    return results;
  }

  async getAllFiles(dir, files = []) {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        await this.getAllFiles(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  compileResults(results) {
    // Check file sizes
    if (results.details.sizes) {
      for (const [type, data] of Object.entries(results.details.sizes)) {
        const budget = this.budget.sizes[type];
        if (budget) {
          if (data.current > budget.max) {
            results.failures.push(`${type}: ${this.formatBytes(data.current)} exceeds ${this.formatBytes(budget.max)}`);
            results.passed = false;
          } else if (data.current > budget.warning) {
            results.warnings.push(`${type}: ${this.formatBytes(data.current)} approaching limit of ${this.formatBytes(budget.max)}`);
          }
        }
      }
    }

    // Check Lighthouse scores
    if (results.details.lighthouse) {
      for (const [metric, value] of Object.entries(results.details.lighthouse.scores)) {
        if (value !== null) {
          const budget = this.budget.lighthouse[metric];
          if (budget) {
            if (value < budget.min) {
              results.failures.push(`Lighthouse ${metric}: ${value} below minimum ${budget.min}`);
              results.passed = false;
            } else if (value < budget.warning) {
              results.warnings.push(`Lighthouse ${metric}: ${value} could be improved (target: ${budget.warning}+)`);
            }
          }
        }
      }

      // Check performance metrics
      for (const [metric, value] of Object.entries(results.details.lighthouse.metrics)) {
        const budget = this.budget.metrics[metric];
        if (budget) {
          if (value > budget.max) {
            results.failures.push(`${metric.toUpperCase()}: ${value}ms exceeds ${budget.max}ms`);
            results.passed = false;
          } else if (value > budget.warning) {
            results.warnings.push(`${metric.toUpperCase()}: ${value}ms approaching limit of ${budget.max}ms`);
          }
        }
      }
    }

    // Check resource counts
    if (results.details.resources) {
      for (const [type, count] of Object.entries(results.details.resources)) {
        const budget = this.budget.requests[type];
        if (budget) {
          if (count > budget.max) {
            results.failures.push(`${type} requests: ${count} exceeds ${budget.max}`);
            results.passed = false;
          } else if (count > budget.warning) {
            results.warnings.push(`${type} requests: ${count} approaching limit of ${budget.max}`);
          }
        }
      }
    }

    // Check critical CSS
    if (results.details.criticalCss && !results.details.criticalCss.hasCriticalCSS) {
      results.warnings.push('No critical CSS found - consider inlining critical styles');
    }

    // Check image optimization
    if (results.details.images) {
      const { totalImages, optimized, needsOptimization } = results.details.images;
      if (needsOptimization.length > 0) {
        results.warnings.push(`${needsOptimization.length} images need optimization (>200KB)`);
      }
      if (optimized < totalImages * 0.5) {
        results.warnings.push(`Only ${optimized}/${totalImages} images have WebP/AVIF versions`);
      }
    }
  }

  async generateReport(results) {
    const reportPath = path.join('test-results', 'performance-budget.json');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      passed: results.passed,
      summary: {
        failures: results.failures.length,
        warnings: results.warnings.length
      },
      details: results.details,
      failures: results.failures,
      warnings: results.warnings
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    // Generate HTML report
    await this.generateHTMLReport(results);
  }

  async generateHTMLReport(results) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Budget Report</title>
  <style>
    body { font-family: system-ui; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 2px solid #0066ff; padding-bottom: 10px; }
    .status { padding: 10px; border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .passed { background: #d4edda; color: #155724; }
    .failed { background: #f8d7da; color: #721c24; }
    .warning { background: #fff3cd; color: #856404; }
    .metric { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
    .metric-name { font-weight: 600; }
    .metric-value { font-family: monospace; }
    .progress { height: 20px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin: 5px 0; }
    .progress-bar { height: 100%; transition: width 0.3s; }
    .good { background: #28a745; }
    .warning { background: #ffc107; }
    .bad { background: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6; }
    th { background: #f8f9fa; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Performance Budget Report</h1>
    <div class="status ${results.passed ? 'passed' : 'failed'}">
      Status: ${results.passed ? '✓ PASSED' : '✗ FAILED'}
    </div>
    
    <h2>File Sizes</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Current</th>
          <th>Budget</th>
          <th>Usage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(results.details.sizes || {}).map(([type, data]) => {
          const budget = this.budget.sizes[type];
          if (!budget) return '';
          const percentage = Math.round((data.current / budget.max) * 100);
          const status = percentage > 100 ? 'bad' : percentage > 80 ? 'warning' : 'good';
          return `
            <tr>
              <td>${type.toUpperCase()}</td>
              <td>${this.formatBytes(data.current)}</td>
              <td>${this.formatBytes(budget.max)}</td>
              <td>
                <div class="progress">
                  <div class="progress-bar ${status}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                ${percentage}%
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    ${results.details.lighthouse ? `
      <h2>Lighthouse Scores</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Score</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(results.details.lighthouse.scores).map(([metric, value]) => `
            <tr>
              <td>${metric}</td>
              <td class="${value >= 90 ? 'good' : value >= 50 ? 'warning' : 'bad'}">${value}/100</td>
              <td>${this.budget.lighthouse[metric]?.min || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
    
    ${results.warnings.length > 0 ? `
      <h2>Warnings (${results.warnings.length})</h2>
      <ul class="warning">
        ${results.warnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    ` : ''}
    
    ${results.failures.length > 0 ? `
      <h2>Failures (${results.failures.length})</h2>
      <ul class="failed">
        ${results.failures.map(f => `<li>${f}</li>`).join('')}
      </ul>
    ` : ''}
    
    <p style="margin-top: 40px; color: #666; font-size: 14px;">
      Generated: ${new Date().toLocaleString()}
    </p>
  </div>
</body>
</html>
    `;
    
    const reportPath = path.join('test-results', 'performance-budget.html');
    await fs.writeFile(reportPath, html, 'utf-8');
  }

  printReport(results) {
    console.log(chalk.cyan('\n📊 Performance Budget Report\n'));

    // File sizes
    if (results.details.sizes) {
      console.log(chalk.white('File Sizes:'));
      for (const [type, data] of Object.entries(results.details.sizes)) {
        const budget = this.budget.sizes[type];
        if (budget) {
          const percentage = Math.round((data.current / budget.max) * 100);
          const color = percentage > 100 ? chalk.red : percentage > 80 ? chalk.yellow : chalk.green;
          console.log(color(`  ${type}: ${this.formatBytes(data.current)} / ${this.formatBytes(budget.max)} (${percentage}%)`));
          
          // Show largest files if over budget
          if (percentage > 100 && data.files && data.files.length > 0) {
            console.log(chalk.gray(`    Largest files:`));
            data.files.slice(0, 3).forEach(file => {
              console.log(chalk.gray(`      - ${file.path}: ${this.formatBytes(file.size)}`));
            });
          }
        }
      }
    }

    // Lighthouse scores
    if (results.details.lighthouse) {
      console.log(chalk.white('\nLighthouse Scores:'));
      for (const [metric, value] of Object.entries(results.details.lighthouse.scores)) {
        if (value !== null) {
          const color = value >= 90 ? chalk.green : value >= 50 ? chalk.yellow : chalk.red;
          console.log(color(`  ${metric}: ${value}/100`));
        }
      }

      console.log(chalk.white('\nPerformance Metrics:'));
      for (const [metric, value] of Object.entries(results.details.lighthouse.metrics)) {
        const budget = this.budget.metrics[metric];
        if (budget) {
          const percentage = Math.round((value / budget.max) * 100);
          const color = percentage > 100 ? chalk.red : percentage > 80 ? chalk.yellow : chalk.green;
          const unit = metric === 'cls' ? '' : 'ms';
          console.log(color(`  ${metric.toUpperCase()}: ${value}${unit} / ${budget.max}${unit} (${percentage}%)`));
        }
      }

      // Show opportunities
      if (results.details.lighthouse.opportunities && results.details.lighthouse.opportunities.length > 0) {
        console.log(chalk.white('\nOptimization Opportunities:'));
        results.details.lighthouse.opportunities.slice(0, 5).forEach(opp => {
          console.log(chalk.cyan(`  • ${opp.title}`));
          if (opp.savings > 0) {
            console.log(chalk.gray(`    Potential savings: ${opp.savings}ms`));
          }
        });
      }
    }

    // Resource counts
    if (results.details.resources) {
      console.log(chalk.white('\nResource Counts:'));
      for (const [type, count] of Object.entries(results.details.resources)) {
        const budget = this.budget.requests[type];
        if (budget) {
          const color = count > budget.max ? chalk.red : count > budget.warning ? chalk.yellow : chalk.green;
          console.log(color(`  ${type}: ${count} / ${budget.max}`));
        }
      }
    }

    // Image optimization
    if (results.details.images) {
      const { totalImages, optimized, needsOptimization, formats } = results.details.images;
      console.log(chalk.white('\nImage Optimization:'));
      console.log(chalk.white(`  Total images: ${totalImages}`));
      console.log(chalk.white(`  Optimized: ${optimized}`));
      if (needsOptimization.length > 0) {
        console.log(chalk.yellow(`  Need optimization: ${needsOptimization.length}`));
        needsOptimization.slice(0, 3).forEach(img => {
          console.log(chalk.gray(`    - ${img.path}: ${this.formatBytes(img.size)}`));
        });
      }
      console.log(chalk.white('  Formats:'));
      Object.entries(formats).forEach(([format, count]) => {
        console.log(chalk.white(`    ${format}: ${count}`));
      });
    }

    // Warnings
    if (results.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠ Warnings (${results.warnings.length}):`));
      results.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    // Failures
    if (results.failures.length > 0) {
      console.log(chalk.red(`\n✗ Failures (${results.failures.length}):`));
      results.failures.forEach(failure => {
        console.log(chalk.red(`  • ${failure}`));
      });
    }

    // Summary
    console.log(chalk.cyan('\n📈 Summary:'));
    console.log(chalk.white(`  Total page weight: ${this.formatBytes(results.details.sizes.total.current)}`));
    console.log(chalk.white(`  Total resources: ${results.details.resources.total}`));
    console.log(
      results.passed 
        ? chalk.green('  Status: ✓ PASSED') 
        : chalk.red('  Status: ✗ FAILED')
    );
    
    // Report location
    console.log(chalk.cyan('\n📄 Reports saved to:'));
    console.log(chalk.white('  • test-results/performance-budget.json'));
    console.log(chalk.white('  • test-results/performance-budget.html'));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export for use in build process
module.exports = PerformanceBudget;

// CLI execution
if (require.main === module) {
  const checker = new PerformanceBudget();
  
  checker.checkBudget()
    .then(results => {
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    });
}
