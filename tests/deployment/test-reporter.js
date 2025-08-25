/**
 * Test Reporter and Metrics Collection
 * Centralized reporting system for all deployment tests
 */

const fs = require('fs');
const path = require('path');

class TestReporter {
    constructor(options = {}) {
        this.options = {
            outputDir: options.outputDir || path.join(process.cwd(), 'tests/deployment/reports'),
            generateHTML: options.generateHTML !== false,
            generateJSON: options.generateJSON !== false,
            generateJUnit: options.generateJUnit || false,
            includeMetrics: options.includeMetrics !== false,
            ...options
        };
        
        this.metrics = {
            startTime: Date.now(),
            endTime: null,
            totalDuration: 0,
            testSuites: [],
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            warningTests: 0,
            overallScore: 0,
            grades: {}
        };
        
        // Ensure output directory exists
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
        }
    }

    addTestSuite(suiteName, results) {
        const suite = {
            name: suiteName,
            timestamp: new Date().toISOString(),
            results: results,
            summary: this.calculateSuiteSummary(results),
            duration: this.extractDuration(results),
            score: this.extractScore(results),
            grade: this.extractGrade(results)
        };
        
        this.metrics.testSuites.push(suite);
        this.updateOverallMetrics();
        
        console.log(`📊 Test suite '${suiteName}' reported: ${suite.summary.passed}/${suite.summary.total} passed (${suite.score || 'N/A'}%)`);
    }

    calculateSuiteSummary(results) {
        const summary = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            warnings: 0
        };
        
        if (results.success !== undefined) {
            summary.total = 1;
            summary.passed = results.success ? 1 : 0;
            summary.failed = results.success ? 0 : 1;
            summary.warnings = results.warnings ? 1 : 0;
        }
        
        // Extract more detailed metrics if available
        if (results.report && results.report.summary) {
            const reportSummary = results.report.summary;
            
            if (reportSummary.total) summary.total = reportSummary.total;
            if (reportSummary.passed) summary.passed = reportSummary.passed;
            if (reportSummary.failed) summary.failed = reportSummary.failed;
            if (reportSummary.warnings) summary.warnings = reportSummary.warnings;
            
            // Handle different naming conventions
            if (reportSummary.totalTests) summary.total = reportSummary.totalTests;
            if (reportSummary.passedTests) summary.passed = reportSummary.passedTests;
            if (reportSummary.failedTests) summary.failed = reportSummary.failedTests;
        }
        
        return summary;
    }

    extractDuration(results) {
        if (results.duration) return results.duration;
        if (results.report && results.report.duration) return results.report.duration;
        return null;
    }

    extractScore(results) {
        if (results.report && results.report.summary) {
            const summary = results.report.summary;
            if (summary.score) return summary.score;
            if (summary.overall) return summary.overall;
            if (summary.overallScore) return summary.overallScore;
        }
        return null;
    }

    extractGrade(results) {
        if (results.report && results.report.summary && results.report.summary.grade) {
            return results.report.summary.grade;
        }
        
        const score = this.extractScore(results);
        if (score !== null) {
            return this.scoreToGrade(score);
        }
        
        return null;
    }

    scoreToGrade(score) {
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

    updateOverallMetrics() {
        this.metrics.totalTests = this.metrics.testSuites.reduce((sum, suite) => sum + suite.summary.total, 0);
        this.metrics.passedTests = this.metrics.testSuites.reduce((sum, suite) => sum + suite.summary.passed, 0);
        this.metrics.failedTests = this.metrics.testSuites.reduce((sum, suite) => sum + suite.summary.failed, 0);
        this.metrics.skippedTests = this.metrics.testSuites.reduce((sum, suite) => sum + suite.summary.skipped, 0);
        this.metrics.warningTests = this.metrics.testSuites.reduce((sum, suite) => sum + suite.summary.warnings, 0);
        
        // Calculate overall score
        const scores = this.metrics.testSuites
            .map(suite => suite.score)
            .filter(score => score !== null);
        
        if (scores.length > 0) {
            this.metrics.overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        }
    }

    finalize() {
        this.metrics.endTime = Date.now();
        this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
        
        const reports = {};
        
        if (this.options.generateJSON) {
            reports.json = this.generateJSONReport();
        }
        
        if (this.options.generateHTML) {
            reports.html = this.generateHTMLReport();
        }
        
        if (this.options.generateJUnit) {
            reports.junit = this.generateJUnitReport();
        }
        
        return reports;
    }

    generateJSONReport() {
        const report = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            metadata: {
                nodeVersion: process.version,
                platform: process.platform,
                cwd: process.cwd(),
                environment: process.env.NODE_ENV || 'development'
            },
            metrics: this.metrics,
            configuration: this.options
        };
        
        const filename = `deployment-test-report-${this.getTimestamp()}.json`;
        const filepath = path.join(this.options.outputDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
        
        // Also save as latest
        const latestPath = path.join(this.options.outputDir, 'latest-deployment-test-report.json');
        fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
        
        console.log(`📄 JSON report saved: ${filepath}`);
        
        return { filepath, report };
    }

    generateHTMLReport() {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deployment Test Report</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; padding: 20px; background: #f8f9fa; line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header h1 { margin: 0 0 10px 0; font-size: 2.5em; font-weight: 700; }
        .header p { margin: 5px 0; opacity: 0.9; }
        .metrics-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; margin-bottom: 30px;
        }
        .metric-card { 
            background: white; padding: 25px; border-radius: 12px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center;
            transition: transform 0.2s ease;
        }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
        .metric-label { color: #6c757d; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .score-card { border-left: 5px solid #28a745; }
        .passed-card { border-left: 5px solid #007bff; }
        .failed-card { border-left: 5px solid #dc3545; }
        .warning-card { border-left: 5px solid #ffc107; }
        .test-suites { background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .suite-header { 
            background: #343a40; color: white; padding: 20px; border-radius: 12px 12px 0 0;
            font-size: 1.2em; font-weight: 600;
        }
        .suite-content { padding: 0; }
        .suite-item { 
            padding: 20px; border-bottom: 1px solid #dee2e6; 
            display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 20px; align-items: center;
        }
        .suite-item:last-child { border-bottom: none; }
        .suite-item:hover { background: #f8f9fa; }
        .suite-name { font-weight: 600; color: #495057; }
        .suite-stat { text-align: center; font-size: 1.1em; }
        .status-icon { font-size: 1.2em; }
        .grade { 
            font-size: 1.2em; font-weight: bold; padding: 5px 10px; 
            border-radius: 6px; text-align: center;
        }
        .grade-A { background: #d4edda; color: #155724; }
        .grade-B { background: #d1ecf1; color: #0c5460; }
        .grade-C { background: #fff3cd; color: #856404; }
        .grade-D { background: #f8d7da; color: #721c24; }
        .grade-F { background: #f8d7da; color: #721c24; }
        .details { margin-top: 30px; }
        .details-section { 
            background: white; margin-bottom: 20px; border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .details-header { 
            background: #495057; color: white; padding: 15px 20px; 
            border-radius: 12px 12px 0 0; font-weight: 600;
        }
        .details-content { padding: 20px; }
        pre { 
            background: #f8f9fa; padding: 15px; border-radius: 6px; 
            overflow-x: auto; font-size: 0.9em; border: 1px solid #dee2e6;
        }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .footer { 
            text-align: center; margin-top: 40px; padding: 20px;
            color: #6c757d; border-top: 1px solid #dee2e6;
        }
        @media (max-width: 768px) {
            .metrics-grid { grid-template-columns: 1fr 1fr; }
            .suite-item { grid-template-columns: 1fr; gap: 10px; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Deployment Test Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Duration: ${Math.round(this.metrics.totalDuration / 1000)} seconds</p>
            <p>Test Suites: ${this.metrics.testSuites.length}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card score-card">
                <div class="metric-value" style="color: ${this.metrics.overallScore >= 80 ? '#28a745' : this.metrics.overallScore >= 60 ? '#ffc107' : '#dc3545'}">
                    ${this.metrics.overallScore}%
                </div>
                <div class="metric-label">Overall Score</div>
            </div>
            <div class="metric-card passed-card">
                <div class="metric-value" style="color: #007bff">${this.metrics.passedTests}</div>
                <div class="metric-label">Passed Tests</div>
            </div>
            <div class="metric-card failed-card">
                <div class="metric-value" style="color: #dc3545">${this.metrics.failedTests}</div>
                <div class="metric-label">Failed Tests</div>
            </div>
            <div class="metric-card warning-card">
                <div class="metric-value" style="color: #ffc107">${this.metrics.warningTests}</div>
                <div class="metric-label">Warnings</div>
            </div>
        </div>
        
        <div class="test-suites">
            <div class="suite-header">Test Suite Results</div>
            <div class="suite-content">
                <div class="suite-item" style="font-weight: bold; background: #f8f9fa;">
                    <div>Suite Name</div>
                    <div class="suite-stat">Score</div>
                    <div class="suite-stat">Passed/Total</div>
                    <div class="suite-stat">Duration</div>
                    <div class="suite-stat">Grade</div>
                </div>
                ${this.metrics.testSuites.map(suite => `
                    <div class="suite-item">
                        <div class="suite-name">${suite.name}</div>
                        <div class="suite-stat">${suite.score !== null ? suite.score + '%' : 'N/A'}</div>
                        <div class="suite-stat">
                            ${suite.summary.passed}/${suite.summary.total}
                            <span class="status-icon">${suite.summary.failed === 0 ? '✅' : '❌'}</span>
                        </div>
                        <div class="suite-stat">${suite.duration ? Math.round(suite.duration / 1000) + 's' : 'N/A'}</div>
                        <div class="suite-stat">
                            ${suite.grade ? `<span class="grade grade-${suite.grade.charAt(0)}">${suite.grade}</span>` : 'N/A'}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="details">
            <div class="details-section">
                <div class="details-header">📊 Metrics Summary</div>
                <div class="details-content">
                    <pre>${JSON.stringify({
                        totalTests: this.metrics.totalTests,
                        passedTests: this.metrics.passedTests,
                        failedTests: this.metrics.failedTests,
                        overallScore: this.metrics.overallScore,
                        duration: Math.round(this.metrics.totalDuration / 1000) + 's'
                    }, null, 2)}</pre>
                </div>
            </div>
            
            <div class="details-section">
                <div class="details-header">🔧 Configuration</div>
                <div class="details-content">
                    <pre>${JSON.stringify(this.options, null, 2)}</pre>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Report generated by Deployment Test Runner</p>
            <p class="timestamp">${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;
        
        const filename = `deployment-test-report-${this.getTimestamp()}.html`;
        const filepath = path.join(this.options.outputDir, filename);
        
        fs.writeFileSync(filepath, html);
        
        // Also save as latest
        const latestPath = path.join(this.options.outputDir, 'latest-deployment-test-report.html');
        fs.writeFileSync(latestPath, html);
        
        console.log(`📄 HTML report saved: ${filepath}`);
        
        return { filepath, html };
    }

    generateJUnitReport() {
        const testsuites = this.metrics.testSuites.map(suite => {
            const failures = suite.summary.failed;
            const tests = suite.summary.total;
            const time = suite.duration ? (suite.duration / 1000).toFixed(3) : '0.000';
            
            return `    <testsuite name="${suite.name}" tests="${tests}" failures="${failures}" time="${time}" timestamp="${suite.timestamp}">
${this.generateJUnitTestCases(suite)}
    </testsuite>`;
        }).join('\n');
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Deployment Tests" tests="${this.metrics.totalTests}" failures="${this.metrics.failedTests}" time="${(this.metrics.totalDuration / 1000).toFixed(3)}">
${testsuites}
</testsuites>`;
        
        const filename = `deployment-test-junit-${this.getTimestamp()}.xml`;
        const filepath = path.join(this.options.outputDir, filename);
        
        fs.writeFileSync(filepath, xml);
        
        console.log(`📄 JUnit report saved: ${filepath}`);
        
        return { filepath, xml };
    }

    generateJUnitTestCases(suite) {
        // This is simplified - in a real implementation you'd extract individual test cases
        const status = suite.summary.failed === 0 ? 'passed' : 'failed';
        const testcase = `        <testcase classname="${suite.name}" name="Overall Suite" time="${suite.duration ? (suite.duration / 1000).toFixed(3) : '0.000'}">`;
        
        if (suite.summary.failed > 0) {
            return testcase + `
            <failure message="Test suite failed">${suite.summary.failed} out of ${suite.summary.total} tests failed</failure>
        </testcase>`;
        }
        
        return testcase + '\n        </testcase>';
    }

    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }

    generateSummaryReport() {
        const summary = {
            timestamp: new Date().toISOString(),
            duration: Math.round(this.metrics.totalDuration / 1000),
            overallScore: this.metrics.overallScore,
            totalTests: this.metrics.totalTests,
            passedTests: this.metrics.passedTests,
            failedTests: this.metrics.failedTests,
            warningTests: this.metrics.warningTests,
            success: this.metrics.failedTests === 0 && this.metrics.overallScore >= 70,
            suites: this.metrics.testSuites.map(suite => ({
                name: suite.name,
                score: suite.score,
                grade: suite.grade,
                passed: suite.summary.passed,
                total: suite.summary.total,
                success: suite.summary.failed === 0
            }))
        };
        
        return summary;
    }

    printConsoleSummary() {
        console.log('\n' + '='.repeat(70));
        console.log('📊 DEPLOYMENT TEST REPORT SUMMARY');
        console.log('='.repeat(70));
        
        console.log(`\n🎯 Overall Score: ${this.metrics.overallScore}%`);
        console.log(`⏱️  Total Duration: ${Math.round(this.metrics.totalDuration / 1000)}s`);
        console.log(`📋 Total Tests: ${this.metrics.totalTests}`);
        console.log(`✅ Passed: ${this.metrics.passedTests}`);
        console.log(`❌ Failed: ${this.metrics.failedTests}`);
        console.log(`⚠️  Warnings: ${this.metrics.warningTests}`);
        
        console.log('\n📊 Test Suite Breakdown:');
        this.metrics.testSuites.forEach(suite => {
            const status = suite.summary.failed === 0 ? '✅' : '❌';
            const score = suite.score !== null ? ` (${suite.score}%)` : '';
            const grade = suite.grade ? ` [${suite.grade}]` : '';
            
            console.log(`   ${status} ${suite.name}: ${suite.summary.passed}/${suite.summary.total}${score}${grade}`);
        });
        
        const success = this.metrics.failedTests === 0 && this.metrics.overallScore >= 70;
        
        console.log(`\n${success ? '🎉 DEPLOYMENT READY!' : '🚫 DEPLOYMENT NOT RECOMMENDED'}`);
        console.log('='.repeat(70));
    }
}

// Factory function for easy usage
function createTestReporter(options) {
    return new TestReporter(options);
}

// Export both class and factory
module.exports = {
    TestReporter,
    createTestReporter
};

// CLI usage for standalone reporting
if (require.main === module) {
    console.log('📊 Test Reporter - Standalone usage not implemented');
    console.log('Use this module programmatically or through the automated test runner');
}