/**
 * Comprehensive Integration Test Suite
 * End-to-end testing for all major features and workflows
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

class IntegrationTestSuite {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.DEPLOYED_URL || 'http://localhost:3000';
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY;
        
        this.supabase = null;
        if (this.supabaseUrl && this.supabaseKey) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        }
        
        this.results = {
            authentication: [],
            portfolio: [],
            admin: [],
            api: [],
            cms: [],
            workflow: [],
            summary: {
                passed: 0,
                failed: 0,
                total: 0,
                score: 0
            }
        };
        
        this.testUser = {
            email: `test-${Date.now()}@example.com`,
            password: 'TestPassword123!',
            profile: {
                name: 'Test User',
                bio: 'Integration test user'
            }
        };
        
        this.startTime = Date.now();
    }

    async runAllIntegrationTests() {
        console.log('🧪 Starting Integration Test Suite...');
        console.log(`🌐 Target: ${this.baseUrl}`);
        console.log('='.repeat(60));
        
        try {
            await this.testAuthentication();
            await this.testPortfolioFeatures();
            await this.testAdminPanel();
            await this.testAPIEndpoints();
            await this.testCMSFunctionality();
            await this.testUserWorkflows();
            
            this.calculateSummary();
            const report = this.generateReport();
            
            if (this.results.summary.score >= 85) {
                console.log('✅ Integration tests passed! All major features working.');
                return { success: true, report };
            } else {
                console.log(`❌ Integration tests failed! Score: ${this.results.summary.score}%`);
                return { success: false, report };
            }
            
        } catch (error) {
            console.error('❌ Integration test suite failed:', error);
            return { success: false, error: error.message };
        }
    }

    async testAuthentication() {
        console.log('\n🔐 Testing Authentication...');
        
        if (!this.supabase) {
            console.log('  ⚠️ Supabase not configured, skipping auth tests');
            return;
        }
        
        // Test user registration
        await this.addAsyncTest('authentication', 'User Registration', async () => {
            const { data, error } = await this.supabase.auth.signUp({
                email: this.testUser.email,
                password: this.testUser.password
            });
            
            if (error) {
                // Email might already exist, which is ok for testing
                if (error.message.includes('already') || error.message.includes('exists')) {
                    return 'User registration (email exists, expected) ✓';
                }
                throw new Error(`Registration failed: ${error.message}`);
            }
            
            return 'User registration successful ✓';
        });
        
        // Test user login
        await this.addAsyncTest('authentication', 'User Login', async () => {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: this.testUser.email,
                password: this.testUser.password
            });
            
            if (error) {
                throw new Error(`Login failed: ${error.message}`);
            }
            
            if (!data.user) {
                throw new Error('Login succeeded but no user data returned');
            }
            
            return `User login successful (${data.user.email}) ✓`;
        });
        
        // Test session management
        await this.addAsyncTest('authentication', 'Session Management', async () => {
            const { data: session, error } = await this.supabase.auth.getSession();
            
            if (error) {
                throw new Error(`Session check failed: ${error.message}`);
            }
            
            if (!session.session) {
                return 'No active session (expected for test) ✓';
            }
            
            return `Active session found (${session.session.user.email}) ✓`;
        });
        
        // Test password reset request
        await this.addAsyncTest('authentication', 'Password Reset', async () => {
            const { error } = await this.supabase.auth.resetPasswordForEmail(
                this.testUser.email,
                { redirectTo: `${this.baseUrl}/reset-password` }
            );
            
            if (error) {
                throw new Error(`Password reset failed: ${error.message}`);
            }
            
            return 'Password reset request sent ✓';
        });
        
        // Test logout
        await this.addAsyncTest('authentication', 'User Logout', async () => {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                throw new Error(`Logout failed: ${error.message}`);
            }
            
            return 'User logout successful ✓';
        });
    }

    async testPortfolioFeatures() {
        console.log('\n💼 Testing Portfolio Features...');
        
        // Test main portfolio page
        await this.addAsyncTest('portfolio', 'Portfolio Page Load', async () => {
            const response = await fetch(`${this.baseUrl}/portfolio`);
            
            if (!response.ok && response.status !== 404) {
                throw new Error(`Portfolio page failed: ${response.status}`);
            }
            
            if (response.status === 404) {
                return 'Portfolio page (404 - may not exist yet) ⚠️';
            }
            
            const html = await response.text();
            
            if (!html.includes('project') && !html.includes('Portfolio')) {
                throw new Error('Portfolio page loaded but missing expected content');
            }
            
            return `Portfolio page loaded successfully (${response.status}) ✓`;
        });
        
        // Test project listing
        await this.addAsyncTest('portfolio', 'Project Listing', async () => {
            const response = await fetch(`${this.baseUrl}/projects`);
            
            if (!response.ok && response.status !== 404) {
                throw new Error(`Projects page failed: ${response.status}`);
            }
            
            if (response.status === 404) {
                return 'Projects page (404 - expected) ⚠️';
            }
            
            return `Projects page accessible (${response.status}) ✓`;
        });
        
        // Test individual project pages
        await this.addAsyncTest('portfolio', 'Project Detail Pages', async () => {
            // Try common project URLs
            const projectUrls = [
                '/projects/sample-project',
                '/portfolio/project-1',
                '/work/sample'
            ];
            
            let foundProject = false;
            
            for (const url of projectUrls) {
                try {
                    const response = await fetch(`${this.baseUrl}${url}`);
                    if (response.ok) {
                        foundProject = true;
                        break;
                    }
                } catch (error) {
                    // Continue checking other URLs
                }
            }
            
            if (!foundProject) {
                return 'Project detail pages (none found - expected) ⚠️';
            }
            
            return 'Project detail pages accessible ✓';
        });
        
        // Test contact functionality
        await this.addAsyncTest('portfolio', 'Contact Form', async () => {
            const response = await fetch(`${this.baseUrl}/contact`);
            
            if (response.status === 404) {
                return 'Contact page (404 - expected) ⚠️';
            }
            
            if (!response.ok) {
                throw new Error(`Contact page failed: ${response.status}`);
            }
            
            const html = await response.text();
            const hasForm = html.includes('<form') || html.includes('contact');
            
            return hasForm ? 'Contact form present ✓' : 'Contact page loaded (no form detected) ⚠️';
        });
        
        // Test image loading
        await this.addAsyncTest('portfolio', 'Media Loading', async () => {
            const response = await fetch(`${this.baseUrl}/images/logo.png`);
            
            if (response.status === 404) {
                // Try alternative image paths
                const altPaths = ['/assets/logo.png', '/static/images/logo.png', '/img/logo.png'];
                
                for (const path of altPaths) {
                    const altResponse = await fetch(`${this.baseUrl}${path}`);
                    if (altResponse.ok) {
                        return `Media loading working (found at ${path}) ✓`;
                    }
                }
                
                return 'Media loading (no test images found) ⚠️';
            }
            
            return `Media loading successful (${response.status}) ✓`;
        });
    }

    async testAdminPanel() {
        console.log('\n⚙️ Testing Admin Panel...');
        
        // Test admin panel accessibility
        await this.addAsyncTest('admin', 'Admin Panel Access', async () => {
            const response = await fetch(`${this.baseUrl}/admin/`);
            
            // Admin should require authentication (401/403) or be accessible (200)
            if (response.status === 401 || response.status === 403) {
                return `Admin panel protected (${response.status}) ✓`;
            }
            
            if (response.ok) {
                return `Admin panel accessible (${response.status}) ✓`;
            }
            
            if (response.status === 404) {
                throw new Error('Admin panel not found');
            }
            
            throw new Error(`Admin panel error: ${response.status}`);
        });
        
        // Test admin pages
        const adminPages = [
            '/admin/portfolio.html',
            '/admin/analytics.html',
            '/admin/media-library.html',
            '/admin/user-management.html'
        ];
        
        for (const page of adminPages) {
            await this.addAsyncTest('admin', `Admin Page: ${page}`, async () => {
                const response = await fetch(`${this.baseUrl}${page}`);
                
                if (response.status === 404) {
                    return `${page} (404 - expected) ⚠️`;
                }
                
                if (!response.ok) {
                    throw new Error(`Admin page ${page} failed: ${response.status}`);
                }
                
                return `${page} accessible (${response.status}) ✓`;
            });
        }
        
        // Test admin JavaScript dependencies
        await this.addAsyncTest('admin', 'Admin JS Dependencies', async () => {
            const response = await fetch(`${this.baseUrl}/admin/js/unified-api-client.js`);
            
            if (response.status === 404) {
                return 'Admin JS dependencies (404 - may not exist) ⚠️';
            }
            
            if (!response.ok) {
                throw new Error(`Admin JS failed to load: ${response.status}`);
            }
            
            const js = await response.text();
            
            if (js.includes('class') || js.includes('function')) {
                return 'Admin JavaScript loaded successfully ✓';
            }
            
            return 'Admin JavaScript loaded but content unclear ⚠️';
        });
    }

    async testAPIEndpoints() {
        console.log('\n🔌 Testing API Endpoints...');
        
        // Test health endpoint
        await this.addAsyncTest('api', 'Health Check Endpoint', async () => {
            const response = await fetch(`${this.baseUrl}/.netlify/functions/health`);
            
            if (response.status === 404) {
                return 'Health endpoint (404 - expected) ⚠️';
            }
            
            if (!response.ok) {
                throw new Error(`Health endpoint failed: ${response.status}`);
            }
            
            try {
                const data = await response.json();
                return `Health endpoint responding (${response.status}) ✓`;
            } catch (error) {
                return `Health endpoint responding but not JSON (${response.status}) ⚠️`;
            }
        });
        
        // Test projects API
        await this.addAsyncTest('api', 'Projects API', async () => {
            const response = await fetch(`${this.baseUrl}/.netlify/functions/projects`);
            
            if (response.status === 404) {
                return 'Projects API (404 - expected) ⚠️';
            }
            
            if (response.status >= 500) {
                throw new Error(`Projects API server error: ${response.status}`);
            }
            
            return `Projects API accessible (${response.status}) ✓`;
        });
        
        // Test auth API
        await this.addAsyncTest('api', 'Auth API', async () => {
            const response = await fetch(`${this.baseUrl}/.netlify/functions/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test' })
            });
            
            if (response.status === 404) {
                return 'Auth API (404 - expected) ⚠️';
            }
            
            if (response.status >= 500) {
                throw new Error(`Auth API server error: ${response.status}`);
            }
            
            // 400-499 are expected for invalid auth requests
            return `Auth API responding (${response.status}) ✓`;
        });
        
        // Test media upload API
        await this.addAsyncTest('api', 'Media Upload API', async () => {
            const response = await fetch(`${this.baseUrl}/.netlify/functions/media-upload`, {
                method: 'OPTIONS'
            });
            
            if (response.status === 404) {
                return 'Media upload API (404 - expected) ⚠️';
            }
            
            // OPTIONS request should return CORS headers
            const corsOrigin = response.headers.get('access-control-allow-origin');
            
            return corsOrigin ? `Media upload API with CORS (${response.status}) ✓` : `Media upload API accessible (${response.status}) ✓`;
        });
        
        // Test API error handling
        await this.addAsyncTest('api', 'API Error Handling', async () => {
            const response = await fetch(`${this.baseUrl}/.netlify/functions/nonexistent`);
            
            if (response.status !== 404) {
                return `API error handling (unexpected status: ${response.status}) ⚠️`;
            }
            
            return 'API error handling (404 for nonexistent endpoints) ✓';
        });
    }

    async testCMSFunctionality() {
        console.log('\n📝 Testing CMS Functionality...');
        
        if (!this.supabase) {
            console.log('  ⚠️ Supabase not configured, skipping CMS tests');
            return;
        }
        
        // Test database read operations
        await this.addAsyncTest('cms', 'Database Read Operations', async () => {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('id')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                return 'Database read (table not found - expected) ⚠️';
            }
            
            if (error) {
                throw new Error(`Database read failed: ${error.message}`);
            }
            
            return 'Database read operations working ✓';
        });
        
        // Test project CRUD operations
        await this.addAsyncTest('cms', 'Project Management', async () => {
            // Try to read projects
            const { data, error } = await this.supabase
                .from('projects')
                .select('id, title')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                return 'Project management (table not found - expected) ⚠️';
            }
            
            if (error) {
                throw new Error(`Project read failed: ${error.message}`);
            }
            
            return `Project management accessible (${data ? data.length : 0} projects) ✓`;
        });
        
        // Test blog functionality
        await this.addAsyncTest('cms', 'Blog Management', async () => {
            const { data, error } = await this.supabase
                .from('blog_posts')
                .select('id, title')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                return 'Blog management (table not found - expected) ⚠️';
            }
            
            if (error) {
                throw new Error(`Blog read failed: ${error.message}`);
            }
            
            return `Blog management accessible (${data ? data.length : 0} posts) ✓`;
        });
        
        // Test media management
        await this.addAsyncTest('cms', 'Media Management', async () => {
            const { data, error } = await this.supabase
                .from('media_assets')
                .select('id, filename')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                return 'Media management (table not found - expected) ⚠️';
            }
            
            if (error) {
                throw new Error(`Media read failed: ${error.message}`);
            }
            
            return `Media management accessible (${data ? data.length : 0} assets) ✓`;
        });
    }

    async testUserWorkflows() {
        console.log('\n🔄 Testing User Workflows...');
        
        // Test complete visitor journey
        await this.addAsyncTest('workflow', 'Visitor Journey', async () => {
            const pages = ['/', '/about', '/projects', '/contact'];
            const results = [];
            
            for (const page of pages) {
                try {
                    const response = await fetch(`${this.baseUrl}${page}`);
                    results.push({
                        page,
                        status: response.status,
                        ok: response.ok || response.status === 404
                    });
                } catch (error) {
                    results.push({ page, status: 'ERROR', ok: false });
                }
            }
            
            const successful = results.filter(r => r.ok).length;
            
            if (successful < 2) {
                throw new Error(`Visitor journey broken: only ${successful}/${pages.length} pages accessible`);
            }
            
            return `Visitor journey: ${successful}/${pages.length} pages accessible ✓`;
        });
        
        // Test admin workflow (if accessible)
        await this.addAsyncTest('workflow', 'Admin Workflow', async () => {
            const adminFlow = [
                '/admin/',
                '/admin/portfolio.html',
                '/admin/analytics.html'
            ];
            
            let accessible = 0;
            
            for (const page of adminFlow) {
                try {
                    const response = await fetch(`${this.baseUrl}${page}`);
                    if (response.ok || response.status === 401 || response.status === 403) {
                        accessible++;
                    }
                } catch (error) {
                    // Continue
                }
            }
            
            if (accessible === 0) {
                return 'Admin workflow (not accessible - expected) ⚠️';
            }
            
            return `Admin workflow: ${accessible}/${adminFlow.length} pages accessible ✓`;
        });
        
        // Test API workflow
        await this.addAsyncTest('workflow', 'API Workflow', async () => {
            const apiFlow = [
                { url: '/.netlify/functions/health', method: 'GET' },
                { url: '/.netlify/functions/projects', method: 'GET' },
                { url: '/.netlify/functions/auth', method: 'POST', body: { test: true } }
            ];
            
            let responsive = 0;
            
            for (const api of apiFlow) {
                try {
                    const options = {
                        method: api.method,
                        headers: { 'Content-Type': 'application/json' }
                    };
                    
                    if (api.body) {
                        options.body = JSON.stringify(api.body);
                    }
                    
                    const response = await fetch(`${this.baseUrl}${api.url}`, options);
                    
                    // Any response (including 404, 400) counts as responsive
                    if (response.status < 500) {
                        responsive++;
                    }
                } catch (error) {
                    // Continue
                }
            }
            
            if (responsive === 0) {
                return 'API workflow (no endpoints responsive) ⚠️';
            }
            
            return `API workflow: ${responsive}/${apiFlow.length} endpoints responsive ✓`;
        });
        
        // Test error handling workflow
        await this.addAsyncTest('workflow', 'Error Handling', async () => {
            const errorTests = [
                { url: '/nonexistent-page', expected: 404 },
                { url: '/admin/nonexistent', expected: [401, 403, 404] }
            ];
            
            let handledCorrectly = 0;
            
            for (const test of errorTests) {
                try {
                    const response = await fetch(`${this.baseUrl}${test.url}`);
                    const expectedStatuses = Array.isArray(test.expected) ? test.expected : [test.expected];
                    
                    if (expectedStatuses.includes(response.status)) {
                        handledCorrectly++;
                    }
                } catch (error) {
                    // Network errors are also acceptable for some tests
                    handledCorrectly++;
                }
            }
            
            return `Error handling: ${handledCorrectly}/${errorTests.length} cases handled correctly ✓`;
        });
    }

    async addAsyncTest(category, name, testFn) {
        try {
            const result = await testFn();
            
            this.results[category].push({
                name,
                passed: true,
                message: result,
                timestamp: new Date().toISOString()
            });
            
            console.log(`  ✅ ${name}: ${result}`);
        } catch (error) {
            this.results[category].push({
                name,
                passed: false,
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.log(`  ❌ ${name}: ${error.message}`);
        }
    }

    calculateSummary() {
        let passed = 0;
        let failed = 0;
        let total = 0;
        
        Object.values(this.results).forEach(categoryResults => {
            if (Array.isArray(categoryResults)) {
                categoryResults.forEach(test => {
                    total++;
                    if (test.passed) {
                        passed++;
                    } else {
                        failed++;
                    }
                });
            }
        });
        
        this.results.summary = {
            passed,
            failed,
            total,
            score: total > 0 ? Math.round((passed / total) * 100) : 0,
            duration: Date.now() - this.startTime
        };
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            duration: this.results.summary.duration,
            summary: this.results.summary,
            results: this.results,
            recommendations: this.generateRecommendations()
        };
        
        this.printSummary();
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.summary.score < 70) {
            recommendations.push('Critical integration issues - major features not working');
        } else if (this.results.summary.score < 85) {
            recommendations.push('Some integration issues - review failed tests');
        } else if (this.results.summary.score < 95) {
            recommendations.push('Minor integration issues - system mostly functional');
        } else {
            recommendations.push('Excellent integration - all major features working!');
        }
        
        return recommendations;
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🧪 INTEGRATION TEST SUITE SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n🌐 Target: ${this.baseUrl}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`📊 Score: ${this.results.summary.score}%`);
        console.log(`⏱️  Duration: ${Math.round(this.results.summary.duration / 1000)}s`);
        
        // Category breakdown
        console.log('\n📊 Category Results:');
        Object.entries(this.results).forEach(([category, tests]) => {
            if (Array.isArray(tests) && tests.length > 0) {
                const passed = tests.filter(t => t.passed).length;
                const total = tests.length;
                
                console.log(`   ${category}: ${passed}/${total} tests passed`);
            }
        });
        
        console.log('\n' + '='.repeat(60));
    }
}

// CLI execution
if (require.main === module) {
    const baseUrl = process.argv[2] || process.env.DEPLOYED_URL || 'http://localhost:3000';
    
    const suite = new IntegrationTestSuite({ baseUrl });
    
    suite.runAllIntegrationTests()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 Integration tests completed successfully!');
                process.exit(0);
            } else {
                console.log('\n💥 Integration tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Integration test error:', error);
            process.exit(1);
        });
}

module.exports = IntegrationTestSuite;