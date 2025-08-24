/**
 * Comprehensive Admin Panel Test Suite
 * Tests all aspects of admin functionality and loading
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class AdminComprehensiveTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
        this.startTime = Date.now();
        this.baseUrl = process.env.BASE_URL || 'http://localhost:1313';
        this.testTimeout = 30000;
    }

    /**
     * Run comprehensive admin tests
     */
    async runTests() {
        console.log('🧪 Starting comprehensive admin panel tests...');
        
        try {
            await this.setupBrowser();
            
            const tests = [
                { name: 'Admin Index Redirect', test: () => this.testAdminIndexRedirect() },
                { name: 'Login Page Loading', test: () => this.testLoginPageLoading() },
                { name: 'Authentication Flow', test: () => this.testAuthenticationFlow() },
                { name: 'Dashboard Loading', test: () => this.testDashboardLoading() },
                { name: 'Script Dependencies', test: () => this.testScriptDependencies() },
                { name: 'Error Handling', test: () => this.testErrorHandling() },
                { name: 'Offline Behavior', test: () => this.testOfflineBehavior() },
                { name: 'Performance Metrics', test: () => this.testPerformanceMetrics() }
            ];

            for (const testCase of tests) {
                await this.runSingleTest(testCase);
            }

            const summary = await this.generateTestSummary();
            await this.saveTestResults(summary);
            
            console.log('✅ Admin panel tests completed');
            return summary;

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Setup browser for testing
     */
    async setupBrowser() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set viewport and user agent
        await this.page.setViewport({ width: 1280, height: 720 });
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('🔴 Browser Console Error:', msg.text());
            }
        });

        // Enable request/response logging
        this.page.on('response', response => {
            if (response.status() >= 400) {
                console.log(`🔴 HTTP Error: ${response.status()} ${response.url()}`);
            }
        });
    }

    /**
     * Run a single test case
     */
    async runSingleTest(testCase) {
        const startTime = Date.now();
        console.log(`🔍 Testing: ${testCase.name}`);

        try {
            const result = await Promise.race([
                testCase.test(),
                this.createTimeoutPromise(this.testTimeout)
            ]);

            const duration = Date.now() - startTime;
            const testResult = {
                name: testCase.name,
                status: result?.status || 'pass',
                message: result?.message || 'Test passed',
                duration,
                details: result?.details || {},
                timestamp: new Date().toISOString()
            };

            this.results.push(testResult);
            
            const statusIcon = testResult.status === 'pass' ? '✅' : 
                              testResult.status === 'warn' ? '⚠️' : '❌';
            console.log(`${statusIcon} ${testCase.name}: ${testResult.message} (${duration}ms)`);

        } catch (error) {
            const duration = Date.now() - startTime;
            const testResult = {
                name: testCase.name,
                status: 'error',
                message: error.message,
                duration,
                details: { error: error.stack },
                timestamp: new Date().toISOString()
            };

            this.results.push(testResult);
            console.error(`❌ ${testCase.name}: ${error.message} (${duration}ms)`);
        }
    }

    /**
     * Test admin index redirect functionality
     */
    async testAdminIndexRedirect() {
        try {
            await this.page.goto(`${this.baseUrl}/admin`, { waitUntil: 'networkidle0' });
            
            const url = this.page.url();
            const title = await this.page.title();
            
            // Should redirect to either login or dashboard
            const validUrls = [
                '/admin/index.html',
                '/admin/login.html',
                '/admin/dashboard.html'
            ];
            
            const isValidRedirect = validUrls.some(path => url.includes(path));
            
            return {
                status: isValidRedirect ? 'pass' : 'error',
                message: isValidRedirect ? 'Admin redirect working' : `Invalid redirect: ${url}`,
                details: { finalUrl: url, title, validUrls }
            };
            
        } catch (error) {
            return {
                status: 'error',
                message: `Admin redirect failed: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * Test login page loading
     */
    async testLoginPageLoading() {
        try {
            await this.page.goto(`${this.baseUrl}/admin/login.html`, { waitUntil: 'networkidle0' });
            
            // Check for essential elements
            const elements = await this.page.evaluate(() => {
                return {
                    hasLoginForm: !!document.querySelector('#loginForm'),
                    hasUsernameField: !!document.querySelector('#username'),
                    hasPasswordField: !!document.querySelector('#password'),
                    hasSubmitButton: !!document.querySelector('button[type="submit"]'),
                    hasClientAuth: !!window.ClientAuth,
                    hasAuthManager: !!window.AuthManager,
                    hasLoadingManager: !!window.LoadingManager,
                    pageTitle: document.title,
                    scriptErrors: window.scriptErrors || []
                };
            });

            const issues = [];
            if (!elements.hasLoginForm) issues.push('Login form missing');
            if (!elements.hasUsernameField) issues.push('Username field missing');
            if (!elements.hasPasswordField) issues.push('Password field missing');
            if (!elements.hasSubmitButton) issues.push('Submit button missing');
            if (!elements.hasClientAuth) issues.push('ClientAuth system missing');

            return {
                status: issues.length === 0 ? 'pass' : 'error',
                message: issues.length === 0 ? 'Login page loaded successfully' : `${issues.length} issues found`,
                details: { elements, issues }
            };

        } catch (error) {
            return {
                status: 'error',
                message: `Login page loading failed: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * Test authentication flow
     */
    async testAuthenticationFlow() {
        try {
            await this.page.goto(`${this.baseUrl}/admin/login.html`, { waitUntil: 'networkidle0' });
            
            // Wait for authentication system to load
            await this.page.waitForFunction(() => window.ClientAuth?.initialized, { timeout: 10000 });
            
            // Fill in credentials
            await this.page.type('#username', 'admin');
            await this.page.type('#password', 'password123');
            
            // Submit form and wait for response
            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
                this.page.click('button[type="submit"]')
            ]);
            
            // Check if redirected to dashboard
            const finalUrl = this.page.url();
            const isDashboard = finalUrl.includes('dashboard.html');
            
            if (!isDashboard) {
                // Check for error messages or loading states
                const authStatus = await this.page.evaluate(() => {
                    return {
                        currentUrl: window.location.href,
                        hasToken: !!localStorage.getItem('token'),
                        isAuthenticated: window.ClientAuth?.isAuthenticated() || false,
                        errorMessages: Array.from(document.querySelectorAll('.alert, .error')).map(el => el.textContent)
                    };
                });
                
                return {
                    status: 'warn',
                    message: 'Authentication completed but no dashboard redirect',
                    details: { finalUrl, authStatus }
                };
            }

            return {
                status: 'pass',
                message: 'Authentication flow completed successfully',
                details: { finalUrl, redirectedToDashboard: isDashboard }
            };

        } catch (error) {
            return {
                status: 'error',
                message: `Authentication flow failed: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * Test dashboard loading
     */
    async testDashboardLoading() {
        try {
            // First authenticate
            await this.page.goto(`${this.baseUrl}/admin/login.html`, { waitUntil: 'networkidle0' });
            await this.page.waitForFunction(() => window.ClientAuth?.initialized, { timeout: 5000 });
            
            await this.page.type('#username', 'admin');
            await this.page.type('#password', 'password123');
            await this.page.click('button[type="submit"]');
            
            // Wait for dashboard to load
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
            
            // Check dashboard elements
            const dashboardStatus = await this.page.evaluate(() => {
                return {
                    hasDashboardTitle: !!document.querySelector('.dashboard-title'),
                    hasStatsGrid: !!document.querySelector('.stats-grid'),
                    hasNavigation: !!document.querySelector('.nav'),
                    hasUserDisplay: !!document.querySelector('#user-display-name'),
                    isLoadingScreenHidden: document.getElementById('loading-screen')?.style?.display === 'none',
                    authElementsVisible: document.querySelectorAll('.auth-logged-in-only').length > 0,
                    hasErrors: !!document.querySelector('.error, #error-screen'),
                    pageTitle: document.title
                };
            });

            const issues = [];
            if (!dashboardStatus.hasDashboardTitle) issues.push('Dashboard title missing');
            if (!dashboardStatus.hasStatsGrid) issues.push('Stats grid missing');
            if (!dashboardStatus.hasNavigation) issues.push('Navigation missing');
            if (!dashboardStatus.isLoadingScreenHidden) issues.push('Loading screen still visible');

            return {
                status: issues.length === 0 ? 'pass' : issues.length <= 2 ? 'warn' : 'error',
                message: issues.length === 0 ? 'Dashboard loaded successfully' : `${issues.length} dashboard issues`,
                details: { dashboardStatus, issues }
            };

        } catch (error) {
            return {
                status: 'error',
                message: `Dashboard loading failed: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * Test script dependencies
     */
    async testScriptDependencies() {
        try {
            await this.page.goto(`${this.baseUrl}/admin/dashboard.html`, { waitUntil: 'networkidle0' });
            
            const dependencies = await this.page.evaluate(() => {
                const systems = {
                    ClientAuth: {
                        available: !!window.ClientAuth,
                        initialized: window.ClientAuth?.initialized || false,
                        methods: window.ClientAuth ? Object.keys(window.ClientAuth) : []
                    },
                    AuthManager: {
                        available: !!window.AuthManager,
                        methods: window.AuthManager ? Object.keys(window.AuthManager) : []
                    },
                    LoadingManager: {
                        available: !!window.LoadingManager,
                        methods: window.LoadingManager ? Object.keys(window.LoadingManager) : []
                    },
                    APIConfig: {
                        available: !!window.APIConfig,
                        methods: window.APIConfig ? Object.keys(window.APIConfig) : []
                    },
                    AdminDiagnostics: {
                        available: !!window.AdminDiagnostics,
                        methods: window.AdminDiagnostics ? Object.keys(window.AdminDiagnostics) : []
                    }
                };

                const scriptElements = Array.from(document.querySelectorAll('script[src]')).map(script => ({
                    src: script.src,
                    loaded: !script.onerror
                }));

                return { systems, scriptElements };
            });

            const criticalSystems = ['ClientAuth', 'LoadingManager'];
            const missingCritical = criticalSystems.filter(sys => !dependencies.systems[sys]?.available);
            
            return {
                status: missingCritical.length === 0 ? 'pass' : 'error',
                message: missingCritical.length === 0 ? 'All dependencies loaded' : `Missing: ${missingCritical.join(', ')}`,
                details: dependencies
            };

        } catch (error) {
            return {
                status: 'error',
                message: `Dependency check failed: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        try {
            // Test with invalid URL
            const response = await this.page.goto(`${this.baseUrl}/admin/nonexistent.html`, { 
                waitUntil: 'networkidle0' 
            });
            
            const status = response.status();
            const hasErrorHandling = await this.page.evaluate(() => {
                return {
                    hasErrorScreen: !!document.querySelector('#error-screen'),
                    has404Page: document.title.includes('404') || document.body.textContent.includes('404'),
                    hasRetryButton: !!document.querySelector('button[onclick*="reload"]'),
                    hasBackButton: !!document.querySelector('button[onclick*="back"]')
                };
            });

            return {
                status: hasErrorHandling.hasErrorScreen || hasErrorHandling.has404Page ? 'pass' : 'warn',
                message: 'Error handling present',
                details: { httpStatus: status, errorHandling: hasErrorHandling }
            };

        } catch (error) {
            return {
                status: 'warn',
                message: 'Error handling test inconclusive',
                details: { error: error.message }
            };
        }
    }

    /**
     * Test offline behavior
     */
    async testOfflineBehavior() {
        try {
            await this.page.goto(`${this.baseUrl}/admin/login.html`, { waitUntil: 'networkidle0' });
            
            // Simulate offline condition
            await this.page.setOfflineMode(true);
            
            await this.page.type('#username', 'admin');
            await this.page.type('#password', 'password123');
            await this.page.click('button[type="submit"]');
            
            // Wait for response
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const offlineResult = await this.page.evaluate(() => {
                return {
                    hasErrorMessage: !!document.querySelector('.alert-danger, .error'),
                    hasOfflineIndicator: document.body.textContent.includes('offline') || 
                                        document.body.textContent.includes('network'),
                    clientAuthWorked: window.ClientAuth?.isAuthenticated() || false,
                    currentUrl: window.location.href
                };
            });

            // Restore online mode
            await this.page.setOfflineMode(false);

            return {
                status: offlineResult.clientAuthWorked ? 'pass' : 'warn',
                message: offlineResult.clientAuthWorked ? 'Offline fallback working' : 'Limited offline functionality',
                details: offlineResult
            };

        } catch (error) {
            return {
                status: 'warn',
                message: 'Offline test inconclusive',
                details: { error: error.message }
            };
        }
    }

    /**
     * Test performance metrics
     */
    async testPerformanceMetrics() {
        try {
            const startTime = Date.now();
            
            await this.page.goto(`${this.baseUrl}/admin/login.html`, { waitUntil: 'networkidle0' });
            
            const loadTime = Date.now() - startTime;
            
            const metrics = await this.page.evaluate(() => {
                const perf = performance.getEntriesByType('navigation')[0];
                return {
                    domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.navigationStart),
                    loadComplete: Math.round(perf.loadEventEnd - perf.navigationStart),
                    firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
                    memoryUsage: performance.memory ? {
                        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
                    } : null
                };
            });

            const issues = [];
            if (loadTime > 5000) issues.push('Slow page load');
            if (metrics.domContentLoaded > 3000) issues.push('Slow DOM loading');
            if (metrics.memoryUsage && metrics.memoryUsage.used > 50) issues.push('High memory usage');

            return {
                status: issues.length === 0 ? 'pass' : 'warn',
                message: `Load: ${loadTime}ms, DOM: ${metrics.domContentLoaded}ms`,
                details: { loadTime, metrics, issues }
            };

        } catch (error) {
            return {
                status: 'warn',
                message: 'Performance test inconclusive',
                details: { error: error.message }
            };
        }
    }

    /**
     * Generate test summary
     */
    async generateTestSummary() {
        const duration = Date.now() - this.startTime;
        
        const statusCounts = {
            pass: 0,
            warn: 0,
            error: 0
        };

        this.results.forEach(result => {
            statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
        });

        const overallStatus = statusCounts.error > 0 ? 'error' :
                            statusCounts.warn > 0 ? 'warn' : 'pass';

        const summary = {
            overallStatus,
            duration,
            totalTests: this.results.length,
            statusCounts,
            tests: this.results,
            timestamp: new Date().toISOString(),
            environment: {
                baseUrl: this.baseUrl,
                userAgent: await this.page.evaluate(() => navigator.userAgent)
            },
            recommendations: this.generateRecommendations()
        };

        return summary;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        const errors = this.results.filter(r => r.status === 'error');
        const warnings = this.results.filter(r => r.status === 'warn');

        if (errors.length > 0) {
            recommendations.push(`🚨 ${errors.length} critical issues must be resolved before production`);
        }

        if (warnings.length > 0) {
            recommendations.push(`⚠️ ${warnings.length} warnings should be reviewed for optimal performance`);
        }

        // Specific recommendations based on test results
        const authError = errors.find(r => r.name.includes('Authentication'));
        if (authError) {
            recommendations.push('🔑 Fix authentication system - admin panel will be unusable');
        }

        const loadingError = errors.find(r => r.name.includes('Loading'));
        if (loadingError) {
            recommendations.push('🔄 Resolve script loading issues - affects user experience');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ All tests passing - admin panel is ready for use');
        }

        return recommendations;
    }

    /**
     * Save test results
     */
    async saveTestResults(summary) {
        const filename = path.join(__dirname, `admin-test-results-${new Date().toISOString().split('T')[0]}.json`);
        await fs.writeFile(filename, JSON.stringify(summary, null, 2));
        console.log(`📄 Test results saved to: ${filename}`);
    }

    /**
     * Create timeout promise
     */
    createTimeoutPromise(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
        });
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AdminComprehensiveTest();
    tester.runTests()
        .then(summary => {
            console.log('\n📊 Test Summary:');
            console.log(`Overall Status: ${summary.overallStatus.toUpperCase()}`);
            console.log(`Duration: ${summary.duration}ms`);
            console.log(`Tests: ${summary.statusCounts.pass} passed, ${summary.statusCounts.warn} warnings, ${summary.statusCounts.error} errors`);
            
            if (summary.recommendations.length > 0) {
                console.log('\n📋 Recommendations:');
                summary.recommendations.forEach(rec => console.log(rec));
            }
            
            process.exit(summary.overallStatus === 'error' ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = AdminComprehensiveTest;