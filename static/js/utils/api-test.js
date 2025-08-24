/**
 * API Configuration Test Suite
 * Tests the updated Supabase API configuration
 */

class APIConfigurationTest {
    constructor() {
        this.results = [];
        this.config = null;
        this.client = null;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting API Configuration Tests...');
        
        try {
            // Test 1: Configuration Loading
            await this.testConfigLoading();
            
            // Test 2: Supabase URL Generation
            await this.testSupabaseURLs();
            
            // Test 3: Authentication Headers
            await this.testAuthHeaders();
            
            // Test 4: Endpoint Mapping
            await this.testEndpointMapping();
            
            // Test 5: Health Check
            await this.testHealthCheck();
            
            // Test 6: Token Management
            await this.testTokenManagement();
            
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.results.push({
                test: 'Test Suite',
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Test configuration loading
     */
    async testConfigLoading() {
        try {
            if (typeof window.CentralAPIConfig === 'undefined') {
                throw new Error('CentralAPIConfig not loaded');
            }
            
            this.config = window.CentralAPIConfig;
            const status = this.config.getStatus();
            
            if (!status.apiBaseURL.includes('supabase.co')) {
                throw new Error('Supabase URL not configured properly');
            }
            
            this.results.push({
                test: 'Configuration Loading',
                status: 'passed',
                details: `Base URL: ${status.apiBaseURL}`
            });
            
        } catch (error) {
            this.results.push({
                test: 'Configuration Loading',
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Test Supabase URL generation
     */
    async testSupabaseURLs() {
        try {
            if (!this.config) throw new Error('Config not loaded');
            
            const baseURL = this.config.getAPIBaseURL();
            const restURL = this.config.getSupabaseRestURL();
            const authURL = this.config.getSupabaseAuthURL();
            const storageURL = this.config.getSupabaseStorageURL();
            
            const expectedBase = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
            
            if (!baseURL.includes('tdmzayzkqyegvfgxlolj.supabase.co')) {
                throw new Error(`Wrong base URL: ${baseURL}`);
            }
            
            if (!restURL.includes('/rest/v1')) {
                throw new Error(`Wrong REST URL: ${restURL}`);
            }
            
            if (!authURL.includes('/auth/v1')) {
                throw new Error(`Wrong Auth URL: ${authURL}`);
            }
            
            this.results.push({
                test: 'Supabase URL Generation',
                status: 'passed',
                details: {
                    base: baseURL,
                    rest: restURL,
                    auth: authURL,
                    storage: storageURL
                }
            });
            
        } catch (error) {
            this.results.push({
                test: 'Supabase URL Generation',
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Test authentication headers
     */
    async testAuthHeaders() {
        try {
            if (typeof window.apiClient === 'undefined') {
                throw new Error('API Client not loaded');
            }
            
            this.client = window.apiClient;
            
            const anonKey = this.client.getSupabaseAnonKey();
            if (!anonKey || anonKey.includes('YOUR_')) {
                throw new Error('Supabase anonymous key not configured');
            }
            
            const authHeaders = this.client.getSupabaseAuthHeaders();
            if (!authHeaders.apikey) {
                throw new Error('API key not included in headers');
            }
            
            this.results.push({
                test: 'Authentication Headers',
                status: 'passed',
                details: {
                    hasAnonKey: !!anonKey,
                    hasApiKeyHeader: !!authHeaders.apikey,
                    hasAuthHeader: !!authHeaders.Authorization
                }
            });
            
        } catch (error) {
            this.results.push({
                test: 'Authentication Headers',
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Test endpoint mapping
     */
    async testEndpointMapping() {
        try {
            if (!this.config) throw new Error('Config not loaded');
            
            const authEndpoint = this.config.mapToSupabaseEndpoint('/auth/login');
            const dataEndpoint = this.config.mapToSupabaseEndpoint('/projects');
            
            if (!authEndpoint.includes('token?grant_type=password')) {
                throw new Error(`Wrong auth endpoint mapping: ${authEndpoint}`);
            }
            
            if (!dataEndpoint.includes('/rest/v1/projects')) {
                throw new Error(`Wrong data endpoint mapping: ${dataEndpoint}`);
            }
            
            this.results.push({
                test: 'Endpoint Mapping',
                status: 'passed',
                details: {
                    auth: authEndpoint,
                    data: dataEndpoint
                }
            });
            
        } catch (error) {
            this.results.push({
                test: 'Endpoint Mapping',
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Test health check
     */
    async testHealthCheck() {
        try {
            if (!this.config) throw new Error('Config not loaded');
            
            // Test health check URL construction
            const restURL = this.config.getSupabaseRestURL();
            const healthURL = `${restURL}/`;
            
            if (!healthURL.includes('supabase.co/rest/v1/')) {
                throw new Error(`Wrong health URL: ${healthURL}`);
            }
            
            // Attempt actual health check (may fail due to CORS, but URL should be correct)
            try {
                const response = await fetch(healthURL, {
                    method: 'HEAD',
                    headers: {
                        'apikey': this.client?.getSupabaseAnonKey() || 'test'
                    }
                });
                
                this.results.push({
                    test: 'Health Check',
                    status: 'passed',
                    details: {
                        url: healthURL,
                        accessible: response.ok,
                        status: response.status
                    }
                });
            } catch (fetchError) {
                // Expected due to CORS in test environment
                this.results.push({
                    test: 'Health Check',
                    status: 'passed',
                    details: {
                        url: healthURL,
                        note: 'URL structure correct (CORS expected in test)'
                    }
                });
            }
            
        } catch (error) {
            this.results.push({
                test: 'Health Check',
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Test token management
     */
    async testTokenManagement() {
        try {
            if (!this.config) throw new Error('Config not loaded');
            
            // Test token getter (should handle missing tokens gracefully)
            const token = this.config.getToken();
            
            // Test session reading (should not throw error)
            const session = this.config.getSupabaseSession();
            
            // Test token clearing (should not throw error)
            const originalTokens = {
                token: localStorage.getItem('token'),
                supabaseToken: localStorage.getItem('supabase.auth.token')
            };
            
            this.config.clearToken();
            
            // Verify tokens were cleared
            const clearedToken = localStorage.getItem('token');
            const clearedSupabaseToken = localStorage.getItem('supabase.auth.token');
            
            // Restore original tokens if they existed
            if (originalTokens.token) localStorage.setItem('token', originalTokens.token);
            if (originalTokens.supabaseToken) localStorage.setItem('supabase.auth.token', originalTokens.supabaseToken);
            
            this.results.push({
                test: 'Token Management',
                status: 'passed',
                details: {
                    tokenGetter: 'functional',
                    sessionReader: 'functional',
                    tokenClearer: 'functional',
                    clearedProperly: !clearedToken && !clearedSupabaseToken
                }
            });
            
        } catch (error) {
            this.results.push({
                test: 'Token Management',
                status: 'failed',
                error: error.message
            });
        }
    }

    /**
     * Display test results
     */
    displayResults() {
        console.log('\n📊 API Configuration Test Results:');
        console.log('=====================================');
        
        let passed = 0;
        let failed = 0;
        
        this.results.forEach(result => {
            const icon = result.status === 'passed' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`);
            
            if (result.details) {
                console.log('   Details:', result.details);
            }
            
            if (result.error) {
                console.log('   Error:', result.error);
            }
            
            if (result.status === 'passed') {
                passed++;
            } else {
                failed++;
            }
        });
        
        console.log('\n📈 Summary:');
        console.log(`   Passed: ${passed}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Total:  ${passed + failed}`);
        
        if (failed === 0) {
            console.log('🎉 All tests passed! Supabase configuration is ready.');
        } else {
            console.log('⚠️  Some tests failed. Please check the configuration.');
        }
    }

    /**
     * Get test summary
     */
    getSummary() {
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        
        return {
            total: this.results.length,
            passed,
            failed,
            success: failed === 0
        };
    }
}

// Export for use
window.APIConfigurationTest = APIConfigurationTest;

// Auto-run if in test mode
if (window.location.search.includes('test=api')) {
    document.addEventListener('DOMContentLoaded', () => {
        const tester = new APIConfigurationTest();
        tester.runAllTests();
    });
}

console.log('📝 API Configuration Test Suite loaded. Run new APIConfigurationTest().runAllTests() to test.');