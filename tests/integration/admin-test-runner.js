/**
 * Admin Test Runner
 * Automated test runner with comprehensive validation and reporting
 */

class AdminTestRunner {
    constructor() {
        this.tests = new Map();
        this.suites = new Map();
        this.results = [];
        this.hooks = {
            beforeAll: [],
            afterAll: [],
            beforeEach: [],
            afterEach: []
        };
        this.currentSuite = null;
        this.config = {
            timeout: 30000,
            retries: 2,
            parallel: false,
            bail: false,
            verbose: true
        };
        this.startTime = null;
        this.endTime = null;
    }

    // Register test suite
    describe(suiteName, callback) {
        const parentSuite = this.currentSuite;
        this.currentSuite = {
            name: suiteName,
            parent: parentSuite,
            tests: [],
            hooks: {
                beforeAll: [],
                afterAll: [],
                beforeEach: [],
                afterEach: []
            }
        };

        this.suites.set(suiteName, this.currentSuite);
        
        try {
            callback();
        } finally {
            this.currentSuite = parentSuite;
        }
    }

    // Register individual test
    it(testName, testFn) {
        if (!this.currentSuite) {
            throw new Error('Tests must be defined within a describe block');
        }

        const test = {
            name: testName,
            fn: testFn,
            suite: this.currentSuite.name,
            timeout: this.config.timeout,
            retries: this.config.retries,
            skip: false,
            only: false
        };

        this.currentSuite.tests.push(test);
        this.tests.set(`${this.currentSuite.name} > ${testName}`, test);
    }

    // Skip test
    xit(testName, testFn) {
        this.it(testName, testFn);
        const testKey = `${this.currentSuite.name} > ${testName}`;
        this.tests.get(testKey).skip = true;
    }

    // Only run this test
    fit(testName, testFn) {
        this.it(testName, testFn);
        const testKey = `${this.currentSuite.name} > ${testName}`;
        this.tests.get(testKey).only = true;
    }

    // Register hooks
    beforeAll(hookFn) {
        if (this.currentSuite) {
            this.currentSuite.hooks.beforeAll.push(hookFn);
        } else {
            this.hooks.beforeAll.push(hookFn);
        }
    }

    afterAll(hookFn) {
        if (this.currentSuite) {
            this.currentSuite.hooks.afterAll.push(hookFn);
        } else {
            this.hooks.afterAll.push(hookFn);
        }
    }

    beforeEach(hookFn) {
        if (this.currentSuite) {
            this.currentSuite.hooks.beforeEach.push(hookFn);
        } else {
            this.hooks.beforeEach.push(hookFn);
        }
    }

    afterEach(hookFn) {
        if (this.currentSuite) {
            this.currentSuite.hooks.afterEach.push(hookFn);
        } else {
            this.hooks.afterEach.push(hookFn);
        }
    }

    // Configure test runner
    configure(options) {
        this.config = { ...this.config, ...options };
    }

    // Run all tests
    async run() {
        this.startTime = performance.now();
        console.log('🚀 Starting Admin Test Runner...');
        console.log('=' .repeat(60));

        try {
            // Run global beforeAll hooks
            await this.runHooks(this.hooks.beforeAll, 'Global beforeAll');

            // Filter tests based on 'only' flag
            const testsToRun = this.getTestsToRun();
            
            if (testsToRun.length === 0) {
                console.log('⚠️  No tests to run');
                return this.generateReport();
            }

            console.log(`📝 Running ${testsToRun.length} tests...\n`);

            // Run tests
            if (this.config.parallel) {
                await this.runTestsParallel(testsToRun);
            } else {
                await this.runTestsSequential(testsToRun);
            }

            // Run global afterAll hooks
            await this.runHooks(this.hooks.afterAll, 'Global afterAll');

        } catch (error) {
            console.error('❌ Test runner failed:', error);
        }

        this.endTime = performance.now();
        return this.generateReport();
    }

    // Get tests to run (respecting 'only' and 'skip' flags)
    getTestsToRun() {
        const allTests = Array.from(this.tests.values());
        
        // If any tests have 'only', run only those
        const onlyTests = allTests.filter(test => test.only);
        if (onlyTests.length > 0) {
            return onlyTests;
        }

        // Otherwise, run all tests except skipped ones
        return allTests.filter(test => !test.skip);
    }

