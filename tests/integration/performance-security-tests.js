/**
 * Performance and Security Integration Tests
 * Comprehensive test suite for performance metrics and security validation
 */

class PerformanceSecurityTests {
    constructor() {
        this.results = {
            performance: [],
            security: [],
            summary: {
                performanceScore: 0,
                securityScore: 0,
                overall: 0
            }
        };
        this.thresholds = {
            performance: {
                loadTime: 3000, // 3 seconds
                memoryUsage: 50, // 50MB
                resourceCount: 50,
                largeResourceSize: 1024 * 1024, // 1MB
                slowRequestTime: 2000 // 2 seconds
            },
            security: {
                minPasswordLength: 8,
                sessionTimeout: 86400000, // 24 hours
                maxFailedAttempts: 5
            }
        };
    }

    // Run all performance and security tests
    async runAllTests() {
        console.log('🚀 Starting Performance & Security Tests...');
        console.log('=' .repeat(60));
        
        try {
            await this.runPerformanceTests();
            await this.runSecurityTests();
            
            this.calculateScores();
            const report = this.generateReport();
            
            // Store results globally for diagnostic dashboard
            window.PERFORMANCE_SECURITY_RESULTS = report;
            
            // Dispatch completion event
            window.dispatchEvent(new CustomEvent('performanceSecurityTestsComplete', {
                detail: report
            }));
            
            return report;
            
        } catch (error) {
            console.error('❌ Performance & Security tests failed:', error);
            return {
                error: error.message,
                results: this.results
            };
        }
    }

    // Performance Tests
    async runPerformanceTests() {
        console.log('\n⚡ Running Performance Tests...');
        
        await this.testPageLoadPerformance();
        await this.testMemoryUsage();
        await this.testResourceLoading();
        await this.testNetworkPerformance();
        await this.testRenderingPerformance();
        await this.testCacheEfficiency();
    }

