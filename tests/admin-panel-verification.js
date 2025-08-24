#!/usr/bin/env node

/**
 * Comprehensive Admin Panel Verification Script
 * Tests authentication flow, database connectivity, and deployment readiness
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🔍 Starting Admin Panel Verification...\n');

// Test configuration
const CONFIG = {
  LOCAL_PORT: 1313,
  ADMIN_CREDENTIALS: {
    username: 'admin',
    email: 'admin@portfolio.com',
    password: 'password123'
  },
  SUPABASE_URL: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
  NETLIFY_URL: 'https://vocal-pony-24e3de.netlify.app'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function logResult(test, status, message, details = '') {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️' };
  const icon = icons[status] || '🔍';
  
  console.log(`${icon} ${test}: ${message}`);
  if (details) console.log(`   ${details}`);
  
  results[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'warnings']++;
  results.details.push({
    test,
    status,
    message,
    details
  });
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: File Structure Validation
async function testFileStructure() {
  console.log('\n📁 Testing File Structure...');
  
  const requiredFiles = [
    'netlify/functions/auth-login.js',
    'public/admin/login.html',
    'public/admin/dashboard.html',
    'public/admin/js/auth-manager.js',
    'netlify/functions/utils/supabase-config.js',
    'supabase/config.toml',
    '.env',
    'netlify.toml'
  ];
  
  for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      logResult(`File exists: ${file}`, 'pass', 'Found');
    } else {
      logResult(`File exists: ${file}`, 'fail', 'Missing required file');
    }
  }
}

// Test 2: Environment Configuration
async function testEnvironmentConfig() {
  console.log('\n🔧 Testing Environment Configuration...');
  
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
      logResult('Environment file', 'fail', '.env file not found');
      return;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check for required environment variables
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY'
    ];
    
    for (const varName of requiredVars) {
      const regex = new RegExp(`${varName}=(.+)`);
      const match = envContent.match(regex);
      if (match && match[1] && match[1].trim() && !match[1].includes('your-') && !match[1].includes('{{')) {
        logResult(`Environment var: ${varName}`, 'pass', 'Configured');
      } else {
        logResult(`Environment var: ${varName}`, 'fail', 'Missing or empty');
      }
    }
    
    // Check Supabase URL format
    const urlMatch = envContent.match(/SUPABASE_URL=([^\n]+)/);
    if (urlMatch && urlMatch[1].includes('tdmzayzkqyegvfgxlolj.supabase.co')) {
      logResult('Supabase URL', 'pass', 'Correct instance URL');
    } else {
      logResult('Supabase URL', 'warn', 'URL may not match expected instance');
    }
    
  } catch (error) {
    logResult('Environment config', 'fail', `Error reading .env: ${error.message}`);
  }
}

// Test 3: Netlify Function Syntax
async function testNetlifyFunctions() {
  console.log('\n⚡ Testing Netlify Functions...');
  
  try {
    // Test auth-login function
    const authLoginPath = path.join(__dirname, '..', 'netlify', 'functions', 'auth-login.js');
    if (fs.existsSync(authLoginPath)) {
      const authLogin = require(authLoginPath);
      
      if (typeof authLogin.handler === 'function') {
        logResult('Auth login function', 'pass', 'Function exported correctly');
        
        // Test function execution
        try {
          const mockEvent = {
            httpMethod: 'POST',
            body: JSON.stringify({
              emailOrUsername: CONFIG.ADMIN_CREDENTIALS.username,
              password: CONFIG.ADMIN_CREDENTIALS.password
            })
          };
          
          const result = await authLogin.handler(mockEvent, {});
          
          if (result.statusCode === 200) {
            const response = JSON.parse(result.body);
            if (response.success && response.token) {
              logResult('Auth login test', 'pass', 'Function executes successfully');
            } else {
              logResult('Auth login test', 'fail', 'Function returns invalid response');
            }
          } else {
            logResult('Auth login test', 'fail', `Function returns status ${result.statusCode}`);
          }
          
        } catch (execError) {
          logResult('Auth login execution', 'fail', `Execution error: ${execError.message}`);
        }
      } else {
        logResult('Auth login function', 'fail', 'Handler not exported or not a function');
      }
    } else {
      logResult('Auth login function', 'fail', 'File not found');
    }
    
  } catch (error) {
    logResult('Netlify functions', 'fail', `Error testing functions: ${error.message}`);
  }
}

// Test 4: Supabase Connectivity
async function testSupabaseConnectivity() {
  console.log('\n🔌 Testing Supabase Connectivity...');
  
  try {
    // Test Supabase REST API endpoint
    const healthUrl = `${CONFIG.SUPABASE_URL}/rest/v1/`;
    
    const response = await makeRequest(healthUrl, {
      method: 'GET',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.statusCode === 200 || response.statusCode === 404) {
      logResult('Supabase connectivity', 'pass', 'Can reach Supabase API');
    } else {
      logResult('Supabase connectivity', 'warn', `Unexpected status: ${response.statusCode}`);
    }
    
    // Test auth endpoint specifically
    const authUrl = `${CONFIG.SUPABASE_URL}/auth/v1/settings`;
    const authResponse = await makeRequest(authUrl, {
      method: 'GET',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY
      }
    });
    
    if (authResponse.statusCode === 200) {
      logResult('Supabase auth endpoint', 'pass', 'Auth service reachable');
    } else {
      logResult('Supabase auth endpoint', 'warn', `Auth endpoint status: ${authResponse.statusCode}`);
    }
    
  } catch (error) {
    logResult('Supabase connectivity', 'fail', `Connection error: ${error.message}`);
  }
}

// Test 5: Frontend Authentication Components
async function testFrontendAuth() {
  console.log('\n🖥️  Testing Frontend Authentication...');
  
  try {
    // Check login.html structure
    const loginPath = path.join(__dirname, '..', 'public', 'admin', 'login.html');
    if (fs.existsSync(loginPath)) {
      const loginContent = fs.readFileSync(loginPath, 'utf8');
      
      // Check for required elements
      const requiredElements = [
        'id="loginForm"',
        'id="username"',
        'id="password"',
        'handleLogin',
        'SUPABASE_CONFIG'
      ];
      
      for (const element of requiredElements) {
        if (loginContent.includes(element)) {
          logResult(`Login form element: ${element}`, 'pass', 'Found');
        } else {
          logResult(`Login form element: ${element}`, 'fail', 'Missing');
        }
      }
      
      // Check for security considerations
      if (loginContent.includes('preventDefault()')) {
        logResult('Form security', 'pass', 'Form submission properly handled');
      } else {
        logResult('Form security', 'warn', 'Form handling may not be secure');
      }
      
    } else {
      logResult('Login page', 'fail', 'login.html not found');
    }
    
    // Check dashboard.html
    const dashboardPath = path.join(__dirname, '..', 'public', 'admin', 'dashboard.html');
    if (fs.existsSync(dashboardPath)) {
      logResult('Dashboard page', 'pass', 'dashboard.html found');
    } else {
      logResult('Dashboard page', 'fail', 'dashboard.html not found');
    }
    
  } catch (error) {
    logResult('Frontend auth', 'fail', `Error testing frontend: ${error.message}`);
  }
}

// Test 6: Netlify Configuration
async function testNetlifyConfig() {
  console.log('\n🌐 Testing Netlify Configuration...');
  
  try {
    const netlifyConfigPath = path.join(__dirname, '..', 'netlify.toml');
    if (fs.existsSync(netlifyConfigPath)) {
      const configContent = fs.readFileSync(netlifyConfigPath, 'utf8');
      
      // Check for required redirects
      const requiredRedirects = [
        '/api/auth/login',
        '/api/auth/logout',
        '/.netlify/functions/auth-login'
      ];
      
      for (const redirect of requiredRedirects) {
        if (configContent.includes(redirect)) {
          logResult(`Netlify redirect: ${redirect}`, 'pass', 'Configured');
        } else {
          logResult(`Netlify redirect: ${redirect}`, 'warn', 'Not found');
        }
      }
      
      // Check function directory
      if (configContent.includes('directory = "netlify/functions"')) {
        logResult('Function directory', 'pass', 'Correctly configured');
      } else {
        logResult('Function directory', 'warn', 'May not be configured correctly');
      }
      
    } else {
      logResult('Netlify config', 'fail', 'netlify.toml not found');
    }
    
  } catch (error) {
    logResult('Netlify config', 'fail', `Error reading netlify.toml: ${error.message}`);
  }
}

// Test 7: Production Readiness
async function testProductionReadiness() {
  console.log('\n🚀 Testing Production Readiness...');
  
  try {
    // Test Netlify deployment
    const netlifyResponse = await makeRequest(CONFIG.NETLIFY_URL, {
      method: 'GET',
      timeout: 10000
    });
    
    if (netlifyResponse.statusCode === 200) {
      logResult('Netlify deployment', 'pass', 'Site is accessible');
    } else {
      logResult('Netlify deployment', 'warn', `Site returns status ${netlifyResponse.statusCode}`);
    }
    
    // Test admin login endpoint on Netlify
    try {
      const adminLoginUrl = `${CONFIG.NETLIFY_URL}/.netlify/functions/auth-login`;
      const loginResponse = await makeRequest(adminLoginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrUsername: CONFIG.ADMIN_CREDENTIALS.username,
          password: CONFIG.ADMIN_CREDENTIALS.password
        })
      });
      
      if (loginResponse.statusCode === 200) {
        const response = JSON.parse(loginResponse.body);
        if (response.success) {
          logResult('Production login', 'pass', 'Admin login works on production');
        } else {
          logResult('Production login', 'fail', 'Login failed on production');
        }
      } else {
        logResult('Production login', 'fail', `Login endpoint returns ${loginResponse.statusCode}`);
      }
      
    } catch (loginError) {
      logResult('Production login', 'warn', `Cannot test login: ${loginError.message}`);
    }
    
  } catch (error) {
    logResult('Production readiness', 'fail', `Production test error: ${error.message}`);
  }
}

// Test 8: Security Validation
async function testSecurity() {
  console.log('\n🔒 Testing Security Configuration...');
  
  try {
    // Check for hardcoded secrets
    const sensitiveFiles = [
      'netlify/functions/auth-login.js',
      'public/admin/login.html',
      'public/js/config/supabase-config.js'
    ];
    
    for (const file of sensitiveFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for common security issues
        if (content.includes('password123') && file.includes('auth-login.js')) {
          logResult(`Security - ${file}`, 'warn', 'Demo password found (acceptable for demo)');
        } else if (content.includes('TODO') || content.includes('FIXME')) {
          logResult(`Security - ${file}`, 'warn', 'Contains TODO/FIXME comments');
        } else {
          logResult(`Security - ${file}`, 'pass', 'No obvious security issues');
        }
      }
    }
    
    // Check CORS configuration
    const netlifyConfigPath = path.join(__dirname, '..', 'netlify.toml');
    if (fs.existsSync(netlifyConfigPath)) {
      const configContent = fs.readFileSync(netlifyConfigPath, 'utf8');
      
      if (configContent.includes('X-Frame-Options')) {
        logResult('Security headers', 'pass', 'Security headers configured');
      } else {
        logResult('Security headers', 'warn', 'Security headers may not be configured');
      }
    }
    
  } catch (error) {
    logResult('Security validation', 'fail', `Security test error: ${error.message}`);
  }
}

// Main execution
async function runAllTests() {
  console.log('🧪 Portfolio Site Admin Panel Verification');
  console.log('==========================================\n');
  
  await testFileStructure();
  await testEnvironmentConfig();
  await testNetlifyFunctions();
  await testSupabaseConnectivity();
  await testFrontendAuth();
  await testNetlifyConfig();
  await testProductionReadiness();
  await testSecurity();
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`📋 Total Tests: ${results.passed + results.failed + results.warnings}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All critical tests passed! Admin panel should work when deployed.');
  } else {
    console.log('\n🔥 Some tests failed. Review the issues above before deployment.');
  }
  
  // Deployment checklist
  console.log('\n📝 DEPLOYMENT CHECKLIST:');
  console.log('========================');
  console.log('□ Environment variables are set in Netlify dashboard');
  console.log('□ Supabase database is properly configured');
  console.log('□ Admin credentials are updated for production');
  console.log('□ SSL certificate is configured');
  console.log('□ Custom domain is configured (if applicable)');
  console.log('□ Backup and monitoring are set up');
  
  // Save detailed results
  const reportPath = path.join(__dirname, 'admin-panel-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return results.failed === 0;
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, CONFIG };