    // Run tests sequentially
    async runTestsSequential(tests) {
        const suiteGroups = this.groupTestsBySuite(tests);

        for (const [suiteName, suiteTests] of suiteGroups) {
            await this.runSuite(suiteName, suiteTests);
        }
    }

    // Run tests in parallel
    async runTestsParallel(tests) {
        const promises = tests.map(test => this.runSingleTest(test));
        await Promise.allSettled(promises);
    }

    // Group tests by suite
    groupTestsBySuite(tests) {
        const groups = new Map();
        
        tests.forEach(test => {
            if (!groups.has(test.suite)) {
                groups.set(test.suite, []);
            }
            groups.get(test.suite).push(test);
        });

        return groups;
    }

    // Run entire test suite
    async runSuite(suiteName, tests) {
        console.log(`\n📦 Suite: ${suiteName}`);
        console.log('-'.repeat(40));

        const suite = this.suites.get(suiteName);
        
        try {
            // Run suite beforeAll hooks
            await this.runHooks(suite.hooks.beforeAll, `${suiteName} beforeAll`);

            // Run each test in the suite
            for (const test of tests) {
                if (this.config.bail && this.hasFailures()) {
                    console.log('🛑 Bailing out due to previous failures');
                    break;
                }

                await this.runSingleTest(test, suite);
            }

            // Run suite afterAll hooks
            await this.runHooks(suite.hooks.afterAll, `${suiteName} afterAll`);

        } catch (error) {
            console.error(`❌ Suite ${suiteName} failed:`, error);
        }
    }

