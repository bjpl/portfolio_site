#!/usr/bin/env node

/**
 * Admin Cache Busting Test Script
 * Validates that admin routes are properly configured to bypass caching
 */

const https = require('https');
const http = require('http');

class AdminCacheBustingTest {
    constructor() {
        this.baseUrl = 'https://vocal-pony-24e3de.netlify.app';
        this.testResults = [];
    }

    /**
     * Make HTTP request and check headers
     */
    async checkCacheHeaders(path, description) {
        return new Promise((resolve) => {
            const url = `${this.baseUrl}${path}`;
            const requestModule = url.startsWith('https') ? https : http;
            
            const req = requestModule.get(url, (res) => {
                const cacheControl = res.headers['cache-control'] || '';
                const pragma = res.headers['pragma'] || '';
                const expires = res.headers['expires'] || '';
                const etag = res.headers['etag'] || '';
                
                const hasNoCache = cacheControl.includes('no-cache') || 
                                 cacheControl.includes('no-store') ||
                                 cacheControl.includes('max-age=0');
                
                const hasPragmaNoCache = pragma.includes('no-cache');
                const hasExpiredExpires = expires === '0' || new Date(expires).getTime() < Date.now();
                
                const result = {
                    path,
                    description,
                    cacheControl,
                    pragma,
                    expires,
                    etag,
                    hasNoCache,
                    hasPragmaNoCache,
                    hasExpiredExpires,
                    passed: hasNoCache && hasPragmaNoCache
                };
                
                this.testResults.push(result);
                resolve(result);
            });
            
            req.on('error', (err) => {
                const result = {
                    path,
                    description,
                    error: err.message,
                    passed: false
                };
                this.testResults.push(result);
                resolve(result);
            });
        });
    }

    /**
     * Test admin route cache headers
     */
    async testAdminRoutes() {
        const routes = [
            { path: '/admin', description: 'Admin root' },
            { path: '/admin/', description: 'Admin root with trailing slash' },
            { path: '/admin-login.html', description: 'Admin login page' },
            { path: '/admin/dashboard.html', description: 'Admin dashboard' },
            { path: '/api/admin/test', description: 'Admin API endpoint' }
        ];

        console.log('🧪 Testing Admin Cache Busting Configuration...\n');
        
        for (const route of routes) {
            console.log(`Testing: ${route.description} (${route.path})`);
            await this.checkCacheHeaders(route.path, route.description);
        }
    }

    /**
     * Test cache busting parameters
     */
    async testCacheBustingParameters() {
        console.log('\n🔄 Testing Cache Busting Parameters...\n');
        
        const routes = [
            '/admin?v=test',
            '/admin-login.html?v=test&t=' + Date.now(),
            '/admin/dashboard.html?v=2025-08-24-v4'
        ];

        for (const route of routes) {
            console.log(`Testing cache busting: ${route}`);
            await this.checkCacheHeaders(route, `Cache busting parameter test`);
        }
    }

    /**
     * Generate test report
     */
    generateReport() {
        console.log('\n📊 Cache Busting Test Results:\n');
        console.log('=' .repeat(80));
        
        let passedTests = 0;
        let totalTests = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${index + 1}. ${result.description} - ${status}`);
            console.log(`   Path: ${result.path}`);
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            } else {
                console.log(`   Cache-Control: ${result.cacheControl}`);
                console.log(`   Pragma: ${result.pragma}`);
                console.log(`   Expires: ${result.expires}`);
                
                if (!result.hasNoCache) {
                    console.log(`   ⚠️  Missing no-cache directive`);
                }
                if (!result.hasPragmaNoCache) {
                    console.log(`   ⚠️  Missing Pragma: no-cache`);
                }
            }
            
            if (result.passed) passedTests++;
            console.log('');
        });
        
        console.log('=' .repeat(80));
        console.log(`Summary: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All cache busting tests passed!');
            console.log('✨ Admin pages should now load fresh content immediately.');
        } else {
            console.log('⚠️  Some cache busting tests failed.');
            console.log('🔧 Check your netlify.toml configuration and redeploy.');
        }
        
        return passedTests === totalTests;
    }

    /**
     * Run all tests
     */
    async runTests() {
        try {
            await this.testAdminRoutes();
            await this.testCacheBustingParameters();
            
            // Wait for all requests to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return this.generateReport();
        } catch (error) {
            console.error('Test execution failed:', error);
            return false;
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AdminCacheBustingTest();
    tester.runTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = AdminCacheBustingTest;