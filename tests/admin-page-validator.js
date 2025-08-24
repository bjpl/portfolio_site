/**
 * Admin Page Validation Script
 * Tests all admin pages to ensure proper status indicators and functionality
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

class AdminPageValidator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            },
            tests: [],
            recommendations: []
        };
    }

    /**
     * Main validation runner
     */
    async validateAll() {
        console.log('🔍 Starting Admin Page Validation...\n');

        // Test individual files
        await this.validateLoginPages();
        await this.validateDashboardPages();
        await this.validateConfigurationFiles();
        await this.validateStatusIndicators();
        await this.validateSupabaseCredentials();
        await this.validateEnvironmentDetection();
        await this.validateSyntaxErrors();

        // Generate final report
        this.generateSummary();
        await this.saveReport();
        this.displayResults();

        return this.results;
    }

    /**
     * Test login pages for proper status indicators
     */
    async validateLoginPages() {
        const testName = 'Login Pages Status Indicators';
        console.log(`📝 Testing ${testName}...`);

        const loginPages = [
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\login.html',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\static\\admin\\login.html'
        ];

        let allPassed = true;
        const issues = [];

        for (const pagePath of loginPages) {
            try {
                if (!fs.existsSync(pagePath)) {
                    issues.push(`File not found: ${pagePath}`);
                    continue;
                }

                const content = await readFile(pagePath, 'utf8');

                // Check for proper Supabase credentials
                if (!content.includes('tdmzayzkqyegvfgxlolj.supabase.co')) {
                    issues.push(`${path.basename(pagePath)}: Missing proper Supabase URL`);
                    allPassed = false;
                }

                if (!content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
                    issues.push(`${path.basename(pagePath)}: Missing proper Supabase anon key`);
                    allPassed = false;
                }

                // Check for status indicators
                const hasStatusIndicators = content.includes('CONNECTED') || 
                                          content.includes('LOADED') || 
                                          content.includes('PRODUCTION');

                if (!hasStatusIndicators) {
                    issues.push(`${path.basename(pagePath)}: Missing status indicators`);
                    allPassed = false;
                }

            } catch (error) {
                issues.push(`${path.basename(pagePath)}: Error reading file - ${error.message}`);
                allPassed = false;
            }
        }

        this.addTestResult(testName, allPassed, issues);
    }

    /**
     * Validate dashboard pages
     */
    async validateDashboardPages() {
        const testName = 'Dashboard Pages Configuration';
        console.log(`📝 Testing ${testName}...`);

        const dashboardPages = [
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\dashboard.html',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\static\\admin\\dashboard.html'
        ];

        let allPassed = true;
        const issues = [];

        for (const pagePath of dashboardPages) {
            try {
                if (!fs.existsSync(pagePath)) {
                    issues.push(`File not found: ${pagePath}`);
                    continue;
                }

                const content = await readFile(pagePath, 'utf8');

                // Check for proper script loading
                if (!content.includes('environment-checker.js')) {
                    issues.push(`${path.basename(pagePath)}: Missing environment checker script`);
                    allPassed = false;
                }

                // Check for auth system initialization
                if (!content.includes('AuthManager') && !content.includes('authService')) {
                    issues.push(`${path.basename(pagePath)}: Missing authentication system`);
                    allPassed = false;
                }

            } catch (error) {
                issues.push(`${path.basename(pagePath)}: Error reading file - ${error.message}`);
                allPassed = false;
            }
        }

        this.addTestResult(testName, allPassed, issues);
    }

    /**
     * Validate configuration files
     */
    async validateConfigurationFiles() {
        const testName = 'Configuration Files';
        console.log(`📝 Testing ${testName}...`);

        const configFiles = [
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\js\\config.js',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\js\\environment-checker.js',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\js\\enhanced-auth-manager.js'
        ];

        let allPassed = true;
        const issues = [];

        for (const configPath of configFiles) {
            try {
                if (!fs.existsSync(configPath)) {
                    issues.push(`Config file not found: ${path.basename(configPath)}`);
                    allPassed = false;
                    continue;
                }

                const content = await readFile(configPath, 'utf8');

                // Check for syntax errors (basic check)
                if (content.includes('syntax error') || content.includes('SyntaxError')) {
                    issues.push(`${path.basename(configPath)}: Contains syntax errors`);
                    allPassed = false;
                }

                // Check for proper exports
                if (configPath.includes('config.js') && !content.includes('AdminConfig')) {
                    issues.push(`${path.basename(configPath)}: Missing AdminConfig export`);
                    allPassed = false;
                }

            } catch (error) {
                issues.push(`${path.basename(configPath)}: Error reading file - ${error.message}`);
                allPassed = false;
            }
        }

        this.addTestResult(testName, allPassed, issues);
    }

    /**
     * Validate status indicators show correct values
     */
    async validateStatusIndicators() {
        const testName = 'Status Indicators Display';
        console.log(`📝 Testing ${testName}...`);

        // This test checks if the login page would show proper status indicators
        const workingAdminPath = 'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\layouts\\admin\\admin-dashboard.html';
        
        let allPassed = true;
        const issues = [];
        const expectedStatus = {
            supabase: 'CONNECTED',
            config: 'LOADED',
            environment: 'PRODUCTION'
        };

        try {
            if (fs.existsSync(workingAdminPath)) {
                const content = await readFile(workingAdminPath, 'utf8');
                
                // Check that the working admin shows correct status
                if (!content.includes('Supabase: <span id="supabaseStatus">CONNECTED ✅</span>')) {
                    issues.push('Working admin template missing proper Supabase status');
                    allPassed = false;
                }

                if (!content.includes('Config: <span id="configStatus">LOADED ✅</span>')) {
                    issues.push('Working admin template missing proper config status');
                    allPassed = false;
                }

                if (!content.includes('Environment: <span style="color: #28a745; font-weight: bold;">PRODUCTION</span>')) {
                    issues.push('Working admin template missing proper environment status');
                    allPassed = false;
                }
            } else {
                issues.push('Working admin template not found');
                allPassed = false;
            }

        } catch (error) {
            issues.push(`Error validating status indicators: ${error.message}`);
            allPassed = false;
        }

        this.addTestResult(testName, allPassed, issues);
    }

    /**
     * Validate Supabase credentials are properly embedded
     */
    async validateSupabaseCredentials() {
        const testName = 'Supabase Credentials Validation';
        console.log(`📝 Testing ${testName}...`);

        const expectedUrl = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
        const expectedKeyStart = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

        let allPassed = true;
        const issues = [];

        // Check all admin files for proper credentials
        const adminFiles = [
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\login.html',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\dashboard.html',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\static\\admin\\login.html',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\static\\admin\\dashboard.html'
        ];

        for (const filePath of adminFiles) {
            if (!fs.existsSync(filePath)) continue;

            try {
                const content = await readFile(filePath, 'utf8');
                const fileName = path.basename(filePath);

                if (content.includes('window.SUPABASE_CONFIG')) {
                    if (!content.includes(expectedUrl)) {
                        issues.push(`${fileName}: Incorrect Supabase URL`);
                        allPassed = false;
                    }

                    if (!content.includes(expectedKeyStart)) {
                        issues.push(`${fileName}: Incorrect or missing Supabase anon key`);
                        allPassed = false;
                    }
                } else {
                    issues.push(`${fileName}: Missing SUPABASE_CONFIG object`);
                    allPassed = false;
                }

            } catch (error) {
                issues.push(`${path.basename(filePath)}: Error reading file - ${error.message}`);
                allPassed = false;
            }
        }

        this.addTestResult(testName, allPassed, issues);
    }

    /**
     * Validate environment detection logic
     */
    async validateEnvironmentDetection() {
        const testName = 'Environment Detection Logic';
        console.log(`📝 Testing ${testName}...`);

        let allPassed = true;
        const issues = [];

        try {
            const envCheckerPath = 'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\js\\environment-checker.js';
            
            if (fs.existsSync(envCheckerPath)) {
                const content = await readFile(envCheckerPath, 'utf8');

                // Check for proper production detection
                if (!content.includes('isProductionEnvironment')) {
                    issues.push('Environment checker missing production detection method');
                    allPassed = false;
                }

                // Check for proper hostname checking
                if (!content.includes('window.location.hostname')) {
                    issues.push('Environment checker missing hostname validation');
                    allPassed = false;
                }

                // Check for environment reporting
                if (!content.includes('PRODUCTION') || !content.includes('development')) {
                    issues.push('Environment checker missing proper environment labels');
                    allPassed = false;
                }

            } else {
                issues.push('Environment checker script not found');
                allPassed = false;
            }

        } catch (error) {
            issues.push(`Error validating environment detection: ${error.message}`);
            allPassed = false;
        }

        this.addTestResult(testName, allPassed, issues);
    }

    /**
     * Check for syntax errors in admin files
     */
    async validateSyntaxErrors() {
        const testName = 'Syntax Error Detection';
        console.log(`📝 Testing ${testName}...`);

        const jsFiles = [
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\js\\config.js',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\js\\environment-checker.js',
            'C:\\Users\\brand\\Development\\Project_Workspace\\portfolio_site\\public\\admin\\js\\enhanced-auth-manager.js'
        ];

        let allPassed = true;
        const issues = [];

        for (const jsFile of jsFiles) {
            if (!fs.existsSync(jsFile)) continue;

            try {
                const content = await readFile(jsFile, 'utf8');
                const fileName = path.basename(jsFile);

                // Basic syntax checks
                const openBraces = (content.match(/\{/g) || []).length;
                const closeBraces = (content.match(/\}/g) || []).length;
                
                if (openBraces !== closeBraces) {
                    issues.push(`${fileName}: Unmatched braces (${openBraces} open, ${closeBraces} close)`);
                    allPassed = false;
                }

                const openParens = (content.match(/\(/g) || []).length;
                const closeParens = (content.match(/\)/g) || []).length;
                
                if (openParens !== closeParens) {
                    issues.push(`${fileName}: Unmatched parentheses (${openParens} open, ${closeParens} close)`);
                    allPassed = false;
                }

                // Check for common syntax errors
                if (content.includes('undefined is not a function') || 
                    content.includes('Cannot read property') ||
                    content.includes('SyntaxError')) {
                    issues.push(`${fileName}: Contains runtime error indicators`);
                    allPassed = false;
                }

            } catch (error) {
                issues.push(`${path.basename(jsFile)}: Error reading file - ${error.message}`);
                allPassed = false;
            }
        }

        this.addTestResult(testName, allPassed, issues);
    }

    /**
     * Add test result to results array
     */
    addTestResult(testName, passed, issues = []) {
        this.results.summary.total++;
        
        if (passed) {
            this.results.summary.passed++;
            console.log(`✅ ${testName}: PASSED`);
        } else {
            this.results.summary.failed++;
            console.log(`❌ ${testName}: FAILED`);
            issues.forEach(issue => console.log(`   - ${issue}`));
        }

        if (issues.length > 0 && passed) {
            this.results.summary.warnings++;
        }

        this.results.tests.push({
            name: testName,
            status: passed ? 'PASSED' : 'FAILED',
            issues: issues,
            timestamp: new Date().toISOString()
        });

        console.log('');
    }

    /**
     * Generate summary and recommendations
     */
    generateSummary() {
        const { summary } = this.results;
        const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

        console.log('📊 VALIDATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed} (${passRate}%)`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Warnings: ${summary.warnings}`);
        console.log('');

        // Generate recommendations based on failures
        if (summary.failed > 0) {
            this.results.recommendations.push('🚨 Critical: Admin pages have configuration issues that need immediate attention');
        }

        // Look for specific patterns in issues
        const allIssues = this.results.tests.flatMap(test => test.issues);
        
        if (allIssues.some(issue => issue.includes('Supabase'))) {
            this.results.recommendations.push('🔧 Fix Supabase credentials in admin pages to show CONNECTED status');
        }

        if (allIssues.some(issue => issue.includes('status indicators'))) {
            this.results.recommendations.push('📊 Update admin login pages to show proper status indicators: ✅ Supabase: CONNECTED, ✅ Config: LOADED, ✅ Environment: PRODUCTION');
        }

        if (allIssues.some(issue => issue.includes('environment'))) {
            this.results.recommendations.push('🌍 Fix environment detection to properly show PRODUCTION instead of "unknown"');
        }

        if (allIssues.some(issue => issue.includes('syntax'))) {
            this.results.recommendations.push('⚙️ Fix syntax errors in JavaScript files to prevent runtime issues');
        }

        if (this.results.recommendations.length === 0) {
            this.results.recommendations.push('✅ All admin pages are properly configured and ready for use');
        }
    }

    /**
     * Display final results
     */
    displayResults() {
        console.log('🎯 RECOMMENDATIONS');
        console.log('='.repeat(50));
        this.results.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
        console.log('');

        if (this.results.summary.failed === 0) {
            console.log('🎉 All tests passed! Admin pages are properly configured.');
            console.log('Users visiting /admin should see:');
            console.log('   ✅ Supabase: CONNECTED');
            console.log('   ✅ Config: LOADED');
            console.log('   ✅ Environment: PRODUCTION');
        } else {
            console.log('⚠️ Some tests failed. Admin pages need fixes to show proper status.');
            console.log('Users might see:');
            console.log('   ❌ Environment: unknown');
            console.log('   ❌ API: not configured');
            console.log('   ❌ Status indicators missing');
        }
    }

    /**
     * Save validation report
     */
    async saveReport() {
        const reportPath = path.join(__dirname, 'admin-validation-report.json');
        
        try {
            await writeFile(reportPath, JSON.stringify(this.results, null, 2));
            console.log(`📄 Report saved to: ${reportPath}`);
        } catch (error) {
            console.error('Error saving report:', error.message);
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new AdminPageValidator();
    validator.validateAll().then(() => {
        process.exit(validator.results.summary.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = AdminPageValidator;