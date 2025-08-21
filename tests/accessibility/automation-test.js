// Automated Accessibility Testing with pa11y and axe-core
// Runs comprehensive automated accessibility checks

const fs = require('fs');
const path = require('path');

class AutomatedAccessibilityTester {
  constructor() {
    this.results = [];
    this.baseUrl = 'http://localhost:3000';
  }

  // Test configuration
  getTestConfig() {
    return {
      // Standard for WCAG 2.1 AA compliance
      standard: 'WCAG2AA',
      
      // Include additional rules
      includeNotices: false,
      includeWarnings: true,
      
      // Timeout settings
      timeout: 30000,
      
      // Browser configuration
      chromeLaunchConfig: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      },
      
      // Rules to ignore (if any specific false positives)
      ignore: [
        // Add specific rule IDs to ignore here if needed
      ]
    };
  }

  // Test both light and dark themes
  async testThemes() {
    const pages = [
      '/',
      '/about',
      '/portfolio',
      '/blog',
      '/contact'
    ];

    for (const page of pages) {
      console.log(`Testing ${page}...`);
      
      // Test light theme
      await this.testPage(page, 'light');
      
      // Test dark theme
      await this.testPage(page, 'dark');
    }

    return this.results;
  }

  // Test a specific page with theme
  async testPage(path, theme) {
    try {
      const url = `${this.baseUrl}${path}`;
      
      // Configure pa11y for theme testing
      const pa11y = require('pa11y');
      const config = {
        ...this.getTestConfig(),
        
        // Set theme before testing
        actions: [
          `set field #theme-selector to ${theme}`,
          'click element #theme-toggle',
          'wait for element body to be visible'
        ],
        
        // Custom viewport
        viewport: {
          width: 1280,
          height: 1024
        }
      };

      const result = await pa11y(url, config);
      
      this.results.push({
        url: path,
        theme,
        timestamp: new Date().toISOString(),
        issues: result.issues,
        pageTitle: result.pageTitle,
        documentTitle: result.documentTitle
      });

      console.log(`${path} (${theme}): ${result.issues.length} issues found`);
      
    } catch (error) {
      console.error(`Error testing ${path} with ${theme} theme:`, error.message);
      
      this.results.push({
        url: path,
        theme,
        timestamp: new Date().toISOString(),
        error: error.message,
        issues: []
      });
    }
  }

  // Run axe-core browser tests
  async runAxeTests() {
    const puppeteer = require('puppeteer');
    const axeCore = require('axe-core');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Inject axe-core
      await page.addScriptTag({
        content: axeCore.source
      });

      const pages = ['/', '/about', '/portfolio'];
      
      for (const pagePath of pages) {
        await page.goto(`${this.baseUrl}${pagePath}`);
        
        // Test light theme
        await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'light');
        });
        
        await page.waitForTimeout(1000);
        
        const lightResults = await page.evaluate(() => {
          return axe.run();
        });

        // Test dark theme
        await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'dark');
        });
        
        await page.waitForTimeout(1000);
        
        const darkResults = await page.evaluate(() => {
          return axe.run();
        });

        this.results.push({
          url: pagePath,
          theme: 'light',
          tool: 'axe-core',
          timestamp: new Date().toISOString(),
          violations: lightResults.violations,
          passes: lightResults.passes.length,
          incomplete: lightResults.incomplete.length
        });

        this.results.push({
          url: pagePath,
          theme: 'dark', 
          tool: 'axe-core',
          timestamp: new Date().toISOString(),
          violations: darkResults.violations,
          passes: darkResults.passes.length,
          incomplete: darkResults.incomplete.length
        });
      }
      
    } finally {
      await browser.close();
    }
  }

  // Generate comprehensive report
  generateReport() {
    const timestamp = new Date().toISOString();
    
    let report = `# Automated Accessibility Test Report\n\n`;
    report += `**Generated**: ${timestamp}\n`;
    report += `**Tool**: pa11y + axe-core\n`;
    report += `**Standard**: WCAG 2.1 AA\n\n`;

    // Summary statistics
    const totalIssues = this.results.reduce((sum, result) => {
      return sum + (result.issues ? result.issues.length : 0) + 
                   (result.violations ? result.violations.length : 0);
    }, 0);

    const pagesCounted = new Set(this.results.map(r => r.url)).size;
    const themesCounted = new Set(this.results.map(r => r.theme)).size;

    report += `## Summary\n\n`;
    report += `- **Pages tested**: ${pagesCounted}\n`;
    report += `- **Themes tested**: ${themesCounted}\n`;
    report += `- **Total issues found**: ${totalIssues}\n`;
    report += `- **Test runs**: ${this.results.length}\n\n`;

    // Group results by page and theme
    const groupedResults = {};
    
    this.results.forEach(result => {
      const key = `${result.url}-${result.theme}`;
      if (!groupedResults[key]) {
        groupedResults[key] = [];
      }
      groupedResults[key].push(result);
    });

    // Detailed results
    report += `## Detailed Results\n\n`;
    
    Object.keys(groupedResults).forEach(key => {
      const [url, theme] = key.split('-');
      const results = groupedResults[key];
      
      report += `### ${url} (${theme} theme)\n\n`;
      
      results.forEach(result => {
        if (result.error) {
          report += `**Error**: ${result.error}\n\n`;
          return;
        }

        const tool = result.tool || 'pa11y';
        const issueCount = result.issues ? result.issues.length : 
                          result.violations ? result.violations.length : 0;
        
        report += `**${tool}**: ${issueCount} issues found\n\n`;

        // pa11y issues
        if (result.issues && result.issues.length > 0) {
          result.issues.forEach(issue => {
            const severity = issue.type === 'error' ? '❌' : 
                           issue.type === 'warning' ? '⚠️' : 'ℹ️';
            
            report += `${severity} **${issue.type.toUpperCase()}**: ${issue.message}\n`;
            report += `   - Code: ${issue.code}\n`;
            report += `   - Element: \`${issue.selector}\`\n`;
            if (issue.context) {
              report += `   - Context: \`${issue.context.substring(0, 100)}...\`\n`;
            }
            report += '\n';
          });
        }

        // axe-core violations
        if (result.violations && result.violations.length > 0) {
          result.violations.forEach(violation => {
            report += `❌ **${violation.impact?.toUpperCase() || 'ERROR'}**: ${violation.description}\n`;
            report += `   - Rule: ${violation.id}\n`;
            report += `   - Help: ${violation.helpUrl}\n`;
            report += `   - Nodes affected: ${violation.nodes.length}\n`;
            
            violation.nodes.slice(0, 3).forEach((node, index) => {
              report += `   - Element ${index + 1}: \`${node.target[0]}\`\n`;
            });
            
            if (violation.nodes.length > 3) {
              report += `   - ... and ${violation.nodes.length - 3} more\n`;
            }
            report += '\n';
          });
        }

        // Axe passes summary
        if (typeof result.passes === 'number') {
          report += `✅ **Passed checks**: ${result.passes}\n`;
        }
        
        if (typeof result.incomplete === 'number' && result.incomplete > 0) {
          report += `⚠️ **Incomplete checks**: ${result.incomplete}\n`;
        }
        
        report += '\n';
      });
    });

    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (totalIssues === 0) {
      report += `🎉 **Excellent!** No accessibility issues detected.\n\n`;
      report += `### Next Steps:\n`;
      report += `- Continue manual testing with screen readers\n`;
      report += `- Test with real users who have disabilities\n`;
      report += `- Verify keyboard navigation thoroughly\n`;
      report += `- Test with different browser/OS combinations\n`;
    } else {
      report += `### Priority Actions:\n`;
      report += `1. **Address all ERROR level issues immediately**\n`;
      report += `2. **Review and fix WARNING level issues**\n`;
      report += `3. **Test fixes in both light and dark themes**\n`;
      report += `4. **Re-run automated tests after fixes**\n\n`;
      
      report += `### Common Issue Types:\n`;
      const issueCounts = {};
      
      this.results.forEach(result => {
        if (result.issues) {
          result.issues.forEach(issue => {
            const code = issue.code || 'Unknown';
            issueCounts[code] = (issueCounts[code] || 0) + 1;
          });
        }
        
        if (result.violations) {
          result.violations.forEach(violation => {
            const id = violation.id || 'Unknown';
            issueCounts[id] = (issueCounts[id] || 0) + 1;
          });
        }
      });
      
      Object.entries(issueCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([issue, count]) => {
          report += `- **${issue}**: ${count} occurrences\n`;
        });
    }

    report += `\n### Testing Notes:\n`;
    report += `- Tests run against local development server\n`;
    report += `- Both light and dark themes tested\n`;
    report += `- Automated tools may miss some issues\n`;
    report += `- Manual testing still required\n`;
    report += `- Consider user testing with assistive technologies\n`;

    return report;
  }

  // Save report to file
  saveReport() {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `accessibility-automated-report-${timestamp}.md`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, report, 'utf8');
    console.log(`Report saved to: ${filepath}`);
    
    return filepath;
  }
}

// CLI usage
if (require.main === module) {
  const tester = new AutomatedAccessibilityTester();
  
  async function runTests() {
    console.log('Starting automated accessibility tests...');
    
    try {
      // Run pa11y tests
      console.log('Running pa11y tests...');
      await tester.testThemes();
      
      // Run axe-core tests
      console.log('Running axe-core tests...');
      await tester.runAxeTests();
      
      // Generate and save report
      console.log('Generating report...');
      const reportPath = tester.saveReport();
      
      console.log(`\nTesting complete! Report saved to: ${reportPath}`);
      
    } catch (error) {
      console.error('Test execution failed:', error);
      process.exit(1);
    }
  }
  
  runTests();
}

module.exports = AutomatedAccessibilityTester;