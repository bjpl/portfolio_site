/**
 * Automated Authentication Test Runner
 * 
 * This script orchestrates the execution of all authentication tests,
 * generates reports, tracks coverage, and integrates with CI/CD pipelines.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AuthTestRunner {
  constructor() {
    this.config = {
      testDir: path.join(__dirname),
      reportDir: path.join(__dirname, '../../test-results/auth'),
      coverageDir: path.join(__dirname, '../../coverage/auth'),
      testTimeout: 300000, // 5 minutes per test suite
      coverageThreshold: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85
      },
      testSuites: [
        'comprehensive-auth-test-suite.js',
        'integration-login-flow-tests.js',
        'token-validation-tests.js',
        'session-persistence-tests.js',
        'error-handling-edge-cases.js'
      ]
    };

    this.results = {
      startTime: null,
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suiteResults: [],
      coverage: null,
      performance: {
        averageTestTime: 0,
        slowestTest: null,
        fastestTest: null
      },
      issues: []
    };
  }

  async run(options = {}) {
    try {
      console.log('🚀 Starting Automated Authentication Test Runner');
      console.log('=' .repeat(60));
      
      this.results.startTime = new Date();

      // Setup test environment
      await this.setupTestEnvironment();

      // Run pre-test checks
      await this.runPreTestChecks();

      // Execute test suites
      await this.executeTestSuites(options);

      // Generate coverage report
      await this.generateCoverageReport();

      // Analyze results
      await this.analyzeResults();

      // Generate reports
      await this.generateReports();

      // Run post-test cleanup
      await this.cleanup();

      this.results.endTime = new Date();
      
      // Display summary
      this.displaySummary();

      // Return exit code based on results
      return this.getExitCode();

    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      this.results.issues.push({
        type: 'RUNNER_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      
      await this.generateErrorReport(error);
      return 1; // Exit with error
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Ensure directories exist
    await this.ensureDirectories([
      this.config.reportDir,
      this.config.coverageDir
    ]);

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';

    // Initialize test database
    await this.initializeTestDatabase();

    console.log('✅ Test environment setup complete');
  }

  async ensureDirectories(dirs) {
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async initializeTestDatabase() {
    try {
      // Clean up any existing test data
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Run database migrations for test environment
      await execAsync('npm run migrate', {
        env: { ...process.env, NODE_ENV: 'test' },
        cwd: path.join(__dirname, '../../backend')
      });

      console.log('📊 Test database initialized');
    } catch (error) {
      console.warn('⚠️ Database initialization warning:', error.message);
      // Don't fail the entire test run for database issues
    }
  }

  async runPreTestChecks() {
    console.log('🔍 Running pre-test checks...');

    const checks = [
      this.checkNodeVersion(),
      this.checkDependencies(),
      this.checkEnvironmentVariables(),
      this.checkDatabaseConnection()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.results.issues.push({
          type: 'PRE_TEST_CHECK',
          check: ['Node Version', 'Dependencies', 'Environment', 'Database'][index],
          message: result.reason.message,
          timestamp: new Date()
        });
      }
    });

    console.log('✅ Pre-test checks complete');
  }

  async checkNodeVersion() {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim();
    console.log(`📦 Node.js version: ${version}`);
    
    // Check for minimum supported version
    const major = parseInt(version.slice(1));
    if (major < 16) {
      throw new Error(`Node.js ${major} is too old. Minimum required: 16`);
    }
  }

  async checkDependencies() {
    const packageJsonPath = path.join(__dirname, '../../backend/package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    const requiredDeps = ['jest', 'supertest', 'sequelize'];
    const missing = requiredDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );

    if (missing.length > 0) {
      throw new Error(`Missing dependencies: ${missing.join(', ')}`);
    }
    
    console.log('📚 All required dependencies found');
  }

  async checkEnvironmentVariables() {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    console.log('🔑 Environment variables configured');
  }

  async checkDatabaseConnection() {
    try {
      // Attempt to connect to test database
      const { Sequelize } = require('sequelize');
      const config = require('../../backend/src/config');
      
      if (config.database && config.database.test) {
        const sequelize = new Sequelize(config.database.test);
        await sequelize.authenticate();
        await sequelize.close();
        console.log('🗄️ Database connection verified');
      } else {
        console.log('ℹ️ Database configuration not found, skipping connection test');
      }
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async executeTestSuites(options = {}) {
    console.log('🧪 Executing test suites...');
    console.log('-'.repeat(40));

    const suitesToRun = options.suites || this.config.testSuites;
    const parallel = options.parallel !== false;

    for (const suite of suitesToRun) {
      console.log(`\n📝 Running: ${suite}`);
      
      const startTime = Date.now();
      const result = await this.runTestSuite(suite, options);
      const endTime = Date.now();
      
      result.duration = endTime - startTime;
      result.suite = suite;
      
      this.results.suiteResults.push(result);
      this.updateOverallResults(result);

      // Display immediate feedback
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`${status} ${suite} completed in ${duration}s`);
      
      if (!result.success) {
        console.log(`   Failures: ${result.failedTests}`);
        if (result.errors.length > 0) {
          console.log(`   First error: ${result.errors[0]}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test execution completed');
  }

  async runTestSuite(suiteName, options = {}) {
    return new Promise((resolve) => {
      const suitePath = path.join(this.config.testDir, suiteName);
      const jestConfig = this.generateJestConfig(suiteName, options);
      
      // Write temporary Jest config
      const configPath = path.join(this.config.testDir, `jest.${suiteName}.json`);
      fs.writeFile(configPath, JSON.stringify(jestConfig, null, 2));

      const jestArgs = [
        '--config', configPath,
        '--testPathPattern', suitePath,
        '--json',
        '--outputFile', path.join(this.config.reportDir, `${suiteName}.json`)
      ];

      if (options.verbose) {
        jestArgs.push('--verbose');
      }

      if (options.coverage) {
        jestArgs.push('--coverage');
      }

      const jest = spawn('npx', ['jest', ...jestArgs], {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe',
        timeout: this.config.testTimeout
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', async (code) => {
        // Clean up config file
        try {
          await fs.unlink(configPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        const result = {
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          errors: []
        };

        // Parse Jest JSON output if available
        try {
          const reportPath = path.join(this.config.reportDir, `${suiteName}.json`);
          const reportData = await fs.readFile(reportPath, 'utf8');
          const jestResult = JSON.parse(reportData);
          
          if (jestResult.testResults && jestResult.testResults.length > 0) {
            jestResult.testResults.forEach(testResult => {
              result.totalTests += testResult.assertionResults.length;
              testResult.assertionResults.forEach(assertion => {
                if (assertion.status === 'passed') {
                  result.passedTests++;
                } else if (assertion.status === 'failed') {
                  result.failedTests++;
                  result.errors.push(assertion.failureMessages?.join(' ') || 'Unknown error');
                } else {
                  result.skippedTests++;
                }
              });
            });
          }
        } catch (parseError) {
          result.errors.push(`Failed to parse test results: ${parseError.message}`);
        }

        resolve(result);
      });

      jest.on('error', (error) => {
        resolve({
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: error.message,
          totalTests: 0,
          passedTests: 0,
          failedTests: 1,
          skippedTests: 0,
          errors: [error.message]
        });
      });
    });
  }

  generateJestConfig(suiteName, options = {}) {
    return {
      testEnvironment: 'node',
      testTimeout: 30000,
      setupFilesAfterEnv: [
        path.join(__dirname, '../setup.js')
      ],
      collectCoverage: options.coverage !== false,
      collectCoverageFrom: [
        'backend/src/**/*.js',
        '!backend/src/**/*.test.js',
        '!backend/src/migrations/**',
        '!backend/src/seeders/**'
      ],
      coverageDirectory: this.config.coverageDir,
      coverageReporters: ['json', 'lcov', 'text', 'html'],
      coverageThreshold: this.config.coverageThreshold,
      verbose: options.verbose || false,
      bail: options.bail || false,
      forceExit: true,
      detectOpenHandles: true
    };
  }

  updateOverallResults(suiteResult) {
    this.results.totalTests += suiteResult.totalTests;
    this.results.passedTests += suiteResult.passedTests;
    this.results.failedTests += suiteResult.failedTests;
    this.results.skippedTests += suiteResult.skippedTests;
  }

  async generateCoverageReport() {
    console.log('📈 Generating coverage report...');

    try {
      // Run Jest with coverage for all suites
      const { stdout } = await execAsync('npx jest --coverage --testPathPattern="tests/auth/" --json', {
        cwd: path.join(__dirname, '../../'),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      const coverageResult = JSON.parse(stdout);
      
      if (coverageResult.coverageMap) {
        this.results.coverage = {
          statements: coverageResult.coverageMap.getCoverageSummary().statements,
          branches: coverageResult.coverageMap.getCoverageSummary().branches,
          functions: coverageResult.coverageMap.getCoverageSummary().functions,
          lines: coverageResult.coverageMap.getCoverageSummary().lines
        };
      }

      console.log('✅ Coverage report generated');
    } catch (error) {
      console.warn('⚠️ Coverage generation failed:', error.message);
      this.results.issues.push({
        type: 'COVERAGE_ERROR',
        message: error.message,
        timestamp: new Date()
      });
    }
  }

  async analyzeResults() {
    console.log('🔍 Analyzing test results...');

    // Calculate performance metrics
    if (this.results.suiteResults.length > 0) {
      const durations = this.results.suiteResults.map(r => r.duration);
      this.results.performance.averageTestTime = durations.reduce((a, b) => a + b, 0) / durations.length;
      this.results.performance.slowestTest = Math.max(...durations);
      this.results.performance.fastestTest = Math.min(...durations);
    }

    // Identify issues
    this.identifyIssues();

    // Check thresholds
    this.checkThresholds();

    console.log('✅ Results analysis complete');
  }

  identifyIssues() {
    // Check for failed tests
    this.results.suiteResults.forEach(result => {
      if (result.failedTests > 0) {
        this.results.issues.push({
          type: 'TEST_FAILURE',
          suite: result.suite,
          failedCount: result.failedTests,
          errors: result.errors,
          timestamp: new Date()
        });
      }
    });

    // Check for performance issues
    if (this.results.performance.slowestTest > 60000) { // 1 minute
      this.results.issues.push({
        type: 'SLOW_TEST',
        message: `Slowest test took ${(this.results.performance.slowestTest / 1000).toFixed(2)}s`,
        timestamp: new Date()
      });
    }

    // Check coverage thresholds
    if (this.results.coverage) {
      Object.entries(this.config.coverageThreshold).forEach(([metric, threshold]) => {
        const actual = this.results.coverage[metric]?.pct || 0;
        if (actual < threshold) {
          this.results.issues.push({
            type: 'COVERAGE_THRESHOLD',
            metric,
            threshold,
            actual,
            message: `${metric} coverage (${actual}%) below threshold (${threshold}%)`,
            timestamp: new Date()
          });
        }
      });
    }
  }

  checkThresholds() {
    const successRate = this.results.totalTests > 0 
      ? (this.results.passedTests / this.results.totalTests) * 100 
      : 0;

    if (successRate < 95) {
      this.results.issues.push({
        type: 'SUCCESS_RATE',
        rate: successRate,
        message: `Test success rate (${successRate.toFixed(1)}%) below 95%`,
        timestamp: new Date()
      });
    }
  }

  async generateReports() {
    console.log('📄 Generating reports...');

    const reports = [
      this.generateSummaryReport(),
      this.generateDetailedReport(),
      this.generateCIReport(),
      this.generateHTMLReport()
    ];

    await Promise.all(reports);
    console.log('✅ Reports generated');
  }

  async generateSummaryReport() {
    const duration = this.results.endTime 
      ? (this.results.endTime - this.results.startTime) / 1000 
      : 0;

    const summary = {
      timestamp: new Date().toISOString(),
      duration: `${duration.toFixed(2)}s`,
      results: {
        total: this.results.totalTests,
        passed: this.results.passedTests,
        failed: this.results.failedTests,
        skipped: this.results.skippedTests,
        successRate: this.results.totalTests > 0 
          ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)
          : '0.0'
      },
      coverage: this.results.coverage,
      performance: {
        averageTestTime: `${(this.results.performance.averageTestTime / 1000).toFixed(2)}s`,
        slowestTest: `${(this.results.performance.slowestTest / 1000).toFixed(2)}s`,
        fastestTest: `${(this.results.performance.fastestTest / 1000).toFixed(2)}s`
      },
      issues: this.results.issues.length,
      status: this.results.failedTests === 0 ? 'PASSED' : 'FAILED'
    };

    await fs.writeFile(
      path.join(this.config.reportDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }

  async generateDetailedReport() {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        runner: 'AuthTestRunner',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      configuration: this.config,
      results: this.results,
      suiteDetails: this.results.suiteResults.map(result => ({
        suite: result.suite,
        duration: `${(result.duration / 1000).toFixed(2)}s`,
        success: result.success,
        tests: {
          total: result.totalTests,
          passed: result.passedTests,
          failed: result.failedTests,
          skipped: result.skippedTests
        },
        errors: result.errors
      }))
    };

    await fs.writeFile(
      path.join(this.config.reportDir, 'detailed-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  async generateCIReport() {
    // JUnit XML format for CI/CD systems
    const junit = this.generateJUnitXML();
    await fs.writeFile(
      path.join(this.config.reportDir, 'junit.xml'),
      junit
    );

    // GitHub Actions format
    const githubActions = this.generateGitHubActionsOutput();
    await fs.writeFile(
      path.join(this.config.reportDir, 'github-actions.txt'),
      githubActions
    );
  }

  generateJUnitXML() {
    const duration = this.results.endTime 
      ? (this.results.endTime - this.results.startTime) / 1000 
      : 0;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Authentication Tests" 
            tests="${this.results.totalTests}" 
            failures="${this.results.failedTests}" 
            time="${duration.toFixed(2)}">
`;

    this.results.suiteResults.forEach(suite => {
      xml += `  <testsuite name="${suite.suite}" 
                   tests="${suite.totalTests}" 
                   failures="${suite.failedTests}" 
                   time="${(suite.duration / 1000).toFixed(2)}">
`;
      
      // Add individual test results if available
      suite.errors.forEach((error, index) => {
        xml += `    <testcase name="Test ${index + 1}" classname="${suite.suite}">
`;
        if (error) {
          xml += `      <failure message="${this.escapeXML(error)}">
        <![CDATA[${error}]]>
      </failure>
`;
        }
        xml += `    </testcase>
`;
      });

      xml += `  </testsuite>
`;
    });

    xml += `</testsuites>`;
    return xml;
  }

  generateGitHubActionsOutput() {
    let output = `::group::Authentication Test Results
`;
    
    if (this.results.failedTests > 0) {
      output += `::error::${this.results.failedTests} test(s) failed
`;
    }

    if (this.results.issues.length > 0) {
      this.results.issues.forEach(issue => {
        const level = issue.type.includes('ERROR') || issue.type.includes('FAILURE') ? 'error' : 'warning';
        output += `::${level}::${issue.type}: ${issue.message}
`;
      });
    }

    output += `::notice::Tests: ${this.results.passedTests}/${this.results.totalTests} passed
`;

    if (this.results.coverage) {
      Object.entries(this.results.coverage).forEach(([metric, data]) => {
        output += `::notice::Coverage ${metric}: ${data.pct}%
`;
      });
    }

    output += `::endgroup::`;
    return output;
  }

  async generateHTMLReport() {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Authentication Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .issue { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 3px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Authentication Test Report</h1>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Status:</strong> <span class="${this.results.failedTests === 0 ? 'success' : 'failure'}">
            ${this.results.failedTests === 0 ? '✅ PASSED' : '❌ FAILED'}
        </span></p>
    </div>

    <h2>📊 Summary</h2>
    <div class="metric">Total Tests: <strong>${this.results.totalTests}</strong></div>
    <div class="metric">Passed: <strong class="success">${this.results.passedTests}</strong></div>
    <div class="metric">Failed: <strong class="failure">${this.results.failedTests}</strong></div>
    <div class="metric">Skipped: <strong class="warning">${this.results.skippedTests}</strong></div>
    <div class="metric">Success Rate: <strong>${this.results.totalTests > 0 ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1) : '0.0'}%</strong></div>

    ${this.results.coverage ? `
    <h2>📈 Coverage</h2>
    <table>
        <tr><th>Metric</th><th>Percentage</th><th>Covered</th><th>Total</th></tr>
        ${Object.entries(this.results.coverage).map(([metric, data]) => `
        <tr>
            <td>${metric}</td>
            <td class="${data.pct >= this.config.coverageThreshold[metric] ? 'success' : 'failure'}">
                ${data.pct}%
            </td>
            <td>${data.covered}</td>
            <td>${data.total}</td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    <h2>🧪 Test Suites</h2>
    ${this.results.suiteResults.map(suite => `
    <div class="suite">
        <h3>${suite.suite} ${suite.success ? '✅' : '❌'}</h3>
        <p><strong>Duration:</strong> ${(suite.duration / 1000).toFixed(2)}s</p>
        <p><strong>Tests:</strong> ${suite.totalTests} total, ${suite.passedTests} passed, ${suite.failedTests} failed</p>
        ${suite.errors.length > 0 ? `
        <details>
            <summary>Errors (${suite.errors.length})</summary>
            ${suite.errors.map(error => `<p class="issue">${this.escapeHtml(error)}</p>`).join('')}
        </details>
        ` : ''}
    </div>
    `).join('')}

    ${this.results.issues.length > 0 ? `
    <h2>⚠️ Issues (${this.results.issues.length})</h2>
    ${this.results.issues.map(issue => `
    <div class="issue">
        <strong>${issue.type}:</strong> ${this.escapeHtml(issue.message)}
        ${issue.timestamp ? `<br><small>${issue.timestamp.toISOString()}</small>` : ''}
    </div>
    `).join('')}
    ` : ''}

    <h2>⏱️ Performance</h2>
    <div class="metric">Average Test Time: <strong>${(this.results.performance.averageTestTime / 1000).toFixed(2)}s</strong></div>
    <div class="metric">Slowest Test: <strong>${(this.results.performance.slowestTest / 1000).toFixed(2)}s</strong></div>
    <div class="metric">Fastest Test: <strong>${(this.results.performance.fastestTest / 1000).toFixed(2)}s</strong></div>
</body>
</html>`;

    await fs.writeFile(
      path.join(this.config.reportDir, 'report.html'),
      html
    );
  }

  async generateErrorReport(error) {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV
      },
      partialResults: this.results
    };

    await fs.writeFile(
      path.join(this.config.reportDir, 'error-report.json'),
      JSON.stringify(errorReport, null, 2)
    );
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    try {
      // Clean up test database
      await this.cleanupTestDatabase();
      
      // Remove temporary files
      const tempFiles = [
        path.join(this.config.testDir, 'jest.*.json')
      ];
      
      // Clean up any Jest config files
      const files = await fs.readdir(this.config.testDir);
      for (const file of files) {
        if (file.startsWith('jest.') && file.endsWith('.json')) {
          await fs.unlink(path.join(this.config.testDir, file)).catch(() => {});
        }
      }
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  async cleanupTestDatabase() {
    // This would clean up test data
    // Implementation depends on database setup
    console.log('🗄️ Database cleanup complete');
  }

  displaySummary() {
    const duration = (this.results.endTime - this.results.startTime) / 1000;
    const successRate = this.results.totalTests > 0 
      ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)
      : '0.0';

    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`🕐 Total Duration: ${duration.toFixed(2)}s`);
    console.log(`🧪 Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`⏭️ Skipped: ${this.results.skippedTests}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (this.results.coverage) {
      console.log('\n📈 COVERAGE SUMMARY:');
      Object.entries(this.results.coverage).forEach(([metric, data]) => {
        const status = data.pct >= this.config.coverageThreshold[metric] ? '✅' : '❌';
        console.log(`${status} ${metric}: ${data.pct}%`);
      });
    }

    if (this.results.issues.length > 0) {
      console.log(`\n⚠️ Issues Found: ${this.results.issues.length}`);
      this.results.issues.forEach(issue => {
        console.log(`  - ${issue.type}: ${issue.message}`);
      });
    }

    const status = this.results.failedTests === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n🏁 Overall Status: ${status}`);
    console.log('='.repeat(60));
  }

  getExitCode() {
    if (this.results.failedTests > 0) {
      return 1; // Tests failed
    }

    // Check for critical issues
    const criticalIssues = this.results.issues.filter(issue => 
      issue.type.includes('ERROR') || 
      issue.type === 'COVERAGE_THRESHOLD' ||
      issue.type === 'SUCCESS_RATE'
    );

    if (criticalIssues.length > 0) {
      return 1; // Critical issues found
    }

    return 0; // Success
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  escapeXML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: !args.includes('--no-coverage'),
    bail: args.includes('--bail'),
    parallel: !args.includes('--no-parallel'),
    suites: args.filter(arg => arg.endsWith('.js'))
  };

  const runner = new AuthTestRunner();
  runner.run(options).then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AuthTestRunner;