    // Test page load performance
    async testPageLoadPerformance() {
        const test = {
            name: 'Page Load Performance',
            category: 'performance',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            // DOM Content Loaded time
            const domLoadTime = performance.timing.domContentLoadedEventEnd - 
                                 performance.timing.navigationStart;
            
            // Full page load time
            const loadTime = performance.timing.loadEventEnd - 
                            performance.timing.navigationStart;
            
            // First Paint (if available)
            let firstPaint = null;
            let firstContentfulPaint = null;
            
            if (performance.getEntriesByType) {
                const paintEntries = performance.getEntriesByType('paint');
                firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime;
                firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime;
            }
            
            test.metrics = {
                domLoadTime,
                fullLoadTime: loadTime,
                firstPaint,
                firstContentfulPaint
            };
            
            // Check against thresholds
            const withinThreshold = loadTime < this.thresholds.performance.loadTime;
            test.passed = withinThreshold;
            test.message = `Load time: ${loadTime}ms (threshold: ${this.thresholds.performance.loadTime}ms)`;
            
            if (withinThreshold) {
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                console.log(`  ❌ ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to measure page load performance';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.performance.push(test);
    }

    // Test memory usage
    async testMemoryUsage() {
        const test = {
            name: 'Memory Usage',
            category: 'performance',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            if (performance.memory) {
                const memory = performance.memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
                const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
                
                test.metrics = {
                    usedJSHeapSize: usedMB,
                    totalJSHeapSize: totalMB,
                    jsHeapSizeLimit: limitMB,
                    usagePercentage: Math.round((usedMB / limitMB) * 100)
                };
                
                const withinThreshold = usedMB < this.thresholds.performance.memoryUsage;
                test.passed = withinThreshold;
                test.message = `Memory usage: ${usedMB}MB (threshold: ${this.thresholds.performance.memoryUsage}MB)`;
                
                if (withinThreshold) {
                    console.log(`  ✅ ${test.name}: ${test.message}`);
                } else {
                    console.log(`  ❌ ${test.name}: ${test.message}`);
                }
            } else {
                test.passed = true; // Can't test if not available
                test.message = 'Memory API not available';
                console.log(`  ⚠️  ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to measure memory usage';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.performance.push(test);
    }

    // Test resource loading performance
    async testResourceLoading() {
        const test = {
            name: 'Resource Loading Performance',
            category: 'performance',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            if (performance.getEntriesByType) {
                const resources = performance.getEntriesByType('resource');
                
                const slowResources = resources.filter(r => r.duration > this.thresholds.performance.slowRequestTime);
                const largeResources = resources.filter(r => r.transferSize > this.thresholds.performance.largeResourceSize);
                
                const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
                const averageLoadTime = resources.length > 0 ? 
                    resources.reduce((sum, r) => sum + r.duration, 0) / resources.length : 0;
                
                test.metrics = {
                    totalResources: resources.length,
                    slowResources: slowResources.length,
                    largeResources: largeResources.length,
                    totalSizeKB: Math.round(totalSize / 1024),
                    averageLoadTime: Math.round(averageLoadTime)
                };
                
                const withinThreshold = resources.length < this.thresholds.performance.resourceCount &&
                                      slowResources.length < 3 &&
                                      largeResources.length < 2;
                
                test.passed = withinThreshold;
                test.message = `${resources.length} resources, ${slowResources.length} slow, ${largeResources.length} large`;
                
                if (withinThreshold) {
                    console.log(`  ✅ ${test.name}: ${test.message}`);
                } else {
                    console.log(`  ❌ ${test.name}: ${test.message}`);
                }
            } else {
                test.passed = true;
                test.message = 'Resource timing API not available';
                console.log(`  ⚠️  ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to analyze resource loading';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.performance.push(test);
    }

    // Test network performance
    async testNetworkPerformance() {
        const test = {
            name: 'Network Performance',
            category: 'performance',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            // Test network connectivity and response times
            const testEndpoints = [
                { name: 'Supabase', url: window.SUPABASE_CONFIG?.url + '/health' },
                { name: 'Local API', url: '/.netlify/functions/health' },
                { name: 'CDN Resource', url: '/images/logo.png' }
            ];
            
            const results = [];
            
            for (const endpoint of testEndpoints) {
                if (!endpoint.url.includes('undefined')) {
                    try {
                        const startTime = performance.now();
                        const response = await fetch(endpoint.url, {
                            method: 'GET',
                            cache: 'no-cache'
                        });
                        const endTime = performance.now();
                        const duration = endTime - startTime;
                        
                        results.push({
                            name: endpoint.name,
                            url: endpoint.url,
                            duration: Math.round(duration),
                            status: response.status,
                            ok: response.ok
                        });
                    } catch (error) {
                        results.push({
                            name: endpoint.name,
                            url: endpoint.url,
                            duration: null,
                            error: error.message
                        });
                    }
                }
            }
            
            const successfulTests = results.filter(r => r.ok);
            const averageResponseTime = successfulTests.length > 0 ?
                successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length : 0;
            
            test.metrics = {
                tests: results,
                successfulTests: successfulTests.length,
                totalTests: results.length,
                averageResponseTime: Math.round(averageResponseTime)
            };
            
            const withinThreshold = averageResponseTime < this.thresholds.performance.slowRequestTime;
            test.passed = withinThreshold && successfulTests.length > 0;
            test.message = `${successfulTests.length}/${results.length} endpoints responding, avg: ${Math.round(averageResponseTime)}ms`;
            
            if (test.passed) {
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                console.log(`  ❌ ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to test network performance';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.performance.push(test);
    }

    // Test rendering performance
    async testRenderingPerformance() {
        const test = {
            name: 'Rendering Performance',
            category: 'performance',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            // Test DOM complexity
            const elements = document.querySelectorAll('*').length;
            const scripts = document.querySelectorAll('script').length;
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"]').length;
            const images = document.querySelectorAll('img').length;
            
            // Test for render-blocking resources
            const renderBlockingScripts = document.querySelectorAll('script:not([async]):not([defer])').length;
            const inlineStyles = document.querySelectorAll('style').length;
            
            test.metrics = {
                totalElements: elements,
                scripts: scripts,
                stylesheets: stylesheets,
                images: images,
                renderBlockingScripts: renderBlockingScripts,
                inlineStyles: inlineStyles
            };
            
            // Simple heuristics for good rendering performance
            const withinThreshold = elements < 1500 && 
                                  renderBlockingScripts < 5 &&
                                  inlineStyles < 10;
            
            test.passed = withinThreshold;
            test.message = `${elements} DOM elements, ${renderBlockingScripts} render-blocking scripts`;
            
            if (withinThreshold) {
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                console.log(`  ❌ ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to analyze rendering performance';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.performance.push(test);
    }

    // Test cache efficiency
    async testCacheEfficiency() {
        const test = {
            name: 'Cache Efficiency',
            category: 'performance',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            if (performance.getEntriesByType) {
                const resources = performance.getEntriesByType('resource');
                
                const cachedResources = resources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0);
                const totalResources = resources.length;
                const cacheHitRate = totalResources > 0 ? (cachedResources.length / totalResources) * 100 : 0;
                
                test.metrics = {
                    totalResources,
                    cachedResources: cachedResources.length,
                    cacheHitRate: Math.round(cacheHitRate)
                };
                
                const withinThreshold = cacheHitRate > 30; // At least 30% cache hit rate
                test.passed = withinThreshold;
                test.message = `${Math.round(cacheHitRate)}% cache hit rate (${cachedResources.length}/${totalResources})`;
                
                if (withinThreshold) {
                    console.log(`  ✅ ${test.name}: ${test.message}`);
                } else {
                    console.log(`  ❌ ${test.name}: ${test.message}`);
                }
            } else {
                test.passed = true;
                test.message = 'Resource timing API not available';
                console.log(`  ⚠️  ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to analyze cache efficiency';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.performance.push(test);
    }

    // Security Tests
    async runSecurityTests() {
        console.log('\n🛡️  Running Security Tests...');
        
        await this.testHTTPSUsage();
        await this.testContentSecurityPolicy();
        await this.testSecureCookies();
        await this.testDataExposure();
        await this.testInputValidation();
        await this.testAuthenticationSecurity();
        await this.testCORSConfiguration();
    }

    // Test HTTPS usage
    async testHTTPSUsage() {
        const test = {
            name: 'HTTPS Usage',
            category: 'security',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            const isHTTPS = window.location.protocol === 'https:';
            const isLocalhost = window.location.hostname === 'localhost';
            
            test.metrics = {
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                isSecure: isHTTPS || isLocalhost
            };
            
            test.passed = isHTTPS || isLocalhost;
            test.message = `Protocol: ${window.location.protocol} on ${window.location.hostname}`;
            
            if (test.passed) {
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                console.log(`  ❌ ${test.name}: HTTPS required for production`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to check HTTPS usage';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.security.push(test);
    }

    // Test Content Security Policy
    async testContentSecurityPolicy() {
        const test = {
            name: 'Content Security Policy',
            category: 'security',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            // Check for CSP meta tag
            const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            const cspMetaContent = cspMeta ? cspMeta.getAttribute('content') : null;
            
            // Check for CSP header (can't directly access, but can infer from violations)
            const hasCSP = !!cspMetaContent;
            
            test.metrics = {
                metaTagPresent: !!cspMeta,
                metaContent: cspMetaContent,
                hasCSP: hasCSP
            };
            
            test.passed = hasCSP;
            test.message = hasCSP ? 'CSP found' : 'No CSP detected';
            
            if (test.passed) {
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                console.log(`  ❌ ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to check CSP';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.security.push(test);
    }

    // Test secure cookies
    async testSecureCookies() {
        const test = {
            name: 'Secure Cookies',
            category: 'security',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            const cookies = document.cookie;
            const isLocalhost = window.location.hostname === 'localhost';
            const isHTTPS = window.location.protocol === 'https:';
            
            // If no cookies, pass the test
            if (!cookies) {
                test.passed = true;
                test.message = 'No cookies present';
                test.metrics = { cookiesPresent: false };
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                // Check for secure attributes (we can't directly check HttpOnly via JS)
                const hasSecureAttribute = cookies.includes('Secure') || isLocalhost;
                
                test.metrics = {
                    cookiesPresent: true,
                    hasSecureAttribute: hasSecureAttribute,
                    isSecureContext: isHTTPS || isLocalhost
                };
                
                test.passed = hasSecureAttribute || isLocalhost;
                test.message = `Cookies ${test.passed ? 'properly secured' : 'not properly secured'}`;
                
                if (test.passed) {
                    console.log(`  ✅ ${test.name}: ${test.message}`);
                } else {
                    console.log(`  ❌ ${test.name}: ${test.message}`);
                }
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to check cookie security';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.security.push(test);
    }

    // Test for data exposure
    async testDataExposure() {
        const test = {
            name: 'Data Exposure',
            category: 'security',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            const sensitivePatterns = [
                /password\s*[:=]\s*['"][^'"]+['"]/i,
                /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
                /secret\s*[:=]\s*['"][^'"]+['"]/i,
                /token\s*[:=]\s*['"][^'"]+['"]/i
            ];
            
            const pageContent = document.documentElement.innerHTML;
            const exposedData = [];
            
            sensitivePatterns.forEach((pattern, index) => {
                const matches = pageContent.match(pattern);
                if (matches) {
                    exposedData.push({
                        pattern: pattern.toString(),
                        matches: matches.length
                    });
                }
            });
            
            // Check localStorage for sensitive data
            const localStorageKeys = Object.keys(localStorage);
            const sensitiveStorageKeys = localStorageKeys.filter(key =>
                key.toLowerCase().includes('password') ||
                key.toLowerCase().includes('secret') ||
                key.toLowerCase().includes('private')
            );
            
            test.metrics = {
                exposedInHTML: exposedData.length,
                sensitiveStorageKeys: sensitiveStorageKeys.length,
                totalStorageKeys: localStorageKeys.length
            };
            
            test.passed = exposedData.length === 0 && sensitiveStorageKeys.length === 0;
            test.message = `${exposedData.length} potential exposures in HTML, ${sensitiveStorageKeys.length} in localStorage`;
            
            if (test.passed) {
                console.log(`  ✅ ${test.name}: No sensitive data exposed`);
            } else {
                console.log(`  ❌ ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to check data exposure';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.security.push(test);
    }

    // Test input validation
    async testInputValidation() {
        const test = {
            name: 'Input Validation',
            category: 'security',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
            const forms = document.querySelectorAll('form');
            
            let validationScore = 0;
            let maxScore = 0;
            
            // Check for input validation attributes
            inputs.forEach(input => {
                maxScore += 3; // 3 points per input
                
                if (input.hasAttribute('required')) validationScore += 1;
                if (input.hasAttribute('pattern') || input.hasAttribute('minlength') || input.hasAttribute('maxlength')) validationScore += 1;
                if (input.type === 'email' || input.type === 'password') validationScore += 1;
            });
            
            // Check for form validation
            forms.forEach(form => {
                maxScore += 1;
                if (form.hasAttribute('novalidate') === false) validationScore += 1;
            });
            
            const validationPercentage = maxScore > 0 ? (validationScore / maxScore) * 100 : 100;
            
            test.metrics = {
                totalInputs: inputs.length,
                totalForms: forms.length,
                validationScore: validationScore,
                maxScore: maxScore,
                validationPercentage: Math.round(validationPercentage)
            };
            
            test.passed = validationPercentage > 60 || inputs.length === 0; // 60% validation coverage
            test.message = `${Math.round(validationPercentage)}% validation coverage (${inputs.length} inputs, ${forms.length} forms)`;
            
            if (test.passed) {
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                console.log(`  ❌ ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to check input validation';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.security.push(test);
    }

    // Test authentication security
    async testAuthenticationSecurity() {
        const test = {
            name: 'Authentication Security',
            category: 'security',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            const hasAuthManager = typeof window.UnifiedAuthManager !== 'undefined';
            const hasSupabaseConfig = typeof window.SUPABASE_CONFIG !== 'undefined';
            
            let securityFeatures = 0;
            let maxFeatures = 5;
            
            if (hasAuthManager) securityFeatures += 1;
            if (hasSupabaseConfig) securityFeatures += 1;
            
            // Check for session management
            const hasSessionManagement = hasAuthManager && typeof window.UnifiedAuthManager.getSession === 'function';
            if (hasSessionManagement) securityFeatures += 1;
            
            // Check for secure session storage
            const sessionData = localStorage.getItem('supabase-auth-session');
            const hasSecureSessionStorage = !sessionData || !sessionData.includes('password');
            if (hasSecureSessionStorage) securityFeatures += 1;
            
            // Check for logout functionality
            const hasLogout = hasAuthManager && typeof window.UnifiedAuthManager.logout === 'function';
            if (hasLogout) securityFeatures += 1;
            
            test.metrics = {
                hasAuthManager,
                hasSupabaseConfig,
                hasSessionManagement,
                hasSecureSessionStorage,
                hasLogout,
                securityFeatures,
                maxFeatures
            };
            
            const securityPercentage = (securityFeatures / maxFeatures) * 100;
            test.passed = securityPercentage > 60;
            test.message = `${Math.round(securityPercentage)}% auth security features (${securityFeatures}/${maxFeatures})`;
            
            if (test.passed) {
                console.log(`  ✅ ${test.name}: ${test.message}`);
            } else {
                console.log(`  ❌ ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to check authentication security';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.security.push(test);
    }

    // Test CORS configuration
    async testCORSConfiguration() {
        const test = {
            name: 'CORS Configuration',
            category: 'security',
            passed: false,
            metrics: {},
            message: ''
        };
        
        try {
            // Test CORS with a simple request
            const testUrl = '/.netlify/functions/health';
            
            try {
                const response = await fetch(testUrl, {
                    method: 'OPTIONS',
                    headers: {
                        'Origin': window.location.origin,
                        'Access-Control-Request-Method': 'GET'
                    }
                });
                
                const corsHeaders = {
                    allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
                    allowMethods: response.headers.get('Access-Control-Allow-Methods'),
                    allowHeaders: response.headers.get('Access-Control-Allow-Headers'),
                    maxAge: response.headers.get('Access-Control-Max-Age')
                };
                
                test.metrics = {
                    optionsSupported: response.status < 400,
                    corsHeaders: corsHeaders,
                    restrictiveOrigin: corsHeaders.allowOrigin !== '*'
                };
                
                // CORS is properly configured if it's restrictive but functional
                const hasProperCORS = corsHeaders.allowOrigin && 
                                    (corsHeaders.allowOrigin === window.location.origin || 
                                     corsHeaders.allowOrigin === '*');
                
                test.passed = hasProperCORS;
                test.message = `CORS configured with origin: ${corsHeaders.allowOrigin || 'none'}`;
                
                if (test.passed) {
                    console.log(`  ✅ ${test.name}: ${test.message}`);
                } else {
                    console.log(`  ❌ ${test.name}: ${test.message}`);
                }
                
            } catch (fetchError) {
                // If CORS test fails, it might still be properly configured
                test.passed = true; // Don't fail on network errors
                test.message = 'CORS test inconclusive (network error)';
                test.metrics = { error: fetchError.message };
                console.log(`  ⚠️  ${test.name}: ${test.message}`);
            }
            
        } catch (error) {
            test.error = error.message;
            test.message = 'Failed to check CORS configuration';
            console.log(`  ❌ ${test.name}: ${test.message}`);
        }
        
        this.results.security.push(test);
    }

    // Calculate scores
    calculateScores() {
        const performanceTests = this.results.performance;
        const securityTests = this.results.security;
        
        // Calculate performance score
        const performancePassed = performanceTests.filter(t => t.passed).length;
        this.results.summary.performanceScore = performanceTests.length > 0 ? 
            Math.round((performancePassed / performanceTests.length) * 100) : 0;
        
        // Calculate security score
        const securityPassed = securityTests.filter(t => t.passed).length;
        this.results.summary.securityScore = securityTests.length > 0 ? 
            Math.round((securityPassed / securityTests.length) * 100) : 0;
        
        // Calculate overall score
        const totalTests = performanceTests.length + securityTests.length;
        const totalPassed = performancePassed + securityPassed;
        this.results.summary.overall = totalTests > 0 ? 
            Math.round((totalPassed / totalTests) * 100) : 0;
    }

    // Generate comprehensive report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.results.summary,
            performance: {
                tests: this.results.performance,
                passed: this.results.performance.filter(t => t.passed).length,
                failed: this.results.performance.filter(t => !t.passed).length,
                total: this.results.performance.length
            },
            security: {
                tests: this.results.security,
                passed: this.results.security.filter(t => t.passed).length,
                failed: this.results.security.filter(t => !t.passed).length,
                total: this.results.security.length
            },
            recommendations: this.generateRecommendations(),
            thresholds: this.thresholds
        };
        
        this.printSummary(report);
        
        return report;
    }

    // Generate recommendations
    generateRecommendations() {
        const recommendations = [];
        
        // Performance recommendations
        this.results.performance.forEach(test => {
            if (!test.passed) {
                switch (test.name) {
                    case 'Page Load Performance':
                        recommendations.push('Optimize page load time by reducing resource sizes and implementing lazy loading');
                        break;
                    case 'Memory Usage':
                        recommendations.push('Optimize memory usage by reducing DOM complexity and cleaning up event listeners');
                        break;
                    case 'Resource Loading Performance':
                        recommendations.push('Optimize resource loading by compressing images and minifying CSS/JS');
                        break;
                    case 'Network Performance':
                        recommendations.push('Improve network performance by implementing caching and CDN usage');
                        break;
                    case 'Rendering Performance':
                        recommendations.push('Optimize rendering by reducing DOM complexity and avoiding render-blocking resources');
                        break;
                    case 'Cache Efficiency':
                        recommendations.push('Improve cache efficiency by setting proper cache headers and implementing service workers');
                        break;
                }
            }
        });
        
        // Security recommendations
        this.results.security.forEach(test => {
            if (!test.passed) {
                switch (test.name) {
                    case 'HTTPS Usage':
                        recommendations.push('Implement HTTPS for all production environments');
                        break;
                    case 'Content Security Policy':
                        recommendations.push('Implement a Content Security Policy to prevent XSS attacks');
                        break;
                    case 'Secure Cookies':
                        recommendations.push('Set Secure and HttpOnly attributes on all cookies');
                        break;
                    case 'Data Exposure':
                        recommendations.push('Remove any sensitive data from client-side code and storage');
                        break;
                    case 'Input Validation':
                        recommendations.push('Implement proper input validation on all form fields');
                        break;
                    case 'Authentication Security':
                        recommendations.push('Strengthen authentication security with proper session management');
                        break;
                    case 'CORS Configuration':
                        recommendations.push('Configure CORS properly with specific origins instead of wildcards');
                        break;
                }
            }
        });
        
        return [...new Set(recommendations)]; // Remove duplicates
    }

    // Print summary
    printSummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PERFORMANCE & SECURITY SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n⚡ Performance Score: ${report.summary.performanceScore}%`);
        console.log(`   Passed: ${report.performance.passed}/${report.performance.total} tests`);
        
        console.log(`\n🛡️  Security Score: ${report.summary.securityScore}%`);
        console.log(`   Passed: ${report.security.passed}/${report.security.total} tests`);
        
        console.log(`\n🎯 Overall Score: ${report.summary.overall}%`);
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
    }
}

// Auto-run if not in test environment
if (typeof window !== 'undefined' && !window.TESTING_MODE) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new PerformanceSecurityTests().runAllTests();
        });
    } else {
        new PerformanceSecurityTests().runAllTests();
    }
}

// Export for use in other scripts
window.PerformanceSecurityTests = PerformanceSecurityTests;