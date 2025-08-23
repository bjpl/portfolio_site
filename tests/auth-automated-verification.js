#!/usr/bin/env node

/**
 * Automated Authentication Verification Test Suite
 * 
 * This script provides comprehensive automated testing for the authentication system.
 * It can be run from Node.js command line to verify all authentication flows.
 * 
 * Usage:
 *   node auth-automated-verification.js
 *   node auth-automated-verification.js --backend=http://localhost:3001
 *   node auth-automated-verification.js --verbose --export-results
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:1313',
    timeout: 10000,
    maxRetries: 3,
    adminCredentials: {
        email: 'admin@brandondocumentation.com',
        password: 'admin123'
    },
    testCredentials: {
        email: 'test@example.com',
        password: 'testpassword123'
    }
};

// Test results storage
let testResults = {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    tests: {},
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0
    }
};

// Logging utilities
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, level = 'info', testName = null) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = testName ? `[${testName}]` : '[AUTH-TEST]';
    
    const colorMap = {
        info: colors.blue,
        success: colors.green,
        error: colors.red,
        warning: colors.yellow,
        debug: colors.dim
    };
    
    const color = colorMap[level] || colors.reset;
    console.log(`${color}${timestamp} ${prefix} ${message}${colors.reset}`);
}

// HTTP request utility with timeout and retries
async function makeRequest(url, options = {}, retries = CONFIG.maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    const requestOptions = {
        ...options,
        signal: controller.signal,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    };
    
    try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (retries > 0 && (error.name === 'AbortError' || error.code === 'ECONNREFUSED')) {
            log(`Request failed, retrying... (${CONFIG.maxRetries - retries + 1}/${CONFIG.maxRetries})`, 'warning');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return makeRequest(url, options, retries - 1);
        }
        
        throw error;
    }
}

// Test execution framework
async function runTest(testName, testFunction) {
    log(`Starting test: ${testName}`, 'info', testName);
    testResults.summary.total++;
    
    const startTime = Date.now();
    
    try {
        const result = await testFunction();
        const duration = Date.now() - startTime;
        
        const testResult = {
            name: testName,
            status: result.status || 'passed',
            message: result.message || 'Test completed successfully',
            data: result.data || null,
            duration,
            timestamp: new Date().toISOString()
        };
        
        testResults.tests[testName] = testResult;
        
        switch (testResult.status) {
            case 'passed':
                testResults.summary.passed++;
                log(`✅ ${testName}: PASSED - ${testResult.message}`, 'success', testName);
                break;
            case 'warning':
                testResults.summary.warnings++;
                log(`⚠️  ${testName}: WARNING - ${testResult.message}`, 'warning', testName);
                break;
            case 'failed':
                testResults.summary.failed++;
                log(`❌ ${testName}: FAILED - ${testResult.message}`, 'error', testName);
                break;
            case 'skipped':
                testResults.summary.skipped++;
                log(`⏭️  ${testName}: SKIPPED - ${testResult.message}`, 'debug', testName);
                break;
        }
        
        if (result.data && process.argv.includes('--verbose')) {
            console.log(JSON.stringify(result.data, null, 2));
        }
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        testResults.tests[testName] = {
            name: testName,
            status: 'failed',
            message: error.message,
            error: error.stack,
            duration,
            timestamp: new Date().toISOString()
        };
        
        testResults.summary.failed++;
        log(`❌ ${testName}: ERROR - ${error.message}`, 'error', testName);
    }
}

// Test implementations
async function testServerConnection() {
    try {
        const response = await makeRequest(`${CONFIG.backendUrl}/api/health`);
        
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            status: data.status === 'healthy' ? 'passed' : 'warning',
            message: `Server is ${data.status || 'responding'}`,
            data: {
                serverStatus: data.status,
                uptime: data.uptime,
                version: data.version,
                services: data.services
            }
        };
        
    } catch (error) {
        throw new Error(`Cannot connect to backend server: ${error.message}`);
    }
}

async function testValidAuthentication() {
    try {
        const response = await makeRequest(`${CONFIG.backendUrl}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify(CONFIG.adminCredentials)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Authentication failed: ${data.message || response.statusText}`);
        }
        
        if (!data.token) {
            throw new Error('Authentication succeeded but no token was returned');
        }
        
        // Store token for subsequent tests
        CONFIG.authToken = data.token;
        
        return {
            status: 'passed',
            message: 'Valid credentials accepted and token received',
            data: {
                tokenReceived: true,
                tokenLength: data.token.length,
                user: data.user,
                responseTime: response.headers.get('x-response-time')
            }
        };
        
    } catch (error) {
        throw new Error(`Valid authentication test failed: ${error.message}`);
    }
}

async function testInvalidAuthentication() {
    const invalidCredentials = [
        { email: 'invalid@test.com', password: 'wrongpassword' },
        { email: 'admin@brandondocumentation.com', password: 'wrongpassword' },
        { email: '', password: '' },
        { email: 'notanemail', password: 'test' }
    ];
    
    const results = [];
    
    for (const credentials of invalidCredentials) {
        try {
            const response = await makeRequest(`${CONFIG.backendUrl}/api/auth/login`, {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                results.push({
                    credentials: credentials.email,
                    status: 'SECURITY_ISSUE',
                    message: 'Invalid credentials were accepted',
                    data
                });
            } else {
                results.push({
                    credentials: credentials.email,
                    status: 'CORRECTLY_REJECTED',
                    statusCode: response.status,
                    message: data.message || 'No message provided'
                });
            }
            
        } catch (error) {
            results.push({
                credentials: credentials.email,
                status: 'ERROR',
                message: error.message
            });
        }
    }
    
    const securityIssues = results.filter(r => r.status === 'SECURITY_ISSUE');
    
    if (securityIssues.length > 0) {
        return {
            status: 'failed',
            message: `SECURITY VULNERABILITY: ${securityIssues.length} invalid credential(s) were accepted`,
            data: { results, securityIssues }
        };
    }
    
    return {
        status: 'passed',
        message: 'All invalid credentials correctly rejected',
        data: { results }
    };
}

async function testProtectedEndpointAccess() {
    if (!CONFIG.authToken) {
        return {
            status: 'skipped',
            message: 'No auth token available (depends on valid authentication test)'
        };
    }
    
    const protectedEndpoints = [
        '/api/portfolios',
        '/api/projects',
        '/api/workflow'
    ];
    
    const results = [];
    
    for (const endpoint of protectedEndpoints) {
        try {
            // Test without token
            const unauthorizedResponse = await makeRequest(`${CONFIG.backendUrl}${endpoint}`);
            
            // Test with token
            const authorizedResponse = await makeRequest(`${CONFIG.backendUrl}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.authToken}`
                }
            });
            
            results.push({
                endpoint,
                withoutToken: {
                    status: unauthorizedResponse.status,
                    correctlyBlocked: unauthorizedResponse.status === 401 || unauthorizedResponse.status === 403
                },
                withToken: {
                    status: authorizedResponse.status,
                    accessible: authorizedResponse.ok
                }
            });
            
        } catch (error) {
            results.push({
                endpoint,
                error: error.message
            });
        }
    }
    
    const issues = results.filter(r => 
        (r.withoutToken && !r.withoutToken.correctlyBlocked) ||
        (r.withToken && !r.withToken.accessible && r.withToken.status !== 404)
    );
    
    if (issues.length > 0) {
        return {
            status: 'warning',
            message: `${issues.length} endpoint(s) have access control issues`,
            data: { results, issues }
        };
    }
    
    return {
        status: 'passed',
        message: 'All protected endpoints properly secured',
        data: { results }
    };
}

async function testTokenValidation() {
    const tokenTests = [
        { name: 'Empty Token', token: '' },
        { name: 'Invalid Token', token: 'invalid_token_here' },
        { name: 'Malformed Bearer', token: 'NotBearer token' },
        { name: 'Expired Token', token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MzQ3NzU5MzgsImV4cCI6MTYzNDc3NTkzOCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.past_expiry_token' }
    ];
    
    const results = [];
    
    for (const test of tokenTests) {
        try {
            const response = await makeRequest(`${CONFIG.backendUrl}/api/portfolios`, {
                headers: {
                    'Authorization': `Bearer ${test.token}`
                }
            });
            
            const correctlyRejected = response.status === 401 || response.status === 403;
            
            results.push({
                name: test.name,
                status: response.status,
                correctlyRejected,
                issue: !correctlyRejected
            });
            
        } catch (error) {
            results.push({
                name: test.name,
                error: error.message
            });
        }
    }
    
    const issues = results.filter(r => r.issue);
    
    if (issues.length > 0) {
        return {
            status: 'failed',
            message: `${issues.length} invalid token(s) were accepted`,
            data: { results, issues }
        };
    }
    
    return {
        status: 'passed',
        message: 'All invalid tokens correctly rejected',
        data: { results }
    };
}

async function testSecurityHeaders() {
    try {
        const response = await makeRequest(`${CONFIG.backendUrl}/api/health`);
        
        const securityHeaders = {
            'X-Frame-Options': response.headers.get('x-frame-options'),
            'X-Content-Type-Options': response.headers.get('x-content-type-options'),
            'X-XSS-Protection': response.headers.get('x-xss-protection'),
            'Strict-Transport-Security': response.headers.get('strict-transport-security'),
            'Content-Security-Policy': response.headers.get('content-security-policy'),
            'Referrer-Policy': response.headers.get('referrer-policy')
        };
        
        const presentHeaders = Object.entries(securityHeaders)
            .filter(([key, value]) => value !== null);
        
        const criticalHeaders = ['X-Frame-Options', 'X-Content-Type-Options'];
        const criticalPresent = criticalHeaders.filter(header => securityHeaders[header] !== null);
        
        if (criticalPresent.length < criticalHeaders.length) {
            return {
                status: 'warning',
                message: `${presentHeaders.length}/${Object.keys(securityHeaders).length} security headers present, missing critical headers`,
                data: { securityHeaders, missing: criticalHeaders.filter(h => securityHeaders[h] === null) }
            };
        }
        
        return {
            status: presentHeaders.length >= 4 ? 'passed' : 'warning',
            message: `${presentHeaders.length}/${Object.keys(securityHeaders).length} security headers present`,
            data: { securityHeaders }
        };
        
    } catch (error) {
        throw new Error(`Security headers test failed: ${error.message}`);
    }
}

async function testRateLimiting() {
    try {
        const requests = [];
        const requestCount = 20;
        
        // Make rapid requests
        for (let i = 0; i < requestCount; i++) {
            requests.push(
                makeRequest(`${CONFIG.backendUrl}/api/health`)
                    .then(response => ({
                        request: i + 1,
                        status: response.status,
                        rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
                        rateLimitReset: response.headers.get('x-ratelimit-reset'),
                        rateLimited: response.status === 429
                    }))
                    .catch(error => ({
                        request: i + 1,
                        error: error.message
                    }))
            );
        }
        
        const results = await Promise.all(requests);
        const rateLimitedRequests = results.filter(r => r.rateLimited);
        const errors = results.filter(r => r.error);
        
        if (errors.length > requestCount / 2) {
            return {
                status: 'warning',
                message: `Too many request errors (${errors.length}/${requestCount})`,
                data: { results }
            };
        }
        
        if (rateLimitedRequests.length > 0) {
            return {
                status: 'passed',
                message: `Rate limiting active: ${rateLimitedRequests.length}/${requestCount} requests limited`,
                data: { results, rateLimitedCount: rateLimitedRequests.length }
            };
        }
        
        return {
            status: 'warning',
            message: 'Rate limiting not detected (may not be configured for test endpoint)',
            data: { results }
        };
        
    } catch (error) {
        throw new Error(`Rate limiting test failed: ${error.message}`);
    }
}

async function testCORSConfiguration() {
    try {
        // Test preflight request
        const response = await makeRequest(`${CONFIG.backendUrl}/api/health`, {
            method: 'OPTIONS'
        });
        
        const corsHeaders = {
            'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
            'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
            'Access-Control-Allow-Headers': response.headers.get('access-control-allow-headers'),
            'Access-Control-Allow-Credentials': response.headers.get('access-control-allow-credentials')
        };
        
        const hasBasicCORS = corsHeaders['Access-Control-Allow-Origin'] !== null;
        const allowsCredentials = corsHeaders['Access-Control-Allow-Credentials'] === 'true';
        const allowsMethods = corsHeaders['Access-Control-Allow-Methods'] !== null;
        
        if (!hasBasicCORS) {
            return {
                status: 'failed',
                message: 'CORS not configured - Cross-origin requests will fail',
                data: { corsHeaders }
            };
        }
        
        return {
            status: 'passed',
            message: `CORS properly configured (Origin: ${corsHeaders['Access-Control-Allow-Origin']})`,
            data: { 
                corsHeaders,
                analysis: {
                    hasBasicCORS,
                    allowsCredentials,
                    allowsMethods
                }
            }
        };
        
    } catch (error) {
        throw new Error(`CORS test failed: ${error.message}`);
    }
}

async function testSessionManagement() {
    if (!CONFIG.authToken) {
        return {
            status: 'skipped',
            message: 'No auth token available for session testing'
        };
    }
    
    try {
        // Test token usage over time
        const initialRequest = await makeRequest(`${CONFIG.backendUrl}/api/portfolios`, {
            headers: { 'Authorization': `Bearer ${CONFIG.authToken}` }
        });
        
        if (!initialRequest.ok) {
            throw new Error('Token immediately invalid');
        }
        
        // Wait a bit and test again
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const subsequentRequest = await makeRequest(`${CONFIG.backendUrl}/api/portfolios`, {
            headers: { 'Authorization': `Bearer ${CONFIG.authToken}` }
        });
        
        const sessionPersists = subsequentRequest.ok;
        
        return {
            status: sessionPersists ? 'passed' : 'warning',
            message: sessionPersists ? 'Session properly maintained' : 'Session may have expired quickly',
            data: {
                initialStatus: initialRequest.status,
                subsequentStatus: subsequentRequest.status,
                sessionPersists
            }
        };
        
    } catch (error) {
        throw new Error(`Session management test failed: ${error.message}`);
    }
}

// Main test execution
async function runAllTests() {
    log('🚀 Starting Automated Authentication Verification Suite', 'info');
    log(`Backend URL: ${CONFIG.backendUrl}`, 'debug');
    log(`Frontend URL: ${CONFIG.frontendUrl}`, 'debug');
    log(`Timeout: ${CONFIG.timeout}ms`, 'debug');
    
    const tests = [
        { name: 'SERVER_CONNECTION', fn: testServerConnection },
        { name: 'VALID_AUTHENTICATION', fn: testValidAuthentication },
        { name: 'INVALID_AUTHENTICATION', fn: testInvalidAuthentication },
        { name: 'PROTECTED_ENDPOINT_ACCESS', fn: testProtectedEndpointAccess },
        { name: 'TOKEN_VALIDATION', fn: testTokenValidation },
        { name: 'SECURITY_HEADERS', fn: testSecurityHeaders },
        { name: 'RATE_LIMITING', fn: testRateLimiting },
        { name: 'CORS_CONFIGURATION', fn: testCORSConfiguration },
        { name: 'SESSION_MANAGEMENT', fn: testSessionManagement }
    ];
    
    log(`Running ${tests.length} tests...`, 'info');
    
    for (const test of tests) {
        await runTest(test.name, test.fn);
    }
    
    // Generate summary
    const summary = testResults.summary;
    const total = summary.total;
    const successRate = total > 0 ? Math.round((summary.passed / total) * 100) : 0;
    
    log('\n📊 Test Results Summary:', 'info');
    log(`✅ Passed: ${summary.passed}`, 'success');
    log(`⚠️  Warnings: ${summary.warnings}`, 'warning');
    log(`❌ Failed: ${summary.failed}`, 'error');
    log(`⏭️  Skipped: ${summary.skipped}`, 'debug');
    log(`📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'success' : 'warning');
    
    // Export results if requested
    if (process.argv.includes('--export-results')) {
        await exportResults();
    }
    
    // Set exit code
    if (summary.failed > 0) {
        process.exit(1);
    } else if (summary.warnings > 0) {
        process.exit(2);
    } else {
        process.exit(0);
    }
}

// Export results to file
async function exportResults() {
    try {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `auth-verification-results-${timestamp}.json`;
        
        await fs.writeFile(filename, JSON.stringify(testResults, null, 2));
        log(`📄 Results exported to: ${filename}`, 'success');
        
        // Also create a summary report
        const summaryFilename = `auth-verification-summary-${timestamp}.md`;
        const summaryContent = generateMarkdownSummary();
        await fs.writeFile(summaryFilename, summaryContent);
        log(`📋 Summary report: ${summaryFilename}`, 'success');
        
    } catch (error) {
        log(`Failed to export results: ${error.message}`, 'error');
    }
}

function generateMarkdownSummary() {
    const summary = testResults.summary;
    const timestamp = new Date().toLocaleString();
    
    let markdown = `# Authentication Verification Report\n\n`;
    markdown += `**Generated:** ${timestamp}\n`;
    markdown += `**Backend URL:** ${CONFIG.backendUrl}\n`;
    markdown += `**Test Duration:** ${Math.round((Date.now() - new Date(testResults.timestamp).getTime()) / 1000)}s\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `| Status | Count | Percentage |\n`;
    markdown += `|--------|-------|------------|\n`;
    markdown += `| ✅ Passed | ${summary.passed} | ${Math.round(summary.passed / summary.total * 100)}% |\n`;
    markdown += `| ⚠️ Warnings | ${summary.warnings} | ${Math.round(summary.warnings / summary.total * 100)}% |\n`;
    markdown += `| ❌ Failed | ${summary.failed} | ${Math.round(summary.failed / summary.total * 100)}% |\n`;
    markdown += `| ⏭️ Skipped | ${summary.skipped} | ${Math.round(summary.skipped / summary.total * 100)}% |\n\n`;
    
    markdown += `## Test Details\n\n`;
    
    Object.values(testResults.tests).forEach(test => {
        const statusEmoji = {
            'passed': '✅',
            'warning': '⚠️',
            'failed': '❌',
            'skipped': '⏭️'
        }[test.status] || '❓';
        
        markdown += `### ${statusEmoji} ${test.name}\n\n`;
        markdown += `**Status:** ${test.status.toUpperCase()}\n`;
        markdown += `**Message:** ${test.message}\n`;
        markdown += `**Duration:** ${test.duration}ms\n`;
        
        if (test.error) {
            markdown += `**Error:** \`${test.error}\`\n`;
        }
        
        markdown += `\n`;
    });
    
    return markdown;
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    
    args.forEach(arg => {
        if (arg.startsWith('--backend=')) {
            CONFIG.backendUrl = arg.split('=')[1];
        } else if (arg.startsWith('--frontend=')) {
            CONFIG.frontendUrl = arg.split('=')[1];
        } else if (arg.startsWith('--timeout=')) {
            CONFIG.timeout = parseInt(arg.split('=')[1]);
        }
    });
}

// Handle uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`, 'error');
    process.exit(1);
});

// Main execution
if (require.main === module) {
    parseArgs();
    runAllTests().catch(error => {
        log(`Test suite failed: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testResults,
    CONFIG
};