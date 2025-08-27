#!/usr/bin/env node

/**
 * Simple Test Suite Validation
 * Validates that all testing infrastructure is properly set up
 */

import fs from 'fs';
import path from 'path';

class TestValidator {
  constructor() {
    this.results = { passed: 0, failed: 0 };
  }

  check(condition, description) {
    if (condition) {
      console.log(`✅ ${description}`);
      this.results.passed++;
    } else {
      console.log(`❌ ${description}`);
      this.results.failed++;
    }
    return condition;
  }

  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  async validate() {
    console.log('🧪 Portfolio Site Test Suite Validation');
    console.log('=' .repeat(50));

    // Configuration Files
    console.log('\n📋 Configuration Files:');
    this.check(this.fileExists('jest.config.cjs'), 'Jest configuration exists');
    this.check(this.fileExists('babel.config.cjs'), 'Babel configuration exists');

    // Test Files
    console.log('\n📝 Test Files:');
    this.check(this.fileExists('tests/unit/simple-unit.test.js'), 'Unit tests created');
    this.check(this.fileExists('tests/unit/components/Navigation.test.jsx'), 'Navigation component tests');
    this.check(this.fileExists('tests/unit/components/Layout.test.jsx'), 'Layout component tests');
    this.check(this.fileExists('tests/unit/components/ProjectCard.test.jsx'), 'ProjectCard component tests');
    this.check(this.fileExists('tests/unit/components/BlogCard.test.jsx'), 'BlogCard component tests');

    // Integration Tests
    console.log('\n🔗 Integration Tests:');
    this.check(this.fileExists('tests/integration/routing.test.js'), 'URL routing tests');
    this.check(this.fileExists('tests/integration/data-flow.test.js'), 'Data flow tests');
    this.check(this.fileExists('tests/integration/responsive-breakpoints.test.js'), 'Responsive design tests');
    this.check(this.fileExists('tests/integration/pwa-validation.test.js'), 'PWA validation tests');

    // E2E and Performance Tests
    console.log('\n🚀 Advanced Tests:');
    this.check(this.fileExists('tests/e2e/user-flows.spec.js'), 'End-to-end user flow tests');
    this.check(this.fileExists('tests/performance/lighthouse.test.js'), 'Lighthouse performance tests');
    this.check(this.fileExists('tests/accessibility/accessibility.test.js'), 'Accessibility compliance tests');

    // Infrastructure
    console.log('\n🏗️ Test Infrastructure:');
    this.check(this.fileExists('tests/setup/test-environment.js'), 'Test environment setup');
    this.check(this.fileExists('tests/mocks/server.js'), 'Mock server configuration');
    this.check(this.fileExists('tests/test-runner.js'), 'Comprehensive test runner');

    // Package Scripts
    console.log('\n⚡ Package Scripts:');
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = pkg.scripts || {};
      
      this.check(scripts['test'], 'Basic test script');
      this.check(scripts['test:unit'], 'Unit test script');
      this.check(scripts['test:coverage'], 'Coverage test script');
    } catch (error) {
      this.check(false, 'Package.json readable');
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    const total = this.results.passed + this.results.failed;
    const successRate = ((this.results.passed / total) * 100).toFixed(1);
    
    console.log(`📊 RESULTS: ${this.results.passed}/${total} checks passed (${successRate}%)`);
    
    if (this.results.failed === 0) {
      console.log('🎉 SUCCESS: Test suite is complete and ready!');
      console.log('\n🚀 Next Steps:');
      console.log('   npm run test:unit     - Run unit tests');
      console.log('   npm run test:coverage - Run with coverage');
      console.log('   node tests/test-runner.js - Full test suite');
    } else {
      console.log('⚠️  Some test files are missing. Please check above.');
    }

    return this.results.failed === 0;
  }
}

// Run if called directly
const validator = new TestValidator();
validator.validate().then(success => {
  process.exit(success ? 0 : 1);
});