    // Run single test with retries
    async runSingleTest(test, suite = null) {
        const testId = `${test.suite} > ${test.name}`;
        let lastError = null;
        let attempts = 0;
        const maxAttempts = test.retries + 1;

        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                const result = await this.executeTest(test, suite, attempts);
                this.results.push(result);
                
                if (result.passed) {
                    if (attempts > 1) {
                        console.log(`  ✅ ${test.name} (passed on attempt ${attempts})`);
                    } else {
                        console.log(`  ✅ ${test.name}`);
                    }
                    return result;
                }
                
            } catch (error) {
                lastError = error;
                
                if (attempts < maxAttempts) {
                    console.log(`  🔄 ${test.name} (attempt ${attempts} failed, retrying...)`);
                    await this.delay(1000); // Wait 1 second before retry
                }
            }
        }

        // All attempts failed
        const result = {
            testId,
            name: test.name,
            suite: test.suite,
            passed: false,
            error: lastError,
            duration: 0,
            attempts: attempts,
            timestamp: new Date().toISOString()
        };

        this.results.push(result);
        console.log(`  ❌ ${test.name} (failed after ${attempts} attempts)`);
        
        if (this.config.verbose && lastError) {
            console.log(`     Error: ${lastError.message}`);
        }

        return result;
    }

    // Execute single test
    async executeTest(test, suite = null, attempt = 1) {
        const startTime = performance.now();
        const testId = `${test.suite} > ${test.name}`;
        
        try {
            // Run beforeEach hooks
            if (suite) {
                await this.runHooks(suite.hooks.beforeEach, `${test.suite} beforeEach`);
            }
            await this.runHooks(this.hooks.beforeEach, 'Global beforeEach');

            // Create test context
            const context = {
                test: test,
                suite: test.suite,
                attempt: attempt,
                startTime: startTime
            };

            // Run the actual test with timeout
            await this.runWithTimeout(test.fn, test.timeout, context);

            const duration = performance.now() - startTime;

            // Run afterEach hooks
            await this.runHooks(this.hooks.afterEach, 'Global afterEach');
            if (suite) {
                await this.runHooks(suite.hooks.afterEach, `${test.suite} afterEach`);
            }

            return {
                testId,
                name: test.name,
                suite: test.suite,
                passed: true,
                duration: Math.round(duration),
                attempts: attempt,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const duration = performance.now() - startTime;
            
            // Still run afterEach hooks even if test failed
            try {
                await this.runHooks(this.hooks.afterEach, 'Global afterEach');
                if (suite) {
                    await this.runHooks(suite.hooks.afterEach, `${test.suite} afterEach`);
                }
            } catch (hookError) {
                console.warn(`⚠️  afterEach hook failed: ${hookError.message}`);
            }

            throw error;
        }
    }

    // Run hooks
    async runHooks(hooks, description) {
        for (const hook of hooks) {
            try {
                await hook();
            } catch (error) {
                console.error(`❌ Hook failed (${description}):`, error.message);
                throw error;
            }
        }
    }

    // Run function with timeout
    async runWithTimeout(fn, timeout, context = {}) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Test timeout after ${timeout}ms`));
            }, timeout);

            try {
                const result = await fn(context);
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if there are any failures
    hasFailures() {
        return this.results.some(result => !result.passed);
    }

    // Generate comprehensive test report
    generateReport() {
        const duration = this.endTime - this.startTime;
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const total = this.results.length;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        const report = {
            summary: {
                total,
                passed,
                failed,
                successRate: `${successRate}%`,
                duration: Math.round(duration),
                timestamp: new Date().toISOString()
            },
            results: this.results,
            suites: this.generateSuiteReport(),
            slowTests: this.getSlowTests(),
            failedTests: this.getFailedTests(),
            environment: this.getEnvironmentInfo()
        };

        this.printReport(report);
        return report;
    }

    // Generate suite-specific report
    generateSuiteReport() {
        const suiteStats = new Map();

        this.results.forEach(result => {
            if (!suiteStats.has(result.suite)) {
                suiteStats.set(result.suite, {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    duration: 0
                });
            }

            const stats = suiteStats.get(result.suite);
            stats.total++;
            stats.duration += result.duration || 0;
            
            if (result.passed) {
                stats.passed++;
            } else {
                stats.failed++;
            }
        });

        return Array.from(suiteStats.entries()).map(([name, stats]) => ({
            name,
            ...stats,
            successRate: `${Math.round((stats.passed / stats.total) * 100)}%`
        }));
    }

    // Get slowest tests
    getSlowTests(limit = 5) {
        return this.results
            .filter(r => r.duration)
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit)
            .map(r => ({
                name: r.name,
                suite: r.suite,
                duration: r.duration
            }));
    }

    // Get failed tests with details
    getFailedTests() {
        return this.results
            .filter(r => !r.passed)
            .map(r => ({
                name: r.name,
                suite: r.suite,
                error: r.error?.message || 'Unknown error',
                attempts: r.attempts
            }));
    }

    // Get environment information
    getEnvironmentInfo() {
        return {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    }

    // Print formatted report to console
    printReport(report) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Tests: ${report.summary.total}`);
        console.log(`   Passed: ${report.summary.passed} ✅`);
        console.log(`   Failed: ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : ''}`);
        console.log(`   Success Rate: ${report.summary.successRate}`);
        console.log(`   Duration: ${report.summary.duration}ms`);

        if (report.suites.length > 0) {
            console.log(`\n📦 Suite Results:`);
            report.suites.forEach(suite => {
                console.log(`   ${suite.name}: ${suite.passed}/${suite.total} (${suite.successRate}) - ${suite.duration}ms`);
            });
        }

        if (report.slowTests.length > 0) {
            console.log(`\n⏱️  Slowest Tests:`);
            report.slowTests.forEach(test => {
                console.log(`   ${test.suite} > ${test.name}: ${test.duration}ms`);
            });
        }

        if (report.failedTests.length > 0) {
            console.log(`\n❌ Failed Tests:`);
            report.failedTests.forEach(test => {
                console.log(`   ${test.suite} > ${test.name}: ${test.error}`);
                if (test.attempts > 1) {
                    console.log(`     (Failed after ${test.attempts} attempts)`);
                }
            });
        }

        console.log('\n' + '='.repeat(60));
    }

    // Export results
    exportResults(format = 'json') {
        const report = this.generateReport();
        
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        } else if (format === 'junit') {
            return this.generateJunitXml(report);
        }
        
        return report;
    }

    // Generate JUnit XML format
    generateJunitXml(report) {
        const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
        const testSuites = report.suites.map(suite => {
            const tests = this.results.filter(r => r.suite === suite.name);
            const testCases = tests.map(test => {
                if (test.passed) {
                    return `    <testcase name="${this.escapeXml(test.name)}" time="${(test.duration / 1000).toFixed(3)}"/>`;
                } else {
                    return `    <testcase name="${this.escapeXml(test.name)}" time="0">
      <failure message="${this.escapeXml(test.error?.message || 'Test failed')}">${this.escapeXml(test.error?.stack || '')}</failure>
    </testcase>`;
                }
            }).join('\n');

            return `  <testsuite name="${this.escapeXml(suite.name)}" tests="${suite.total}" failures="${suite.failed}" time="${(suite.duration / 1000).toFixed(3)}">
${testCases}
  </testsuite>`;
        }).join('\n');

        return `${xmlHeader}<testsuites>
${testSuites}
</testsuites>`;
    }

    // Escape XML characters
    escapeXml(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// Global test runner instance
let globalTestRunner = null;

// Global functions for test definition
function describe(suiteName, callback) {
    if (!globalTestRunner) {
        globalTestRunner = new AdminTestRunner();
    }
    return globalTestRunner.describe(suiteName, callback);
}

function it(testName, testFn) {
    if (!globalTestRunner) {
        throw new Error('Tests must be defined within a describe block');
    }
    return globalTestRunner.it(testName, testFn);
}

function xit(testName, testFn) {
    if (!globalTestRunner) {
        throw new Error('Tests must be defined within a describe block');
    }
    return globalTestRunner.xit(testName, testFn);
}

function fit(testName, testFn) {
    if (!globalTestRunner) {
        throw new Error('Tests must be defined within a describe block');
    }
    return globalTestRunner.fit(testName, testFn);
}

function beforeAll(hookFn) {
    if (!globalTestRunner) {
        globalTestRunner = new AdminTestRunner();
    }
    return globalTestRunner.beforeAll(hookFn);
}

function afterAll(hookFn) {
    if (!globalTestRunner) {
        globalTestRunner = new AdminTestRunner();
    }
    return globalTestRunner.afterAll(hookFn);
}

function beforeEach(hookFn) {
    if (!globalTestRunner) {
        globalTestRunner = new AdminTestRunner();
    }
    return globalTestRunner.beforeEach(hookFn);
}

function afterEach(hookFn) {
    if (!globalTestRunner) {
        globalTestRunner = new AdminTestRunner();
    }
    return globalTestRunner.afterEach(hookFn);
}

// Expectation library
function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${actual} to be ${expected}`);
            }
        },
        toEqual: (expected) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
            }
        },
        toBeTruthy: () => {
            if (!actual) {
                throw new Error(`Expected ${actual} to be truthy`);
            }
        },
        toBeFalsy: () => {
            if (actual) {
                throw new Error(`Expected ${actual} to be falsy`);
            }
        },
        toContain: (expected) => {
            if (typeof actual === 'string') {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected "${actual}" to contain "${expected}"`);
                }
            } else if (Array.isArray(actual)) {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected array to contain ${expected}`);
                }
            } else {
                throw new Error('toContain can only be used with strings or arrays');
            }
        },
        toThrow: () => {
            if (typeof actual !== 'function') {
                throw new Error('toThrow can only be used with functions');
            }
            try {
                actual();
                throw new Error('Expected function to throw an error');
            } catch (error) {
                // Expected behavior
            }
        }
    };
}

// Run tests when called directly
function runTests(config = {}) {
    if (!globalTestRunner) {
        console.log('⚠️  No tests defined');
        return Promise.resolve({});
    }
    
    globalTestRunner.configure(config);
    return globalTestRunner.run();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AdminTestRunner,
        describe,
        it,
        xit,
        fit,
        beforeAll,
        afterAll,
        beforeEach,
        afterEach,
        expect,
        runTests
    };
}

// Global exports
if (typeof window !== 'undefined') {
    window.AdminTestRunner = AdminTestRunner;
    window.describe = describe;
    window.it = it;
    window.xit = xit;
    window.fit = fit;
    window.beforeAll = beforeAll;
    window.afterAll = afterAll;
    window.beforeEach = beforeEach;
    window.afterEach = afterEach;
    window.expect = expect;
    window.runTests = runTests;
}