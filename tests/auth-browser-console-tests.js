/**
 * Browser Console Authentication Tests
 * 
 * Copy and paste these functions into your browser's developer console
 * to test authentication functionality directly.
 * 
 * Usage:
 * 1. Open Developer Tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire file
 * 4. Run individual test functions
 * 
 * Available functions:
 * - testHealthEndpoint()
 * - testValidLogin()
 * - testInvalidLogin()
 * - testProtectedEndpoint()
 * - runAllTests()
 * - monitorNetworkRequests()
 */

// Configuration
const AUTH_TEST_CONFIG = {
    backendUrl: 'http://localhost:3001',
    frontendUrl: 'http://localhost:1313',
    adminCredentials: {
        email: 'admin@brandondocumentation.com',
        password: 'admin123'
    },
    testCredentials: {
        email: 'test@example.com',
        password: 'testpassword'
    }
};

// Utility functions
function logTest(message, type = 'info', data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const styles = {
        info: 'color: #2196F3; font-weight: bold',
        success: 'color: #4CAF50; font-weight: bold',
        error: 'color: #F44336; font-weight: bold',
        warning: 'color: #FF9800; font-weight: bold'
    };
    
    console.log(`%c[${timestamp}] ${message}`, styles[type] || styles.info);
    
    if (data) {
        console.log(data);
    }
}

function createTestRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
}

