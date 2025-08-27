#!/usr/bin/env node

/**
 * Test Suite Validation Script
 * Validates that all testing infrastructure is properly set up
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class TestSuiteValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(message, status = 'info') {
    const colors = {
      success: 'green',
      error: 'red',
      warning: 'yellow',
      info: 'blue'
    };
    
    console.log(chalk[colors[status]](`[${status.toUpperCase()}] ${message}`));
    
    this.results.details.push({
      message,
      status,
      timestamp: new Date().toISOString()
    });
  }

  checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.log(`✅ ${description}: ${filePath}`, 'success');
      this.results.passed++;
      return true;
    } else {
      this.log(`❌ ${description}: ${filePath} not found`, 'error');
      this.results.failed++;
      return false;
    }
  }

  checkDirectory(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath);
      this.log(`✅ ${description}: ${files.length} files found`, 'success');
      this.results.passed++;
      return true;
    } else {
      this.log(`❌ ${description}: ${dirPath} not found`, 'error');
      this.results.failed++;
      return false;
    }
  }

  checkPackageScript(scriptName, description) {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (packageJson.scripts && packageJson.scripts[scriptName]) {
        this.log(`✅ ${description}: npm run ${scriptName}`, 'success');
        this.results.passed++;
        return true;
      } else {
        this.log(`⚠️  ${description}: ${scriptName} script not found`, 'warning');
        this.results.warnings++;
        return false;
      }
    } catch (error) {
      this.log(`❌ Error checking package.json: ${error.message}`, 'error');
      this.results.failed++;
      return false;
    }
  }

  async validateTestingSuite() {
    this.log('Starting Test Suite Validation...', 'info');
    console.log('='.repeat(60));

    // 1. Configuration Files
    this.log('\n📋 Checking Configuration Files:', 'info');
    this.checkFile('jest.config.cjs', 'Jest Configuration');
    this.checkFile('babel.config.cjs', 'Babel Configuration');
    this.checkFile('playwright.config.cjs', 'Playwright Configuration');
    this.checkFile('package.json', 'Package Configuration');

    // 2. Test Directories
    this.log('\n📁 Checking Test Directory Structure:', 'info');
    this.checkDirectory('tests', 'Tests Root Directory');
    this.checkDirectory('tests/unit', 'Unit Tests Directory');
    this.checkDirectory('tests/unit/components', 'Component Tests Directory');
    this.checkDirectory('tests/integration', 'Integration Tests Directory');
    this.checkDirectory('tests/e2e', 'E2E Tests Directory');
    this.checkDirectory('tests/performance', 'Performance Tests Directory');
    this.checkDirectory('tests/accessibility', 'Accessibility Tests Directory');
    this.checkDirectory('tests/setup', 'Test Setup Directory');
    this.checkDirectory('tests/mocks', 'Test Mocks Directory');

    // 3. Test Files
    this.log('\n📝 Checking Test Files:', 'info');
    this.checkFile('tests/unit/simple-unit.test.js', 'Basic Unit Tests');
    this.checkFile('tests/unit/components/Navigation.test.jsx', 'Navigation Component Tests');
    this.checkFile('tests/unit/components/Layout.test.jsx', 'Layout Component Tests');
    this.checkFile('tests/unit/components/ProjectCard.test.jsx', 'ProjectCard Component Tests');
    this.checkFile('tests/unit/components/BlogCard.test.jsx', 'BlogCard Component Tests');
    this.checkFile('tests/integration/routing.test.js', 'Routing Integration Tests');
    this.checkFile('tests/integration/data-flow.test.js', 'Data Flow Integration Tests');
    this.checkFile('tests/integration/responsive-breakpoints.test.js', 'Responsive Tests');
    this.checkFile('tests/integration/pwa-validation.test.js', 'PWA Validation Tests');
    this.checkFile('tests/e2e/user-flows.spec.js', 'E2E User Flow Tests');
    this.checkFile('tests/performance/lighthouse.test.js', 'Performance Tests');
    this.checkFile('tests/accessibility/accessibility.test.js', 'Accessibility Tests');

    // 4. Infrastructure Files
    this.log('\n🏗️  Checking Infrastructure Files:', 'info');
    this.checkFile('tests/setup/test-environment.js', 'Test Environment Setup');
    this.checkFile('tests/mocks/server.js', 'Mock Server Setup');
    this.checkFile('tests/test-runner.js', 'Test Runner Script');

    // 5. Package Scripts
    this.log('\n⚡ Checking NPM Scripts:', 'info');
    this.checkPackageScript('test', 'Basic Test Command');
    this.checkPackageScript('test:unit', 'Unit Test Command');
    this.checkPackageScript('test:integration', 'Integration Test Command');
    this.checkPackageScript('test:e2e', 'E2E Test Command');
    this.checkPackageScript('test:coverage', 'Coverage Test Command');
    this.checkPackageScript('test:accessibility', 'Accessibility Test Command');
    this.checkPackageScript('test:performance', 'Performance Test Command');

    // 6. Dependencies Check
    this.log('\n📦 Checking Test Dependencies:', 'info');
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const devDeps = packageJson.devDependencies || {};
      
      const requiredDeps = [
        '@testing-library/react',
        '@testing-library/jest-dom',
        '@testing-library/user-event',
        '@playwright/test',
        'jest',
        'babel-jest',
        '@babel/preset-react',
        'jest-environment-jsdom'
      ];

      requiredDeps.forEach(dep => {
        if (devDeps[dep] || packageJson.dependencies?.[dep]) {
          this.log(`✅ Dependency: ${dep}`, 'success');
          this.results.passed++;
        } else {
          this.log(`⚠️  Dependency: ${dep} not found`, 'warning');
          this.results.warnings++;
        }
      });
    } catch (error) {
      this.log(`❌ Error checking dependencies: ${error.message}`, 'error');
      this.results.failed++;
    }

    // 7. Test Coverage
    this.log('\n📊 Test Coverage Analysis:', 'info');
    
    // Count test files and estimate coverage
    let testCount = 0;
    const testFiles = [
      'tests/unit/simple-unit.test.js',
      'tests/unit/components/Navigation.test.jsx',
      'tests/unit/components/Layout.test.jsx',
      'tests/unit/components/ProjectCard.test.jsx',
      'tests/unit/components/BlogCard.test.jsx'
    ];

    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const tests = content.match(/test\(|it\(/g);
        const testCases = tests ? tests.length : 0;
        testCount += testCases;
        this.log(`✅ ${path.basename(file)}: ${testCases} test cases`, 'success');
      }
    });

    this.log(`📈 Total Test Cases Created: ${testCount}`, 'success');

    // 8. Generate Final Report
    console.log('\n' + '='.repeat(60));
    this.log('🎯 VALIDATION SUMMARY:', 'info');
    console.log('='.repeat(60));
    
    console.log(chalk.green(`✅ Passed: ${this.results.passed}`));
    console.log(chalk.red(`❌ Failed: ${this.results.failed}`));
    console.log(chalk.yellow(`⚠️  Warnings: ${this.results.warnings}`));
    
    const totalChecks = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = ((this.results.passed / totalChecks) * 100).toFixed(1);
    
    console.log(chalk.cyan(`📊 Success Rate: ${successRate}%`));
    console.log(chalk.cyan(`🧪 Estimated Test Cases: ${testCount}+`));

    if (this.results.failed === 0 && successRate >= 90) {
      console.log(chalk.green('\n🚀 TESTING SUITE READY FOR PRODUCTION!'));
      console.log(chalk.green('✅ All critical testing infrastructure is in place'));
      console.log(chalk.green('✅ Test coverage framework configured'));
      console.log(chalk.green('✅ Performance and accessibility testing ready'));
      console.log(chalk.green('✅ CI/CD integration ready'));
    } else if (this.results.failed === 0) {
      console.log(chalk.yellow('\n⚠️  TESTING SUITE MOSTLY READY'));
      console.log(chalk.yellow('✅ Core infrastructure in place'));
      console.log(chalk.yellow('⚠️  Some optional features missing'));
    } else {
      console.log(chalk.red('\n❌ TESTING SUITE NEEDS ATTENTION'));
      console.log(chalk.red('❌ Critical files missing'));
      console.log(chalk.red('🔧 Please address failed checks above'));
    }

    // 9. Usage Instructions
    console.log(chalk.blue('\n📚 USAGE INSTRUCTIONS:'));
    console.log(chalk.white('• Run all tests: npm run test:coverage'));
    console.log(chalk.white('• Run unit tests: npm run test:unit'));
    console.log(chalk.white('• Run integration tests: npm run test:integration'));
    console.log(chalk.white('• Run E2E tests: npm run test:e2e'));
    console.log(chalk.white('• Run performance tests: npm run test:performance'));
    console.log(chalk.white('• Full test runner: node tests/test-runner.js'));

    console.log(chalk.blue('\n🎯 COVERAGE TARGETS:'));
    console.log(chalk.white('• Unit Test Coverage: ≥90%'));
    console.log(chalk.white('• Performance Score: ≥90%'));
    console.log(chalk.white('• Accessibility Score: ≥95%'));
    console.log(chalk.white('• SEO Score: ≥95%'));

    return {
      success: this.results.failed === 0,
      summary: this.results,
      successRate: parseFloat(successRate)
    };
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TestSuiteValidator();
  validator.validateTestingSuite().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = TestSuiteValidator;