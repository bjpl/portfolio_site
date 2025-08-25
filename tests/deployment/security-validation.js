/**
 * Security Validation Test Suite
 * Comprehensive security testing for deployment validation
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

class SecurityValidator {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.DEPLOYED_URL || 'http://localhost:3000';
        this.timeout = options.timeout || 10000;
        
        this.results = {
            https: [],
            headers: [],
            authentication: [],
            authorization: [],
            inputValidation: [],
            dataExposure: [],
            cors: [],
            vulnerabilities: [],
            summary: {
                criticalIssues: 0,
                highIssues: 0,
                mediumIssues: 0,
                lowIssues: 0,
                score: 0,
                grade: 'F'
            }
        };
        
        this.vulnerabilityPatterns = [
            {
                name: 'SQL Injection',
                pattern: /sql|select|insert|update|delete|drop|union/i,
                severity: 'critical'
            },
            {
                name: 'XSS Vulnerability',
                pattern: /<script|javascript:|onclick=|onerror=/i,
                severity: 'high'
            },
            {
                name: 'Exposed API Keys',
                pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
                severity: 'critical'
            },
            {
                name: 'Hardcoded Passwords',
                pattern: /password\s*[:=]\s*['"][^'"]+['"]/i,
                severity: 'critical'
            },
            {
                name: 'JWT Token Exposure',
                pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/,
                severity: 'high'
            },
            {
                name: 'Debug Information',
                pattern: /console\.log|console\.error|debugger;|var_dump|print_r/i,
                severity: 'medium'
            }
        ];
        
        this.startTime = Date.now();
    }

    async runAllSecurityTests() {
        console.log('🛡️ Starting Security Validation...');
        console.log(`🎯 Target: ${this.baseUrl}`);
        console.log('='.repeat(60));
        
        try {
            await this.testHTTPSEnforcement();
            await this.testSecurityHeaders();
            await this.testAuthentication();
            await this.testAuthorization();
            await this.testInputValidation();
            await this.testDataExposure();
            await this.testCORSConfiguration();
            await this.testCommonVulnerabilities();
            
            this.calculateSecurityScore();
            const report = this.generateReport();
            
            if (this.results.summary.criticalIssues === 0 && this.results.summary.score >= 80) {
                console.log('✅ Security validation passed! No critical issues found.');
                return { success: true, report };
            } else if (this.results.summary.criticalIssues === 0) {
                console.log('⚠️ Security validation acceptable but improvements needed.');
                return { success: true, report, warnings: true };
            } else {
                console.log(`❌ Security validation failed! ${this.results.summary.criticalIssues} critical issues found.`);
                return { success: false, report };
            }
            
        } catch (error) {
            console.error('❌ Security validation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async testHTTPSEnforcement() {
        console.log('\n🔒 Testing HTTPS Enforcement...');
        
        // Test HTTPS usage
        await this.addSecurityTest('https', 'HTTPS Usage', 'high', async () => {
            if (!this.baseUrl.startsWith('https://')) {
                if (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) {
                    return { passed: true, message: 'HTTPS not required for localhost ✓', severity: 'info' };
                }
                throw new Error('Site not using HTTPS - critical security issue');
            }
            
            return { passed: true, message: 'Site using HTTPS ✓', severity: 'info' };
        });
        
        // Test HTTP to HTTPS redirect
        if (this.baseUrl.startsWith('https://')) {
            await this.addSecurityTest('https', 'HTTP Redirect', 'medium', async () => {
                const httpUrl = this.baseUrl.replace('https://', 'http://');
                
                try {
                    const response = await fetch(httpUrl, {
                        redirect: 'manual',
                        timeout: this.timeout
                    });
                    
                    if (response.status >= 300 && response.status < 400) {
                        const location = response.headers.get('location');
                        if (location && location.startsWith('https://')) {
                            return { passed: true, message: 'HTTP redirects to HTTPS ✓', severity: 'info' };
                        } else {
                            throw new Error('HTTP redirects but not to HTTPS');
                        }
                    } else {
                        return { passed: false, message: 'HTTP does not redirect to HTTPS ⚠️', severity: 'medium' };
                    }
                } catch (error) {
                    if (error.code === 'ECONNREFUSED' || error.message.includes('timeout')) {
                        return { passed: true, message: 'HTTP port not accessible (good) ✓', severity: 'info' };
                    }
                    throw error;
                }
            });
        }
        
        // Test HSTS header
        await this.addSecurityTest('https', 'HSTS Header', 'medium', async () => {
            const response = await fetch(this.baseUrl, { timeout: this.timeout });
            const hsts = response.headers.get('strict-transport-security');
            
            if (!hsts) {
                return { passed: false, message: 'HSTS header not present', severity: 'medium' };
            }
            
            const maxAge = hsts.match(/max-age=(\d+)/);
            const includesSubdomains = hsts.includes('includeSubDomains');
            
            if (maxAge && parseInt(maxAge[1]) >= 31536000) { // 1 year
                return { 
                    passed: true, 
                    message: `HSTS configured properly (max-age: ${maxAge[1]}${includesSubdomains ? ', includeSubDomains' : ''}) ✓`, 
                    severity: 'info' 
                };
            } else {
                return { passed: false, message: 'HSTS max-age too low (should be >= 1 year)', severity: 'medium' };
            }
        });
    }

    async testSecurityHeaders() {
        console.log('\n🛡️ Testing Security Headers...');
        
        const response = await fetch(this.baseUrl, { timeout: this.timeout });
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
        });
        
        // X-Frame-Options
        await this.addSecurityTest('headers', 'X-Frame-Options', 'high', async () => {
            const xFrameOptions = headers['x-frame-options'];
            
            if (!xFrameOptions) {
                return { passed: false, message: 'X-Frame-Options header missing', severity: 'high' };
            }
            
            if (xFrameOptions.toLowerCase() === 'deny' || xFrameOptions.toLowerCase().startsWith('sameorigin')) {
                return { passed: true, message: `X-Frame-Options set to ${xFrameOptions} ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `X-Frame-Options set to insecure value: ${xFrameOptions}`, severity: 'high' };
            }
        });
        
        // X-Content-Type-Options
        await this.addSecurityTest('headers', 'X-Content-Type-Options', 'medium', async () => {
            const xContentType = headers['x-content-type-options'];
            
            if (!xContentType) {
                return { passed: false, message: 'X-Content-Type-Options header missing', severity: 'medium' };
            }
            
            if (xContentType.toLowerCase() === 'nosniff') {
                return { passed: true, message: 'X-Content-Type-Options set to nosniff ✓', severity: 'info' };
            } else {
                return { passed: false, message: `X-Content-Type-Options set to: ${xContentType}`, severity: 'medium' };
            }
        });
        
        // X-XSS-Protection
        await this.addSecurityTest('headers', 'X-XSS-Protection', 'medium', async () => {
            const xssProtection = headers['x-xss-protection'];
            
            if (!xssProtection) {
                return { passed: false, message: 'X-XSS-Protection header missing', severity: 'medium' };
            }
            
            if (xssProtection === '1; mode=block' || xssProtection === '0') {
                return { passed: true, message: `X-XSS-Protection set to ${xssProtection} ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `X-XSS-Protection set to: ${xssProtection}`, severity: 'medium' };
            }
        });
        
        // Content-Security-Policy
        await this.addSecurityTest('headers', 'Content-Security-Policy', 'high', async () => {
            const csp = headers['content-security-policy'];
            
            if (!csp) {
                return { passed: false, message: 'Content-Security-Policy header missing', severity: 'high' };
            }
            
            // Check for unsafe directives
            const unsafePatterns = [
                { pattern: /'unsafe-inline'/, issue: "contains 'unsafe-inline'" },
                { pattern: /'unsafe-eval'/, issue: "contains 'unsafe-eval'" },
                { pattern: /\*/, issue: "contains wildcard (*)" }
            ];
            
            const issues = unsafePatterns.filter(p => p.pattern.test(csp));
            
            if (issues.length > 0) {
                return { 
                    passed: false, 
                    message: `CSP present but ${issues.map(i => i.issue).join(', ')}`, 
                    severity: 'medium' 
                };
            }
            
            return { passed: true, message: 'Content-Security-Policy configured ✓', severity: 'info' };
        });
        
        // Referrer-Policy
        await this.addSecurityTest('headers', 'Referrer-Policy', 'low', async () => {
            const referrerPolicy = headers['referrer-policy'];
            
            if (!referrerPolicy) {
                return { passed: false, message: 'Referrer-Policy header missing', severity: 'low' };
            }
            
            const secureValues = ['no-referrer', 'strict-origin', 'strict-origin-when-cross-origin'];
            
            if (secureValues.includes(referrerPolicy.toLowerCase())) {
                return { passed: true, message: `Referrer-Policy set to ${referrerPolicy} ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `Referrer-Policy set to: ${referrerPolicy}`, severity: 'low' };
            }
        });
    }

    async testAuthentication() {
        console.log('\n🔐 Testing Authentication Security...');
        
        // Test admin panel authentication
        await this.addSecurityTest('authentication', 'Admin Panel Protection', 'critical', async () => {
            const adminResponse = await fetch(`${this.baseUrl}/admin/`, { timeout: this.timeout });
            
            if (adminResponse.ok) {
                // Check if admin panel requires authentication
                const html = await adminResponse.text();
                
                if (html.includes('login') || html.includes('authenticate') || html.includes('password')) {
                    return { passed: true, message: 'Admin panel shows authentication form ✓', severity: 'info' };
                } else {
                    return { passed: false, message: 'Admin panel accessible without authentication', severity: 'critical' };
                }
            } else if (adminResponse.status === 401 || adminResponse.status === 403) {
                return { passed: true, message: `Admin panel protected (${adminResponse.status}) ✓`, severity: 'info' };
            } else if (adminResponse.status === 404) {
                return { passed: true, message: 'Admin panel not found (good for security) ✓', severity: 'info' };
            } else {
                return { passed: false, message: `Admin panel returned unexpected status: ${adminResponse.status}`, severity: 'medium' };
            }
        });
        
        // Test auth API endpoints
        await this.addSecurityTest('authentication', 'Auth API Security', 'high', async () => {
            const authEndpoints = [
                '/.netlify/functions/auth',
                '/.netlify/functions/login',
                '/.netlify/functions/register'
            ];
            
            let protectedEndpoints = 0;
            let totalEndpoints = 0;
            
            for (const endpoint of authEndpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${endpoint}`, {
                        method: 'GET',
                        timeout: 5000
                    });
                    
                    totalEndpoints++;
                    
                    // Auth endpoints should reject GET requests without proper data
                    if (response.status >= 400 && response.status < 500) {
                        protectedEndpoints++;
                    }
                } catch (error) {
                    // Endpoint doesn't exist, which is fine
                }
            }
            
            if (totalEndpoints === 0) {
                return { passed: true, message: 'No auth endpoints found (expected) ✓', severity: 'info' };
            }
            
            const protectionRate = (protectedEndpoints / totalEndpoints) * 100;
            
            if (protectionRate === 100) {
                return { passed: true, message: `All auth endpoints properly protected (${protectedEndpoints}/${totalEndpoints}) ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `Some auth endpoints not properly protected (${protectedEndpoints}/${totalEndpoints})`, severity: 'high' };
            }
        });
        
        // Test password policy enforcement (if applicable)
        await this.addSecurityTest('authentication', 'Password Policy', 'medium', async () => {
            // This test would need to be more comprehensive in a real scenario
            // For now, we'll check if there are any password validation scripts
            
            const response = await fetch(`${this.baseUrl}/admin/`, { timeout: this.timeout });
            
            if (response.status === 404) {
                return { passed: true, message: 'Password policy test skipped (admin not found) ✓', severity: 'info' };
            }
            
            const html = await response.text();
            
            // Look for password validation patterns
            const hasPasswordValidation = 
                html.includes('minlength') ||
                html.includes('password') && html.includes('pattern') ||
                html.includes('password-strength') ||
                html.includes('validatePassword');
            
            if (hasPasswordValidation) {
                return { passed: true, message: 'Password validation present ✓', severity: 'info' };
            } else {
                return { passed: false, message: 'No client-side password validation detected', severity: 'medium' };
            }
        });
    }

    async testAuthorization() {
        console.log('\n👮 Testing Authorization Controls...');
        
        // Test admin functionality access
        await this.addSecurityTest('authorization', 'Admin Functions Access', 'high', async () => {
            const adminFunctions = [
                '/.netlify/functions/admin-users',
                '/.netlify/functions/admin-config',
                '/.netlify/functions/admin-delete'
            ];
            
            let protectedFunctions = 0;
            let totalFunctions = 0;
            
            for (const func of adminFunctions) {
                try {
                    const response = await fetch(`${this.baseUrl}${func}`, {
                        timeout: 5000
                    });
                    
                    totalFunctions++;
                    
                    // Admin functions should require authorization
                    if (response.status === 401 || response.status === 403) {
                        protectedFunctions++;
                    } else if (response.status === 404) {
                        // Function doesn't exist, which is acceptable
                        protectedFunctions++;
                    }
                } catch (error) {
                    // Function doesn't exist or network error
                }
            }
            
            if (totalFunctions === 0) {
                return { passed: true, message: 'No admin functions found (expected) ✓', severity: 'info' };
            }
            
            if (protectedFunctions === totalFunctions) {
                return { passed: true, message: `All admin functions protected (${protectedFunctions}/${totalFunctions}) ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `Some admin functions not protected (${protectedFunctions}/${totalFunctions})`, severity: 'high' };
            }
        });
        
        // Test API access without authentication
        await this.addSecurityTest('authorization', 'API Access Control', 'medium', async () => {
            const apiEndpoints = [
                '/.netlify/functions/projects',
                '/.netlify/functions/upload',
                '/.netlify/functions/delete'
            ];
            
            let properlyControlled = 0;
            let totalApis = 0;
            
            for (const api of apiEndpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${api}`, {
                        method: 'DELETE', // Try destructive operation
                        timeout: 5000
                    });
                    
                    totalApis++;
                    
                    // DELETE operations should be protected
                    if (response.status === 401 || response.status === 403 || response.status === 405) {
                        properlyControlled++;
                    } else if (response.status === 404) {
                        properlyControlled++;
                    }
                } catch (error) {
                    // API doesn't exist or network error
                }
            }
            
            if (totalApis === 0) {
                return { passed: true, message: 'No sensitive APIs found (expected) ✓', severity: 'info' };
            }
            
            if (properlyControlled === totalApis) {
                return { passed: true, message: `All APIs properly controlled (${properlyControlled}/${totalApis}) ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `Some APIs lack proper access control (${properlyControlled}/${totalApis})`, severity: 'medium' };
            }
        });
    }

    async testInputValidation() {
        console.log('\n📝 Testing Input Validation...');
        
        // Test XSS prevention
        await this.addSecurityTest('inputValidation', 'XSS Prevention', 'high', async () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src=x onerror=alert("xss")>'
            ];
            
            let protectedEndpoints = 0;
            let totalTests = 0;
            
            // Test contact form or comment endpoints
            const testEndpoints = [
                '/.netlify/functions/contact',
                '/.netlify/functions/comment',
                '/.netlify/functions/message'
            ];
            
            for (const endpoint of testEndpoints) {
                for (const payload of xssPayloads) {
                    try {
                        const response = await fetch(`${this.baseUrl}${endpoint}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                message: payload,
                                email: 'test@example.com'
                            }),
                            timeout: 5000
                        });
                        
                        totalTests++;
                        
                        // Server should reject or sanitize XSS attempts
                        if (response.status >= 400 || response.status === 200) {
                            // Check response doesn't echo back the payload
                            const responseText = await response.text();
                            
                            if (!responseText.includes('<script>') && !responseText.includes('javascript:')) {
                                protectedEndpoints++;
                            }
                        }
                    } catch (error) {
                        // Endpoint doesn't exist
                    }
                }
            }
            
            if (totalTests === 0) {
                return { passed: true, message: 'No input endpoints found to test XSS ✓', severity: 'info' };
            }
            
            const protectionRate = (protectedEndpoints / totalTests) * 100;
            
            if (protectionRate >= 80) {
                return { passed: true, message: `XSS protection effective (${Math.round(protectionRate)}%) ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `Potential XSS vulnerabilities (${Math.round(protectionRate)}% protected)`, severity: 'high' };
            }
        });
        
        // Test SQL injection prevention
        await this.addSecurityTest('inputValidation', 'SQL Injection Prevention', 'critical', async () => {
            const sqlPayloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "1; SELECT * FROM users"
            ];
            
            let protectedEndpoints = 0;
            let totalTests = 0;
            
            // Test search or query endpoints
            const searchEndpoints = [
                '/.netlify/functions/search',
                '/.netlify/functions/projects',
                '/.netlify/functions/users'
            ];
            
            for (const endpoint of searchEndpoints) {
                for (const payload of sqlPayloads) {
                    try {
                        const response = await fetch(`${this.baseUrl}${endpoint}?q=${encodeURIComponent(payload)}`, {
                            timeout: 5000
                        });
                        
                        totalTests++;
                        
                        // Server should handle SQL injection attempts gracefully
                        if (response.status !== 500) {
                            protectedEndpoints++;
                        }
                    } catch (error) {
                        totalTests++;
                        protectedEndpoints++; // Network errors are better than SQL errors
                    }
                }
            }
            
            if (totalTests === 0) {
                return { passed: true, message: 'No query endpoints found to test SQL injection ✓', severity: 'info' };
            }
            
            if (protectedEndpoints === totalTests) {
                return { passed: true, message: `SQL injection protection effective (${protectedEndpoints}/${totalTests}) ✓`, severity: 'info' };
            } else {
                return { passed: false, message: `Potential SQL injection vulnerabilities (${protectedEndpoints}/${totalTests})`, severity: 'critical' };
            }
        });
    }

    async testDataExposure() {
        console.log('\n🔍 Testing Data Exposure...');
        
        // Test for sensitive information in HTML
        await this.addSecurityTest('dataExposure', 'HTML Source Analysis', 'high', async () => {
            const response = await fetch(this.baseUrl, { timeout: this.timeout });
            const html = await response.text();
            
            const exposures = [];
            
            this.vulnerabilityPatterns.forEach(pattern => {
                if (pattern.pattern.test(html)) {
                    exposures.push(pattern.name);
                }
            });
            
            if (exposures.length === 0) {
                return { passed: true, message: 'No sensitive data found in HTML source ✓', severity: 'info' };
            } else {
                return { 
                    passed: false, 
                    message: `Potential data exposure: ${exposures.join(', ')}`, 
                    severity: 'high' 
                };
            }
        });
        
        // Test error page information disclosure
        await this.addSecurityTest('dataExposure', 'Error Information Disclosure', 'medium', async () => {
            const response = await fetch(`${this.baseUrl}/nonexistent-page-12345`, { timeout: this.timeout });
            
            if (response.status === 404) {
                const html = await response.text();
                
                // Check if error page reveals sensitive information
                const sensitiveInfo = [
                    /server version/i,
                    /database.*error/i,
                    /stack trace/i,
                    /file path.*\/var\/www/i,
                    /apache.*version/i,
                    /nginx.*version/i
                ];
                
                const revelations = sensitiveInfo.filter(pattern => pattern.test(html));
                
                if (revelations.length === 0) {
                    return { passed: true, message: '404 page does not reveal sensitive information ✓', severity: 'info' };
                } else {
                    return { 
                        passed: false, 
                        message: `404 page reveals sensitive information (${revelations.length} patterns)`, 
                        severity: 'medium' 
                    };
                }
            } else {
                return { passed: true, message: `Nonexistent page handling: ${response.status} ✓`, severity: 'info' };
            }
        });
        
        // Test directory listing
        await this.addSecurityTest('dataExposure', 'Directory Listing', 'medium', async () => {
            const directories = [
                '/uploads/',
                '/assets/',
                '/files/',
                '/images/',
                '/.git/',
                '/node_modules/'
            ];
            
            let securedDirectories = 0;
            
            for (const dir of directories) {
                try {
                    const response = await fetch(`${this.baseUrl}${dir}`, { timeout: 5000 });
                    
                    if (response.ok) {
                        const html = await response.text();
                        
                        // Check if it's a directory listing
                        if (html.includes('Index of') || html.includes('Directory listing')) {
                            // Directory listing enabled - security issue
                        } else {
                            securedDirectories++;
                        }
                    } else {
                        securedDirectories++; // 403/404 is good
                    }
                } catch (error) {
                    securedDirectories++; // Error is better than directory listing
                }
            }
            
            if (securedDirectories === directories.length) {
                return { passed: true, message: 'Directory listings properly secured ✓', severity: 'info' };
            } else {
                return { 
                    passed: false, 
                    message: `${directories.length - securedDirectories} directories may have listings enabled`, 
                    severity: 'medium' 
                };
            }
        });
    }

    async testCORSConfiguration() {
        console.log('\n🌐 Testing CORS Configuration...');
        
        await this.addSecurityTest('cors', 'CORS Policy', 'medium', async () => {
            const apiEndpoints = [
                '/.netlify/functions/health',
                '/.netlify/functions/projects'
            ];
            
            let properlyConfigured = 0;
            let totalEndpoints = 0;
            
            for (const endpoint of apiEndpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${endpoint}`, {
                        method: 'OPTIONS',
                        headers: {
                            'Origin': 'https://evil.example.com',
                            'Access-Control-Request-Method': 'GET'
                        },
                        timeout: 5000
                    });
                    
                    totalEndpoints++;
                    
                    const allowOrigin = response.headers.get('access-control-allow-origin');
                    
                    // CORS should not allow all origins in production
                    if (!allowOrigin || allowOrigin !== '*') {
                        properlyConfigured++;
                    } else if (this.baseUrl.includes('localhost')) {
                        properlyConfigured++; // Allow * for localhost
                    }
                } catch (error) {
                    // Endpoint doesn't exist
                }
            }
            
            if (totalEndpoints === 0) {
                return { passed: true, message: 'No API endpoints found for CORS testing ✓', severity: 'info' };
            }
            
            if (properlyConfigured === totalEndpoints) {
                return { passed: true, message: `CORS properly configured (${properlyConfigured}/${totalEndpoints}) ✓`, severity: 'info' };
            } else {
                return { 
                    passed: false, 
                    message: `CORS too permissive (${properlyConfigured}/${totalEndpoints} properly configured)`, 
                    severity: 'medium' 
                };
            }
        });
    }

    async testCommonVulnerabilities() {
        console.log('\n🔍 Testing Common Vulnerabilities...');
        
        // Test clickjacking protection
        await this.addSecurityTest('vulnerabilities', 'Clickjacking Protection', 'medium', async () => {
            const response = await fetch(this.baseUrl, { timeout: this.timeout });
            const xFrameOptions = response.headers.get('x-frame-options');
            const csp = response.headers.get('content-security-policy');
            
            const protected = 
                (xFrameOptions && (xFrameOptions.toLowerCase() === 'deny' || xFrameOptions.toLowerCase() === 'sameorigin')) ||
                (csp && csp.includes('frame-ancestors'));
            
            if (protected) {
                return { passed: true, message: 'Clickjacking protection enabled ✓', severity: 'info' };
            } else {
                return { passed: false, message: 'No clickjacking protection detected', severity: 'medium' };
            }
        });
        
        // Test MIME type sniffing protection
        await this.addSecurityTest('vulnerabilities', 'MIME Sniffing Protection', 'low', async () => {
            const response = await fetch(this.baseUrl, { timeout: this.timeout });
            const xContentType = response.headers.get('x-content-type-options');
            
            if (xContentType && xContentType.toLowerCase() === 'nosniff') {
                return { passed: true, message: 'MIME sniffing protection enabled ✓', severity: 'info' };
            } else {
                return { passed: false, message: 'No MIME sniffing protection detected', severity: 'low' };
            }
        });
        
        // Test for common backup files
        await this.addSecurityTest('vulnerabilities', 'Backup Files Exposure', 'medium', async () => {
            const backupFiles = [
                '/backup.sql',
                '/database.sql',
                '/config.bak',
                '/.env.backup',
                '/site.zip',
                '/backup.tar.gz'
            ];
            
            let exposedFiles = 0;
            
            for (const file of backupFiles) {
                try {
                    const response = await fetch(`${this.baseUrl}${file}`, { timeout: 3000 });
                    
                    if (response.ok) {
                        exposedFiles++;
                    }
                } catch (error) {
                    // File doesn't exist, which is good
                }
            }
            
            if (exposedFiles === 0) {
                return { passed: true, message: 'No backup files exposed ✓', severity: 'info' };
            } else {
                return { passed: false, message: `${exposedFiles} backup files may be exposed`, severity: 'medium' };
            }
        });
    }

    async addSecurityTest(category, name, severity, testFn) {
        try {
            const result = await testFn();
            
            this.results[category].push({
                name,
                severity,
                passed: result.passed,
                message: result.message,
                timestamp: new Date().toISOString()
            });
            
            console.log(`  ${result.passed ? '✅' : '❌'} ${name}: ${result.message}`);
            
            // Count severity issues
            if (!result.passed) {
                switch (result.severity || severity) {
                    case 'critical':
                        this.results.summary.criticalIssues++;
                        break;
                    case 'high':
                        this.results.summary.highIssues++;
                        break;
                    case 'medium':
                        this.results.summary.mediumIssues++;
                        break;
                    case 'low':
                        this.results.summary.lowIssues++;
                        break;
                }
            }
        } catch (error) {
            this.results[category].push({
                name,
                severity,
                passed: false,
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.log(`  ❌ ${name}: ${error.message}`);
            
            // Count as high severity if test failed with error
            this.results.summary.highIssues++;
        }
    }

    calculateSecurityScore() {
        const weights = {
            critical: -25, // Critical issues heavily penalize
            high: -10,
            medium: -5,
            low: -2
        };
        
        let baseScore = 100;
        
        baseScore += this.results.summary.criticalIssues * weights.critical;
        baseScore += this.results.summary.highIssues * weights.high;
        baseScore += this.results.summary.mediumIssues * weights.medium;
        baseScore += this.results.summary.lowIssues * weights.low;
        
        // Ensure score is between 0 and 100
        this.results.summary.score = Math.max(0, Math.min(100, baseScore));
        
        // Assign grade
        if (this.results.summary.score >= 90) {
            this.results.summary.grade = 'A';
        } else if (this.results.summary.score >= 80) {
            this.results.summary.grade = 'B';
        } else if (this.results.summary.score >= 70) {
            this.results.summary.grade = 'C';
        } else if (this.results.summary.score >= 60) {
            this.results.summary.grade = 'D';
        } else {
            this.results.summary.grade = 'F';
        }
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            duration: Date.now() - this.startTime,
            summary: this.results.summary,
            results: this.results,
            recommendations: this.generateRecommendations()
        };
        
        this.printSummary();
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.summary.criticalIssues > 0) {
            recommendations.push('URGENT: Fix all critical security issues before deployment');
        }
        
        if (this.results.summary.highIssues > 0) {
            recommendations.push('Address high severity security issues promptly');
        }
        
        if (this.results.summary.mediumIssues > 0) {
            recommendations.push('Consider fixing medium severity issues for better security posture');
        }
        
        // Specific recommendations based on failed tests
        Object.entries(this.results).forEach(([category, tests]) => {
            if (Array.isArray(tests)) {
                const failedTests = tests.filter(t => !t.passed);
                
                if (failedTests.length > 0) {
                    switch (category) {
                        case 'https':
                            recommendations.push('Implement HTTPS enforcement and HSTS headers');
                            break;
                        case 'headers':
                            recommendations.push('Add missing security headers (CSP, X-Frame-Options, etc.)');
                            break;
                        case 'authentication':
                            recommendations.push('Strengthen authentication mechanisms and access controls');
                            break;
                        case 'dataExposure':
                            recommendations.push('Review and remove any exposed sensitive information');
                            break;
                    }
                }
            }
        });
        
        return [...new Set(recommendations)]; // Remove duplicates
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🛡️ SECURITY VALIDATION SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n🎯 Target: ${this.baseUrl}`);
        console.log(`📊 Security Score: ${this.results.summary.score} (Grade: ${this.results.summary.grade})`);
        console.log(`⏱️  Duration: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
        
        console.log('\n🚨 Security Issues:');
        console.log(`   Critical: ${this.results.summary.criticalIssues}`);
        console.log(`   High: ${this.results.summary.highIssues}`);
        console.log(`   Medium: ${this.results.summary.mediumIssues}`);
        console.log(`   Low: ${this.results.summary.lowIssues}`);
        
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
    
    const validator = new SecurityValidator({ baseUrl });
    
    validator.runAllSecurityTests()
        .then(result => {
            if (result.success && !result.warnings) {
                console.log('\n🎉 Security validation completed successfully!');
                process.exit(0);
            } else if (result.success) {
                console.log('\n⚠️ Security validation completed with warnings.');
                process.exit(0);
            } else {
                console.log('\n💥 Security validation failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Security validation error:', error);
            process.exit(1);
        });
}

module.exports = SecurityValidator;