// Test 1: Health Endpoint
async function testHealthEndpoint() {
    logTest('🔄 Testing /api/health endpoint...', 'info');
    
    try {
        const response = await createTestRequest(`${AUTH_TEST_CONFIG.backendUrl}/api/health`);
        const data = await response.json();
        
        if (response.ok) {
            logTest('✅ Health endpoint SUCCESS', 'success', data);
            
            // Check service statuses
            if (data.services) {
                Object.entries(data.services).forEach(([service, status]) => {
                    const serviceStatus = status.status || 'unknown';
                    logTest(`  📊 ${service}: ${serviceStatus}`, 
                           serviceStatus === 'healthy' ? 'success' : 'warning');
                });
            }
            
            return { success: true, data };
        } else {
            logTest('❌ Health endpoint FAILED', 'error', data);
            return { success: false, error: data };
        }
    } catch (error) {
        logTest('❌ Health endpoint ERROR', 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Test 2: Valid Login
async function testValidLogin() {
    logTest('🔄 Testing valid login credentials...', 'info');
    
    try {
        const response = await createTestRequest(`${AUTH_TEST_CONFIG.backendUrl}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify(AUTH_TEST_CONFIG.adminCredentials)
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
            logTest('✅ Valid login SUCCESS', 'success');
            logTest(`  🎫 Token received: ${data.token.substring(0, 20)}...`, 'success');
            logTest(`  👤 User data:`, 'success', data.user);
            
            // Store token for other tests
            window.AUTH_TEST_TOKEN = data.token;
            localStorage.setItem('test_auth_token', data.token);
            
            return { success: true, data };
        } else {
            logTest('❌ Valid login FAILED', 'error', data);
            return { success: false, error: data };
        }
    } catch (error) {
        logTest('❌ Valid login ERROR', 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Test 3: Invalid Login
async function testInvalidLogin() {
    logTest('🔄 Testing invalid login credentials...', 'info');
    
    const invalidCredentials = {
        email: 'invalid@test.com',
        password: 'wrongpassword'
    };
    
    try {
        const response = await createTestRequest(`${AUTH_TEST_CONFIG.backendUrl}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify(invalidCredentials)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            logTest('✅ Invalid login correctly REJECTED', 'success');
            logTest(`  📝 Status: ${response.status} - ${response.statusText}`, 'success');
            logTest(`  💬 Error message: ${data.message || 'No message'}`, 'success', data);
            return { success: true, data };
        } else {
            logTest('❌ SECURITY ISSUE: Invalid login was ACCEPTED!', 'error', data);
            return { success: false, error: 'Security vulnerability detected' };
        }
    } catch (error) {
        logTest('❌ Invalid login test ERROR', 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Test 4: Protected Endpoint Access
async function testProtectedEndpoint() {
    logTest('🔄 Testing protected endpoint access...', 'info');
    
    const token = window.AUTH_TEST_TOKEN || localStorage.getItem('test_auth_token');
    
    if (!token) {
        logTest('⚠️  No auth token available. Run testValidLogin() first.', 'warning');
        return { success: false, error: 'No token available' };
    }
    
    try {
        // Test with token
        const response = await createTestRequest(`${AUTH_TEST_CONFIG.backendUrl}/api/portfolios`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            logTest('✅ Protected endpoint access SUCCESS', 'success');
            logTest(`  📊 Data type: ${Array.isArray(data) ? 'Array' : typeof data}`, 'success');
            logTest(`  📈 Items: ${Array.isArray(data) ? data.length : 'N/A'}`, 'success');
            return { success: true, data };
        } else {
            const errorData = await response.json();
            logTest('❌ Protected endpoint access FAILED', 'error');
            logTest(`  📝 Status: ${response.status} - ${response.statusText}`, 'error');
            logTest(`  💬 Error:`, 'error', errorData);
            return { success: false, error: errorData };
        }
    } catch (error) {
        logTest('❌ Protected endpoint test ERROR', 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Test 5: Token Validation
async function testTokenValidation() {
    logTest('🔄 Testing token validation...', 'info');
    
    const tests = [
        { name: 'No Token', headers: {} },
        { name: 'Invalid Token', headers: { 'Authorization': 'Bearer invalid_token_here' } },
        { name: 'Malformed Token', headers: { 'Authorization': 'NotBearer token' } },
        { name: 'Empty Token', headers: { 'Authorization': 'Bearer ' } }
    ];
    
    for (const test of tests) {
        try {
            const response = await createTestRequest(`${AUTH_TEST_CONFIG.backendUrl}/api/portfolios`, {
                headers: {
                    'Accept': 'application/json',
                    ...test.headers
                }
            });
            
            const expectedStatus = [401, 403];
            if (expectedStatus.includes(response.status)) {
                logTest(`  ✅ ${test.name}: Correctly rejected (${response.status})`, 'success');
            } else {
                logTest(`  ⚠️  ${test.name}: Unexpected status ${response.status}`, 'warning');
            }
        } catch (error) {
            logTest(`  ❌ ${test.name}: Error - ${error.message}`, 'error');
        }
    }
}

// Test 6: CORS and Preflight Requests
async function testCORSHeaders() {
    logTest('🔄 Testing CORS headers...', 'info');
    
    try {
        // Test preflight request
        const response = await fetch(`${AUTH_TEST_CONFIG.backendUrl}/api/health`, {
            method: 'OPTIONS'
        });
        
        const corsHeaders = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
        };
        
        logTest('📋 CORS Headers:', 'info', corsHeaders);
        
        const hasBasicCors = corsHeaders['Access-Control-Allow-Origin'] !== null;
        
        if (hasBasicCors) {
            logTest('✅ CORS headers present', 'success');
        } else {
            logTest('⚠️  CORS headers missing or incomplete', 'warning');
        }
        
        return { success: true, corsHeaders };
    } catch (error) {
        logTest('❌ CORS test ERROR', 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Test 7: Rate Limiting
async function testRateLimiting() {
    logTest('🔄 Testing rate limiting...', 'info');
    
    const requests = [];
    const requestCount = 10;
    
    try {
        // Make multiple rapid requests
        for (let i = 0; i < requestCount; i++) {
            requests.push(
                createTestRequest(`${AUTH_TEST_CONFIG.backendUrl}/api/health`)
                    .then(response => ({
                        request: i + 1,
                        status: response.status,
                        rateLimitRemaining: response.headers.get('X-RateLimit-Remaining'),
                        rateLimitReset: response.headers.get('X-RateLimit-Reset')
                    }))
                    .catch(error => ({
                        request: i + 1,
                        error: error.message
                    }))
            );
        }
        
        const results = await Promise.all(requests);
        
        logTest('📊 Rate Limiting Results:', 'info');
        results.forEach(result => {
            if (result.error) {
                logTest(`  Request ${result.request}: ERROR - ${result.error}`, 'error');
            } else {
                const status = result.status === 429 ? 'warning' : 'info';
                logTest(`  Request ${result.request}: ${result.status} (Remaining: ${result.rateLimitRemaining || 'N/A'})`, status);
            }
        });
        
        const rateLimitedRequests = results.filter(r => r.status === 429);
        
        if (rateLimitedRequests.length > 0) {
            logTest('✅ Rate limiting is ACTIVE', 'success');
        } else {
            logTest('⚠️  Rate limiting not detected', 'warning');
        }
        
        return { success: true, results };
    } catch (error) {
        logTest('❌ Rate limiting test ERROR', 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Test 8: Security Headers
async function testSecurityHeaders() {
    logTest('🔄 Testing security headers...', 'info');
    
    try {
        const response = await createTestRequest(`${AUTH_TEST_CONFIG.backendUrl}/api/health`);
        
        const securityHeaders = {
            'X-Frame-Options': response.headers.get('X-Frame-Options'),
            'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
            'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
            'Strict-Transport-Security': response.headers.get('Strict-Transport-Security'),
            'Content-Security-Policy': response.headers.get('Content-Security-Policy'),
            'Referrer-Policy': response.headers.get('Referrer-Policy')
        };
        
        logTest('🛡️  Security Headers:', 'info', securityHeaders);
        
        const presentHeaders = Object.entries(securityHeaders)
            .filter(([key, value]) => value !== null);
        
        logTest(`📊 ${presentHeaders.length} of ${Object.keys(securityHeaders).length} security headers present`, 
               presentHeaders.length >= 3 ? 'success' : 'warning');
        
        return { success: true, securityHeaders };
    } catch (error) {
        logTest('❌ Security headers test ERROR', 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Network Request Monitor
function monitorNetworkRequests() {
    logTest('🔄 Starting network request monitoring...', 'info');
    logTest('💡 Open Network tab in DevTools to see real-time requests', 'info');
    
    // Override fetch to log requests
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        const [url, options = {}] = args;
        const method = options.method || 'GET';
        
        console.group(`🌐 ${method} ${url}`);
        console.log('Request URL:', url);
        console.log('Request Options:', options);
        
        return originalFetch.apply(this, args)
            .then(response => {
                console.log(`Response Status: ${response.status} ${response.statusText}`);
                console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
                console.groupEnd();
                return response;
            })
            .catch(error => {
                console.error('Request Error:', error);
                console.groupEnd();
                throw error;
            });
    };
    
    logTest('✅ Network monitoring enabled', 'success');
    logTest('📝 Run: stopNetworkMonitoring() to disable', 'info');
}

function stopNetworkMonitoring() {
    if (window.originalFetch) {
        window.fetch = window.originalFetch;
        delete window.originalFetch;
        logTest('✅ Network monitoring disabled', 'success');
    } else {
        logTest('⚠️  Network monitoring was not active', 'warning');
    }
}

// Run All Tests
async function runAllTests() {
    logTest('🚀 Starting comprehensive authentication test suite...', 'info');
    
    const tests = [
        { name: 'Health Endpoint', fn: testHealthEndpoint },
        { name: 'Valid Login', fn: testValidLogin },
        { name: 'Invalid Login', fn: testInvalidLogin },
        { name: 'Protected Endpoint', fn: testProtectedEndpoint },
        { name: 'Token Validation', fn: testTokenValidation },
        { name: 'CORS Headers', fn: testCORSHeaders },
        { name: 'Rate Limiting', fn: testRateLimiting },
        { name: 'Security Headers', fn: testSecurityHeaders }
    ];
    
    const results = {};
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        console.group(`🧪 Running: ${test.name}`);
        
        try {
            const result = await test.fn();
            results[test.name] = result;
            
            if (result.success) {
                passed++;
                logTest(`✅ ${test.name}: PASSED`, 'success');
            } else {
                failed++;
                logTest(`❌ ${test.name}: FAILED`, 'error');
            }
        } catch (error) {
            failed++;
            results[test.name] = { success: false, error: error.message };
            logTest(`❌ ${test.name}: EXCEPTION - ${error.message}`, 'error');
        }
        
        console.groupEnd();
    }
    
    // Summary
    console.group('📊 Test Results Summary');
    logTest(`✅ Passed: ${passed}`, 'success');
    logTest(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'success');
    
    const total = passed + failed;
    if (total > 0) {
        const successRate = Math.round((passed / total) * 100);
        logTest(`📈 Success Rate: ${successRate}%`, 
               successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error');
    }
    
    console.groupEnd();
    
    // Store results globally
    window.AUTH_TEST_RESULTS = {
        timestamp: new Date().toISOString(),
        passed,
        failed,
        successRate: passed / total * 100,
        details: results
    };
    
    logTest('💾 Results stored in: window.AUTH_TEST_RESULTS', 'info');
    
    return window.AUTH_TEST_RESULTS;
}

// Export test results
function exportTestResults() {
    if (!window.AUTH_TEST_RESULTS) {
        logTest('⚠️  No test results available. Run runAllTests() first.', 'warning');
        return;
    }
    
    const results = {
        ...window.AUTH_TEST_RESULTS,
        browserInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack
        },
        location: {
            href: window.location.href,
            origin: window.location.origin,
            protocol: window.location.protocol
        }
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-console-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logTest('💾 Test results exported successfully!', 'success');
}

// Initialize
logTest('🔐 Authentication Test Suite Loaded', 'success');
logTest('📋 Available functions:', 'info');
console.table({
    'testHealthEndpoint()': 'Test /api/health endpoint',
    'testValidLogin()': 'Test login with valid credentials',
    'testInvalidLogin()': 'Test login with invalid credentials',
    'testProtectedEndpoint()': 'Test protected endpoint access',
    'testTokenValidation()': 'Test various token scenarios',
    'testCORSHeaders()': 'Test CORS configuration',
    'testRateLimiting()': 'Test rate limiting',
    'testSecurityHeaders()': 'Test security headers',
    'runAllTests()': 'Run complete test suite',
    'monitorNetworkRequests()': 'Enable network monitoring',
    'stopNetworkMonitoring()': 'Disable network monitoring',
    'exportTestResults()': 'Export test results as JSON'
});

logTest('🚀 Quick start: runAllTests()', 'info');