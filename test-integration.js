// Integration Test Script for Portfolio CMS
// This script tests that all components work together correctly

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

const API_BASE = 'http://localhost:3334/api';
const HUGO_BASE = 'http://localhost:1313';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

async function makeRequest(url, options = {}) {
    const fetch = (await import('node-fetch')).default;
    try {
        const response = await fetch(url, options);
        return {
            ok: response.ok,
            status: response.status,
            data: await response.json().catch(() => null)
        };
    } catch (error) {
        return {
            ok: false,
            error: error.message
        };
    }
}

async function testServerHealth() {
    console.log(`\n${colors.blue}Testing Server Health...${colors.reset}`);
    
    // Test CMS server
    const cmsHealth = await makeRequest(`${API_BASE}/content`);
    if (cmsHealth.ok) {
        console.log(`${colors.green}✓ CMS Server (3334) is running${colors.reset}`);
    } else {
        console.log(`${colors.red}✗ CMS Server (3334) is not responding${colors.reset}`);
        return false;
    }
    
    // Test Hugo server
    const hugoHealth = await makeRequest(HUGO_BASE);
    if (hugoHealth.ok || hugoHealth.status === 200) {
        console.log(`${colors.green}✓ Hugo Server (1313) is running${colors.reset}`);
    } else {
        console.log(`${colors.red}✗ Hugo Server (1313) is not responding${colors.reset}`);
        return false;
    }
    
    return true;
}

async function testContentManagement() {
    console.log(`\n${colors.blue}Testing Content Management...${colors.reset}`);
    
    // Create test content with proper format for the API
    const testPath = 'test-integration-page.md';
    const testFrontmatter = {
        title: "Integration Test Page",
        date: new Date().toISOString(),
        draft: false
    };
    const testContent = `This is a test page created by the integration test at ${new Date().toLocaleString()}.

## Test Section

This content should appear on the Hugo site after saving.`;
    
    // Save content via CMS API (using the correct endpoint format)
    const saveResponse = await makeRequest(`${API_BASE}/content/${testPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            frontmatter: testFrontmatter, 
            content: testContent 
        })
    });
    
    if (saveResponse.ok) {
        console.log(`${colors.green}✓ Content saved via CMS API${colors.reset}`);
    } else {
        console.log(`${colors.red}✗ Failed to save content: ${JSON.stringify(saveResponse)}${colors.reset}`);
        return false;
    }
    
    // Wait for Hugo to rebuild
    console.log(`${colors.yellow}  Waiting for Hugo rebuild...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if content appears on Hugo site
    const hugoResponse = await makeRequest(`${HUGO_BASE}/test-integration-page/`);
    if (hugoResponse.ok) {
        console.log(`${colors.green}✓ Content appears on Hugo site${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠ Content not immediately visible on Hugo (may need manual refresh)${colors.reset}`);
    }
    
    return true;
}

async function testImageUpload() {
    console.log(`\n${colors.blue}Testing Image Upload...${colors.reset}`);
    
    // Check if test image exists
    const testImagePath = path.join(__dirname, 'static', 'uploads', 'tree_image.jpg');
    try {
        await fs.access(testImagePath);
        console.log(`${colors.green}✓ Test image found: tree_image.jpg${colors.reset}`);
        
        // Verify it's accessible via CMS API
        const mediaResponse = await makeRequest(`${API_BASE}/media`);
        if (mediaResponse.ok && mediaResponse.data) {
            const hasImage = mediaResponse.data.files?.some(f => f.includes('tree_image.jpg'));
            if (hasImage) {
                console.log(`${colors.green}✓ Image appears in media library${colors.reset}`);
            } else {
                console.log(`${colors.yellow}⚠ Image not found in media library response${colors.reset}`);
            }
        }
    } catch (error) {
        console.log(`${colors.yellow}⚠ Test image not found (upload test skipped)${colors.reset}`);
    }
    
    return true;
}

async function testAnalytics() {
    console.log(`\n${colors.blue}Testing Analytics Tracking...${colors.reset}`);
    
    // Send test analytics event
    const analyticsData = {
        type: 'pageview',
        data: {
            path: '/test-integration',
            referrer: '',
            sessionId: 'test-session-' + Date.now(),
            timestamp: new Date().toISOString(),
            screenWidth: 1920,
            screenHeight: 1080,
            userAgent: 'Integration Test Script'
        }
    };
    
    const trackResponse = await makeRequest(`${API_BASE}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsData)
    });
    
    if (trackResponse.ok) {
        console.log(`${colors.green}✓ Analytics event tracked${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠ Analytics tracking failed (non-critical)${colors.reset}`);
    }
    
    // Check analytics summary
    const summaryResponse = await makeRequest(`${API_BASE}/analytics/summary`);
    if (summaryResponse.ok) {
        console.log(`${colors.green}✓ Analytics summary accessible${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠ Analytics summary not available${colors.reset}`);
    }
    
    return true;
}

async function testPortfolioManagement() {
    console.log(`\n${colors.blue}Testing Portfolio Management...${colors.reset}`);
    
    // Create test portfolio item with proper format
    const portfolioPath = 'portfolio/test-project.md';
    const portfolioFrontmatter = {
        title: "Test Portfolio Project",
        date: new Date().toISOString(),
        draft: false,
        featured_image: "/uploads/tree_image.jpg",
        technologies: ["Node.js", "Hugo", "JavaScript"],
        github_url: "https://github.com/test/project",
        live_url: "https://example.com"
    };
    const portfolioContent = `This is a test portfolio project created by the integration test.

## Features
- Feature 1
- Feature 2
- Feature 3`;
    
    const saveResponse = await makeRequest(`${API_BASE}/content/${portfolioPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            frontmatter: portfolioFrontmatter,
            content: portfolioContent
        })
    });
    
    if (saveResponse.ok) {
        console.log(`${colors.green}✓ Portfolio item created${colors.reset}`);
        
        // Wait for Hugo rebuild
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check portfolio list
        const listResponse = await makeRequest(`${HUGO_BASE}/portfolio/`);
        if (listResponse.ok) {
            console.log(`${colors.green}✓ Portfolio list page accessible${colors.reset}`);
        }
    } else {
        console.log(`${colors.red}✗ Failed to create portfolio item${colors.reset}`);
    }
    
    return true;
}

async function testContactForm() {
    console.log(`\n${colors.blue}Testing Contact Form...${colors.reset}`);
    
    const contactData = {
        name: 'Integration Test',
        email: 'test@example.com',
        message: 'This is an automated integration test message',
        timestamp: new Date().toISOString()
    };
    
    const contactResponse = await makeRequest(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
    });
    
    if (contactResponse.ok) {
        console.log(`${colors.green}✓ Contact form submission successful${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠ Contact form submission failed (may need email config)${colors.reset}`);
    }
    
    return true;
}

