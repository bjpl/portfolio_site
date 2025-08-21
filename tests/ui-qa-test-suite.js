// Comprehensive UI/UX QA Test Suite
// Run with: node tests/ui-qa-test-suite.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class UIQATestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            issues: [],
            tests: []
        };
        this.baseUrl = 'http://localhost:51142';
    }

    async setUp() {
        console.log('🚀 Starting UI/UX QA Test Suite...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for CI
            devtools: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set viewport for desktop testing
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Listen for console errors
        this.page.on('console', (msg) => {
            if (msg.type() === 'error') {
                this.addIssue('Console Error', `Console error: ${msg.text()}`, 'high');
            }
        });
        
        // Listen for page errors
        this.page.on('pageerror', (error) => {
            this.addIssue('Page Error', `JavaScript error: ${error.message}`, 'high');
        });
    }

    async tearDown() {
        if (this.browser) {
            await this.browser.close();
        }
        this.generateReport();
    }

    addIssue(component, description, severity = 'medium', reproduction = '') {
        this.results.issues.push({
            component,
            description,
            severity,
            reproduction,
            timestamp: new Date().toISOString()
        });
        console.log(`❌ ${severity.toUpperCase()}: ${component} - ${description}`);
    }

    addTest(name, passed, details = '') {
        this.results.tests.push({ name, passed, details });
        if (passed) {
            this.results.passed++;
            console.log(`✅ ${name}`);
        } else {
            this.results.failed++;
            console.log(`❌ ${name} - ${details}`);
        }
    }

    // === NAVIGATION TESTS ===
    async testNavigation() {
        console.log('\n📱 Testing Navigation...');
        
        await this.page.goto(this.baseUrl);
        
        // Test main navigation links
        const navLinks = await this.page.$$eval('.site-nav a', links => 
            links.map(link => ({
                text: link.textContent.trim(),
                href: link.href,
                target: link.target || '_self'
            }))
        );
        
        this.addTest('Navigation links found', navLinks.length > 0, 
            `Found ${navLinks.length} navigation links`);
        
        // Test each navigation link
        for (const link of navLinks) {
            try {
                // Skip external links for now
                if (link.target === '_blank') continue;
                
                console.log(`  Testing nav link: ${link.text}`);
                await this.page.goto(link.href);
                
                // Check if page loads successfully
                await this.page.waitForSelector('body', { timeout: 5000 });
                const title = await this.page.title();
                
                this.addTest(`Navigation: ${link.text}`, true, 
                    `Successfully loaded page: ${title}`);
                    
            } catch (error) {
                this.addIssue('Navigation', 
                    `Failed to load navigation link "${link.text}": ${error.message}`, 
                    'high',
                    `Click on navigation link "${link.text}"`);
                this.addTest(`Navigation: ${link.text}`, false, error.message);
            }
        }
        
        // Test navigation hover states
        await this.page.goto(this.baseUrl);
        const hoverWorks = await this.page.evaluate(() => {
            const navLink = document.querySelector('.site-nav a');
            if (!navLink) return false;
            
            // Trigger hover
            navLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            
            // Check if hover styles are applied
            const computedStyle = getComputedStyle(navLink);
            return computedStyle.getPropertyValue('color') !== '';
        });
        
        this.addTest('Navigation hover states', hoverWorks);
    }

    // === THEME TOGGLE TESTS ===
    async testThemeToggle() {
        console.log('\n🌙 Testing Theme Toggle...');
        
        await this.page.goto(this.baseUrl);
        
        // Check if theme toggle button exists
        const themeButton = await this.page.$('#theme-toggle-btn, .theme-toggle');
        this.addTest('Theme toggle button exists', themeButton !== null);
        
        if (!themeButton) {
            this.addIssue('Theme Toggle', 'Theme toggle button not found', 'medium');
            return;
        }
        
        // Test theme toggle functionality
        try {
            // Get initial theme
            const initialTheme = await this.page.evaluate(() => 
                document.documentElement.getAttribute('data-theme')
            );
            
            // Click theme toggle
            await themeButton.click();
            await this.page.waitForTimeout(500); // Wait for theme transition
            
            // Get new theme
            const newTheme = await this.page.evaluate(() => 
                document.documentElement.getAttribute('data-theme')
            );
            
            const themeChanged = initialTheme !== newTheme;
            this.addTest('Theme toggle changes theme', themeChanged,
                `Changed from ${initialTheme} to ${newTheme}`);
            
            // Test if theme persists on reload
            await this.page.reload();
            const persistedTheme = await this.page.evaluate(() => 
                document.documentElement.getAttribute('data-theme')
            );
            
            this.addTest('Theme persists on reload', persistedTheme === newTheme);
            
        } catch (error) {
            this.addIssue('Theme Toggle', `Theme toggle failed: ${error.message}`, 'high');
            this.addTest('Theme toggle functionality', false, error.message);
        }
    }

    // === LANGUAGE SWITCHER TESTS ===
    async testLanguageSwitcher() {
        console.log('\n🌍 Testing Language Switcher...');
        
        await this.page.goto(this.baseUrl);
        
        // Check if language switcher exists
        const langSwitcher = await this.page.$('.lang-switch, .lang-switcher select');
        this.addTest('Language switcher exists', langSwitcher !== null);
        
        if (!langSwitcher) {
            this.addIssue('Language Switcher', 'Language switcher not found', 'medium');
            return;
        }
        
        try {
            // Get available languages
            const languages = await this.page.$$eval('.lang-switch option', options =>
                options.map(option => ({
                    value: option.value,
                    text: option.textContent.trim()
                }))
            );
            
            this.addTest('Language options available', languages.length > 1,
                `Found ${languages.length} language options`);
            
            // Test switching to Spanish (if available)
            const spanishOption = languages.find(lang => lang.value === 'es');
            if (spanishOption) {
                await this.page.select('.lang-switch', 'es');
                await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
                
                const currentUrl = this.page.url();
                const isSpanishUrl = currentUrl.includes('/es/') || currentUrl.endsWith('/es');
                
                this.addTest('Language switcher navigates to Spanish', isSpanishUrl,
                    `Current URL: ${currentUrl}`);
            }
            
        } catch (error) {
            this.addIssue('Language Switcher', `Language switch failed: ${error.message}`, 'medium');
            this.addTest('Language switcher functionality', false, error.message);
        }
    }

    // === RESPONSIVE DESIGN TESTS ===
    async testResponsiveDesign() {
        console.log('\n📱 Testing Responsive Design...');
        
        const viewports = [
            { name: 'Mobile', width: 375, height: 667 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1920, height: 1080 }
        ];
        
        for (const viewport of viewports) {
            console.log(`  Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
            
            await this.page.setViewport(viewport);
            await this.page.goto(this.baseUrl);
            
            try {
                // Check if navigation is accessible
                const navVisible = await this.page.evaluate(() => {
                    const nav = document.querySelector('.site-nav');
                    if (!nav) return false;
                    
                    const style = getComputedStyle(nav);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });
                
                this.addTest(`${viewport.name}: Navigation visible`, navVisible);
                
                // Check for horizontal overflow
                const hasOverflow = await this.page.evaluate(() => {
                    return document.documentElement.scrollWidth > window.innerWidth;
                });
                
                if (hasOverflow) {
                    this.addIssue('Responsive Design', 
                        `Horizontal overflow detected on ${viewport.name}`, 
                        'medium',
                        `View site at ${viewport.width}x${viewport.height}`);
                }
                
                this.addTest(`${viewport.name}: No horizontal overflow`, !hasOverflow);
                
                // Check if text is readable (not too small)
                const textTooSmall = await this.page.evaluate(() => {
                    const bodyStyle = getComputedStyle(document.body);
                    const fontSize = parseFloat(bodyStyle.fontSize);
                    return fontSize < 14; // Less than 14px might be too small
                });
                
                this.addTest(`${viewport.name}: Text readable size`, !textTooSmall);
                
            } catch (error) {
                this.addIssue('Responsive Design', 
                    `${viewport.name} test failed: ${error.message}`, 'medium');
            }
        }
        
        // Reset to desktop
        await this.page.setViewport({ width: 1920, height: 1080 });
    }

    // === LINKS PAGE TESTS ===
    async testLinksPage() {
        console.log('\n🔗 Testing Links Page...');
        
        try {
            await this.page.goto(`${this.baseUrl}/teaching-learning/links/`);
            
            // Test search functionality
            const searchInput = await this.page.$('#linkSearch');
            this.addTest('Links page search input exists', searchInput !== null);
            
            if (searchInput) {
                // Test search
                await searchInput.type('test');
                await this.page.waitForTimeout(1000); // Wait for search to process
                
                // Check if search results update
                const hasResults = await this.page.evaluate(() => {
                    const links = document.querySelectorAll('.link-item-wrapper');
                    return links.length > 0;
                });
                
                this.addTest('Links page search functionality', hasResults);
            }
            
            // Test filter functionality
            const filterButtons = await this.page.$$('.filter-btn, .category-filter');
            this.addTest('Links page filters exist', filterButtons.length > 0,
                `Found ${filterButtons.length} filter buttons`);
            
            // Test collapsible sections
            const collapsibleSections = await this.page.$$('.collapsible-toggle, .section-toggle');
            if (collapsibleSections.length > 0) {
                try {
                    await collapsibleSections[0].click();
                    await this.page.waitForTimeout(500);
                    this.addTest('Links page collapsible sections work', true);
                } catch (error) {
                    this.addIssue('Links Page', 
                        `Collapsible sections failed: ${error.message}`, 'medium');
                }
            }
            
        } catch (error) {
            this.addIssue('Links Page', `Links page test failed: ${error.message}`, 'high');
        }
    }

    // === ACCESSIBILITY TESTS ===
    async testAccessibility() {
        console.log('\n♿ Testing Accessibility...');
        
        await this.page.goto(this.baseUrl);
        
        try {
            // Test keyboard navigation
            await this.page.keyboard.press('Tab');
            const focusedElement = await this.page.evaluate(() => 
                document.activeElement.tagName.toLowerCase()
            );
            
            this.addTest('Keyboard navigation works', 
                ['a', 'button', 'input', 'select'].includes(focusedElement));
            
            // Check for alt text on images
            const imagesWithoutAlt = await this.page.$$eval('img', images =>
                images.filter(img => !img.alt || img.alt.trim() === '').length
            );
            
            this.addTest('Images have alt text', imagesWithoutAlt === 0,
                imagesWithoutAlt > 0 ? `${imagesWithoutAlt} images missing alt text` : '');
            
            // Check for proper heading structure
            const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6', headings =>
                headings.map(h => h.tagName.toLowerCase())
            );
            
            const hasH1 = headings.includes('h1');
            this.addTest('Page has H1 heading', hasH1);
            
            // Check for ARIA labels on interactive elements
            const interactiveWithoutAria = await this.page.$$eval(
                'button, [role="button"]', 
                elements => elements.filter(el => 
                    !el.getAttribute('aria-label') && 
                    !el.getAttribute('aria-labelledby') &&
                    !el.textContent.trim()
                ).length
            );
            
            this.addTest('Interactive elements have labels', interactiveWithoutAria === 0,
                interactiveWithoutAria > 0 ? `${interactiveWithoutAria} elements need ARIA labels` : '');
                
        } catch (error) {
            this.addIssue('Accessibility', `Accessibility test failed: ${error.message}`, 'high');
        }
    }

    // === PERFORMANCE TESTS ===
    async testPerformance() {
        console.log('\n⚡ Testing Performance...');
        
        try {
            // Enable performance metrics
            await this.page.tracing.start({ path: 'trace.json' });
            
            const navigationStart = Date.now();
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
            const navigationEnd = Date.now();
            
            await this.page.tracing.stop();
            
            const loadTime = navigationEnd - navigationStart;
            this.addTest('Page loads under 3 seconds', loadTime < 3000,
                `Page loaded in ${loadTime}ms`);
            
            // Check for large images
            const largeImages = await this.page.$$eval('img', images =>
                images.filter(img => {
                    const rect = img.getBoundingClientRect();
                    return rect.width > 800 || rect.height > 600;
                }).length
            );
            
            if (largeImages > 0) {
                this.addIssue('Performance', 
                    `${largeImages} large images detected - consider optimization`, 'low');
            }
            
        } catch (error) {
            this.addIssue('Performance', `Performance test failed: ${error.message}`, 'medium');
        }
    }

    // === RUN ALL TESTS ===
    async runAllTests() {
        try {
            await this.setUp();
            
            await this.testNavigation();
            await this.testThemeToggle();
            await this.testLanguageSwitcher();
            await this.testResponsiveDesign();
            await this.testLinksPage();
            await this.testAccessibility();
            await this.testPerformance();
            
        } catch (error) {
            console.error('Test suite failed:', error);
            this.addIssue('Test Suite', `Test suite error: ${error.message}`, 'critical');
        } finally {
            await this.tearDown();
        }
    }

    generateReport() {
        console.log('\n📊 Generating QA Report...');
        
        const report = {
            summary: {
                totalTests: this.results.tests.length,
                passed: this.results.passed,
                failed: this.results.failed,
                issues: this.results.issues.length,
                timestamp: new Date().toISOString()
            },
            tests: this.results.tests,
            issues: this.results.issues.sort((a, b) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            })
        };
        
        // Save detailed report
        fs.writeFileSync(
            path.join(__dirname, '../tests/ui-qa-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        // Generate human-readable report
        let readableReport = `
# UI/UX QA Test Report
Generated: ${new Date().toLocaleString()}

## Summary
- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passed} ✅
- **Failed**: ${report.summary.failed} ❌
- **Issues Found**: ${report.summary.issues}

## Test Results
${report.tests.map(test => 
    `${test.passed ? '✅' : '❌'} ${test.name}${test.details ? ` - ${test.details}` : ''}`
).join('\n')}

## Issues Found
${report.issues.length === 0 ? 'No issues found! 🎉' : 
  report.issues.map(issue => 
    `### ${issue.severity.toUpperCase()}: ${issue.component}
**Description**: ${issue.description}
${issue.reproduction ? `**Reproduction**: ${issue.reproduction}` : ''}
**Timestamp**: ${issue.timestamp}
`
  ).join('\n')
}

## Recommendations
${this.generateRecommendations(report.issues)}
`;
        
        fs.writeFileSync(
            path.join(__dirname, '../tests/ui-qa-report.md'),
            readableReport
        );
        
        console.log('\n📋 QA Test Summary:');
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`⚠️  Issues: ${report.summary.issues}`);
        console.log('\nReports saved to:');
        console.log('- tests/ui-qa-report.json');
        console.log('- tests/ui-qa-report.md');
    }

    generateRecommendations(issues) {
        const recommendations = [];
        
        if (issues.some(i => i.component === 'Navigation')) {
            recommendations.push('- Fix navigation issues to ensure smooth user experience');
        }
        
        if (issues.some(i => i.component === 'Theme Toggle')) {
            recommendations.push('- Resolve theme toggle functionality for better accessibility');
        }
        
        if (issues.some(i => i.component === 'Responsive Design')) {
            recommendations.push('- Optimize responsive design for all device sizes');
        }
        
        if (issues.some(i => i.component === 'Accessibility')) {
            recommendations.push('- Address accessibility issues to improve site usability');
        }
        
        if (issues.some(i => i.component === 'Performance')) {
            recommendations.push('- Optimize performance to improve user experience');
        }
        
        return recommendations.length > 0 ? recommendations.join('\n') : '- Great work! No major issues found.';
    }
}

// Run tests if called directly
if (require.main === module) {
    const testSuite = new UIQATestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = UIQATestSuite;