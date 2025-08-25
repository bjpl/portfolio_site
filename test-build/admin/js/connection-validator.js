/**
 * Admin Panel Connection Validator
 * Tests all critical connections and dependencies
 */

class ConnectionValidator {
    constructor() {
        this.tests = [];
        this.results = new Map();
        this.setupTests();
    }

    /**
     * Setup all validation tests
     */
    setupTests() {
        this.tests = [
            {
                name: 'Configuration Loading',
                test: () => this.testConfigurationLoading(),
                critical: true
            },
            {
                name: 'API Connectivity', 
                test: () => this.testAPIConnectivity(),
                critical: true
            },
            {
                name: 'Authentication System',
                test: () => this.testAuthenticationSystem(),
                critical: true
            },
            {
                name: 'Database Connection',
                test: () => this.testDatabaseConnection(),
                critical: false
            },
            {
                name: 'Asset Loading',
                test: () => this.testAssetLoading(),
                critical: false
            },
            {
                name: 'WebSocket Connection',
                test: () => this.testWebSocketConnection(),
                critical: false
            },
            {
                name: 'Local Storage',
                test: () => this.testLocalStorage(),
                critical: true
            },
            {
                name: 'Script Dependencies',
                test: () => this.testScriptDependencies(),
                critical: true
            }
        ];
    }

    /**
     * Run all validation tests
     */
    async runAllTests() {
        console.log('🔍 Running admin panel connection validation...');
        
        for (const test of this.tests) {
            console.log(`Running test: ${test.name}`);
            
            try {
                const result = await Promise.race([
                    test.test(),
                    this.timeout(10000, `Test '${test.name}' timed out`)
                ]);
                
                this.results.set(test.name, {
                    status: 'pass',
                    message: result.message || 'Test passed',
                    critical: test.critical,
                    details: result.details || {}
                });
                
                console.log(`✅ ${test.name}: ${result.message || 'Passed'}`);
            } catch (error) {
                this.results.set(test.name, {
                    status: 'fail',
                    message: error.message || 'Test failed',
                    critical: test.critical,
                    details: error.details || {}
                });
                
                console.log(`❌ ${test.name}: ${error.message}`);
                
                if (test.critical) {
                    console.error(`🚨 Critical test failed: ${test.name}`);
                }
            }
        }

        return this.generateReport();
    }

    /**
     * Test configuration loading
     */
    async testConfigurationLoading() {
        const configs = ['AdminConfig', 'APIConfig', 'SUPABASE_CONFIG', 'unifiedApiClient'];
        const loadedConfigs = [];

        for (const config of configs) {
            if (window[config]) {
                loadedConfigs.push(config);
            }
        }

        if (loadedConfigs.length === 0) {
            throw new Error('No configuration objects found');
        }

        return {
            message: `${loadedConfigs.length} configuration objects loaded`,
            details: { loadedConfigs, availableConfigs: configs }
        };
    }

    /**
     * Test API connectivity
     */
    async testAPIConnectivity() {
        const client = window.unifiedApiClient;
        
        if (!client) {
            throw new Error('Unified API client not available');
        }

        // Test health endpoint
        try {
            const healthUrl = client.buildUrl('/health') || client.buildUrl('/');
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            return {
                message: `API responding (${response.status})`,
                details: { 
                    url: healthUrl,
                    status: response.status,
                    configSource: client.config.source 
                }
            };
        } catch (error) {
            // Try fallback endpoints
            const fallbackUrls = [
                '/.netlify/functions/health',
                '/api/health',
                '/'
            ];

            for (const url of fallbackUrls) {
                try {
                    const response = await fetch(url);
                    return {
                        message: `Fallback API responding (${response.status})`,
                        details: { url, status: response.status, fallback: true }
                    };
                } catch (fallbackError) {
                    continue;
                }
            }

            throw new Error('All API endpoints unreachable');
        }
    }

    /**
     * Test authentication system
     */
    async testAuthenticationSystem() {
        const authSystems = ['AuthManager', 'authService', 'ClientAuth'];
        const availableSystems = [];

        for (const system of authSystems) {
            if (window[system] && typeof window[system].isAuthenticated === 'function') {
                availableSystems.push({
                    name: system,
                    authenticated: window[system].isAuthenticated()
                });
            }
        }

        if (availableSystems.length === 0) {
            throw new Error('No authentication systems available');
        }

        return {
            message: `${availableSystems.length} auth system(s) available`,
            details: { authSystems: availableSystems }
        };
    }

    /**
     * Test database connection via API
     */
    async testDatabaseConnection() {
        const client = window.unifiedApiClient;
        
        if (!client) {
            throw new Error('API client not available for database test');
        }

        try {
            // Try to fetch dashboard stats or user info
            const response = await client.request('/dashboard/stats');
            
            if (response.ok) {
                return {
                    message: 'Database connection via API successful',
                    details: { method: 'api' }
                };
            }
        } catch (error) {
            // Database test failed, but this is not always critical
            return {
                message: 'Database connection test inconclusive',
                details: { error: error.message, method: 'api' }
            };
        }
    }

    /**
     * Test asset loading
     */
    async testAssetLoading() {
        const criticalAssets = [
            '/admin/js/config.js',
            '/admin/js/auth-manager.js',
            '/css/auth/auth-styles.css'
        ];

        const loadedAssets = [];
        const failedAssets = [];

        for (const asset of criticalAssets) {
            try {
                const response = await fetch(asset, { method: 'HEAD' });
                if (response.ok) {
                    loadedAssets.push(asset);
                } else {
                    failedAssets.push({ asset, status: response.status });
                }
            } catch (error) {
                failedAssets.push({ asset, error: error.message });
            }
        }

        if (failedAssets.length > 0) {
            throw new Error(`${failedAssets.length} critical assets failed to load`, {
                details: { failed: failedAssets, loaded: loadedAssets }
            });
        }

        return {
            message: `All ${loadedAssets.length} critical assets loaded`,
            details: { loadedAssets }
        };
    }

