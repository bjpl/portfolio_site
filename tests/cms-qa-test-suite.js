/**
 * Comprehensive CMS Quality Assurance Test Suite
 * Tests complete workflow from authentication to content deployment
 */

const { expect } = require('@jest/globals');
const puppeteer = require('puppeteer');

class CMSTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.bugs = [];
        this.baseUrl = 'http://localhost:3000';
        this.adminUrl = `${this.baseUrl}/admin`;
    }

    async setup() {
        console.log('🚀 Setting up CMS Test Suite...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Visual testing
            args: [
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor',
                '--no-sandbox'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        });
        
        this.page = await this.browser.newPage();
        
        // Enable console monitoring
        this.page.on('console', msg => {
            const type = msg.type();
            if (type === 'error') {
                this.bugs.push({
                    type: 'console-error',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Enable network monitoring
        this.page.on('response', response => {
            if (!response.ok() && response.status() !== 304) {
                this.bugs.push({
                    type: 'network-error',
                    url: response.url(),
                    status: response.status(),
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 CMS-QA-Test');
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('🧹 Test suite cleanup complete');
    }

    async runTest(testName, testFn) {
        console.log(`📝 Running: ${testName}`);
        const startTime = Date.now();
        
        try {
            await testFn();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'PASS',
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ PASS: ${testName} (${duration}ms)`);
            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'FAIL',
                error: error.message,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            
            this.bugs.push({
                type: 'test-failure',
                test: testName,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            console.log(`❌ FAIL: ${testName} - ${error.message}`);
            return false;
        }
    }

    // TEST 1: Authentication System
    async testAuthentication() {
        return await this.runTest('Authentication System', async () => {
            // Go to admin dashboard
            await this.page.goto(`${this.adminUrl}/dashboard.html`, { waitUntil: 'networkidle2' });
            
            // Check if redirected to login
            const currentUrl = this.page.url();
            if (currentUrl.includes('login.html')) {
                // Test login form
                await this.page.waitForSelector('#username', { timeout: 5000 });
                await this.page.type('#username', 'admin');
                await this.page.type('#password', 'admin123');
                
                const loginButton = await this.page.$('#login-btn, button[type="submit"]');
                if (loginButton) {
                    await loginButton.click();
                    await this.page.waitForTimeout(2000);
                }
            }
            
            // Check if we can access dashboard
            const dashboardElements = await this.page.$$('.dashboard-card, .admin-nav, .admin-content');
            if (dashboardElements.length === 0) {
                throw new Error('Dashboard not accessible after login attempt');
            }
            
            // Test logout if logout button exists
            const logoutBtn = await this.page.$('#logout-btn, .logout-button');
            if (logoutBtn) {
                await logoutBtn.click();
                await this.page.waitForTimeout(1000);
            }
        });
    }

    // TEST 2: Create New Blog Post
    async testCreateBlogPost() {
        return await this.runTest('Create New Blog Post', async () => {
            await this.page.goto(`${this.adminUrl}/dashboard.html`, { waitUntil: 'networkidle2' });
            
            // Look for "New Post" or "Create Content" button
            const createButton = await this.page.$('button:contains("New"), .create-btn, .new-post-btn');
            if (createButton) {
                await createButton.click();
                await this.page.waitForTimeout(2000);
            } else {
                // Try navigation menu
                const navItems = await this.page.$$('nav a, .nav-item');
                for (let item of navItems) {
                    const text = await this.page.evaluate(el => el.textContent.toLowerCase(), item);
                    if (text.includes('content') || text.includes('post') || text.includes('blog')) {
                        await item.click();
                        break;
                    }
                }
                await this.page.waitForTimeout(2000);
            }
            
            // Fill in post details
            const titleField = await this.page.$('#title, input[name="title"]');
            if (titleField) {
                await titleField.click({ clickCount: 3 });
                await titleField.type('QA Test Blog Post - ' + Date.now());
            }
            
            const contentField = await this.page.$('#content, textarea[name="content"], .editor');
            if (contentField) {
                await contentField.click();
                await contentField.type('This is a test blog post created during QA testing. Content includes various elements to verify proper rendering.');
            }
            
            // Look for save button
            const saveButton = await this.page.$('button:contains("Save"), .save-btn, #save-post');
            if (saveButton) {
                await saveButton.click();
                await this.page.waitForTimeout(3000);
                
                // Check for success message
                const successMsg = await this.page.$('.success, .alert-success, .toast-success');
                if (!successMsg) {
                    throw new Error('No success confirmation after saving post');
                }
            } else {
                throw new Error('Save button not found');
            }
        });
    }

    // TEST 3: Image Upload and Insertion
    async testImageUpload() {
        return await this.runTest('Image Upload and Insertion', async () => {
            await this.page.goto(`${this.adminUrl}/dashboard.html`, { waitUntil: 'networkidle2' });
            
            // Look for media/upload section
            const uploadButton = await this.page.$('input[type="file"], .upload-btn, .media-upload');
            if (uploadButton) {
                // Create a test image file path
                const testImagePath = require('path').join(__dirname, '../static/images/tree_image.jpg');
                
                if (await require('fs').promises.access(testImagePath).then(() => true).catch(() => false)) {
                    await uploadButton.uploadFile(testImagePath);
                    await this.page.waitForTimeout(3000);
                    
                    // Check if image appears in media library
                    const uploadedImage = await this.page.$('.uploaded-image, .media-item img');
                    if (!uploadedImage) {
                        throw new Error('Uploaded image not visible in media library');
                    }
                }
            } else {
                // Look for media management page
                const mediaLink = await this.page.$('a[href*="media"], .media-link');
                if (mediaLink) {
                    await mediaLink.click();
                    await this.page.waitForTimeout(2000);
                }
            }
        });
    }

    // TEST 4: Edit Existing Content
    async testEditContent() {
        return await this.runTest('Edit Existing Content', async () => {
            await this.page.goto(`${this.adminUrl}/dashboard.html`, { waitUntil: 'networkidle2' });
            
            // Look for content list or existing posts
            const contentList = await this.page.$$('.content-item, .post-item, .file-item');
            if (contentList.length > 0) {
                // Click on first content item
                await contentList[0].click();
                await this.page.waitForTimeout(2000);
                
                // Edit content
                const contentField = await this.page.$('#content, textarea[name="content"], .editor');
                if (contentField) {
                    await contentField.click();
                    await contentField.type('\n\nEdited during QA testing at ' + new Date().toISOString());
                    
                    // Save changes
                    const saveButton = await this.page.$('button:contains("Save"), .save-btn');
                    if (saveButton) {
                        await saveButton.click();
                        await this.page.waitForTimeout(2000);
                    }
                }
            }
        });
    }

    // TEST 5: Content Deletion
    async testContentDeletion() {
        return await this.runTest('Content Deletion', async () => {
            await this.page.goto(`${this.adminUrl}/dashboard.html`, { waitUntil: 'networkidle2' });
            
            // Look for delete buttons in content list
            const deleteButtons = await this.page.$$('.delete-btn, .remove-btn, button:contains("Delete")');
            if (deleteButtons.length > 0) {
                // Click first delete button
                await deleteButtons[0].click();
                await this.page.waitForTimeout(1000);
                
                // Handle confirmation dialog
                const confirmButton = await this.page.$('.confirm-delete, button:contains("Confirm")');
                if (confirmButton) {
                    await confirmButton.click();
                    await this.page.waitForTimeout(2000);
                }
            }
        });
    }

    // TEST 6: Navigation and UI Elements
    async testNavigation() {
        return await this.runTest('Navigation and UI Elements', async () => {
            await this.page.goto(`${this.adminUrl}/dashboard.html`, { waitUntil: 'networkidle2' });
            
            // Test all navigation links
            const navLinks = await this.page.$$('nav a, .nav-link, .menu-item a');
            let workingLinks = 0;
            
            for (let link of navLinks) {
                try {
                    const href = await this.page.evaluate(el => el.href, link);
                    if (href && !href.includes('javascript:') && !href.includes('#')) {
                        await link.click();
                        await this.page.waitForTimeout(1000);
                        
                        // Check if page loaded without errors
                        const errorElement = await this.page.$('.error-page, .404, .error-message');
                        if (!errorElement) {
                            workingLinks++;
                        }
                    }
                } catch (error) {
                    console.log(`Navigation link error: ${error.message}`);
                }
            }
            
            if (workingLinks === 0) {
                throw new Error('No working navigation links found');
            }
        });
    }

    // TEST 7: Responsive Design
    async testResponsiveDesign() {
        return await this.runTest('Responsive Design', async () => {
            const viewports = [
                { width: 320, height: 568, name: 'Mobile' },
                { width: 768, height: 1024, name: 'Tablet' },
                { width: 1920, height: 1080, name: 'Desktop' }
            ];
            
            for (let viewport of viewports) {
                await this.page.setViewport(viewport);
                await this.page.goto(`${this.adminUrl}/dashboard.html`, { waitUntil: 'networkidle2' });
                
                // Check if content is visible and not overflowing
                const bodyScrollWidth = await this.page.evaluate(() => document.body.scrollWidth);
                const bodyClientWidth = await this.page.evaluate(() => document.body.clientWidth);
                
                if (bodyScrollWidth > bodyClientWidth + 50) {
                    throw new Error(`Horizontal overflow on ${viewport.name} (${viewport.width}x${viewport.height})`);
                }
            }
            
            // Reset to desktop view
            await this.page.setViewport({ width: 1920, height: 1080 });
        });
    }

    // TEST 8: Site Changes Verification
    async testSiteChanges() {
        return await this.runTest('Site Changes Verification', async () => {
            // Check if public site is accessible
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
            
            const pageTitle = await this.page.title();
            if (!pageTitle || pageTitle.includes('404') || pageTitle.includes('Error')) {
                throw new Error('Public site not accessible or showing error');
            }
            
            // Check if recent content is visible (if any test posts were created)
            const contentElements = await this.page.$$('article, .post, .content-item');
            if (contentElements.length === 0) {
                console.log('Warning: No content found on public site');
            }
        });
    }

    // Main test runner
    async runAllTests() {
        await this.setup();
        
        console.log('🧪 Starting Comprehensive CMS Testing...\n');
        
        const tests = [
            () => this.testAuthentication(),
            () => this.testCreateBlogPost(),
            () => this.testImageUpload(),
            () => this.testEditContent(),
            () => this.testContentDeletion(),
            () => this.testNavigation(),
            () => this.testResponsiveDesign(),
            () => this.testSiteChanges()
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (let test of tests) {
            const result = await test();
            if (result) passed++;
            else failed++;
            
            // Small delay between tests
            await this.page.waitForTimeout(1000);
        }
        
        await this.teardown();
        
        return {
            passed,
            failed,
            total: tests.length,
            results: this.testResults,
            bugs: this.bugs
        };
    }
}

module.exports = { CMSTestSuite };

// Run tests if called directly
if (require.main === module) {
    (async () => {
        const testSuite = new CMSTestSuite();
        const results = await testSuite.runAllTests();
        
        console.log('\n📊 TEST SUMMARY:');
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📝 Total: ${results.total}`);
        
        if (results.bugs.length > 0) {
            console.log(`\n🐛 BUGS FOUND: ${results.bugs.length}`);
            results.bugs.forEach(bug => {
                console.log(`  - ${bug.type}: ${bug.message || bug.error}`);
            });
        }
    })();
}