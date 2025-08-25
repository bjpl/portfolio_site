/**
 * Automated Deployment Test Runner
 * Orchestrates all deployment tests and generates comprehensive reports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import all test suites
const PreDeploymentValidator = require('./pre-deployment-validation');
const PostDeploymentHealthChecker = require('./post-deployment-health');
const IntegrationTestSuite = require('./integration-test-suite');
const PerformanceBenchmarks = require('./performance-benchmarks');
const SecurityValidator = require('./security-validation');
const UserAcceptanceTests = require('./user-acceptance-tests');

class AutomatedDeploymentTestRunner {
    constructor(options = {}) {
        this.options = {
            baseUrl: options.baseUrl || process.env.DEPLOYED_URL,
            runPreDeployment: options.runPreDeployment !== false,
            runPostDeployment: options.runPostDeployment !== false,
            runIntegration: options.runIntegration !== false,
            runPerformance: options.runPerformance !== false,
            runSecurity: options.runSecurity !== false,
            runUserAcceptance: options.runUserAcceptance !== false,
            generateReport: options.generateReport !== false,
            reportDir: options.reportDir || path.join(process.cwd(), 'tests/deployment/reports'),
            failFast: options.failFast || false,
            timeout: options.timeout || 300000, // 5 minutes default
            ...options
        };
        
        this.results = {
            preDeployment: null,
            postDeployment: null,
            integration: null,
            performance: null,
            security: null,
            userAcceptance: null,
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                warnings: 0,
                overallScore: 0,
                grade: 'F',
                criticalIssues: [],
                recommendations: []
            }
        };
        
        this.startTime = Date.now();
        this.testOrder = [];
        
        // Ensure report directory exists
        if (this.options.generateReport && !fs.existsSync(this.options.reportDir)) {
            fs.mkdirSync(this.options.reportDir, { recursive: true });
        }
    }

    async runAllDeploymentTests() {
        console.log('🚀 Starting Automated Deployment Test Suite');
        console.log('='.repeat(70));
        console.log(`📊 Configuration:`);
        console.log(`   Target URL: ${this.options.baseUrl || 'Not specified (will test locally)'}`);
        console.log(`   Pre-deployment: ${this.options.runPreDeployment ? 'Yes' : 'No'}`);
        console.log(`   Post-deployment: ${this.options.runPostDeployment ? 'Yes' : 'No'}`);
        console.log(`   Integration: ${this.options.runIntegration ? 'Yes' : 'No'}`);
        console.log(`   Performance: ${this.options.runPerformance ? 'Yes' : 'No'}`);
        console.log(`   Security: ${this.options.runSecurity ? 'Yes' : 'No'}`);
        console.log(`   User Acceptance: ${this.options.runUserAcceptance ? 'Yes' : 'No'}`);
        console.log(`   Fail Fast: ${this.options.failFast ? 'Yes' : 'No'}`);
        console.log('='.repeat(70));
        
        try {
            // Run tests in logical order
            if (this.options.runPreDeployment) {
                await this.runPreDeploymentTests();
                if (this.shouldStopOnFailure()) return this.generateFinalReport();
            }
            
            if (this.options.runPostDeployment) {
                await this.runPostDeploymentTests();
                if (this.shouldStopOnFailure()) return this.generateFinalReport();
            }
            
            if (this.options.runIntegration) {
                await this.runIntegrationTests();
                if (this.shouldStopOnFailure()) return this.generateFinalReport();
            }
            
            if (this.options.runSecurity) {
                await this.runSecurityTests();
                if (this.shouldStopOnFailure()) return this.generateFinalReport();
            }
            
            if (this.options.runPerformance) {
                await this.runPerformanceTests();
                if (this.shouldStopOnFailure()) return this.generateFinalReport();
            }
            
            if (this.options.runUserAcceptance) {
                await this.runUserAcceptanceTests();
            }
            
            return this.generateFinalReport();
            
        } catch (error) {
            console.error('💥 Deployment test suite failed with error:', error);
            
            this.results.summary.criticalIssues.push({
                type: 'System Error',
                message: error.message,
                severity: 'critical'
            });
            
            return this.generateFinalReport(false);
        }
    }

    async runPreDeploymentTests() {
        console.log('\n📋 Running Pre-Deployment Validation...');
        this.testOrder.push('pre-deployment');
        
        try {
            const validator = new PreDeploymentValidator();
            const result = await this.runTestWithTimeout(
                () => validator.runAllValidations(),
                'Pre-deployment validation'
            );
            
            this.results.preDeployment = result;
            this.updateSummary('pre-deployment', result);
            
            if (result.success) {
                console.log('✅ Pre-deployment validation completed successfully');
            } else {
                console.log('❌ Pre-deployment validation failed');
                this.results.summary.criticalIssues.push({
                    type: 'Pre-deployment',
                    message: 'Pre-deployment validation failed - deployment should not proceed',
                    severity: 'critical'
                });
            }
            
        } catch (error) {
            console.error('💥 Pre-deployment validation error:', error.message);
            this.results.preDeployment = { success: false, error: error.message };
            this.results.summary.criticalIssues.push({
                type: 'Pre-deployment',
                message: `Pre-deployment validation error: ${error.message}`,
                severity: 'critical'
            });
        }
    }

    async runPostDeploymentTests() {
        console.log('\n🏥 Running Post-Deployment Health Checks...');
        this.testOrder.push('post-deployment');
        
        if (!this.options.baseUrl) {
            console.log('⚠️ No base URL provided - skipping post-deployment health checks');
            this.results.postDeployment = { success: false, message: 'No URL provided' };
            return;
        }
        
        try {
            const healthChecker = new PostDeploymentHealthChecker({
                baseUrl: this.options.baseUrl
            });
            
            const result = await this.runTestWithTimeout(
                () => healthChecker.runAllHealthChecks(),
                'Post-deployment health checks'
            );
            
            this.results.postDeployment = result;
            this.updateSummary('post-deployment', result);
            
            if (result.success) {
                console.log('✅ Post-deployment health checks completed successfully');
            } else {
                console.log('❌ Post-deployment health checks failed');
                this.results.summary.criticalIssues.push({
                    type: 'Health Check',
                    message: 'Deployment health checks failed - site may not be operational',
                    severity: 'high'
                });
            }
            
        } catch (error) {
            console.error('💥 Post-deployment health check error:', error.message);
            this.results.postDeployment = { success: false, error: error.message };
            this.results.summary.criticalIssues.push({
                type: 'Health Check',
                message: `Health check error: ${error.message}`,
                severity: 'high'
            });
        }
    }

    async runIntegrationTests() {
        console.log('\n🧪 Running Integration Tests...');
        this.testOrder.push('integration');
        
        const baseUrl = this.options.baseUrl || 'http://localhost:3000';
        
        try {
            const integrationSuite = new IntegrationTestSuite({ baseUrl });
            
            const result = await this.runTestWithTimeout(
                () => integrationSuite.runAllIntegrationTests(),
                'Integration tests'
            );
            
            this.results.integration = result;
            this.updateSummary('integration', result);
            
            if (result.success) {
                console.log('✅ Integration tests completed successfully');
            } else {
                console.log('❌ Integration tests failed');
                this.results.summary.criticalIssues.push({
                    type: 'Integration',
                    message: 'Integration tests failed - major features may not work properly',
                    severity: 'high'
                });
            }
            
        } catch (error) {
            console.error('💥 Integration test error:', error.message);
            this.results.integration = { success: false, error: error.message };
            this.results.summary.criticalIssues.push({
                type: 'Integration',
                message: `Integration test error: ${error.message}`,
                severity: 'high'
            });
        }
    }

    async runSecurityTests() {
        console.log('\n🛡️ Running Security Validation...');
        this.testOrder.push('security');
        
        const baseUrl = this.options.baseUrl || 'http://localhost:3000';
        
        try {
            const securityValidator = new SecurityValidator({ baseUrl });
            
            const result = await this.runTestWithTimeout(
                () => securityValidator.runAllSecurityTests(),
                'Security validation'
            );
            
            this.results.security = result;
            this.updateSummary('security', result);
            
            if (result.success) {
                console.log('✅ Security validation completed successfully');
                
                if (result.warnings) {
                    console.log('⚠️ Security validation has warnings - review recommended');
                    this.results.summary.warnings++;
                }
            } else {
                console.log('❌ Security validation failed');
                this.results.summary.criticalIssues.push({
                    type: 'Security',
                    message: 'Security validation failed - site may have vulnerabilities',
                    severity: 'critical'
                });
            }
            
        } catch (error) {
            console.error('💥 Security validation error:', error.message);
            this.results.security = { success: false, error: error.message };
            this.results.summary.criticalIssues.push({
                type: 'Security',
                message: `Security validation error: ${error.message}`,
                severity: 'critical'
            });
        }
    }

    async runPerformanceTests() {
        console.log('\n⚡ Running Performance Benchmarks...');
        this.testOrder.push('performance');
        
        const baseUrl = this.options.baseUrl || 'http://localhost:3000';
        
        try {
            const performanceBenchmarks = new PerformanceBenchmarks({ baseUrl });
            
            const result = await this.runTestWithTimeout(
                () => performanceBenchmarks.runAllBenchmarks(),
                'Performance benchmarks'
            );
            
            this.results.performance = result;
            this.updateSummary('performance', result);
            
            if (result.success) {
                console.log('✅ Performance benchmarks completed successfully');
                
                if (result.warnings) {
                    console.log('⚠️ Performance benchmarks have warnings - optimization recommended');
                    this.results.summary.warnings++;
                }
            } else {
                console.log('❌ Performance benchmarks failed');
                this.results.summary.criticalIssues.push({
                    type: 'Performance',
                    message: 'Performance benchmarks failed - site may be too slow',
                    severity: 'medium'
                });
            }
            
        } catch (error) {
            console.error('💥 Performance benchmark error:', error.message);
            this.results.performance = { success: false, error: error.message };
            this.results.summary.criticalIssues.push({
                type: 'Performance',
                message: `Performance benchmark error: ${error.message}`,
                severity: 'medium'
            });
        }
    }

    async runUserAcceptanceTests() {
        console.log('\n👥 Running User Acceptance Tests...');
        this.testOrder.push('user-acceptance');
        
        const baseUrl = this.options.baseUrl || 'http://localhost:3000';
        
        try {
            const userAcceptanceTests = new UserAcceptanceTests({ baseUrl });
            
            const result = await this.runTestWithTimeout(
                () => userAcceptanceTests.runAllUserAcceptanceTests(),
                'User acceptance tests'
            );
            
            this.results.userAcceptance = result;
            this.updateSummary('user-acceptance', result);
            
            if (result.success) {
                console.log('✅ User acceptance tests completed successfully');
                
                if (result.warnings) {
                    console.log('⚠️ User acceptance tests have warnings - UX improvements recommended');
                    this.results.summary.warnings++;
                }
            } else {
                console.log('❌ User acceptance tests failed');
                this.results.summary.criticalIssues.push({
                    type: 'User Experience',
                    message: 'User acceptance tests failed - users may have poor experience',
                    severity: 'medium'
                });
            }
            
        } catch (error) {
            console.error('💥 User acceptance test error:', error.message);
            this.results.userAcceptance = { success: false, error: error.message };
            this.results.summary.criticalIssues.push({
                type: 'User Experience',
                message: `User acceptance test error: ${error.message}`,
                severity: 'medium'
            });
        }
    }

    async runTestWithTimeout(testFunction, testName) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`${testName} timed out after ${this.options.timeout / 1000} seconds`));
            }, this.options.timeout);
            
            try {
                const result = await testFunction();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    updateSummary(testType, result) {
        this.results.summary.totalTests++;
        
        if (result.success) {
            this.results.summary.passedTests++;
        } else {
            this.results.summary.failedTests++;
        }
        
        // Extract recommendations from result
        if (result.report && result.report.recommendations) {
            this.results.summary.recommendations.push(...result.report.recommendations);
        }
    }

    shouldStopOnFailure() {
        if (!this.options.failFast) return false;
        
        // Stop if critical issues found
        const criticalIssues = this.results.summary.criticalIssues.filter(
            issue => issue.severity === 'critical'
        );
        
        return criticalIssues.length > 0;
    }

    calculateOverallScore() {
        const weights = {
            'pre-deployment': 0.20,
            'post-deployment': 0.20,
            'integration': 0.20,
            'security': 0.20,
            'performance': 0.10,
            'user-acceptance': 0.10
        };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        Object.entries(this.results).forEach(([testType, result]) => {
            if (result && typeof result === 'object' && result.report) {
                const weight = weights[testType] || 0;
                
                if (weight > 0) {
                    let score = 0;
                    
                    if (result.success) {
                        // Extract score from result
                        if (result.report.summary && typeof result.report.summary.score === 'number') {
                            score = result.report.summary.score;
                        } else if (result.report.summary && typeof result.report.summary.overall === 'number') {
                            score = result.report.summary.overall;
                        } else {
                            score = 100; // Default to perfect if no score available but test passed
                        }
                    } else {
                        score = 0; // Failed test
                    }
                    
                    totalScore += score * weight;
                    totalWeight += weight;
                }
            }
        });
        
        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }

    calculateGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'A-';
        if (score >= 80) return 'B+';
        if (score >= 75) return 'B';
        if (score >= 70) return 'B-';
        if (score >= 65) return 'C+';
        if (score >= 60) return 'C';
        if (score >= 55) return 'C-';
        if (score >= 50) return 'D';
        return 'F';
    }

    generateFinalReport(success = null) {
        const duration = Date.now() - this.startTime;
        
        // Calculate overall score and grade
        this.results.summary.overallScore = this.calculateOverallScore();
        this.results.summary.grade = this.calculateGrade(this.results.summary.overallScore);
        
        // Determine success if not explicitly provided
        if (success === null) {
            const criticalIssues = this.results.summary.criticalIssues.filter(
                issue => issue.severity === 'critical'
            ).length;
            
            success = criticalIssues === 0 && this.results.summary.overallScore >= 70;
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            duration: duration,
            configuration: this.options,
            testOrder: this.testOrder,
            summary: this.results.summary,
            results: this.results,
            success: success,
            metadata: {
                nodeVersion: process.version,
                platform: process.platform,
                cwd: process.cwd(),
                environment: process.env.NODE_ENV || 'development'
            }
        };
        
        // Print summary to console
        this.printFinalSummary(report);
        
        // Generate report files if requested
        if (this.options.generateReport) {
            this.saveReportFiles(report);
        }
        
        return report;
    }

    printFinalSummary(report) {
        console.log('\n' + '='.repeat(70));
        console.log('🚀 AUTOMATED DEPLOYMENT TEST SUITE SUMMARY');
        console.log('='.repeat(70));
        
        console.log(`\n📊 Overall Results:`);
        console.log(`   Score: ${report.summary.overallScore}% (Grade: ${report.summary.grade})`);
        console.log(`   Status: ${report.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Duration: ${Math.round(report.duration / 1000)}s`);
        
        console.log(`\n📋 Test Results:`);
        console.log(`   Total Tests: ${report.summary.totalTests}`);
        console.log(`   Passed: ${report.summary.passedTests}`);
        console.log(`   Failed: ${report.summary.failedTests}`);
        console.log(`   Warnings: ${report.summary.warnings}`);
        
        // Test breakdown
        console.log(`\n🧪 Test Breakdown:`);
        this.testOrder.forEach(testType => {
            const result = this.results[testType.replace('-', '')]; // Handle naming differences
            if (result) {
                const status = result.success ? '✅' : '❌';
                const warnings = result.warnings ? ' ⚠️' : '';
                console.log(`   ${testType}: ${status}${warnings}`);
            }
        });
        
        // Critical issues
        if (report.summary.criticalIssues.length > 0) {
            console.log(`\n🚨 Critical Issues:`);
            report.summary.criticalIssues.forEach((issue, index) => {
                console.log(`   ${index + 1}. [${issue.type}] ${issue.message}`);
            });
        }
        
        // Recommendations
        const uniqueRecommendations = [...new Set(report.summary.recommendations)];
        if (uniqueRecommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            uniqueRecommendations.slice(0, 5).forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
            
            if (uniqueRecommendations.length > 5) {
                console.log(`   ... and ${uniqueRecommendations.length - 5} more (see detailed report)`);
            }
        }
        
        // Report files
        if (this.options.generateReport) {
            console.log(`\n📄 Reports Generated:`);
            console.log(`   Directory: ${this.options.reportDir}`);
            console.log(`   - deployment-test-report.json (detailed results)`);
            console.log(`   - deployment-test-summary.html (visual summary)`);
            console.log(`   - deployment-test-detailed.html (comprehensive report)`);
        }
        
        console.log('\n' + '='.repeat(70));
        
        // Final verdict
        if (report.success) {
            console.log('🎉 DEPLOYMENT READY! All critical tests passed.');
        } else {
            console.log('🚫 DEPLOYMENT NOT RECOMMENDED! Critical issues found.');
        }
        
        console.log('='.repeat(70));
    }

    saveReportFiles(report) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // 1. Save JSON report
            const jsonPath = path.join(this.options.reportDir, `deployment-test-report-${timestamp}.json`);
            fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
            
            // Also save as latest
            const latestJsonPath = path.join(this.options.reportDir, 'deployment-test-report.json');
            fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2));
            
            // 2. Generate HTML summary
            const summaryHtml = this.generateHtmlSummary(report);
            const summaryPath = path.join(this.options.reportDir, 'deployment-test-summary.html');
            fs.writeFileSync(summaryPath, summaryHtml);
            
            // 3. Generate detailed HTML report
            const detailedHtml = this.generateDetailedHtmlReport(report);
            const detailedPath = path.join(this.options.reportDir, 'deployment-test-detailed.html');
            fs.writeFileSync(detailedPath, detailedHtml);
            
            console.log(`\n📁 Reports saved to: ${this.options.reportDir}`);
            
        } catch (error) {
            console.error('⚠️ Failed to save report files:', error.message);
        }
    }

    generateHtmlSummary(report) {
        const statusColor = report.success ? '#28a745' : '#dc3545';
        const gradeColor = report.summary.overallScore >= 80 ? '#28a745' : 
                          report.summary.overallScore >= 60 ? '#ffc107' : '#dc3545';
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deployment Test Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; margin-bottom: 20px; }
        .score { font-size: 48px; font-weight: bold; color: ${gradeColor}; margin: 20px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric { font-size: 32px; font-weight: bold; color: #495057; }
        .label { font-size: 14px; color: #6c757d; text-transform: uppercase; }
        .test-results { margin-top: 30px; }
        .test-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #dee2e6; }
        .test-name { font-weight: 500; }
        .test-status { font-size: 18px; }
        .issues { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .issue { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Deployment Test Summary</h1>
            <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
            <p>Duration: ${Math.round(report.duration / 1000)} seconds</p>
        </div>
        
        <div class="content">
            <div class="status">${report.success ? '✅ DEPLOYMENT READY' : '❌ DEPLOYMENT NOT RECOMMENDED'}</div>
            
            <div class="score">
                ${report.summary.overallScore}% (${report.summary.grade})
            </div>
            
            <div class="grid">
                <div class="card">
                    <div class="metric">${report.summary.totalTests}</div>
                    <div class="label">Total Tests</div>
                </div>
                <div class="card">
                    <div class="metric">${report.summary.passedTests}</div>
                    <div class="label">Passed</div>
                </div>
                <div class="card">
                    <div class="metric">${report.summary.failedTests}</div>
                    <div class="label">Failed</div>
                </div>
                <div class="card">
                    <div class="metric">${report.summary.warnings}</div>
                    <div class="label">Warnings</div>
                </div>
            </div>
            
            <div class="test-results">
                <h3>Test Results</h3>
                ${this.testOrder.map(testType => {
                    const result = this.results[testType.replace('-', '')];
                    if (result) {
                        const status = result.success ? '✅' : '❌';
                        const warnings = result.warnings ? ' ⚠️' : '';
                        return `<div class="test-item">
                            <div class="test-name">${testType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                            <div class="test-status">${status}${warnings}</div>
                        </div>`;
                    }
                    return '';
                }).join('')}
            </div>
            
            ${report.summary.criticalIssues.length > 0 ? `
            <div class="issues">
                <h4>🚨 Critical Issues</h4>
                ${report.summary.criticalIssues.map(issue => 
                    `<div class="issue"><strong>[${issue.type}]</strong> ${issue.message}</div>`
                ).join('')}
            </div>` : ''}
        </div>
    </div>
</body>
</html>`;
    }

    generateDetailedHtmlReport(report) {
        // This would be a much more comprehensive HTML report
        // For brevity, returning a simplified version
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detailed Deployment Test Report</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; }
        .section { background: white; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section-header { background: #343a40; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0; }
        .section-content { padding: 20px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .timestamp { color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Detailed Deployment Test Report</h1>
        <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        
        <div class="section">
            <div class="section-header">
                <h2>Configuration</h2>
            </div>
            <div class="section-content">
                <pre>${JSON.stringify(report.configuration, null, 2)}</pre>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2>Summary</h2>
            </div>
            <div class="section-content">
                <pre>${JSON.stringify(report.summary, null, 2)}</pre>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2>Detailed Results</h2>
            </div>
            <div class="section-content">
                <pre>${JSON.stringify(report.results, null, 2)}</pre>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2>System Information</h2>
            </div>
            <div class="section-content">
                <pre>${JSON.stringify(report.metadata, null, 2)}</pre>
            </div>
        </div>
    </div>
</body>
</html>`;
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const options = {
        baseUrl: args[0] || process.env.DEPLOYED_URL,
        runPreDeployment: !args.includes('--no-pre'),
        runPostDeployment: !args.includes('--no-post'),
        runIntegration: !args.includes('--no-integration'),
        runPerformance: !args.includes('--no-performance'),
        runSecurity: !args.includes('--no-security'),
        runUserAcceptance: !args.includes('--no-uat'),
        generateReport: !args.includes('--no-report'),
        failFast: args.includes('--fail-fast'),
        timeout: args.includes('--timeout') ? 
            parseInt(args[args.indexOf('--timeout') + 1]) * 1000 : 300000
    };
    
    console.log('🚀 Starting Automated Deployment Test Runner...');
    
    if (!options.baseUrl && (options.runPostDeployment || options.runIntegration || 
                            options.runPerformance || options.runSecurity || options.runUserAcceptance)) {
        console.log('⚠️ No base URL provided. Only pre-deployment tests will run.');
        console.log('Usage: node automated-test-runner.js [URL] [options]');
        console.log('Options:');
        console.log('  --no-pre         Skip pre-deployment validation');
        console.log('  --no-post        Skip post-deployment health checks');
        console.log('  --no-integration Skip integration tests');
        console.log('  --no-performance Skip performance benchmarks');
        console.log('  --no-security    Skip security validation');
        console.log('  --no-uat         Skip user acceptance tests');
        console.log('  --no-report      Skip report generation');
        console.log('  --fail-fast      Stop on first critical failure');
        console.log('  --timeout SECS   Set timeout for each test suite (default: 300)');
        console.log('');
    }
    
    const runner = new AutomatedDeploymentTestRunner(options);
    
    runner.runAllDeploymentTests()
        .then(report => {
            if (report.success) {
                console.log('\n🎉 All deployment tests completed successfully!');
                process.exit(0);
            } else {
                console.log('\n💥 Deployment tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Test runner error:', error);
            process.exit(1);
        });
}

module.exports = AutomatedDeploymentTestRunner;