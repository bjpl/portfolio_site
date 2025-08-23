#!/usr/bin/env node

/**
 * Test script for Universal API Configuration
 * Tests endpoint resolution across different environments
 */

const https = require('https');
const http = require('http');

// Test configuration for different environments
const environments = {
  netlify: {
    hostname: 'vocal-pony-24e3de.netlify.app',
    protocol: 'https',
    port: 443
  },
  localhost: {
    hostname: 'localhost',
    protocol: 'http',
    port: 3000
  }
};

async function testEndpoint(env, endpoint) {
  const { hostname, protocol, port } = environments[env];
  const url = `${protocol}://${hostname}:${port}${endpoint}`;
  
  return new Promise((resolve) => {
    const client = protocol === 'https' ? https : http;
    const options = {
      hostname,
      port,
      path: endpoint,
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Universal-Config-Test/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 200),
          success: res.statusCode < 400
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      resolve({
        status: 0,
        error: 'Request timeout',
        success: false
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Universal API Configuration\n');

  const testCases = [
    // Netlify Functions
    { env: 'netlify', endpoint: '/.netlify/functions/env-check' },
    { env: 'netlify', endpoint: '/.netlify/functions/auth-login' },
    { env: 'netlify', endpoint: '/.netlify/functions/auth-me' },
    { env: 'netlify', endpoint: '/api/health' }, // Should redirect to function

    // Local backend (may not be running)
    { env: 'localhost', endpoint: '/api/health' },
    { env: 'localhost', endpoint: '/api/auth/login' }
  ];

  for (const testCase of testCases) {
    const { env, endpoint } = testCase;
    console.log(`Testing ${env}: ${endpoint}`);
    
    const result = await testEndpoint(env, endpoint);
    
    if (result.success) {
      console.log(`✅ ${result.status} - Success`);
    } else {
      console.log(`❌ ${result.status || 'ERR'} - ${result.error || 'Failed'}`);
    }
    
    if (result.body && result.status === 200) {
      try {
        const parsed = JSON.parse(result.body);
        if (parsed.status || parsed.message) {
          console.log(`   Response: ${parsed.status || parsed.message}`);
        }
      } catch (e) {
        // Not JSON, show first few chars
        console.log(`   Response: ${result.body.substring(0, 50)}...`);
      }
    }
    
    console.log('');
  }

  console.log('🏁 Test completed');
}

runTests().catch(console.error);