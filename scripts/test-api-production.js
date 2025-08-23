#!/usr/bin/env node

/**
 * Production API Testing Script
 * Tests all API endpoints on vocal-pony-24e3de.netlify.app
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://vocal-pony-24e3de.netlify.app';

// Test configuration
const tests = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    expectedStatus: 200,
    description: 'Should return API health status'
  },
  {
    name: 'Environment Check',
    method: 'GET', 
    path: '/api/env-check',
    expectedStatus: 200,
    description: 'Should return environment configuration'
  },
  {
    name: 'Projects List',
    method: 'GET',
    path: '/api/content/projects',
    expectedStatus: 200,
    description: 'Should return list of projects'
  },
  {
    name: 'Skills List',
    method: 'GET',
    path: '/api/content/skills',
    expectedStatus: 200,
    description: 'Should return list of skills'
  },
  {
    name: 'Contact Form OPTIONS',
    method: 'OPTIONS',
    path: '/api/contact',
    expectedStatus: 200,
    description: 'Should handle CORS preflight'
  },
  {
    name: 'Auth Login OPTIONS',
    method: 'OPTIONS',
    path: '/api/auth/login',
    expectedStatus: 200,
    description: 'Should handle CORS preflight for auth'
  },
  {
    name: 'Fallback Handler',
    method: 'GET',
    path: '/api/nonexistent',
    expectedStatus: 404,
    description: 'Should return helpful error for missing endpoints'
  },
  {
    name: 'Contact Form Test',
    method: 'POST',
    path: '/api/contact',
    expectedStatus: 200,
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      message: 'API test message'
    }),
    headers: {
      'Content-Type': 'application/json'
    },
    description: 'Should accept contact form submission'
  },
  {
    name: 'Auth Login Test',
    method: 'POST',
    path: '/api/auth/login',
    expectedStatus: 200,
    body: JSON.stringify({
      emailOrUsername: 'admin',
      password: 'password123'
    }),
    headers: {
      'Content-Type': 'application/json'
    },
    description: 'Should authenticate admin user'
  }
];

// Helper function to make HTTP requests
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data
        });
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      request.write(options.body);
    }
    
    request.end();
  });
}

// Format test results
function formatResult(test, response, startTime) {
  const duration = Date.now() - startTime;
  const success = response.statusCode === test.expectedStatus;
  
  let bodyPreview = '';
  try {
    const parsed = JSON.parse(response.body);
    bodyPreview = JSON.stringify(parsed, null, 2).substring(0, 200);
    if (JSON.stringify(parsed, null, 2).length > 200) {
      bodyPreview += '...';
    }
  } catch {
    bodyPreview = response.body.substring(0, 200);
  }
  
  return {
    success,
    test: test.name,
    method: test.method,
    path: test.path,
    expected: test.expectedStatus,
    actual: response.statusCode,
    duration: `${duration}ms`,
    headers: response.headers,
    bodyPreview,
    description: test.description
  };
}

// Run all tests
async function runTests() {
  console.log(`🧪 Testing API endpoints on ${BASE_URL}\n`);
  console.log('=' * 60);
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 ${test.name} (${test.method} ${test.path})`);
      console.log(`   ${test.description}`);
      
      const options = {
        method: test.method,
        headers: {
          'User-Agent': 'API-Test-Script/1.0',
          ...test.headers
        }
      };
      
      if (test.body) {
        options.body = test.body;
      }
      
      const response = await makeRequest(BASE_URL + test.path, options);
      const result = formatResult(test, response, startTime);
      results.push(result);
      
      if (result.success) {
        console.log(`   ✅ PASS - ${result.actual} (${result.duration})`);
        passed++;
      } else {
        console.log(`   ❌ FAIL - Expected ${result.expected}, got ${result.actual} (${result.duration})`);
        failed++;
      }
      
      // Show response preview for failed tests or important endpoints
      if (!result.success || test.name === 'Health Check' || test.name === 'Environment Check') {
        console.log(`   Response: ${result.bodyPreview}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      results.push({
        success: false,
        test: test.name,
        error: error.message,
        duration: `${Date.now() - startTime}ms`
      });
      failed++;
    }
  }
  
  // Summary
  console.log('\n' + '=' * 60);
  console.log('📊 TEST SUMMARY');
  console.log('=' * 60);
  console.log(`Total tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS');
  console.log('=' * 60);
  
  results.forEach(result => {
    console.log(`\n${result.success ? '✅' : '❌'} ${result.test}`);
    console.log(`   Method: ${result.method} ${result.path}`);
    if (result.expected) {
      console.log(`   Status: ${result.actual} (expected ${result.expected})`);
    }
    console.log(`   Duration: ${result.duration}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // CORS Headers Check
  console.log('\n🔐 CORS HEADERS ANALYSIS');
  console.log('=' * 60);
  
  results.forEach(result => {
    if (result.headers && result.headers['access-control-allow-origin']) {
      console.log(`${result.test}: ${result.headers['access-control-allow-origin']}`);
    }
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('=' * 60);
  
  if (failed > 0) {
    console.log('- Some endpoints are failing. Check Netlify function deployment status.');
    console.log('- Ensure all functions are properly deployed and accessible.');
    console.log('- Verify _redirects and netlify.toml configuration.');
  }
  
  if (passed === tests.length) {
    console.log('- All tests passed! API is properly configured for production.');
    console.log('- Consider setting up monitoring for continued health checks.');
  }
  
  console.log('\n🚀 API Testing Complete!');
  process.exit(failed > 0 ? 1 : 0);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});