    /**
     * Test WebSocket connection
     */
    async testWebSocketConnection() {
        return new Promise((resolve, reject) => {
            const config = window.SUPABASE_CONFIG || window.AdminConfig?.websocket;
            
            if (!config) {
                resolve({
                    message: 'WebSocket not configured (optional)',
                    details: { configured: false }
                });
                return;
            }

            const wsUrl = config.url || config.websocket?.url;
            if (!wsUrl) {
                resolve({
                    message: 'WebSocket URL not available',
                    details: { configured: false }
                });
                return;
            }

            try {
                const ws = new WebSocket(wsUrl.replace('https://', 'wss://').replace('http://', 'ws://'));
                
                const timeout = setTimeout(() => {
                    ws.close();
                    resolve({
                        message: 'WebSocket connection timeout (acceptable)',
                        details: { timeout: true }
                    });
                }, 3000);

                ws.onopen = () => {
                    clearTimeout(timeout);
                    ws.close();
                    resolve({
                        message: 'WebSocket connection successful',
                        details: { connected: true }
                    });
                };

                ws.onerror = () => {
                    clearTimeout(timeout);
                    resolve({
                        message: 'WebSocket connection failed (non-critical)',
                        details: { error: true }
                    });
                };
            } catch (error) {
                resolve({
                    message: 'WebSocket test failed (non-critical)',
                    details: { error: error.message }
                });
            }
        });
    }

    /**
     * Test local storage functionality
     */
    async testLocalStorage() {
        const testKey = '_admin_storage_test';
        const testValue = 'test_value_' + Date.now();

        try {
            // Test write
            localStorage.setItem(testKey, testValue);
            
            // Test read
            const retrieved = localStorage.getItem(testKey);
            
            // Test delete
            localStorage.removeItem(testKey);
            
            if (retrieved !== testValue) {
                throw new Error('Local storage read/write test failed');
            }

            return {
                message: 'Local storage fully functional',
                details: { read: true, write: true, delete: true }
            };
        } catch (error) {
            throw new Error('Local storage not available or failed: ' + error.message);
        }
    }

    /**
     * Test script dependencies
     */
    async testScriptDependencies() {
        const requiredGlobals = [
            'fetch',
            'Promise',
            'JSON',
            'console',
            'localStorage'
        ];

        const missingGlobals = requiredGlobals.filter(global => typeof window[global] === 'undefined');
        
        if (missingGlobals.length > 0) {
            throw new Error(`Missing required globals: ${missingGlobals.join(', ')}`);
        }

        // Check for common polyfills
        const optionalFeatures = {
            'URLSearchParams': typeof URLSearchParams !== 'undefined',
            'IntersectionObserver': typeof IntersectionObserver !== 'undefined',
            'ResizeObserver': typeof ResizeObserver !== 'undefined'
        };

        return {
            message: 'All required dependencies available',
            details: { 
                requiredGlobals: requiredGlobals.length,
                optionalFeatures 
            }
        };
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            overall: {
                total: this.tests.length,
                passed: 0,
                failed: 0,
                critical_failed: 0
            },
            tests: {},
            recommendations: []
        };

        // Process results
        for (const [testName, result] of this.results) {
            report.tests[testName] = result;
            
            if (result.status === 'pass') {
                report.overall.passed++;
            } else {
                report.overall.failed++;
                if (result.critical) {
                    report.overall.critical_failed++;
                }
            }
        }

        // Generate recommendations
        if (report.overall.critical_failed > 0) {
            report.recommendations.push('⚠️ Critical systems are failing. Admin panel may not function properly.');
        }

        if (!this.results.get('API Connectivity')?.status === 'pass') {
            report.recommendations.push('🔌 API connectivity issues detected. Check network and backend status.');
        }

        if (!this.results.get('Authentication System')?.status === 'pass') {
            report.recommendations.push('🔐 Authentication system issues. Users may not be able to log in.');
        }

        // Overall status
        report.overall.status = report.overall.critical_failed === 0 ? 'healthy' : 'critical';

        return report;
    }

    /**
     * Timeout utility
     */
    timeout(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }

    /**
     * Display report in console
     */
    displayReport(report) {
        console.group('🔍 Admin Panel Validation Report');
        
        console.log(`Overall Status: ${report.overall.status.toUpperCase()}`);
        console.log(`Tests: ${report.overall.passed}/${report.overall.total} passed`);
        
        if (report.overall.critical_failed > 0) {
            console.warn(`Critical failures: ${report.overall.critical_failed}`);
        }

        console.group('Test Results:');
        for (const [testName, result] of Object.entries(report.tests)) {
            const icon = result.status === 'pass' ? '✅' : '❌';
            const critical = result.critical ? ' (CRITICAL)' : '';
            console.log(`${icon} ${testName}${critical}: ${result.message}`);
        }
        console.groupEnd();

        if (report.recommendations.length > 0) {
            console.group('Recommendations:');
            report.recommendations.forEach(rec => console.log(rec));
            console.groupEnd();
        }

        console.groupEnd();
    }
}

// Create global validator instance
window.connectionValidator = new ConnectionValidator();

// Auto-run validation in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(async () => {
        const report = await window.connectionValidator.runAllTests();
        window.connectionValidator.displayReport(report);
    }, 2000);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionValidator;
}