const puppeteer = require('puppeteer');
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;
const fs = require('fs');
const path = require('path');

/**
 * Visual Regression Testing Suite
 * Captures screenshots and compares them against baseline images
 */

class VisualRegressionTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.threshold = options.threshold || 0.1;
    this.outputDir = options.outputDir || path.join(__dirname, '../results/visual');
    this.baselineDir = path.join(this.outputDir, 'baseline');
    this.currentDir = path.join(this.outputDir, 'current');
    this.diffDir = path.join(this.outputDir, 'diff');
    this.browser = null;
    this.page = null;
    this.testResults = [];
    
    this.ensureDirectories();
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent screenshots
    await this.page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * Run all visual regression tests
   */
  async runAllTests() {
    console.log('📸 Starting visual regression testing...');
    
    try {
      await this.initialize();
      
      // Test different page layouts
      await this.testHomepage();
      await this.testContentPages();
      await this.testPortfolioPages();
      await this.testAuthenticationPages();
      await this.testAdminPages();
      await this.testResponsiveLayouts();
      await this.testInteractiveElements();
      await this.testDarkMode();
      
      this.generateVisualReport();
      
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Test homepage visual elements
   */
  async testHomepage() {
    console.log('🏠 Testing homepage visuals...');
    
    const scenarios = [
      {
        name: 'homepage-hero',
        url: '/',
        selector: '[data-testid="hero-section"]',
        description: 'Homepage hero section'
      },
      {
        name: 'homepage-full',
        url: '/',
        description: 'Full homepage layout'
      },
      {
        name: 'homepage-navigation',
        url: '/',
        selector: 'nav',
        description: 'Navigation menu'
      },
      {
        name: 'homepage-footer',
        url: '/',
        selector: 'footer',
        description: 'Footer section'
      }
    ];

    for (const scenario of scenarios) {
      await this.captureAndCompare(scenario);
    }
  }

  /**
   * Test content pages
   */
  async testContentPages() {
    console.log('📄 Testing content page visuals...');
    
    const scenarios = [
      {
        name: 'content-list',
        url: '/content',
        description: 'Content listing page'
      },
      {
        name: 'content-single',
        url: '/content/blog/tutorials/test-post',
        description: 'Individual content page'
      },
      {
        name: 'content-search',
        url: '/content/search?q=tutorial',
        description: 'Content search results'
      },
      {
        name: 'content-categories',
        url: '/content?section=blog',
        description: 'Content filtered by category'
      }
    ];

    for (const scenario of scenarios) {
      await this.captureAndCompare(scenario);
    }
  }

  /**
   * Test portfolio pages
   */
  async testPortfolioPages() {
    console.log('💼 Testing portfolio page visuals...');
    
    const scenarios = [
      {
        name: 'portfolio-projects',
        url: '/portfolio/projects',
        description: 'Portfolio projects page'
      },
      {
        name: 'portfolio-single',
        url: '/portfolio/projects/sample-project',
        description: 'Single project page'
      },
      {
        name: 'portfolio-skills',
        url: '/portfolio/skills',
        description: 'Skills showcase page'
      },
      {
        name: 'portfolio-experience',
        url: '/portfolio/experience',
        description: 'Experience timeline'
      }
    ];

    for (const scenario of scenarios) {
      await this.captureAndCompare(scenario);
    }
  }

  /**
   * Test authentication pages
   */
  async testAuthenticationPages() {
    console.log('🔐 Testing authentication page visuals...');
    
    const scenarios = [
      {
        name: 'login-page',
        url: '/login',
        description: 'Login page layout'
      },
      {
        name: 'register-page',
        url: '/register',
        description: 'Registration page layout'
      },
      {
        name: 'forgot-password',
        url: '/forgot-password',
        description: 'Password reset page'
      },
      {
        name: 'profile-page',
        url: '/profile',
        description: 'User profile page'
      }
    ];

    for (const scenario of scenarios) {
      await this.captureAndCompare(scenario);
    }
  }

  /**
   * Test admin pages
   */
  async testAdminPages() {
    console.log('⚙️ Testing admin page visuals...');
    
    // Login as admin first
    await this.loginAsAdmin();
    
    const scenarios = [
      {
        name: 'admin-dashboard',
        url: '/admin/dashboard',
        description: 'Admin dashboard'
      },
      {
        name: 'admin-content',
        url: '/admin/content',
        description: 'Content management'
      },
      {
        name: 'admin-users',
        url: '/admin/users',
        description: 'User management'
      },
      {
        name: 'admin-analytics',
        url: '/admin/analytics',
        description: 'Analytics dashboard'
      }
    ];

    for (const scenario of scenarios) {
      await this.captureAndCompare(scenario);
    }
  }

  /**
   * Test responsive layouts
   */
  async testResponsiveLayouts() {
    console.log('📱 Testing responsive layouts...');
    
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    const pages = [
      { url: '/', name: 'homepage' },
      { url: '/content', name: 'content' },
      { url: '/portfolio/projects', name: 'portfolio' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      
      for (const pageDef of pages) {
        await this.captureAndCompare({
          name: `${pageDef.name}-${viewport.name}`,
          url: pageDef.url,
          description: `${pageDef.name} on ${viewport.name}`
        });
      }
    }

    // Reset to default viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  /**
   * Test interactive elements
   */
  async testInteractiveElements() {
    console.log('🖱️ Testing interactive element states...');
    
    const interactiveTests = [
      {
        name: 'navigation-hover',
        url: '/',
        actions: [
          { type: 'hover', selector: 'nav a:first-child' }
        ],
        description: 'Navigation link hover state'
      },
      {
        name: 'button-focus',
        url: '/login',
        actions: [
          { type: 'focus', selector: 'button[type="submit"]' }
        ],
        description: 'Button focus state'
      },
      {
        name: 'form-validation',
        url: '/login',
        actions: [
          { type: 'click', selector: 'button[type="submit"]' },
          { type: 'wait', duration: 1000 }
        ],
        description: 'Form validation errors'
      },
      {
        name: 'dropdown-open',
        url: '/',
        actions: [
          { type: 'click', selector: '[data-testid="user-menu"]' }
        ],
        description: 'Dropdown menu open state'
      }
    ];

    for (const test of interactiveTests) {
      await this.captureAndCompareWithActions(test);
    }
  }

  /**
   * Test dark mode variations
   */
  async testDarkMode() {
    console.log('🌙 Testing dark mode visuals...');
    
    // Enable dark mode
    await this.page.evaluateOnNewDocument(() => {
      localStorage.setItem('theme', 'dark');
    });

    const scenarios = [
      {
        name: 'homepage-dark',
        url: '/',
        description: 'Homepage in dark mode'
      },
      {
        name: 'content-dark',
        url: '/content',
        description: 'Content page in dark mode'
      },
      {
        name: 'login-dark',
        url: '/login',
        description: 'Login page in dark mode'
      }
    ];

    for (const scenario of scenarios) {
      await this.captureAndCompare(scenario);
    }

    // Reset to light mode
    await this.page.evaluateOnNewDocument(() => {
      localStorage.setItem('theme', 'light');
    });
  }

  /**
   * Capture screenshot and compare with baseline
   */
  async captureAndCompare(scenario) {
    try {
      await this.page.goto(`${this.baseUrl}${scenario.url}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for any animations to complete
      await this.page.waitForTimeout(1000);

      // Hide dynamic content that changes frequently
      await this.hideDynamicContent();

      let screenshot;
      if (scenario.selector) {
        const element = await this.page.$(scenario.selector);
        if (element) {
          screenshot = await element.screenshot();
        } else {
          console.warn(`Element not found for selector: ${scenario.selector}`);
          screenshot = await this.page.screenshot({ fullPage: true });
        }
      } else {
        screenshot = await this.page.screenshot({ fullPage: true });
      }

      const currentPath = path.join(this.currentDir, `${scenario.name}.png`);
      fs.writeFileSync(currentPath, screenshot);

      const result = await this.compareWithBaseline(scenario.name, scenario.description);
      this.testResults.push(result);

    } catch (error) {
      console.error(`Error capturing ${scenario.name}:`, error.message);
      this.testResults.push({
        name: scenario.name,
        description: scenario.description,
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * Capture screenshot with user interactions
   */
  async captureAndCompareWithActions(scenario) {
    try {
      await this.page.goto(`${this.baseUrl}${scenario.url}`, {
        waitUntil: 'networkidle0'
      });

      // Perform actions
      for (const action of scenario.actions) {
        switch (action.type) {
          case 'hover':
            await this.page.hover(action.selector);
            break;
          case 'click':
            await this.page.click(action.selector);
            break;
          case 'focus':
            await this.page.focus(action.selector);
            break;
          case 'wait':
            await this.page.waitForTimeout(action.duration);
            break;
        }
      }

      // Wait for state changes to complete
      await this.page.waitForTimeout(500);

      await this.hideDynamicContent();

      const screenshot = await this.page.screenshot({ fullPage: true });
      const currentPath = path.join(this.currentDir, `${scenario.name}.png`);
      fs.writeFileSync(currentPath, screenshot);

      const result = await this.compareWithBaseline(scenario.name, scenario.description);
      this.testResults.push(result);

    } catch (error) {
      console.error(`Error capturing interactive test ${scenario.name}:`, error.message);
      this.testResults.push({
        name: scenario.name,
        description: scenario.description,
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * Hide dynamic content that changes frequently
   */
  async hideDynamicContent() {
    await this.page.evaluate(() => {
      // Hide timestamps, dates, and other dynamic content
      const dynamicSelectors = [
        '[data-testid="timestamp"]',
        '[data-testid="last-updated"]',
        '.timestamp',
        '.date-time',
        '[data-dynamic]',
        '.loading-animation',
        '.spinner'
      ];

      dynamicSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.style.visibility = 'hidden';
        });
      });

      // Replace any text content that contains current time/date
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );

      const dateRegex = /\\d{4}-\\d{2}-\\d{2}|\\d{1,2}:\\d{2}(:\\d{2})?/g;
      let node;
      while (node = walker.nextNode()) {
        if (dateRegex.test(node.textContent)) {
          node.textContent = node.textContent.replace(dateRegex, '[TIMESTAMP]');
        }
      }
    });
  }

  /**
   * Compare current screenshot with baseline
   */
  async compareWithBaseline(testName, description) {
    const baselinePath = path.join(this.baselineDir, `${testName}.png`);
    const currentPath = path.join(this.currentDir, `${testName}.png`);
    const diffPath = path.join(this.diffDir, `${testName}.png`);

    // If no baseline exists, create one
    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(currentPath, baselinePath);
      return {
        name: testName,
        description,
        status: 'baseline_created',
        message: 'Baseline image created'
      };
    }

    try {
      const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
      const currentImg = PNG.sync.read(fs.readFileSync(currentPath));

      const { width, height } = baselineImg;
      const diff = new PNG({ width, height });

      const pixelDiff = pixelmatch(
        baselineImg.data,
        currentImg.data,
        diff.data,
        width,
        height,
        { threshold: this.threshold }
      );

      const totalPixels = width * height;
      const diffPercentage = (pixelDiff / totalPixels) * 100;

      if (pixelDiff === 0) {
        return {
          name: testName,
          description,
          status: 'passed',
          diffPixels: 0,
          diffPercentage: 0
        };
      } else {
        // Save diff image
        fs.writeFileSync(diffPath, PNG.sync.write(diff));

        const status = diffPercentage < 1 ? 'minor_diff' : 'failed';
        
        return {
          name: testName,
          description,
          status,
          diffPixels: pixelDiff,
          diffPercentage: diffPercentage.toFixed(2),
          diffImagePath: diffPath
        };
      }

    } catch (error) {
      return {
        name: testName,
        description,
        status: 'error',
        error: `Comparison failed: ${error.message}`
      };
    }
  }

  /**
   * Login as admin for admin page testing
   */
  async loginAsAdmin() {
    try {
      await this.page.goto(`${this.baseUrl}/admin/login`);
      await this.page.fill('[data-testid="username-input"]', 'admin');
      await this.page.fill('[data-testid="password-input"]', 'adminpass123');
      await this.page.click('[data-testid="login-submit"]');
      await this.page.waitForNavigation();
    } catch (error) {
      console.warn('Could not login as admin for visual tests');
    }
  }

  /**
   * Ensure output directories exist
   */
  ensureDirectories() {
    [this.outputDir, this.baselineDir, this.currentDir, this.diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate visual regression test report
   */
  generateVisualReport() {
    console.log('\\n\\n📊 Visual Regression Test Report');
    console.log('===================================\\n');

    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'passed').length,
      failed: this.testResults.filter(r => r.status === 'failed').length,
      minorDiff: this.testResults.filter(r => r.status === 'minor_diff').length,
      baselineCreated: this.testResults.filter(r => r.status === 'baseline_created').length,
      errors: this.testResults.filter(r => r.status === 'error').length
    };

    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Minor Differences: ${summary.minorDiff}`);
    console.log(`Baselines Created: ${summary.baselineCreated}`);
    console.log(`Errors: ${summary.errors}\\n`);

    // Show failed tests
    const failedTests = this.testResults.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      console.log('🚨 Failed Visual Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.diffPercentage}% difference`);
        if (test.diffImagePath) {
          console.log(`    Diff image: ${test.diffImagePath}`);
        }
      });
      console.log('');
    }

    // Show tests with minor differences
    const minorDiffTests = this.testResults.filter(r => r.status === 'minor_diff');
    if (minorDiffTests.length > 0) {
      console.log('⚠️ Tests with Minor Differences:');
      minorDiffTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.diffPercentage}% difference`);
      });
      console.log('');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      results: this.testResults,
      configuration: {
        baseUrl: this.baseUrl,
        threshold: this.threshold,
        outputDir: this.outputDir
      }
    };

    const reportPath = path.join(this.outputDir, `visual-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    this.generateHtmlReport(report);

    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  /**
   * Generate HTML report for easier viewing
   */
  generateHtmlReport(report) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-result { margin: 10px 0; padding: 15px; border-radius: 8px; }
        .passed { background: #d4edda; border-left: 4px solid #28a745; }
        .failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .minor-diff { background: #fff3cd; border-left: 4px solid #ffc107; }
        .baseline-created { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        .error { background: #f8d7da; border-left: 4px solid #dc3545; }
        .image-comparison { display: flex; gap: 10px; margin: 10px 0; }
        .image-container { text-align: center; }
        .image-container img { max-width: 300px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Visual Regression Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Base URL: ${report.configuration.baseUrl}</p>
    </div>
    
    <div class="summary">
        <div class="stat">
            <h3>Total Tests</h3>
            <p>${report.summary.total}</p>
        </div>
        <div class="stat">
            <h3>Passed</h3>
            <p>${report.summary.passed}</p>
        </div>
        <div class="stat">
            <h3>Failed</h3>
            <p>${report.summary.failed}</p>
        </div>
        <div class="stat">
            <h3>Minor Differences</h3>
            <p>${report.summary.minorDiff}</p>
        </div>
    </div>
    
    <h2>Test Results</h2>
    ${report.results.map(result => `
        <div class="test-result ${result.status}">
            <h3>${result.name}</h3>
            <p>${result.description}</p>
            ${result.diffPercentage ? `<p>Difference: ${result.diffPercentage}%</p>` : ''}
            ${result.error ? `<p>Error: ${result.error}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;

    const htmlPath = path.join(this.outputDir, 'visual-report.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`📊 HTML report generated: ${htmlPath}`);
  }
}

module.exports = { VisualRegressionTester };

// Run tests if executed directly
if (require.main === module) {
  const tester = new VisualRegressionTester();
  
  tester.runAllTests()
    .then(() => {
      console.log('✅ Visual regression testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Visual regression testing failed:', error);
      process.exit(1);
    });
}