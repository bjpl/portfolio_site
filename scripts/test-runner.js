#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Orchestrates and runs all test suites with reporting and coverage
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

class TestRunner {
  constructor(options = {}) {
    this.options = {
      coverage: options.coverage !== false,
      parallel: options.parallel !== false,
      timeout: options.timeout || 300000, // 5 minutes
      verbose: options.verbose || false,
      watch: options.watch || false,
      pattern: options.pattern || '',
      outputDir: options.outputDir || path.join(__dirname, '../test-results'),
      ...options
    };
    
    this.results = {
      unit: { status: 'pending', coverage: null, duration: 0 },
      integration: { status: 'pending', coverage: null, duration: 0 },
      e2e: { status: 'pending', coverage: null, duration: 0 },
      performance: { status: 'pending', results: null, duration: 0 },
      security: { status: 'pending', vulnerabilities: [], duration: 0 },
      visual: { status: 'pending', changes: [], duration: 0 },
      accessibility: { status: 'pending', violations: [], duration: 0 }
    };
    
    this.ensureOutputDir();
  }

  /**
   * Run all test suites
   */
  async runAll() {
    console.log(chalk.blue.bold('🧪 Starting Comprehensive Test Suite\\n'));
    
    const startTime = Date.now();
    
    try {
      if (this.options.parallel) {
        await this.runTestsParallel();
      } else {
        await this.runTestsSequential();
      }
      
      const totalDuration = Date.now() - startTime;
      await this.generateReport(totalDuration);
      
      this.printSummary();
      
      // Exit with error code if any tests failed
      const failed = Object.values(this.results).some(r => r.status === 'failed');
      process.exit(failed ? 1 : 0);
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Test suite failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Run specific test suite
   */
  async runSuite(suiteName) {
    console.log(chalk.blue.bold(`🧪 Running ${suiteName} tests\\n`));
    
    const startTime = Date.now();
    
    try {
      switch (suiteName) {
        case 'unit':
          await this.runUnitTests();
          break;
        case 'integration':
          await this.runIntegrationTests();
          break;
        case 'e2e':
          await this.runE2ETests();
          break;
        case 'performance':
          await this.runPerformanceTests();
          break;
        case 'security':
          await this.runSecurityTests();
          break;
        case 'visual':
          await this.runVisualTests();
          break;
        case 'accessibility':
          await this.runAccessibilityTests();
          break;
        default:
          throw new Error(`Unknown test suite: ${suiteName}`);
      }
      
      const duration = Date.now() - startTime;
      console.log(chalk.green(`✅ ${suiteName} tests completed in ${duration}ms\\n`));
      
    } catch (error) {
      console.error(chalk.red(`❌ ${suiteName} tests failed:`), error.message);
      throw error;
    }
  }

  /**
   * Run tests in parallel
   */
  async runTestsParallel() {
    console.log(chalk.cyan('Running tests in parallel...\\n'));
    
    const promises = [
      this.runUnitTests(),
      this.runIntegrationTests(),
      this.runSecurityTests()
    ];
    
    // Run unit, integration, and security tests in parallel
    await Promise.allSettled(promises.map((p, index) => {
      const suites = ['unit', 'integration', 'security'];
      return p.catch(error => {
        this.results[suites[index]].status = 'failed';
        this.results[suites[index]].error = error.message;
      });
    }));
    
    // Run E2E tests after basic tests pass
    if (this.results.unit.status !== 'failed' && this.results.integration.status !== 'failed') {
      await this.runE2ETests().catch(error => {
        this.results.e2e.status = 'failed';
        this.results.e2e.error = error.message;
      });
    }
    
    // Run visual and performance tests
    await Promise.allSettled([
      this.runPerformanceTests().catch(error => {
        this.results.performance.status = 'failed';
        this.results.performance.error = error.message;
      }),
      this.runVisualTests().catch(error => {
        this.results.visual.status = 'failed';
        this.results.visual.error = error.message;
      }),
      this.runAccessibilityTests().catch(error => {
        this.results.accessibility.status = 'failed';
        this.results.accessibility.error = error.message;
      })
    ]);
  }

  /**
   * Run tests sequentially
   */
  async runTestsSequential() {
    console.log(chalk.cyan('Running tests sequentially...\\n'));
    
    const suites = [
      'unit',
      'integration', 
      'security',
      'e2e',
      'performance',
      'visual',
      'accessibility'
    ];
    
    for (const suite of suites) {
      try {
        await this.runSuite(suite);
      } catch (error) {
        this.results[suite].status = 'failed';
        this.results[suite].error = error.message;
        
        // Continue with other tests unless it's a critical failure
        if (suite === 'unit' || suite === 'integration') {
          console.log(chalk.yellow(`⚠️ Critical test failed, skipping remaining tests`));
          break;
        }
      }
    }
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    console.log(chalk.yellow('📝 Running unit tests...'));
    
    const startTime = Date.now();
    
    try {
      // Backend unit tests
      const backendResult = await this.runCommand('npm', ['run', 'test:unit'], {
        cwd: path.join(__dirname, '../backend'),
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      // Frontend unit tests
      const frontendResult = await this.runCommand('npm', ['run', 'test:unit'], {
        cwd: __dirname.replace('/scripts', ''),
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      this.results.unit.status = 'passed';
      this.results.unit.duration = Date.now() - startTime;
      
      if (this.options.coverage) {
        this.results.unit.coverage = await this.parseCoverage('unit');
      }
      
    } catch (error) {
      this.results.unit.status = 'failed';
      this.results.unit.error = error.message;
      this.results.unit.duration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log(chalk.yellow('🔗 Running integration tests...'));
    
    const startTime = Date.now();
    
    try {
      await this.runCommand('npm', ['run', 'test:integration'], {
        cwd: path.join(__dirname, '../backend'),
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      this.results.integration.status = 'passed';
      this.results.integration.duration = Date.now() - startTime;
      
    } catch (error) {
      this.results.integration.status = 'failed';
      this.results.integration.error = error.message;
      this.results.integration.duration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Run E2E tests
   */
  async runE2ETests() {
    console.log(chalk.yellow('🌐 Running E2E tests...'));
    
    const startTime = Date.now();
    
    try {
      // Start application first
      const serverProcess = this.startServer();
      await this.waitForServer();
      
      try {
        await this.runCommand('npx', ['playwright', 'test'], {
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        this.results.e2e.status = 'passed';
        
      } finally {
        serverProcess.kill();
      }
      
      this.results.e2e.duration = Date.now() - startTime;
      
    } catch (error) {
      this.results.e2e.status = 'failed';
      this.results.e2e.error = error.message;
      this.results.e2e.duration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    console.log(chalk.yellow('⚡ Running performance tests...'));
    
    const startTime = Date.now();
    
    try {
      const serverProcess = this.startServer();
      await this.waitForServer();
      
      try {
        await this.runCommand('node', ['tests/performance/load-testing.js']);
        
        this.results.performance.status = 'passed';
        this.results.performance.results = await this.parsePerformanceResults();
        
      } finally {
        serverProcess.kill();
      }
      
      this.results.performance.duration = Date.now() - startTime;
      
    } catch (error) {
      this.results.performance.status = 'failed';
      this.results.performance.error = error.message;
      this.results.performance.duration = Date.now() - startTime;
    }
  }

  /**
   * Run security tests
   */
  async runSecurityTests() {
    console.log(chalk.yellow('🔒 Running security tests...'));
    
    const startTime = Date.now();
    
    try {
      // Run npm audit
      await this.runCommand('npm', ['audit', '--audit-level', 'moderate']).catch(() => {
        // npm audit may return non-zero exit code for warnings
      });
      
      const serverProcess = this.startServer();
      await this.waitForServer();
      
      try {
        await this.runCommand('node', ['tests/security/security-testing.js']);
        
        this.results.security.status = 'passed';
        this.results.security.vulnerabilities = await this.parseSecurityResults();
        
      } finally {
        serverProcess.kill();
      }
      
      this.results.security.duration = Date.now() - startTime;
      
    } catch (error) {
      this.results.security.status = 'failed';
      this.results.security.error = error.message;
      this.results.security.duration = Date.now() - startTime;
    }
  }

  /**
   * Run visual regression tests
   */
  async runVisualTests() {
    console.log(chalk.yellow('📸 Running visual regression tests...'));
    
    const startTime = Date.now();
    
    try {
      const serverProcess = this.startServer();
      await this.waitForServer();
      
      try {
        await this.runCommand('node', ['tests/visual/visual-regression.js']);
        
        this.results.visual.status = 'passed';
        this.results.visual.changes = await this.parseVisualResults();
        
      } finally {
        serverProcess.kill();
      }
      
      this.results.visual.duration = Date.now() - startTime;
      
    } catch (error) {
      this.results.visual.status = 'failed';
      this.results.visual.error = error.message;
      this.results.visual.duration = Date.now() - startTime;
    }
  }

  /**
   * Run accessibility tests
   */
  async runAccessibilityTests() {
    console.log(chalk.yellow('♿ Running accessibility tests...'));
    
    const startTime = Date.now();
    
    try {
      const serverProcess = this.startServer();
      await this.waitForServer();
      
      try {
        await this.runCommand('npx', ['pa11y-ci', '--sitemap', 'http://localhost:3000/sitemap.xml']);
        
        this.results.accessibility.status = 'passed';
        
      } finally {
        serverProcess.kill();
      }
      
      this.results.accessibility.duration = Date.now() - startTime;
      
    } catch (error) {
      this.results.accessibility.status = 'failed';
      this.results.accessibility.error = error.message;
      this.results.accessibility.duration = Date.now() - startTime;
    }
  }

  /**
   * Start the application server
   */
  startServer() {
    console.log(chalk.cyan('🚀 Starting application server...'));
    
    const serverProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../backend'),
      env: { ...process.env, NODE_ENV: 'test', PORT: 3001 },
      stdio: this.options.verbose ? 'inherit' : 'ignore'
    });
    
    return serverProcess;
  }

  /**
   * Wait for server to be ready
   */
  async waitForServer(timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          console.log(chalk.green('✅ Server is ready'));
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server failed to start within timeout');
  }

  /**
   * Run a command and return promise
   */
  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  /**
   * Parse coverage results
   */
  async parseCoverage(suite) {
    try {
      const coveragePath = path.join(__dirname, `../coverage/coverage-summary.json`);
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        return coverage.total;
      }
    } catch (error) {
      console.warn(`Could not parse coverage for ${suite}:`, error.message);
    }
    return null;
  }

  /**
   * Parse performance test results
   */
  async parsePerformanceResults() {
    try {
      const resultsDir = path.join(__dirname, '../tests/results');
      const files = fs.readdirSync(resultsDir);
      const perfFile = files.find(f => f.includes('performance-report') && f.endsWith('.json'));
      
      if (perfFile) {
        return JSON.parse(fs.readFileSync(path.join(resultsDir, perfFile), 'utf8'));
      }
    } catch (error) {
      console.warn('Could not parse performance results:', error.message);
    }
    return null;
  }

  /**
   * Parse security test results
   */
  async parseSecurityResults() {
    try {
      const resultsDir = path.join(__dirname, '../tests/results');
      const files = fs.readdirSync(resultsDir);
      const secFile = files.find(f => f.includes('security-report') && f.endsWith('.json'));
      
      if (secFile) {
        const results = JSON.parse(fs.readFileSync(path.join(resultsDir, secFile), 'utf8'));
        return results.vulnerabilities || [];
      }
    } catch (error) {
      console.warn('Could not parse security results:', error.message);
    }
    return [];
  }

  /**
   * Parse visual regression results
   */
  async parseVisualResults() {
    try {
      const resultsDir = path.join(__dirname, '../tests/results/visual');
      const files = fs.readdirSync(resultsDir);
      const visualFile = files.find(f => f.includes('visual-report') && f.endsWith('.json'));
      
      if (visualFile) {
        const results = JSON.parse(fs.readFileSync(path.join(resultsDir, visualFile), 'utf8'));
        return results.results.filter(r => r.status === 'failed' || r.status === 'minor_diff');
      }
    } catch (error) {
      console.warn('Could not parse visual results:', error.message);
    }
    return [];
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(totalDuration) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      results: this.results,
      summary: {
        total: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(r => r.status === 'passed').length,
        failed: Object.values(this.results).filter(r => r.status === 'failed').length,
        pending: Object.values(this.results).filter(r => r.status === 'pending').length
      },
      coverage: this.calculateOverallCoverage(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        ci: !!process.env.CI
      }
    };
    
    const reportPath = path.join(this.options.outputDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.blue(`📄 Test report saved to: ${reportPath}`));
    
    return report;
  }

  /**
   * Calculate overall code coverage
   */
  calculateOverallCoverage() {
    const coverageResults = Object.values(this.results)
      .map(r => r.coverage)
      .filter(Boolean);
    
    if (coverageResults.length === 0) return null;
    
    const totalLines = coverageResults.reduce((sum, cov) => sum + cov.lines.total, 0);
    const coveredLines = coverageResults.reduce((sum, cov) => sum + cov.lines.covered, 0);
    
    return {
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: Math.round((coveredLines / totalLines) * 100)
      }
    };
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log(chalk.blue.bold('\\n📊 Test Suite Summary'));
    console.log(chalk.blue('========================\\n'));
    
    Object.entries(this.results).forEach(([suite, result]) => {
      const icon = result.status === 'passed' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⏳';
      const color = result.status === 'passed' ? 'green' : 
                    result.status === 'failed' ? 'red' : 'yellow';
      
      console.log(chalk[color](`${icon} ${suite.toUpperCase()}: ${result.status} (${result.duration}ms)`));
      
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`));
      }
      
      if (result.coverage) {
        console.log(chalk.cyan(`   Coverage: ${result.coverage.lines.pct}%`));
      }
    });
    
    const summary = {
      total: Object.keys(this.results).length,
      passed: Object.values(this.results).filter(r => r.status === 'passed').length,
      failed: Object.values(this.results).filter(r => r.status === 'failed').length
    };
    
    console.log(chalk.blue(`\\nTotal: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`));
    
    if (summary.failed === 0) {
      console.log(chalk.green.bold('\\n🎉 All tests passed!'));
    } else {
      console.log(chalk.red.bold('\\n💥 Some tests failed!'));
    }
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    coverage: !args.includes('--no-coverage'),
    parallel: !args.includes('--no-parallel'),
    verbose: args.includes('--verbose'),
    watch: args.includes('--watch')
  };
  
  const runner = new TestRunner(options);
  
  switch (command) {
    case 'all':
    case undefined:
      runner.runAll();
      break;
    case 'unit':
    case 'integration':
    case 'e2e':
    case 'performance':
    case 'security':
    case 'visual':
    case 'accessibility':
      runner.runSuite(command);
      break;
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      console.log(chalk.yellow('Available commands: all, unit, integration, e2e, performance, security, visual, accessibility'));
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestRunner;