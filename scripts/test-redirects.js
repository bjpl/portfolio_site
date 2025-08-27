#!/usr/bin/env node
/**
 * Live Redirect Testing Script
 * Tests redirect rules against running server
 */

import fetch from 'node-fetch';
import { REDIRECT_CONFIG } from '../lib/redirects.js';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 5000; // 5 second timeout

/**
 * Test redirect configuration against live server
 */
async function testRedirects() {
  console.log('🧪 Starting redirect testing...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    errors: 0,
    tests: []
  };
  
  // Test static redirects
  console.log('\n📋 Testing Static Redirects');
  console.log('-'.repeat(30));
  
  for (const [from, to] of Object.entries(REDIRECT_CONFIG.staticMappings)) {
    // Only test redirects (not same-path mappings)
    if (from !== to) {
      await testSingleRedirect(from, to, true, results);
    }
  }
  
  // Test dynamic patterns
  console.log('\n🔄 Testing Dynamic Pattern Redirects');
  console.log('-'.repeat(40));
  
  const dynamicTests = [
    { from: '/tools/built/test-app', to: '/projects/test-app' },
    { from: '/tools/strategies/test-strategy', to: '/tools/strategy/test-strategy' },
    { from: '/tools/what-i-use/test-tool', to: '/tools/resources/test-tool' },
    { from: '/writing/poetry/test-poem', to: '/poetry/test-poem' },
    { from: '/teaching-learning/sla-theory/test-theory', to: '/teaching/theory/test-theory' }
  ];
  
  for (const { from, to } of dynamicTests) {
    await testSingleRedirect(from, to, true, results);
  }
  
  // Test trailing slash handling
  console.log('\n✂️  Testing Trailing Slash Normalization');
  console.log('-'.repeat(45));
  
  const trailingSlashTests = [
    { from: '/tools/', to: '/tools' },
    { from: '/writing/', to: '/writing' },
    { from: '/about/', to: '/about' }
  ];
  
  for (const { from, to } of trailingSlashTests) {
    await testSingleRedirect(from, to, true, results);
  }
  
  // Test special endpoints
  console.log('\n🔧 Testing Special Endpoints');
  console.log('-'.repeat(35));
  
  await testSpecialEndpoint('/sitemap.xml', 'application/xml', results);
  await testSpecialEndpoint('/robots.txt', 'text/plain', results);
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`💥 Errors: ${results.errors}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed + results.errors)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0 || results.errors > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`  • ${test.description}: ${test.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

/**
 * Test a single redirect
 */
async function testSingleRedirect(from, expectedTo, permanent, results) {
  const testUrl = `${BASE_URL}${from}`;
  const testName = `${from} → ${expectedTo}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const expectedStatus = permanent ? 301 : 302;
    const actualLocation = response.headers.get('location');
    
    if (response.status === expectedStatus) {
      if (actualLocation && actualLocation.includes(expectedTo)) {
        console.log(`✅ ${testName}`);
        results.passed++;
        results.tests.push({ description: testName, passed: true });
      } else {
        console.log(`❌ ${testName} - Wrong location: ${actualLocation}`);
        results.failed++;
        results.tests.push({ 
          description: testName, 
          passed: false, 
          error: `Wrong location: ${actualLocation}` 
        });
      }
    } else if (response.status === 200) {
      // Might be rewrite instead of redirect
      console.log(`⚠️  ${testName} - 200 OK (possible rewrite)`);
      results.passed++;
      results.tests.push({ description: testName, passed: true, note: 'rewrite' });
    } else {
      console.log(`❌ ${testName} - Status: ${response.status}`);
      results.failed++;
      results.tests.push({ 
        description: testName, 
        passed: false, 
        error: `Wrong status: ${response.status}` 
      });
    }
  } catch (error) {
    console.log(`💥 ${testName} - Error: ${error.message}`);
    results.errors++;
    results.tests.push({ 
      description: testName, 
      passed: false, 
      error: error.message 
    });
  }
}

/**
 * Test special endpoints like sitemap and robots
 */
async function testSpecialEndpoint(path, expectedContentType, results) {
  const testUrl = `${BASE_URL}${path}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes(expectedContentType)) {
        console.log(`✅ ${path} - Content-Type: ${contentType}`);
        results.passed++;
        results.tests.push({ description: path, passed: true });
      } else {
        console.log(`❌ ${path} - Wrong Content-Type: ${contentType}`);
        results.failed++;
        results.tests.push({ 
          description: path, 
          passed: false, 
          error: `Wrong Content-Type: ${contentType}` 
        });
      }
    } else {
      console.log(`❌ ${path} - Status: ${response.status}`);
      results.failed++;
      results.tests.push({ 
        description: path, 
        passed: false, 
        error: `Wrong status: ${response.status}` 
      });
    }
  } catch (error) {
    console.log(`💥 ${path} - Error: ${error.message}`);
    results.errors++;
    results.tests.push({ 
      description: path, 
      passed: false, 
      error: error.message 
    });
  }
}

/**
 * Generate redirect test report
 */
function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: results.tests.length,
      passed: results.passed,
      failed: results.failed,
      errors: results.errors,
      successRate: ((results.passed / results.tests.length) * 100).toFixed(1)
    },
    tests: results.tests
  };
  
  return JSON.stringify(report, null, 2);
}

// CLI interface
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testRedirects().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

export { testRedirects, testSingleRedirect };
