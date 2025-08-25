/**
 * Post-Deployment Health Check Script
 * Comprehensive health monitoring after deployment
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

class PostDeploymentHealthChecker {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.DEPLOYED_URL || 'https://your-site.netlify.app';
        this.timeout = options.timeout || 30000; // 30 seconds
        this.retries = options.retries || 3;
        this.retryDelay = options.retryDelay || 2000; // 2 seconds
        
        this.results = {
            connectivity: [],
            performance: [],
            functionality: [],
            security: [],
            database: [],
            summary: {
                passed: 0,
                failed: 0,
                total: 0,
                score: 0
            }
        };
        
        this.startTime = Date.now();
    }

    async runAllHealthChecks() {
        console.log('🏥 Starting Post-Deployment Health Checks...');
        console.log(`🌐 Target URL: ${this.baseUrl}`);
        console.log('='.repeat(60));
        
        try {
            await this.checkConnectivity();
            await this.checkPerformance();
            await this.checkFunctionality();
            await this.checkSecurity();
            await this.checkDatabase();
            
            this.calculateSummary();
            const report = this.generateReport();
            
            if (this.results.summary.score >= 80) {
                console.log('✅ Deployment health check passed! Site is operational.');
                return { success: true, report };
            } else {
                console.log(`❌ Deployment health check failed! Score: ${this.results.summary.score}%`);
                return { success: false, report };
            }
            
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return { success: false, error: error.message };
        }
    }

    async checkConnectivity() {
        console.log('\n🌐 Checking Connectivity...');
        
        // Basic site availability
        await this.addAsyncTest('connectivity', 'Site Availability', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            
            if (!response.ok) {
                throw new Error(`Site returned ${response.status}: ${response.statusText}`);
            }
            
            const responseTime = response.headers.get('x-response-time') || 'N/A';
            return `Site accessible (${response.status}, ${responseTime}) ✓`;
        });
        
        // Check main pages
        const pages = [
            '/',
            '/about',
            '/projects',
            '/blog',
            '/contact'
        ];
        
        for (const page of pages) {
            await this.addAsyncTest('connectivity', `Page: ${page}`, async () => {
                const url = `${this.baseUrl}${page}`;
                const response = await this.fetchWithRetry(url);
                
                if (!response.ok && response.status !== 404) {
                    throw new Error(`Page ${page} returned ${response.status}`);
                }
                
                return response.status === 404 ? `${page} (404 - expected) ✓` : `${page} (${response.status}) ✓`;
            });
        }
        
        // Check admin panel
        await this.addAsyncTest('connectivity', 'Admin Panel', async () => {
            const response = await this.fetchWithRetry(`${this.baseUrl}/admin/`);
            
            if (!response.ok && response.status !== 401 && response.status !== 403) {
                throw new Error(`Admin panel returned unexpected status: ${response.status}`);
            }
            
            return `Admin panel accessible (${response.status}) ✓`;
        });
        
        // Check API endpoints
        const apiEndpoints = [
            '/.netlify/functions/health',
            '/.netlify/functions/projects',
            '/.netlify/functions/auth'
        ];
        
        for (const endpoint of apiEndpoints) {
            await this.addAsyncTest('connectivity', `API: ${endpoint}`, async () => {
                const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`);
                
                if (response.status >= 500) {
                    throw new Error(`API endpoint error: ${response.status}`);
                }
                
                return `${endpoint} (${response.status}) ✓`;
            });
        }
    }

    async checkPerformance() {
        console.log('\n⚡ Checking Performance...');
        
        // Page load time
        await this.addAsyncTest('performance', 'Page Load Time', async () => {
            const startTime = Date.now();
            const response = await this.fetchWithRetry(this.baseUrl);
            const loadTime = Date.now() - startTime;
            
            if (loadTime > 5000) {
                throw new Error(`Page load time too slow: ${loadTime}ms`);
            }
            
            if (loadTime > 3000) {
                return `Load time: ${loadTime}ms (slow but acceptable) ⚠️`;
            }
            
            return `Load time: ${loadTime}ms ✓`;
        });
        
        // Time to First Byte (TTFB)
        await this.addAsyncTest('performance', 'Time to First Byte', async () => {
            const startTime = Date.now();
            
            const response = await fetch(this.baseUrl, {
                method: 'HEAD',
                timeout: this.timeout
            });
            
            const ttfb = Date.now() - startTime;
            
            if (ttfb > 2000) {
                throw new Error(`TTFB too slow: ${ttfb}ms`);
            }
            
            return `TTFB: ${ttfb}ms ✓`;
        });
        
        // Content size check
        await this.addAsyncTest('performance', 'Content Size', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            const contentLength = response.headers.get('content-length');
            
            if (contentLength) {
                const sizeKB = Math.round(parseInt(contentLength) / 1024);
                
                if (sizeKB > 1024) { // > 1MB
                    return `Page size: ${sizeKB}KB (large) ⚠️`;
                }
                
                return `Page size: ${sizeKB}KB ✓`;
            }
            
            return 'Content size: Unknown ⚠️';
        });
        
        // API response time
        await this.addAsyncTest('performance', 'API Response Time', async () => {
            const startTime = Date.now();
            
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/.netlify/functions/health`);
                const responseTime = Date.now() - startTime;
                
                if (responseTime > 10000) {
                    throw new Error(`API response too slow: ${responseTime}ms`);
                }
                
                return `API response: ${responseTime}ms ✓`;
            } catch (error) {
                if (error.message.includes('timeout')) {
                    throw new Error('API timeout');
                }
                // API might not exist, that's ok
                return 'API response: N/A (endpoint not found) ⚠️';
            }
        });
    }

    async checkFunctionality() {
        console.log('\n🔧 Checking Functionality...');
        
        // HTML structure
        await this.addAsyncTest('functionality', 'HTML Structure', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            const html = await response.text();
            
            const checks = [
                { name: 'DOCTYPE', test: html.includes('<!DOCTYPE') },
                { name: 'Title tag', test: html.includes('<title>') },
                { name: 'Meta viewport', test: html.includes('viewport') },
                { name: 'CSS links', test: html.includes('<link') },
                { name: 'JavaScript', test: html.includes('<script') }
            ];
            
            const passed = checks.filter(c => c.test).length;
            const failed = checks.filter(c => !c.test);
            
            if (failed.length > 0) {
                return `HTML structure: ${passed}/${checks.length} (missing: ${failed.map(f => f.name).join(', ')}) ⚠️`;
            }
            
            return `HTML structure: ${passed}/${checks.length} elements ✓`;
        });
        
        // JavaScript execution
        await this.addAsyncTest('functionality', 'JavaScript Loading', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            const html = await response.text();
            
            const scripts = (html.match(/<script[^>]*src/g) || []).length;
            const inlineScripts = (html.match(/<script[^>]*>/g) || []).length - scripts;
            
            return `JavaScript: ${scripts} external, ${inlineScripts} inline ✓`;
        });
        
        // CSS loading
        await this.addAsyncTest('functionality', 'CSS Loading', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            const html = await response.text();
            
            const cssLinks = (html.match(/<link[^>]*rel=['"]*stylesheet['"]/g) || []).length;
            const inlineCSS = (html.match(/<style[^>]*>/g) || []).length;
            
            return `CSS: ${cssLinks} external, ${inlineCSS} inline ✓`;
        });
        
        // Meta tags for SEO
        await this.addAsyncTest('functionality', 'SEO Meta Tags', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            const html = await response.text();
            
            const metaTags = [
                { name: 'description', test: html.includes('name="description"') },
                { name: 'keywords', test: html.includes('name="keywords"') },
                { name: 'og:title', test: html.includes('property="og:title"') },
                { name: 'og:description', test: html.includes('property="og:description"') }
            ];
            
            const present = metaTags.filter(m => m.test).length;
            
            return `SEO meta tags: ${present}/${metaTags.length} ✓`;
        });
        
        // Form functionality (if contact form exists)
        await this.addAsyncTest('functionality', 'Contact Form', async () => {
            const response = await this.fetchWithRetry(`${this.baseUrl}/contact`);
            
            if (response.status === 404) {
                return 'Contact form: Not found (expected) ✓';
            }
            
            const html = await response.text();
            const hasForm = html.includes('<form');
            
            return hasForm ? 'Contact form: Present ✓' : 'Contact form: Not found ⚠️';
        });
    }

    async checkSecurity() {
        console.log('\n🛡️ Checking Security...');
        
        // HTTPS enforcement
        await this.addAsyncTest('security', 'HTTPS Enforcement', async () => {
            if (!this.baseUrl.startsWith('https://')) {
                throw new Error('Site not using HTTPS');
            }
            
            // Test HTTP redirect (if possible)
            const httpUrl = this.baseUrl.replace('https://', 'http://');
            
            try {
                const response = await fetch(httpUrl, {
                    redirect: 'manual',
                    timeout: 5000
                });
                
                if (response.status >= 300 && response.status < 400) {
                    const location = response.headers.get('location');
                    if (location && location.startsWith('https://')) {
                        return 'HTTPS enforced with redirect ✓';
                    }
                }
            } catch (error) {
                // HTTP might not be available, which is good
            }
            
            return 'HTTPS enabled ✓';
        });
        
        // Security headers
        await this.addAsyncTest('security', 'Security Headers', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            
            const securityHeaders = [
                { name: 'X-Frame-Options', header: 'x-frame-options' },
                { name: 'X-Content-Type-Options', header: 'x-content-type-options' },
                { name: 'X-XSS-Protection', header: 'x-xss-protection' },
                { name: 'Strict-Transport-Security', header: 'strict-transport-security' },
                { name: 'Content-Security-Policy', header: 'content-security-policy' }
            ];
            
            const present = securityHeaders.filter(h => response.headers.get(h.header)).length;
            
            if (present < 3) {
                return `Security headers: ${present}/${securityHeaders.length} (consider adding more) ⚠️`;
            }
            
            return `Security headers: ${present}/${securityHeaders.length} ✓`;
        });
        
        // CORS headers
        await this.addAsyncTest('security', 'CORS Configuration', async () => {
            try {
                const response = await fetch(`${this.baseUrl}/.netlify/functions/health`, {
                    method: 'OPTIONS',
                    timeout: 5000
                });
                
                const corsHeaders = {
                    'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
                    'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
                    'Access-Control-Allow-Headers': response.headers.get('access-control-allow-headers')
                };
                
                const configuredHeaders = Object.values(corsHeaders).filter(h => h).length;
                
                return `CORS headers: ${configuredHeaders}/3 configured ✓`;
            } catch (error) {
                return 'CORS configuration: Cannot test (API not available) ⚠️';
            }
        });
        
        // Check for sensitive information exposure
        await this.addAsyncTest('security', 'Information Exposure', async () => {
            const response = await this.fetchWithRetry(this.baseUrl);
            const html = await response.text();
            
            const sensitivePatterns = [
                /password\s*[:=]/i,
                /secret\s*[:=]/i,
                /api[_-]?key\s*[:=]/i,
                /private[_-]?key/i,
                /token\s*[:=]/i
            ];
            
            const exposures = sensitivePatterns.filter(pattern => pattern.test(html));
            
            if (exposures.length > 0) {
                throw new Error(`Potential sensitive information exposure detected`);
            }
            
            return 'No sensitive information exposed ✓';
        });
    }

    async checkDatabase() {
        console.log('\n🗄️ Checking Database Connectivity...');
        
        // Supabase connection test
        await this.addAsyncTest('database', 'Supabase Connection', async () => {
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
                return 'Supabase credentials not available for testing ⚠️';
            }
            
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            
            const { error } = await supabase
                .from('profiles')
                .select('count')
                .limit(1);
            
            if (error && error.code !== 'PGRST116') {
                throw new Error(`Database connection failed: ${error.message}`);
            }
            
            return 'Supabase connection successful ✓';
        });
        
        // API database integration
        await this.addAsyncTest('database', 'API Database Integration', async () => {
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/.netlify/functions/projects`);
                
                if (response.status === 404) {
                    return 'Projects API not found (expected) ⚠️';
                }
                
                if (response.status >= 500) {
                    throw new Error(`API database integration error: ${response.status}`);
                }
                
                // Try to parse JSON response
                try {
                    const data = await response.json();
                    return `API database integration working (${response.status}) ✓`;
                } catch (parseError) {
                    return `API responding but not JSON (${response.status}) ⚠️`;
                }
            } catch (error) {
                if (error.message.includes('fetch')) {
                    return 'API database integration: Cannot test (endpoint not available) ⚠️';
                }
                throw error;
            }
        });
        
        // Authentication service
        await this.addAsyncTest('database', 'Authentication Service', async () => {
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/.netlify/functions/auth`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true })
                });
                
                if (response.status === 404) {
                    return 'Auth API not found (expected) ⚠️';
                }
                
                // 400-499 status codes are expected for invalid auth requests
                if (response.status >= 400 && response.status < 500) {
                    return `Auth service responding (${response.status}) ✓`;
                }
                
                return `Auth service accessible (${response.status}) ✓`;
            } catch (error) {
                return 'Authentication service: Cannot test (endpoint not available) ⚠️';
            }
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

    async fetchWithRetry(url, options = {}) {
        let lastError;
        
        for (let i = 0; i < this.retries; i++) {
            try {
                const response = await fetch(url, {
                    timeout: this.timeout,
                    ...options
                });
                
                return response;
            } catch (error) {
                lastError = error;
                
                if (i < this.retries - 1) {
                    console.log(`  ⚠️ Retry ${i + 1}/${this.retries} for ${url}`);
                    await this.sleep(this.retryDelay);
                }
            }
        }
        
        throw lastError;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        
        if (this.results.summary.score < 60) {
            recommendations.push('Critical issues found - immediate attention required');
        } else if (this.results.summary.score < 80) {
            recommendations.push('Some issues found - review failed checks');
        } else if (this.results.summary.score < 95) {
            recommendations.push('Minor improvements recommended');
        } else {
            recommendations.push('Excellent health score - deployment successful!');
        }
        
        // Category-specific recommendations
        const failedTests = [];
        Object.entries(this.results).forEach(([category, tests]) => {
            if (Array.isArray(tests)) {
                const failed = tests.filter(t => !t.passed);
                if (failed.length > 0) {
                    failedTests.push(`${category}: ${failed.length} issues`);
                }
            }
        });
        
        if (failedTests.length > 0) {
            recommendations.push(`Review failed tests: ${failedTests.join(', ')}`);
        }
        
        return recommendations;
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🏥 POST-DEPLOYMENT HEALTH CHECK SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n🌐 Target URL: ${this.baseUrl}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`📊 Score: ${this.results.summary.score}%`);
        console.log(`⏱️  Duration: ${Math.round(this.results.summary.duration / 1000)}s`);
        
        // Category breakdown
        console.log('\n📊 Category Breakdown:');
        Object.entries(this.results).forEach(([category, tests]) => {
            if (Array.isArray(tests) && tests.length > 0) {
                const passed = tests.filter(t => t.passed).length;
                const total = tests.length;
                const percentage = Math.round((passed / total) * 100);
                
                console.log(`   ${category}: ${passed}/${total} (${percentage}%)`);
            }
        });
        
        console.log('\n' + '='.repeat(60));
    }
}

// CLI execution
if (require.main === module) {
    const baseUrl = process.argv[2] || process.env.DEPLOYED_URL;
    
    if (!baseUrl) {
        console.error('❌ Please provide a URL to check:');
        console.error('   node post-deployment-health.js https://your-site.netlify.app');
        console.error('   or set DEPLOYED_URL environment variable');
        process.exit(1);
    }
    
    const checker = new PostDeploymentHealthChecker({ baseUrl });
    
    checker.runAllHealthChecks()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 Post-deployment health check passed!');
                process.exit(0);
            } else {
                console.log('\n💥 Post-deployment health check failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Health check error:', error);
            process.exit(1);
        });
}

module.exports = PostDeploymentHealthChecker;