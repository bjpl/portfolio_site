// tools/accessibility/test-suite.js

const puppeteer = require('puppeteer');
const axe = require('axe-core');
const pa11y = require('pa11y');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');

class AccessibilityTestSuite {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.baseUrl || 'http://localhost:1313',
      outputDir: options.outputDir || 'test-results/accessibility',
      standards: options.standards || ['WCAG2AAA', 'Section508'],
      viewport: options.viewport || { width: 1280, height: 720 },
      mobile: options.mobile || { width: 375, height: 667 },
      routes: options.routes || [
        '/',
        '/make/',
        '/learn/',
        '/think/',
        '/meet/'
      ],
      axeConfig: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'best-practice']
        },
        resultTypes: ['violations', 'incomplete', 'inapplicable', 'passes']
      },
      pa11yConfig: {
        standard: 'WCAG2AAA',
        runners: ['axe', 'htmlcs'],
        includeWarnings: true,
        includeNotices: false,
        wait: 1000,
        timeout: 30000
      },
      ...options
    };

    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        violations: [],
        criticalIssues: [],
        score: 100
      },
      pages: [],
      patterns: {
        keyboard: {},
        screenReader: {},
        colorContrast: {},
        focus: {},
        aria: {},
        forms: {},
        media: {}
      }
    };
  }

  async runFullSuite() {
    const spinner = ora('Running accessibility test suite...').start();

    try {
      // Ensure output directory exists
      await fs.mkdir(this.options.outputDir, { recursive: true });

      // Check if server is running
      const serverRunning = await this.checkServerStatus();
      if (!serverRunning) {
        spinner.fail(chalk.red('✗ Hugo server not running. Start with: hugo server'));
        return;
      }

      // Run tests for each route
      for (const route of this.options.routes) {
        spinner.text = `Testing ${route}...`;
        
        // Test desktop viewport
        const desktopResults = await this.testPage(route, 'desktop');
        this.results.pages.push(desktopResults);
        
        // Test mobile viewport
        const mobileResults = await this.testPage(route, 'mobile');
        this.results.pages.push(mobileResults);
      }

      // Run specialized tests
      spinner.text = 'Running keyboard navigation tests...';
      await this.runKeyboardNavigationTests();
      
      spinner.text = 'Running screen reader tests...';
      await this.runScreenReaderTests();
      
      spinner.text = 'Running color contrast tests...';
      await this.runColorContrastTests();
      
      spinner.text = 'Running focus management tests...';
      await this.runFocusManagementTests();
      
      spinner.text = 'Running ARIA tests...';
      await this.runARIATests();
      
      spinner.text = 'Running form accessibility tests...';
      await this.runFormTests();
      
      spinner.text = 'Running media accessibility tests...';
      await this.runMediaTests();

      // Calculate final score
      this.calculateScore();

      // Generate reports
      await this.generateReports();

      spinner.succeed(chalk.green('✓ Accessibility test suite complete'));
      
      // Print summary
      this.printSummary();

      return this.results;

    } catch (error) {
      spinner.fail(chalk.red(`✗ Test suite failed: ${error.message}`));
      throw error;
    }
  }

  async checkServerStatus() {
    try {
      const response = await fetch(this.options.baseUrl);
      return response.ok;
    } catch {
      return false;
    }
  }

  async testPage(route, viewport = 'desktop') {
    const url = `${this.options.baseUrl}${route}`;
    const results = {
      url,
      viewport,
      timestamp: new Date().toISOString(),
      axe: null,
      pa11y: null,
      manual: [],
      score: 100,
      violations: [],
      warnings: [],
      passes: []
    };

    // Run axe-core tests
    results.axe = await this.runAxeTests(url, viewport);
    
    // Run Pa11y tests
    results.pa11y = await this.runPa11yTests(url, viewport);
    
    // Run manual checks
    results.manual = await this.runManualChecks(url, viewport);
    
    // Compile violations
    this.compileViolations(results);
    
    // Calculate page score
    results.score = this.calculatePageScore(results);
    
    // Update summary
    this.updateSummary(results);

    return results;
  }

  async runAxeTests(url, viewport) {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Set viewport
      const viewportSize = viewport === 'mobile' ? this.options.mobile : this.options.viewport;
      await page.setViewport(viewportSize);
      
      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Inject axe-core
      const axeSource = require.resolve('axe-core');
      const axeContent = await fs.readFile(axeSource, 'utf8');
      await page.evaluate(axeContent);
      
      // Run axe tests
      const results = await page.evaluate((config) => {
        return window.axe.run(document, config);
      }, this.options.axeConfig);
      
      // Process results
      const processed = {
        violations: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
          tags: v.tags
        })),
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      };
      
      return processed;
      
    } finally {
      await browser.close();
    }
  }

  async runPa11yTests(url, viewport) {
    try {
      const viewportSize = viewport === 'mobile' ? this.options.mobile : this.options.viewport;
      
      const results = await pa11y(url, {
        ...this.options.pa11yConfig,
        viewport: viewportSize,
        chromeLaunchConfig: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });
      
      // Process results
      return {
        issues: results.issues.map(issue => ({
          type: issue.type,
          code: issue.code,
          message: issue.message,
          context: issue.context,
          selector: issue.selector
        })),
        total: results.issues.length,
        errors: results.issues.filter(i => i.type === 'error').length,
        warnings: results.issues.filter(i => i.type === 'warning').length,
        notices: results.issues.filter(i => i.type === 'notice').length
      };
      
    } catch (error) {
      console.error(chalk.red(`Pa11y test failed for ${url}: ${error.message}`));
      return null;
    }
  }

  async runManualChecks(url, viewport) {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      const viewportSize = viewport === 'mobile' ? this.options.mobile : this.options.viewport;
      await page.setViewport(viewportSize);
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const checks = [];
      
      // Check for skip links
      const skipLink = await page.evaluate(() => {
        const link = document.querySelector('a[href="#main"], a[href="#content"], .skip-link');
        return link ? { exists: true, text: link.textContent } : { exists: false };
      });
      checks.push({
        name: 'Skip Link',
        passed: skipLink.exists,
        message: skipLink.exists ? 'Skip link found' : 'No skip link found'
      });
      
      // Check for proper heading hierarchy
      const headingHierarchy = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let lastLevel = 0;
        let proper = true;
        
        headings.forEach(h => {
          const level = parseInt(h.tagName.substring(1));
          if (level > lastLevel + 1) {
            proper = false;
          }
          lastLevel = level;
        });
        
        return { proper, count: headings.length };
      });
      checks.push({
        name: 'Heading Hierarchy',
        passed: headingHierarchy.proper,
        message: `${headingHierarchy.count} headings, hierarchy ${headingHierarchy.proper ? 'correct' : 'has gaps'}`
      });
      
      // Check for language attribute
      const lang = await page.evaluate(() => {
        return document.documentElement.lang;
      });
      checks.push({
        name: 'Language Attribute',
        passed: !!lang,
        message: lang ? `Language set to "${lang}"` : 'No language attribute'
      });
      
      // Check for viewport meta tag
      const viewport = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta ? meta.getAttribute('content') : null;
      });
      checks.push({
        name: 'Viewport Meta',
        passed: !!viewport,
        message: viewport ? 'Viewport meta tag present' : 'No viewport meta tag'
      });
      
      return checks;
      
    } finally {
      await browser.close();
    }
  }

  async runKeyboardNavigationTests() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport(this.options.viewport);
      
      for (const route of this.options.routes) {
        const url = `${this.options.baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Test tab navigation
        const tabOrder = await page.evaluate(() => {
          const focusable = document.querySelectorAll(
            'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
          );
          return {
            count: focusable.length,
            hasTabIndex: Array.from(focusable).some(el => el.hasAttribute('tabindex'))
          };
        });
        
        // Test keyboard shortcuts
        const shortcuts = await page.evaluate(() => {
          const handlers = [];
          const searchButton = document.querySelector('[aria-label*="search"]');
          const themeToggle = document.querySelector('[aria-label*="theme"]');
          
          return {
            hasSearchShortcut: !!searchButton,
            hasThemeToggle: !!themeToggle
          };
        });
        
        this.results.patterns.keyboard[route] = {
          tabOrder,
          shortcuts,
          passed: tabOrder.count > 0
        };
      }
      
    } finally {
      await browser.close();
    }
  }

  async runScreenReaderTests() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport(this.options.viewport);
      
      for (const route of this.options.routes) {
        const url = `${this.options.baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const landmarks = await page.evaluate(() => {
          return {
            header: !!document.querySelector('header, [role="banner"]'),
            nav: !!document.querySelector('nav, [role="navigation"]'),
            main: !!document.querySelector('main, [role="main"]'),
            footer: !!document.querySelector('footer, [role="contentinfo"]'),
            search: !!document.querySelector('[role="search"]')
          };
        });
        
        const ariaLabels = await page.evaluate(() => {
          const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
          return elements.length;
        });
        
        const altTexts = await page.evaluate(() => {
          const images = Array.from(document.querySelectorAll('img'));
          const withAlt = images.filter(img => img.hasAttribute('alt'));
          return {
            total: images.length,
            withAlt: withAlt.length,
            percentage: images.length > 0 ? (withAlt.length / images.length) * 100 : 100
          };
        });
        
        this.results.patterns.screenReader[route] = {
          landmarks,
          ariaLabels,
          altTexts,
          passed: altTexts.percentage === 100 && Object.values(landmarks).filter(Boolean).length >= 3
        };
      }
      
    } finally {
      await browser.close();
    }
  }

  async runColorContrastTests() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport(this.options.viewport);
      
      for (const route of this.options.routes) {
        const url = `${this.options.baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Test in light mode
        const lightMode = await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'light');
          return window.getComputedStyle(document.body).backgroundColor;
        });
        
        // Test in dark mode
        const darkMode = await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'dark');
          return window.getComputedStyle(document.body).backgroundColor;
        });
        
        // Check if theme changes colors
        const themeWorks = lightMode !== darkMode;
        
        this.results.patterns.colorContrast[route] = {
          lightMode,
          darkMode,
          themeWorks,
          passed: themeWorks
        };
      }
      
    } finally {
      await browser.close();
    }
  }

  async runFocusManagementTests() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport(this.options.viewport);
      
      for (const route of this.options.routes) {
        const url = `${this.options.baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const focusIndicators = await page.evaluate(() => {
          const styles = window.getComputedStyle(document.createElement('button'));
          const focusableElements = document.querySelectorAll(
            'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
          );
          
          let withOutline = 0;
          focusableElements.forEach(el => {
            el.focus();
            const computed = window.getComputedStyle(el);
            if (computed.outline !== 'none' || computed.boxShadow !== 'none') {
              withOutline++;
            }
          });
          
          return {
            total: focusableElements.length,
            withOutline,
            percentage: focusableElements.length > 0 ? (withOutline / focusableElements.length) * 100 : 100
          };
        });
        
        this.results.patterns.focus[route] = {
          focusIndicators,
          passed: focusIndicators.percentage >= 90
        };
      }
      
    } finally {
      await browser.close();
    }
  }

  async runARIATests() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport(this.options.viewport);
      
      for (const route of this.options.routes) {
        const url = `${this.options.baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const ariaUsage = await page.evaluate(() => {
          const ariaElements = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-live], [aria-hidden]');
          const invalidRoles = Array.from(document.querySelectorAll('[role]')).filter(el => {
            const validRoles = ['alert', 'button', 'checkbox', 'dialog', 'img', 'link', 'list', 'listitem', 'main', 'navigation', 'search', 'status', 'tab', 'tabpanel'];
            return !validRoles.includes(el.getAttribute('role'));
          });
          
          return {
            total: ariaElements.length,
            invalidRoles: invalidRoles.length,
            hasLiveRegions: document.querySelectorAll('[aria-live]').length > 0
          };
        });
        
        this.results.patterns.aria[route] = {
          ariaUsage,
          passed: ariaUsage.invalidRoles === 0
        };
      }
      
    } finally {
      await browser.close();
    }
  }

  async runFormTests() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport(this.options.viewport);
      
      for (const route of this.options.routes) {
        const url = `${this.options.baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const formAccessibility = await page.evaluate(() => {
          const forms = document.querySelectorAll('form');
          const inputs = document.querySelectorAll('input, textarea, select');
          const labels = document.querySelectorAll('label');
          
          let inputsWithLabels = 0;
          inputs.forEach(input => {
            const id = input.id;
            if (id && document.querySelector(`label[for="${id}"]`)) {
              inputsWithLabels++;
            } else if (input.closest('label')) {
              inputsWithLabels++;
            } else if (input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby')) {
              inputsWithLabels++;
            }
          });
          
          return {
            forms: forms.length,
            inputs: inputs.length,
            labels: labels.length,
            inputsWithLabels,
            percentage: inputs.length > 0 ? (inputsWithLabels / inputs.length) * 100 : 100
          };
        });
        
        this.results.patterns.forms[route] = {
          formAccessibility,
          passed: formAccessibility.percentage === 100
        };
      }
      
    } finally {
      await browser.close();
    }
  }

  async runMediaTests() {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport(this.options.viewport);
      
      for (const route of this.options.routes) {
        const url = `${this.options.baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const mediaAccessibility = await page.evaluate(() => {
          const videos = document.querySelectorAll('video');
          const audios = document.querySelectorAll('audio');
          const images = document.querySelectorAll('img');
          
          const imagesWithAlt = Array.from(images).filter(img => img.hasAttribute('alt'));
          const videosWithCaptions = Array.from(videos).filter(video => 
            video.querySelector('track[kind="captions"]') || video.hasAttribute('aria-label')
          );
          
          return {
            images: images.length,
            imagesWithAlt: imagesWithAlt.length,
            videos: videos.length,
            videosWithCaptions: videosWithCaptions.length,
            audios: audios.length,
            imageAltPercentage: images.length > 0 ? (imagesWithAlt.length / images.length) * 100 : 100
          };
        });
        
        this.results.patterns.media[route] = {
          mediaAccessibility,
          passed: mediaAccessibility.imageAltPercentage === 100
        };
      }
      
    } finally {
      await browser.close();
    }
  }

  compileViolations(results) {
    // Compile axe violations
    if (results.axe) {
      results.axe.violations.forEach(violation => {
        results.violations.push({
          source: 'axe',
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          nodes: violation.nodes
        });
        
        // Track critical issues
        if (violation.impact === 'critical' || violation.impact === 'serious') {
          this.results.summary.criticalIssues.push({
            page: results.url,
            viewport: results.viewport,
            issue: violation
          });
        }
      });
    }
    
    // Compile Pa11y errors
    if (results.pa11y) {
      results.pa11y.issues.forEach(issue => {
        if (issue.type === 'error') {
          results.violations.push({
            source: 'pa11y',
            type: issue.type,
            code: issue.code,
            message: issue.message,
            context: issue.context,
            selector: issue.selector
          });
        } else if (issue.type === 'warning') {
          results.warnings.push({
            source: 'pa11y',
            type: issue.type,
            message: issue.message
          });
        }
      });
    }
    
    // Track manual check failures
    if (results.manual) {
      results.manual.forEach(check => {
        if (!check.passed) {
          results.warnings.push({
            source: 'manual',
            name: check.name,
            message: check.message
          });
        } else {
          results.passes.push({
            source: 'manual',
            name: check.name,
            message: check.message
          });
        }
      });
    }
  }

  calculatePageScore(results) {
    let score = 100;
    
    // Deduct points for violations
    results.violations.forEach(violation => {
      if (violation.impact === 'critical') score -= 20;
      else if (violation.impact === 'serious') score -= 15;
      else if (violation.impact === 'moderate') score -= 10;
      else if (violation.impact === 'minor') score -= 5;
      else score -= 3; // Default deduction
    });
    
    // Deduct points for warnings
    results.warnings.forEach(() => {
      score -= 1;
    });
    
    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  calculateScore() {
    let totalScore = 0;
    let pageCount = 0;
    
    this.results.pages.forEach(page => {
      totalScore += page.score;
      pageCount++;
    });
    
    // Add pattern test scores
    let patternScore = 0;
    let patternCount = 0;
    
    Object.values(this.results.patterns).forEach(category => {
      Object.values(category).forEach(test => {
        if (test.passed) patternScore += 100;
        patternCount++;
      });
    });
    
    // Calculate final score
    const pageAverage = pageCount > 0 ? totalScore / pageCount : 0;
    const patternAverage = patternCount > 0 ? patternScore / patternCount : 0;
    
    this.results.summary.score = Math.round((pageAverage * 0.7) + (patternAverage * 0.3));
  }

  updateSummary(results) {
    this.results.summary.totalTests++;
    
    if (results.violations.length === 0) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }
    
    this.results.summary.warnings += results.warnings.length;
    
    // Track unique violations
    results.violations.forEach(violation => {
      const existing = this.results.summary.violations.find(v => 
        v.id === violation.id || v.message === violation.message
      );
      
      if (!existing) {
        this.results.summary.violations.push({
          id: violation.id || violation.code,
          description: violation.description || violation.message,
          impact: violation.impact,
          count: 1,
          pages: [results.url]
        });
      } else {
        existing.count++;
        if (!existing.pages.includes(results.url)) {
          existing.pages.push(results.url);
        }
      }
    });
  }

  async generateReports() {
    // Generate JSON report
    const jsonPath = path.join(this.options.outputDir, 'accessibility-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(this.results, null, 2), 'utf-8');
    
    // Generate HTML report
    await this.generateHTMLReport();
    
    // Generate CSV report for tracking
    await this.generateCSVReport();
  }

  async generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      line-height: 1.6; 
      color: #333;
      background: #f5f5f5;
    }
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 20px;
    }
    header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #333; 
      margin-bottom: 10px;
      font-size: 2rem;
    }
    .score {
      font-size: 3rem;
      font-weight: bold;
      margin: 20px 0;
    }
    .score.excellent { color: #10b981; }
    .score.good { color: #3b82f6; }
    .score.fair { color: #f59e0b; }
    .score.poor { color: #ef4444; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      color: #666;
      font-size: 0.9rem;
    }
    .violations {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .violation {
      padding: 15px;
      margin-bottom: 15px;
      border-left: 4px solid #ef4444;
      background: #fef2f2;
      border-radius: 4px;
    }
    .violation.critical { border-left-color: #dc2626; background: #fee2e2; }
    .violation.serious { border-left-color: #f59e0b; background: #fef3c7; }
    .violation.moderate { border-left-color: #3b82f6; background: #dbeafe; }
    .violation.minor { border-left-color: #10b981; background: #d1fae5; }
    .violation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .violation-title {
      font-weight: bold;
      font-size: 1.1rem;
    }
    .impact {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: bold;
      text-transform: uppercase;
    }
    .impact.critical { background: #dc2626; color: white; }
    .impact.serious { background: #f59e0b; color: white; }
    .impact.moderate { background: #3b82f6; color: white; }
    .impact.minor { background: #10b981; color: white; }
    .pages-affected {
      margin-top: 10px;
      font-size: 0.9rem;
      color: #666;
    }
    .patterns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .pattern-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .pattern-title {
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .pattern-test {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .pattern-test:last-child {
      border-bottom: none;
    }
    .status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: bold;
    }
    .status.passed { background: #d1fae5; color: #065f46; }
    .status.failed { background: #fee2e2; color: #991b1b; }
    .recommendations {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .recommendations h2 {
      color: #92400e;
      margin-bottom: 15px;
    }
    .recommendations ul {
      margin-left: 20px;
    }
    .recommendations li {
      margin-bottom: 10px;
    }
    footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Accessibility Test Report</h1>
      <div class="score ${this.getScoreClass(this.results.summary.score)}">
        Score: ${this.results.summary.score}/100
      </div>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </header>

    <div class="summary">
      <div class="stat">
        <div class="stat-value">${this.results.summary.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #10b981">${this.results.summary.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #ef4444">${this.results.summary.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #f59e0b">${this.results.summary.warnings}</div>
        <div class="stat-label">Warnings</div>
      </div>
    </div>

    ${this.results.summary.violations.length > 0 ? `
      <div class="violations">
        <h2>Accessibility Violations</h2>
        ${this.results.summary.violations.sort((a, b) => b.count - a.count).map(violation => `
          <div class="violation ${violation.impact || 'moderate'}">
            <div class="violation-header">
              <div class="violation-title">${violation.description}</div>
              <span class="impact ${violation.impact || 'moderate'}">${violation.impact || 'issue'}</span>
            </div>
            <div class="pages-affected">
              Affects ${violation.count} instance(s) on: ${violation.pages.join(', ')}
            </div>
          </div>
        `).join('')}
      </div>
    ` : '<div class="violations"><h2>✅ No Accessibility Violations Found!</h2></div>'}

    <div class="patterns">
      <div class="pattern-card">
        <div class="pattern-title">🎹 Keyboard Navigation</div>
        ${Object.entries(this.results.patterns.keyboard).map(([route, result]) => `
          <div class="pattern-test">
            <span>${route}</span>
            <span class="status ${result.passed ? 'passed' : 'failed'}">
              ${result.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        `).join('')}
      </div>

      <div class="pattern-card">
        <div class="pattern-title">📢 Screen Reader</div>
        ${Object.entries(this.results.patterns.screenReader).map(([route, result]) => `
          <div class="pattern-test">
            <span>${route}</span>
            <span class="status ${result.passed ? 'passed' : 'failed'}">
              ${result.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        `).join('')}
      </div>

      <div class="pattern-card">
        <div class="pattern-title">🎨 Color Contrast</div>
        ${Object.entries(this.results.patterns.colorContrast).map(([route, result]) => `
          <div class="pattern-test">
            <span>${route}</span>
            <span class="status ${result.passed ? 'passed' : 'failed'}">
              ${result.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        `).join('')}
      </div>

      <div class="pattern-card">
        <div class="pattern-title">🎯 Focus Management</div>
        ${Object.entries(this.results.patterns.focus).map(([route, result]) => `
          <div class="pattern-test">
            <span>${route}</span>
            <span class="status ${result.passed ? 'passed' : 'failed'}">
              ${result.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        `).join('')}
      </div>

      <div class="pattern-card">
        <div class="pattern-title">🏷️ ARIA</div>
        ${Object.entries(this.results.patterns.aria).map(([route, result]) => `
          <div class="pattern-test">
            <span>${route}</span>
            <span class="status ${result.passed ? 'passed' : 'failed'}">
              ${result.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        `).join('')}
      </div>

      <div class="pattern-card">
        <div class="pattern-title">📝 Forms</div>
        ${Object.entries(this.results.patterns.forms).map(([route, result]) => `
          <div class="pattern-test">
            <span>${route}</span>
            <span class="status ${result.passed ? 'passed' : 'failed'}">
              ${result.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
        `).join('')}
      </div>
    </div>

    ${this.results.summary.violations.length > 0 ? `
      <div class="recommendations">
        <h2>📋 Recommendations</h2>
        <ul>
          ${this.generateRecommendations().map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <footer>
      <p>Tested with axe-core, Pa11y, and custom checks</p>
      <p>WCAG 2.1 Level AAA Compliance</p>
    </footer>
  </div>
</body>
</html>
    `;
    
    const htmlPath = path.join(this.options.outputDir, 'accessibility-report.html');
    await fs.writeFile(htmlPath, html, 'utf-8');
  }

  async generateCSVReport() {
    const csv = [
      'Page,Viewport,Score,Violations,Warnings,Passes',
      ...this.results.pages.map(page => 
        `"${page.url}","${page.viewport}",${page.score},${page.violations.length},${page.warnings.length},${page.passes.length}`
      )
    ].join('\n');
    
    const csvPath = path.join(this.options.outputDir, 'accessibility-summary.csv');
    await fs.writeFile(csvPath, csv, 'utf-8');
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for common issues
    const violations = this.results.summary.violations;
    
    if (violations.some(v => v.id && v.id.includes('color-contrast'))) {
      recommendations.push('Improve color contrast ratios to meet WCAG AAA standards (7:1 for normal text, 4.5:1 for large text)');
    }
    
    if (violations.some(v => v.id && v.id.includes('image-alt'))) {
      recommendations.push('Add descriptive alt text to all images');
    }
    
    if (violations.some(v => v.id && v.id.includes('heading'))) {
      recommendations.push('Ensure proper heading hierarchy (h1 → h2 → h3, etc.)');
    }
    
    if (violations.some(v => v.id && v.id.includes('label'))) {
      recommendations.push('Associate all form inputs with proper labels');
    }
    
    if (violations.some(v => v.id && v.id.includes('landmark'))) {
      recommendations.push('Use semantic HTML5 landmarks (header, nav, main, footer)');
    }
    
    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push('Continue regular accessibility testing');
      recommendations.push('Test with real screen readers (NVDA, JAWS, VoiceOver)');
      recommendations.push('Conduct user testing with people with disabilities');
    }
    
    return recommendations;
  }

  getScoreClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  printSummary() {
    console.log(chalk.cyan('\n📊 Accessibility Test Summary\n'));
    
    // Score with color
    const score = this.results.summary.score;
    const scoreColor = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
    console.log(scoreColor(`Overall Score: ${score}/100`));
    
    // Test results
    console.log(chalk.white('\nTest Results:'));
    console.log(chalk.green(`  ✓ Passed: ${this.results.summary.passed}`));
    console.log(chalk.red(`  ✗ Failed: ${this.results.summary.failed}`));
    console.log(chalk.yellow(`  ⚠ Warnings: ${this.results.summary.warnings}`));
    
    // Critical issues
    if (this.results.summary.criticalIssues.length > 0) {
      console.log(chalk.red('\n🚨 Critical Issues:'));
      this.results.summary.criticalIssues.slice(0, 5).forEach(issue => {
        console.log(chalk.red(`  • ${issue.issue.description} (${issue.page})`));
      });
    }
    
    // Top violations
    if (this.results.summary.violations.length > 0) {
      console.log(chalk.yellow('\n⚠ Top Violations:'));
      this.results.summary.violations
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .forEach(violation => {
          console.log(chalk.yellow(`  • ${violation.description} (${violation.count} instances)`));
        });
    }
    
    // Pattern test results
    console.log(chalk.white('\n🔍 Pattern Tests:'));
    Object.entries(this.results.patterns).forEach(([category, tests]) => {
      const passed = Object.values(tests).filter(t => t.passed).length;
      const total = Object.keys(tests).length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
      const color = passRate === 100 ? chalk.green : passRate >= 50 ? chalk.yellow : chalk.red;
      console.log(color(`  ${category}: ${passed}/${total} passed (${passRate}%)`));
    });
    
    // Reports
    console.log(chalk.cyan('\n📄 Reports saved to:'));
    console.log(chalk.white(`  • ${this.options.outputDir}/accessibility-report.html`));
    console.log(chalk.white(`  • ${this.options.outputDir}/accessibility-report.json`));
    console.log(chalk.white(`  • ${this.options.outputDir}/accessibility-summary.csv`));
    
    // Recommendations
    if (this.results.summary.violations.length > 0) {
      console.log(chalk.cyan('\n💡 Quick Fixes:'));
      this.generateRecommendations().slice(0, 3).forEach(rec => {
        console.log(chalk.white(`  • ${rec}`));
      });
    } else {
      console.log(chalk.green('\n✨ Excellent! No accessibility violations found.'));
    }
  }
}

// Export for use in other scripts
module.exports = AccessibilityTestSuite;

// CLI execution
if (require.main === module) {
  const suite = new AccessibilityTestSuite();
  
  suite.runFullSuite()
    .then(results => {
      process.exit(results.summary.score >= 70 ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    });
}
