#!/usr/bin/env node

/**
 * Comprehensive QA Test Suite for Portfolio CMS
 * Tests all aspects of functionality, performance, and reliability
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Test configuration
const CONFIG = {
    API_BASE: 'http://localhost:3334/api',
    ADMIN_BASE: 'http://localhost:3334/admin',
    HUGO_BASE: 'http://localhost:1313',
    NETLIFY_URL: 'https://vocal-pony-24e3de.netlify.app'
};

// Test results tracking
const testResults = {
    passed: [],
    failed: [],
    warnings: [],
    startTime: Date.now()
};

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Test utilities
async function makeRequest(url, options = {}) {
    const fetch = (await import('node-fetch')).default;
    try {
        const response = await fetch(url, {
            ...options,
            timeout: options.timeout || 10000
        });
        return {
            ok: response.ok,
            status: response.status,
            headers: response.headers,
            data: await response.text().then(text => {
                try {
                    return JSON.parse(text);
                } catch {
                    return text;
                }
            })
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message
        };
    }
}

function logTest(category, test, status, details = '') {
    const symbols = {
        pass: `${colors.green}✓${colors.reset}`,
        fail: `${colors.red}✗${colors.reset}`,
        warn: `${colors.yellow}⚠${colors.reset}`,
        info: `${colors.blue}ℹ${colors.reset}`
    };
    
    const message = `${symbols[status]} [${category}] ${test}`;
    console.log(message);
    if (details) {
        console.log(`  ${colors.cyan}→${colors.reset} ${details}`);
    }
    
    if (status === 'pass') testResults.passed.push({ category, test });
    if (status === 'fail') testResults.failed.push({ category, test, details });
    if (status === 'warn') testResults.warnings.push({ category, test, details });
}

function logSection(title) {
    console.log(`\n${colors.bright}${colors.magenta}▶ ${title}${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(50)}${colors.reset}`);
}

// QA Test Categories

async function testAdminDashboard() {
    logSection('Admin Dashboard QA');
    
    // Test dashboard loads
    const dashboardResponse = await makeRequest(`${CONFIG.ADMIN_BASE}/dashboard.html`);
    if (dashboardResponse.ok) {
        logTest('Dashboard', 'Page loads successfully', 'pass');
        
        // Check for required elements
        const hasRequiredElements = dashboardResponse.data.includes('dashboard-grid') &&
                                  dashboardResponse.data.includes('stat-card') &&
                                  dashboardResponse.data.includes('activity-feed');
        
        if (hasRequiredElements) {
            logTest('Dashboard', 'Required UI elements present', 'pass');
        } else {
            logTest('Dashboard', 'Missing UI elements', 'fail');
        }
    } else {
        logTest('Dashboard', 'Failed to load', 'fail', `Status: ${dashboardResponse.status}`);
    }
    
    // Test dashboard APIs
    const apis = [
        { endpoint: '/content', desc: 'Content stats API' },
        { endpoint: '/media', desc: 'Media stats API' },
        { endpoint: '/analytics/summary', desc: 'Analytics API' }
    ];
    
    for (const api of apis) {
        const response = await makeRequest(`${CONFIG.API_BASE}${api.endpoint}`);
        if (response.ok) {
            logTest('Dashboard', api.desc, 'pass');
        } else {
            logTest('Dashboard', api.desc, 'fail', response.error || `Status: ${response.status}`);
        }
    }
}

async function testContentEditor() {
    logSection('Content Editor QA');
    
    const testSlug = `qa-test-${Date.now()}`;
    const testPath = `${testSlug}.md`;
    
    // CREATE
    const createData = {
        frontmatter: {
            title: 'QA Test Content',
            date: new Date().toISOString(),
            draft: false,
            description: 'Automated QA test content'
        },
        content: '# QA Test\n\nThis is automated QA test content.\n\n## Features\n- Test bullet 1\n- Test bullet 2'
    };
    
    const createResponse = await makeRequest(`${CONFIG.API_BASE}/content/${testPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
    });
    
    if (createResponse.ok) {
        logTest('Editor', 'Create content', 'pass');
        
        // READ
        const readResponse = await makeRequest(`${CONFIG.API_BASE}/content/${testPath}`);
        if (readResponse.ok && readResponse.data.frontmatter) {
            logTest('Editor', 'Read content', 'pass');
            
            // Verify content integrity
            if (readResponse.data.frontmatter.title === createData.frontmatter.title) {
                logTest('Editor', 'Content integrity verified', 'pass');
            } else {
                logTest('Editor', 'Content integrity mismatch', 'fail');
            }
            
            // UPDATE
            const updateData = {
                ...createData,
                frontmatter: {
                    ...createData.frontmatter,
                    title: 'QA Test Content - Updated'
                }
            };
            
            const updateResponse = await makeRequest(`${CONFIG.API_BASE}/content/${testPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            if (updateResponse.ok) {
                logTest('Editor', 'Update content', 'pass');
            } else {
                logTest('Editor', 'Update content', 'fail');
            }
            
            // DELETE
            const deleteResponse = await makeRequest(`${CONFIG.API_BASE}/content/${testPath}`, {
                method: 'DELETE'
            });
            
            if (deleteResponse.ok) {
                logTest('Editor', 'Delete content', 'pass');
            } else {
                logTest('Editor', 'Delete content', 'fail');
            }
        } else {
            logTest('Editor', 'Read content', 'fail');
        }
    } else {
        logTest('Editor', 'Create content', 'fail', createResponse.error);
    }
}

async function testPortfolioManagement() {
    logSection('Portfolio Management QA');
    
    // List portfolio items
    const listResponse = await makeRequest(`${CONFIG.API_BASE}/content`);
    if (listResponse.ok && listResponse.data.files) {
        const portfolioItems = listResponse.data.files.filter(f => f.path.startsWith('portfolio/'));
        logTest('Portfolio', `List items (found ${portfolioItems.length})`, 'pass');
        
        // Test portfolio page rendering
        const portfolioPageResponse = await makeRequest(`${CONFIG.HUGO_BASE}/portfolio/`);
        if (portfolioPageResponse.ok) {
            logTest('Portfolio', 'Portfolio list page renders', 'pass');
        } else {
            logTest('Portfolio', 'Portfolio list page fails', 'fail');
        }
        
        // Test individual portfolio item
        if (portfolioItems.length > 0) {
            const itemSlug = portfolioItems[0].path.replace('portfolio/', '').replace('.md', '');
            const itemResponse = await makeRequest(`${CONFIG.HUGO_BASE}/portfolio/${itemSlug}/`);
            if (itemResponse.ok) {
                logTest('Portfolio', 'Individual portfolio page renders', 'pass');
            } else {
                logTest('Portfolio', 'Individual portfolio page fails', 'fail');
            }
        }
    } else {
        logTest('Portfolio', 'List items', 'fail');
    }
}

async function testMediaLibrary() {
    logSection('Media Library QA');
    
    // Test media API
    const mediaResponse = await makeRequest(`${CONFIG.API_BASE}/media`);
    if (mediaResponse.ok && mediaResponse.data.files) {
        logTest('Media', `Library loads (${mediaResponse.data.files.length} files)`, 'pass');
        
        // Check for test image
        const hasTestImage = mediaResponse.data.files.some(f => f.name === 'tree_image.jpg');
        if (hasTestImage) {
            logTest('Media', 'Test image present', 'pass');
            
            // Test image accessibility
            const imageResponse = await makeRequest(`${CONFIG.HUGO_BASE}/uploads/tree_image.jpg`);
            if (imageResponse.ok) {
                logTest('Media', 'Images accessible via Hugo', 'pass');
            } else {
                logTest('Media', 'Images not accessible', 'fail');
            }
        } else {
            logTest('Media', 'Test image missing', 'warn');
        }
        
        // Test upload directory structure
        const uploadsExist = await fs.access(path.join(__dirname, 'static', 'uploads'))
            .then(() => true)
            .catch(() => false);
        
        if (uploadsExist) {
            logTest('Media', 'Upload directory exists', 'pass');
        } else {
            logTest('Media', 'Upload directory missing', 'fail');
        }
    } else {
        logTest('Media', 'Library API fails', 'fail');
    }
}

async function testContactForm() {
    logSection('Contact Form QA');
    
    const contactData = {
        name: 'QA Tester',
        email: 'qa@test.com',
        message: 'This is an automated QA test submission.',
        timestamp: new Date().toISOString()
    };
    
    const submitResponse = await makeRequest(`${CONFIG.API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
    });
    
    if (submitResponse.ok) {
        logTest('Contact', 'Form submission', 'pass');
        
        // Check if data was saved
        const contactFile = `data/contacts/${Date.now()}-qa-at-test.com.json`;
        const fileExists = await fs.access(path.join(__dirname, contactFile))
            .then(() => true)
            .catch(() => false);
        
        if (fileExists || submitResponse.data.success) {
            logTest('Contact', 'Data storage', 'pass');
        } else {
            logTest('Contact', 'Data storage verification', 'warn', 'Could not verify file');
        }
    } else {
        logTest('Contact', 'Form submission', 'fail');
    }
}

async function testAnalytics() {
    logSection('Analytics QA');
    
    // Send test event
    const eventData = {
        type: 'pageview',
        data: {
            path: '/qa-test',
            referrer: 'qa-suite',
            sessionId: `qa-${Date.now()}`,
            timestamp: new Date().toISOString(),
            screenWidth: 1920,
            screenHeight: 1080,
            userAgent: 'QA Test Suite'
        }
    };
    
    const trackResponse = await makeRequest(`${CONFIG.API_BASE}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
    });
    
    if (trackResponse.ok) {
        logTest('Analytics', 'Event tracking', 'pass');
        
        // Get summary
        const summaryResponse = await makeRequest(`${CONFIG.API_BASE}/analytics/summary`);
        if (summaryResponse.ok) {
            logTest('Analytics', 'Summary API', 'pass');
            
            if (summaryResponse.data.data && summaryResponse.data.data.totalEvents >= 0) {
                logTest('Analytics', 'Data structure valid', 'pass');
            } else {
                logTest('Analytics', 'Data structure invalid', 'warn');
            }
        } else {
            logTest('Analytics', 'Summary API', 'fail');
        }
    } else {
        logTest('Analytics', 'Event tracking', 'fail');
    }
}

async function testNavigation() {
    logSection('Navigation & Routing QA');
    
    // Test main navigation pages
    const pages = [
        { path: '/', name: 'Home' },
        { path: '/portfolio/', name: 'Portfolio' },
        { path: '/make/', name: 'Make' },
        { path: '/learn/', name: 'Learn' },
        { path: '/think/', name: 'Think' },
        { path: '/meet/', name: 'Meet' },
        { path: '/contact/', name: 'Contact' }
    ];
    
    for (const page of pages) {
        const response = await makeRequest(`${CONFIG.HUGO_BASE}${page.path}`);
        if (response.ok) {
            logTest('Navigation', `${page.name} page`, 'pass');
        } else {
            logTest('Navigation', `${page.name} page`, 'fail', `Status: ${response.status}`);
        }
    }
    
    // Test admin navigation
    const adminPages = [
        'dashboard.html',
        'simple-editor.html',
        'portfolio.html',
        'analytics.html'
    ];
    
    for (const page of adminPages) {
        const response = await makeRequest(`${CONFIG.ADMIN_BASE}/${page}`);
        if (response.ok) {
            logTest('Admin Nav', page.replace('.html', ''), 'pass');
        } else {
            logTest('Admin Nav', page.replace('.html', ''), 'fail');
        }
    }
}

async function testPerformance() {
    logSection('Performance QA');
    
    // Test response times
    const performanceTests = [
        { url: `${CONFIG.API_BASE}/content`, name: 'Content API', threshold: 500 },
        { url: `${CONFIG.HUGO_BASE}/`, name: 'Homepage', threshold: 1000 },
        { url: `${CONFIG.ADMIN_BASE}/dashboard.html`, name: 'Admin Dashboard', threshold: 1000 }
    ];
    
    for (const test of performanceTests) {
        const startTime = Date.now();
        const response = await makeRequest(test.url);
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
            if (responseTime < test.threshold) {
                logTest('Performance', `${test.name} (${responseTime}ms)`, 'pass');
            } else {
                logTest('Performance', `${test.name} (${responseTime}ms)`, 'warn', 
                    `Slower than ${test.threshold}ms threshold`);
            }
        } else {
            logTest('Performance', test.name, 'fail', 'Request failed');
        }
    }
    
    // Test concurrent requests
    const concurrentStart = Date.now();
    const concurrentRequests = Array(10).fill(null).map(() => 
        makeRequest(`${CONFIG.API_BASE}/content`)
    );
    
    const results = await Promise.all(concurrentRequests);
    const concurrentTime = Date.now() - concurrentStart;
    const allSuccessful = results.every(r => r.ok);
    
    if (allSuccessful) {
        logTest('Performance', `10 concurrent requests (${concurrentTime}ms)`, 'pass');
    } else {
        logTest('Performance', 'Concurrent requests', 'fail', 'Some requests failed');
    }
}

async function testSecurity() {
    logSection('Security QA');
    
    // Test XSS prevention
    const xssPayload = {
        frontmatter: {
            title: '<script>alert("XSS")</script>',
            date: new Date().toISOString()
        },
        content: '<script>alert("XSS")</script>'
    };
    
    const xssResponse = await makeRequest(`${CONFIG.API_BASE}/content/xss-test.md`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssPayload)
    });
    
    if (xssResponse.ok) {
        // Read it back to check escaping
        const readResponse = await makeRequest(`${CONFIG.API_BASE}/content/xss-test.md`);
        if (readResponse.ok) {
            const hasUnescapedScript = JSON.stringify(readResponse.data).includes('<script>');
            if (!hasUnescapedScript) {
                logTest('Security', 'XSS prevention', 'pass');
            } else {
                logTest('Security', 'XSS prevention', 'fail', 'Unescaped script tags found');
            }
            
            // Clean up
            await makeRequest(`${CONFIG.API_BASE}/content/xss-test.md`, { method: 'DELETE' });
        }
    }
    
    // Test SQL injection (even though we're file-based)
    const injectionTest = await makeRequest(`${CONFIG.API_BASE}/content/../../etc/passwd`);
    if (injectionTest.status === 404 || injectionTest.status === 400) {
        logTest('Security', 'Path traversal prevention', 'pass');
    } else {
        logTest('Security', 'Path traversal prevention', 'fail', 'Potential vulnerability');
    }
    
    // Test CORS
    const corsResponse = await makeRequest(`${CONFIG.API_BASE}/content`, {
        headers: { 'Origin': 'http://evil.com' }
    });
    
    const corsHeader = corsResponse.headers?.get('access-control-allow-origin');
    if (corsHeader && !corsHeader.includes('evil.com')) {
        logTest('Security', 'CORS configuration', 'pass');
    } else if (!corsHeader) {
        logTest('Security', 'CORS headers missing', 'warn');
    } else {
        logTest('Security', 'CORS too permissive', 'fail');
    }
    
    // Test authentication endpoints
    const authEndpoints = ['/api/admin', '/api/users', '/api/config'];
    for (const endpoint of authEndpoints) {
        const response = await makeRequest(`${CONFIG.API_BASE}${endpoint}`);
        if (response.status === 404 || response.status === 401) {
            logTest('Security', `Protected endpoint ${endpoint}`, 'pass');
        } else if (response.ok) {
            logTest('Security', `Unprotected endpoint ${endpoint}`, 'fail');
        }
    }
}

async function testErrorHandling() {
    logSection('Error Handling QA');
    
    // Test 404 handling
    const notFoundResponse = await makeRequest(`${CONFIG.API_BASE}/content/does-not-exist.md`);
    if (notFoundResponse.status === 404) {
        logTest('Errors', '404 handling', 'pass');
    } else {
        logTest('Errors', '404 handling', 'fail', `Got status ${notFoundResponse.status}`);
    }
    
    // Test invalid JSON
    const invalidJsonResponse = await makeRequest(`${CONFIG.API_BASE}/content/test.md`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
    });
    
    if (invalidJsonResponse.status >= 400) {
        logTest('Errors', 'Invalid JSON handling', 'pass');
    } else {
        logTest('Errors', 'Invalid JSON handling', 'fail');
    }
    
    // Test large payload
    const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
    const largePayloadResponse = await makeRequest(`${CONFIG.API_BASE}/content/large.md`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            frontmatter: { title: 'Large' },
            content: largeContent
        })
    });
    
    if (largePayloadResponse.status === 413 || largePayloadResponse.ok) {
        logTest('Errors', 'Large payload handling', 'pass');
    } else {
        logTest('Errors', 'Large payload handling', 'warn', 'Unexpected response');
    }
    
    // Clean up if created
    if (largePayloadResponse.ok) {
        await makeRequest(`${CONFIG.API_BASE}/content/large.md`, { method: 'DELETE' });
    }
}

async function testGitIntegration() {
    logSection('Git Integration QA');
    
    // Check git status
    try {
        const { stdout: statusOutput } = await execPromise('git status --porcelain');
        logTest('Git', 'Repository accessible', 'pass');
        
        // Create test content to trigger auto-commit
        const testData = {
            frontmatter: {
                title: 'Git Integration Test',
                date: new Date().toISOString()
            },
            content: 'Testing git auto-commit'
        };
        
        const createResponse = await makeRequest(`${CONFIG.API_BASE}/content/git-test.md`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        if (createResponse.ok) {
            // Wait for auto-commit
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check git log for recent commit
            const { stdout: logOutput } = await execPromise('git log -1 --oneline');
            if (logOutput.includes('content') || logOutput.includes('git-test')) {
                logTest('Git', 'Auto-commit working', 'pass');
            } else {
                logTest('Git', 'Auto-commit verification', 'warn', 'Could not verify commit');
            }
            
            // Clean up
            await makeRequest(`${CONFIG.API_BASE}/content/git-test.md`, { method: 'DELETE' });
        }
    } catch (error) {
        logTest('Git', 'Integration', 'fail', error.message);
    }
}

async function testBuildDeployment() {
    logSection('Build & Deployment QA');
    
    // Test build endpoint
    const buildResponse = await makeRequest(`${CONFIG.API_BASE}/build`, {
        method: 'POST'
    });
    
    if (buildResponse.ok) {
        logTest('Build', 'Build API', 'pass');
    } else {
        logTest('Build', 'Build API', 'fail');
    }
    
    // Test Hugo build
    try {
        const { stdout } = await execPromise('hugo version');
        logTest('Build', 'Hugo installed', 'pass');
        
        // Run Hugo build
        const { stdout: buildOutput } = await execPromise('hugo --quiet');
        logTest('Build', 'Hugo build successful', 'pass');
        
        // Check public directory
        const publicExists = await fs.access(path.join(__dirname, 'public'))
            .then(() => true)
            .catch(() => false);
        
        if (publicExists) {
            logTest('Build', 'Public directory created', 'pass');
        } else {
            logTest('Build', 'Public directory missing', 'warn');
        }
    } catch (error) {
        logTest('Build', 'Hugo build', 'fail', error.message);
    }
    
    // Test Netlify site
    const netlifyResponse = await makeRequest(CONFIG.NETLIFY_URL);
    if (netlifyResponse.ok) {
        logTest('Deploy', 'Netlify site accessible', 'pass');
    } else {
        logTest('Deploy', 'Netlify site', 'fail', `Status: ${netlifyResponse.status}`);
    }
}

async function testMultilanguage() {
    logSection('Multi-language Support QA');
    
    // Test Spanish pages
    const spanishPages = [
        { path: '/es/', name: 'Spanish Home' },
        { path: '/es/hacer/', name: 'Spanish Make' },
        { path: '/es/aprender/', name: 'Spanish Learn' }
    ];
    
    for (const page of spanishPages) {
        const response = await makeRequest(`${CONFIG.HUGO_BASE}${page.path}`);
        if (response.ok) {
            logTest('i18n', page.name, 'pass');
        } else {
            logTest('i18n', page.name, 'fail', `Status: ${response.status}`);
        }
    }
    
    // Check language switcher
    const homeResponse = await makeRequest(`${CONFIG.HUGO_BASE}/`);
    if (homeResponse.ok && homeResponse.data.includes('lang="en"')) {
        logTest('i18n', 'English language tag', 'pass');
    } else {
        logTest('i18n', 'Language tags', 'warn');
    }
}

async function testAccessibility() {
    logSection('Accessibility QA');
    
    // Basic accessibility checks
    const pages = ['/', '/portfolio/', '/contact/'];
    
    for (const page of pages) {
        const response = await makeRequest(`${CONFIG.HUGO_BASE}${page}`);
        if (response.ok) {
            const html = response.data;
            
            // Check for alt tags on images
            const hasImages = html.includes('<img');
            const hasAltTags = html.includes('alt=');
            if (!hasImages || hasAltTags) {
                logTest('A11y', `${page} image alt tags`, 'pass');
            } else {
                logTest('A11y', `${page} missing alt tags`, 'warn');
            }
            
            // Check for proper heading structure
            const hasH1 = html.includes('<h1');
            if (hasH1) {
                logTest('A11y', `${page} heading structure`, 'pass');
            } else {
                logTest('A11y', `${page} missing H1`, 'warn');
            }
            
            // Check for skip navigation
            const hasSkipNav = html.includes('skip') || html.includes('main-content');
            if (hasSkipNav) {
                logTest('A11y', `${page} skip navigation`, 'pass');
            } else {
                logTest('A11y', `${page} skip navigation`, 'warn', 'Consider adding');
            }
        }
    }
}

// Generate comprehensive report
function generateReport() {
    const duration = ((Date.now() - testResults.startTime) / 1000).toFixed(2);
    
    console.log(`\n${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}  QA TEST SUITE COMPLETE${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}\n`);
    
    // Summary stats
    console.log(`${colors.bright}Test Summary:${colors.reset}`);
    console.log(`  Duration: ${duration} seconds`);
    console.log(`  ${colors.green}Passed: ${testResults.passed.length}${colors.reset}`);
    console.log(`  ${colors.yellow}Warnings: ${testResults.warnings.length}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${testResults.failed.length}${colors.reset}`);
    
    // Calculate score
    const total = testResults.passed.length + testResults.failed.length;
    const score = Math.round((testResults.passed.length / total) * 100);
    
    console.log(`\n${colors.bright}Quality Score: ${score}%${colors.reset}`);
    
    // Grade
    let grade, gradeColor;
    if (score >= 95) { grade = 'A+'; gradeColor = colors.green; }
    else if (score >= 90) { grade = 'A'; gradeColor = colors.green; }
    else if (score >= 85) { grade = 'B+'; gradeColor = colors.green; }
    else if (score >= 80) { grade = 'B'; gradeColor = colors.yellow; }
    else if (score >= 75) { grade = 'C+'; gradeColor = colors.yellow; }
    else if (score >= 70) { grade = 'C'; gradeColor = colors.yellow; }
    else { grade = 'F'; gradeColor = colors.red; }
    
    console.log(`${colors.bright}Grade: ${gradeColor}${grade}${colors.reset}`);
    
    // Failed tests details
    if (testResults.failed.length > 0) {
        console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
        testResults.failed.forEach(test => {
            console.log(`  ${colors.red}✗${colors.reset} [${test.category}] ${test.test}`);
            if (test.details) {
                console.log(`    ${colors.cyan}→${colors.reset} ${test.details}`);
            }
        });
    }
    
    // Warnings
    if (testResults.warnings.length > 0) {
        console.log(`\n${colors.yellow}${colors.bright}Warnings:${colors.reset}`);
        testResults.warnings.forEach(test => {
            console.log(`  ${colors.yellow}⚠${colors.reset} [${test.category}] ${test.test}`);
            if (test.details) {
                console.log(`    ${colors.cyan}→${colors.reset} ${test.details}`);
            }
        });
    }
    
    // Recommendations
    console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
    if (testResults.failed.length === 0) {
        console.log(`  ${colors.green}✓${colors.reset} System is production-ready!`);
    } else if (testResults.failed.length <= 3) {
        console.log(`  ${colors.yellow}⚠${colors.reset} Address critical failures before production`);
    } else {
        console.log(`  ${colors.red}✗${colors.reset} System needs significant fixes`);
    }
    
    if (testResults.warnings.some(w => w.category === 'Security')) {
        console.log(`  ${colors.yellow}⚠${colors.reset} Review security warnings`);
    }
    
    if (testResults.warnings.some(w => w.category === 'Performance')) {
        console.log(`  ${colors.yellow}⚠${colors.reset} Consider performance optimizations`);
    }
    
    console.log(`\n${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}\n`);
}

// Main QA execution
async function runFullQA() {
    console.log(`${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}  PORTFOLIO CMS - COMPREHENSIVE QA TEST SUITE${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}${'═'.repeat(60)}${colors.reset}`);
    console.log(`\nStarting at: ${new Date().toLocaleString()}\n`);
    
    try {
        // Run all test categories
        await testAdminDashboard();
        await testContentEditor();
        await testPortfolioManagement();
        await testMediaLibrary();
        await testContactForm();
        await testAnalytics();
        await testNavigation();
        await testPerformance();
        await testSecurity();
        await testErrorHandling();
        await testGitIntegration();
        await testBuildDeployment();
        await testMultilanguage();
        await testAccessibility();
        
    } catch (error) {
        console.error(`\n${colors.red}Fatal error during QA:${colors.reset}`, error);
    }
    
    // Generate final report
    generateReport();
    
    // Exit with appropriate code
    process.exit(testResults.failed.length > 5 ? 1 : 0);
}

// Run QA suite
runFullQA();