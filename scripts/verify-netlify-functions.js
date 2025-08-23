#!/usr/bin/env node

/**
 * Netlify Functions Deployment Verification Script
 * Tests all deployed functions and API routes
 */

const https = require('https');
const http = require('http');
const process = require('process');

const BASE_URL = process.env.NETLIFY_SITE_URL || 'https://vocal-pony-24e3de.netlify.app';
const FUNCTIONS_BASE = '/.netlify/functions';
const API_BASE = '/api';

// Test cases configuration
const testCases = [
  // Direct function endpoints
  {
    name: 'Health Function (Direct)',
    method: 'GET',
    url: `${BASE_URL}${FUNCTIONS_BASE}/health`,
    expectedStatus: 200,
    expectedData: { status: 'healthy' }
  },
  {
    name: 'Contact Function (Direct)',
    method: 'POST',
    url: `${BASE_URL}${FUNCTIONS_BASE}/contact`,
    data: {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message from verification script'
    },
    expectedStatus: 200,
    expectedData: { success: true }
  },
  {
    name: 'Auth Function Login (Direct)',
    method: 'POST',
    url: `${BASE_URL}${FUNCTIONS_BASE}/auth`,
    data: {
      emailOrUsername: 'admin',
      password: 'password123'
    },
    expectedStatus: 200,
    expectedData: { success: true }
  },
  
  // API proxy routes
  {
    name: 'Health API Route',
    method: 'GET',
    url: `${BASE_URL}${API_BASE}/health`,
    expectedStatus: 200,
    expectedData: { status: 'healthy' }
  },
  {
    name: 'Contact API Route',
    method: 'POST',
    url: `${BASE_URL}${API_BASE}/contact`,
    data: {
      name: 'API Test User',
      email: 'api-test@example.com',
      message: 'Test message from API route'
    },
    expectedStatus: 200,
    expectedData: { success: true }
  },
  {
    name: 'Auth Login API Route',
    method: 'POST',
    url: `${BASE_URL}${API_BASE}/auth/login`,
    data: {
      emailOrUsername: 'admin',
      password: 'password123'
    },
    expectedStatus: 200,
    expectedData: { success: true }
  },
  {
    name: 'Auth Logout API Route',
    method: 'POST',
    url: `${BASE_URL}${API_BASE}/auth/logout`,
    data: {},
    expectedStatus: 200,
    expectedData: { success: true }
  }
];

/**
 * Make HTTP request and return promise
 */
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.url.startsWith('https:') ? https : http;
    
    const req = protocol.request(options.url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Netlify-Functions-Verifier/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: { rawData: data, parseError: e.message }
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

/**
 * Run a single test case
 */
async function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   ${testCase.method} ${testCase.url}`);
  
  try {
    const response = await makeRequest({
      url: testCase.url,
      method: testCase.method
    }, testCase.data);
    
    // Check status code
    const statusMatch = response.statusCode === testCase.expectedStatus;
    const statusIcon = statusMatch ? '✅' : '❌';
    console.log(`   Status: ${statusIcon} ${response.statusCode} (expected ${testCase.expectedStatus})`);
    
    // Check expected data fields
    let dataMatch = true;
    if (testCase.expectedData) {
      for (const [key, expectedValue] of Object.entries(testCase.expectedData)) {
        const actualValue = response.data[key];
        const fieldMatch = actualValue === expectedValue;
        const fieldIcon = fieldMatch ? '✅' : '❌';
        
        if (!fieldMatch) {
          dataMatch = false;
        }
        
        console.log(`   Data.${key}: ${fieldIcon} ${actualValue} (expected ${expectedValue})`);
      }
    }
    
    // Show response time and headers
    console.log(`   Response Size: ${JSON.stringify(response.data).length} bytes`);
    console.log(`   CORS: ${response.headers['access-control-allow-origin'] || 'Not Set'}`);
    
    const overallSuccess = statusMatch && dataMatch;
    console.log(`   Result: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      name: testCase.name,
      success: overallSuccess,
      statusCode: response.statusCode,
      data: response.data
    };
    
  } catch (error) {
    console.log(`   Error: ❌ ${error.message}`);
    console.log(`   Result: ❌ FAIL`);
    
    return {
      name: testCase.name,
      success: false,
      error: error.message
    };
  }
}

/**
 * Main verification function
 */
async function verifyDeployment() {
  console.log('🚀 Netlify Functions Deployment Verification');
  console.log('=' .repeat(50));
  console.log(`Target Site: ${BASE_URL}`);
  console.log(`Test Cases: ${testCases.length}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const passRate = ((passed / results.length) * 100).toFixed(1);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${passRate}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.name}: ${result.error || 'Status/Data mismatch'}`);
    });
  }
  
  // Environment check
  console.log('\n🔍 ENVIRONMENT CHECK');
  console.log('=' .repeat(50));
  console.log(`Site URL: ${BASE_URL}`);
  console.log(`Functions Directory: netlify/functions/`);
  console.log(`Available Functions: health.js, auth.js, contact.js, fallback.js`);
  
  const overallSuccess = failed === 0;
  console.log(`\n${overallSuccess ? '✅' : '❌'} Overall Status: ${overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  // Exit code
  process.exit(overallSuccess ? 0 : 1);
}

// Run verification
if (require.main === module) {
  verifyDeployment().catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyDeployment, runTest };