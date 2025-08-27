#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Orchestrates all test types and generates coverage reports
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: { passed: 0, failed: 0, coverage: 0 },
      integration: { passed: 0, failed: 0, coverage: 0 },
      e2e: { passed: 0, failed: 0, coverage: 0 },
      accessibility: { passed: 0, failed: 0 },
      performance: { passed: 0, failed: 0 }
    };
    this.startTime = Date.now();
  }

  log(message, color = 'white') {
    console.log(chalk[color](`[${new Date().toISOString()}] ${message}`));
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  async ensureDirectories() {
    const dirs = [
      'test-results',
      'test-results/coverage',
      'test-results/reports',
      'test-results/screenshots'
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async runUnitTests() {
    this.log('Running unit tests...', 'blue');
    
    try {
      await this.runCommand('npm', ['run', 'test:unit', '--', '--coverage', '--watchAll=false']);
      this.testResults.unit.passed = 1;
      this.log('Unit tests passed ✅', 'green');
    } catch (error) {
      this.testResults.unit.failed = 1;
      this.log('Unit tests failed ❌', 'red');
      throw error;
    }
  }

  async runIntegrationTests() {
    this.log('Running integration tests...', 'blue');
    
    try {
      await this.runCommand('npm', ['run', 'test:integration', '--', '--watchAll=false']);
      this.testResults.integration.passed = 1;
      this.log('Integration tests passed ✅', 'green');
    } catch (error) {
      this.testResults.integration.failed = 1;
      this.log('Integration tests failed ❌', 'red');
      throw error;
    }
  }

  async runE2ETests() {
    this.log('Running E2E tests...', 'blue');
    
    try {
      // Start the development server if not running
      const serverProcess = spawn('npm', ['run', 'dev'], { 
        detached: true,
        stdio: 'pipe'
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 10000));

      try {
        await this.runCommand('npx', ['playwright', 'test', '--reporter=html']);
        this.testResults.e2e.passed = 1;
        this.log('E2E tests passed ✅', 'green');
      } finally {
        // Kill the server process
        process.kill(-serverProcess.pid);
      }
    } catch (error) {
      this.testResults.e2e.failed = 1;
      this.log('E2E tests failed ❌', 'red');
      throw error;
    }
  }

  async runAccessibilityTests() {
    this.log('Running accessibility tests...', 'blue');
    
    try {
      await this.runCommand('npm', ['run', 'test:accessibility']);
      this.testResults.accessibility.passed = 1;
      this.log('Accessibility tests passed ✅', 'green');
    } catch (error) {
      this.testResults.accessibility.failed = 1;
      this.log('Accessibility tests failed ❌', 'red');
      throw error;
    }
  }

  async runPerformanceTests() {
    this.log('Running performance tests...', 'blue');
    
    try {
      await this.runCommand('npm', ['run', 'test:performance']);
      this.testResults.performance.passed = 1;
      this.log('Performance tests passed ✅', 'green');
    } catch (error) {
      this.testResults.performance.failed = 1;
      this.log('Performance tests failed ❌', 'red');
      throw error;
    }
  }

  async generateCoverageReport() {
    this.log('Generating coverage report...', 'blue');

    try {
      // Run tests with coverage
      await this.runCommand('npm', ['run', 'test:coverage', '--', '--watchAll=false']);
      
      // Parse coverage results
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      
      if (await fs.access(coveragePath).then(() => true).catch(() => false)) {
        const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
        const totalCoverage = coverageData.total;
        
        this.testResults.unit.coverage = totalCoverage.lines.pct;
        
        this.log(`Coverage Summary:`, 'yellow');
        this.log(`  Lines: ${totalCoverage.lines.pct}%`, 'cyan');
        this.log(`  Functions: ${totalCoverage.functions.pct}%`, 'cyan');
        this.log(`  Branches: ${totalCoverage.branches.pct}%`, 'cyan');
        this.log(`  Statements: ${totalCoverage.statements.pct}%`, 'cyan');
        
        if (totalCoverage.lines.pct < 90) {
          throw new Error(`Coverage ${totalCoverage.lines.pct}% is below 90% threshold`);
        }
        
        this.log('Coverage threshold met ✅', 'green');
      }
    } catch (error) {
      this.log('Coverage report generation failed ❌', 'red');
      throw error;
    }
  }

  async generateTestReport() {
    this.log('Generating test report...', 'blue');

    const totalTime = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalTime,
      results: this.testResults,
      summary: {
        total: Object.values(this.testResults).reduce((sum, result) => 
          sum + result.passed + result.failed, 0),
        passed: Object.values(this.testResults).reduce((sum, result) => 
          sum + result.passed, 0),
        failed: Object.values(this.testResults).reduce((sum, result) => 
          sum + result.failed, 0)
      }
    };

    const reportPath = path.join('test-results', 'reports', 'test-summary.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join('test-results', 'reports', 'test-report.html');
    await fs.writeFile(htmlReportPath, htmlReport);

    this.log(`Test report saved to ${htmlReportPath}`, 'green');
    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - Portfolio Site</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .coverage { color: #007bff; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        .progress { width: 100%; background: #f0f0f0; border-radius: 4px; }
        .progress-bar { height: 20px; background: #007bff; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Portfolio Site Test Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Duration:</strong> ${Math.round(report.duration / 1000)}s</p>
        <p><strong>Total Tests:</strong> ${report.summary.total}</p>
        <p class="passed"><strong>Passed:</strong> ${report.summary.passed}</p>
        <p class="failed"><strong>Failed:</strong> ${report.summary.failed}</p>
    </div>

    <div class="section">
        <h2>Test Results by Category</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Coverage</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.results).map(([category, results]) => `
                <tr>
                    <td>${category.charAt(0).toUpperCase() + category.slice(1)}</td>
                    <td class="passed">${results.passed}</td>
                    <td class="failed">${results.failed}</td>
                    <td class="coverage">${results.coverage || 'N/A'}${results.coverage ? '%' : ''}</td>
                    <td>${results.failed > 0 ? '<span class="failed">❌ Failed</span>' : '<span class="passed">✅ Passed</span>'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${report.results.unit.coverage ? `
    <div class="section">
        <h2>Coverage Summary</h2>
        <p>Overall Coverage: <strong>${report.results.unit.coverage}%</strong></p>
        <div class="progress">
            <div class="progress-bar" style="width: ${report.results.unit.coverage}%"></div>
        </div>
        ${report.results.unit.coverage >= 90 ? 
          '<p class="passed">✅ Coverage threshold (90%) met</p>' : 
          '<p class="failed">❌ Coverage below 90% threshold</p>'
        }
    </div>
    ` : ''}

    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            ${report.summary.failed > 0 ? '<li class="failed">Fix failing tests before deployment</li>' : ''}
            ${report.results.unit.coverage && report.results.unit.coverage < 90 ? '<li class="failed">Improve test coverage to meet 90% threshold</li>' : ''}
            ${report.results.performance.failed > 0 ? '<li class="failed">Address performance issues identified in testing</li>' : ''}
            ${report.results.accessibility.failed > 0 ? '<li class="failed">Fix accessibility violations for better UX</li>' : ''}
            ${report.summary.failed === 0 ? '<li class="passed">All tests passing - ready for deployment! 🚀</li>' : ''}
        </ul>
    </div>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p>Generated by Portfolio Site Test Runner</p>
    </footer>
</body>
</html>
    `;
  }

  async run(testTypes = ['unit', 'integration', 'coverage']) {
    this.log('Starting comprehensive test suite...', 'cyan');
    
    try {
      await this.ensureDirectories();

      if (testTypes.includes('unit')) {
        await this.runUnitTests();
      }

      if (testTypes.includes('integration')) {
        await this.runIntegrationTests();
      }

      if (testTypes.includes('e2e')) {
        await this.runE2ETests();
      }

      if (testTypes.includes('accessibility')) {
        await this.runAccessibilityTests();
      }

      if (testTypes.includes('performance')) {
        await this.runPerformanceTests();
      }

      if (testTypes.includes('coverage')) {
        await this.generateCoverageReport();
      }

      const report = await this.generateTestReport();
      
      this.log('All tests completed successfully! 🎉', 'green');
      this.log(`Total time: ${Math.round((Date.now() - this.startTime) / 1000)}s`, 'cyan');
      
      if (report.summary.failed === 0 && report.results.unit.coverage >= 90) {
        this.log('✅ Ready for deployment!', 'green');
        process.exit(0);
      } else {
        this.log('❌ Some tests failed or coverage is insufficient', 'red');
        process.exit(1);
      }

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'red');
      await this.generateTestReport();
      process.exit(1);
    }
  }
}

// Command line interface
if (require.main === module) {
  const testTypes = process.argv.slice(2);
  const runner = new TestRunner();
  
  if (testTypes.length === 0) {
    runner.run(['unit', 'integration', 'coverage']);
  } else {
    runner.run(testTypes);
  }
}

module.exports = TestRunner;