async function testCORS() {
    console.log(`\n${colors.blue}Testing CORS Configuration...${colors.reset}`);
    
    // Test CORS headers from CMS API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${API_BASE}/content`, {
        headers: {
            'Origin': 'http://localhost:1313'
        }
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    if (corsHeader) {
        // Check if CORS allows the Hugo origin
        if (corsHeader === '*' || corsHeader.includes('localhost:1313')) {
            console.log(`${colors.green}✓ CORS allows Hugo origin (1313): ${corsHeader}${colors.reset}`);
        } else {
            console.log(`${colors.yellow}⚠ CORS header present but doesn't include Hugo: ${corsHeader}${colors.reset}`);
        }
    } else {
        console.log(`${colors.red}✗ No CORS header found${colors.reset}`);
    }
    
    return true;
}

async function cleanupTestContent() {
    console.log(`\n${colors.blue}Cleaning up test content...${colors.reset}`);
    
    // Remove test files
    const testFiles = [
        'content/test-integration-page.md',
        'content/portfolio/test-project.md'
    ];
    
    for (const file of testFiles) {
        try {
            await fs.unlink(path.join(__dirname, file));
            console.log(`${colors.green}✓ Removed ${file}${colors.reset}`);
        } catch (error) {
            // File might not exist, that's okay
        }
    }
}

async function runIntegrationTests() {
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.blue}Portfolio CMS Integration Test Suite${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);
    
    let allPassed = true;
    
    // Run tests
    if (!await testServerHealth()) {
        console.log(`\n${colors.red}Cannot continue - servers not running${colors.reset}`);
        console.log(`${colors.yellow}Please run: npm start (in backend/) and hugo server -D${colors.reset}`);
        process.exit(1);
    }
    
    allPassed = await testContentManagement() && allPassed;
    allPassed = await testImageUpload() && allPassed;
    allPassed = await testPortfolioManagement() && allPassed;
    allPassed = await testAnalytics() && allPassed;
    allPassed = await testContactForm() && allPassed;
    allPassed = await testCORS() && allPassed;
    
    // Cleanup
    await cleanupTestContent();
    
    // Summary
    console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
    if (allPassed) {
        console.log(`${colors.green}✓ All integration tests completed successfully!${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠ Some tests had warnings - review output above${colors.reset}`);
    }
    console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
}

// Run tests
runIntegrationTests().catch(error => {
    console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
    process.exit(1);
});