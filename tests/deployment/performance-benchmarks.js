/**
 * Performance Benchmark Test Suite
 * Comprehensive performance testing for deployment validation
 */

const { execSync } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

class PerformanceBenchmarks {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.DEPLOYED_URL || 'http://localhost:3000';
        this.iterations = options.iterations || 5;
        this.timeout = options.timeout || 30000;
        
        this.results = {
            loadTime: [],
            throughput: [],
            resource: [],
            memory: [],
            database: [],
            concurrent: [],
            summary: {
                score: 0,
                grade: 'F',
                recommendations: []
            }
        };
        
        this.thresholds = {
            excellent: { loadTime: 1000, ttfb: 200, throughput: 100, memory: 50 },
            good: { loadTime: 2000, ttfb: 500, throughput: 50, memory: 100 },
            acceptable: { loadTime: 3000, ttfb: 800, throughput: 25, memory: 200 },
            poor: { loadTime: 5000, ttfb: 1200, throughput: 10, memory: 500 }
        };
        
        this.startTime = Date.now();
    }

    async runAllBenchmarks() {
        console.log('⚡ Starting Performance Benchmarks...');
        console.log(`🎯 Target: ${this.baseUrl}`);
        console.log(`🔄 Iterations: ${this.iterations}`);
        console.log('='.repeat(60));
        
        try {
            await this.benchmarkLoadTime();
            await this.benchmarkThroughput();
            await this.benchmarkResourceLoading();
            await this.benchmarkMemoryUsage();
            await this.benchmarkDatabase();
            await this.benchmarkConcurrency();
            
            this.calculateScore();
            const report = this.generateReport();
            
            if (this.results.summary.score >= 80) {
                console.log('✅ Performance benchmarks passed! Excellent performance.');
                return { success: true, report };
            } else if (this.results.summary.score >= 60) {
                console.log('⚠️ Performance benchmarks acceptable but could be improved.');
                return { success: true, report, warnings: true };
            } else {
                console.log(`❌ Performance benchmarks failed! Score: ${this.results.summary.score}`);
                return { success: false, report };
            }
            
        } catch (error) {
            console.error('❌ Performance benchmarks failed:', error);
            return { success: false, error: error.message };
        }
    }

    async benchmarkLoadTime() {
        console.log('\n⏱️ Benchmarking Load Time...');
        
        // Page load time benchmark
        const loadTimes = [];
        const ttfbTimes = [];
        
        for (let i = 0; i < this.iterations; i++) {
            console.log(`  📊 Iteration ${i + 1}/${this.iterations}...`);
            
            const startTime = Date.now();
            const response = await fetch(this.baseUrl, {
                timeout: this.timeout,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            const ttfb = Date.now() - startTime;
            ttfbTimes.push(ttfb);
            
            const html = await response.text();
            const totalTime = Date.now() - startTime;
            loadTimes.push(totalTime);
            
            console.log(`    Load: ${totalTime}ms | TTFB: ${ttfb}ms | Size: ${Math.round(html.length / 1024)}KB`);
            
            // Small delay between iterations
            if (i < this.iterations - 1) {
                await this.sleep(100);
            }
        }
        
        const avgLoadTime = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
        const avgTTFB = Math.round(ttfbTimes.reduce((a, b) => a + b, 0) / ttfbTimes.length);
        const minLoadTime = Math.min(...loadTimes);
        const maxLoadTime = Math.max(...loadTimes);
        
        this.results.loadTime.push({
            test: 'Page Load Time',
            average: avgLoadTime,
            minimum: minLoadTime,
            maximum: maxLoadTime,
            ttfb: avgTTFB,
            iterations: this.iterations,
            grade: this.gradeLoadTime(avgLoadTime),
            passed: avgLoadTime < this.thresholds.acceptable.loadTime
        });
        
        console.log(`  📈 Results: Avg ${avgLoadTime}ms | Min ${minLoadTime}ms | Max ${maxLoadTime}ms | TTFB ${avgTTFB}ms`);
    }

    async benchmarkThroughput() {
        console.log('\n🚀 Benchmarking Throughput...');
        
        // Requests per second benchmark
        const duration = 10000; // 10 seconds
        const startTime = Date.now();
        let requestCount = 0;
        let successCount = 0;
        let errorCount = 0;
        
        console.log(`  📊 Running requests for ${duration / 1000} seconds...`);
        
        const promises = [];
        
        while (Date.now() - startTime < duration) {
            const requestPromise = fetch(this.baseUrl, {
                timeout: 5000,
                headers: { 'Cache-Control': 'no-cache' }
            })
            .then(response => {
                requestCount++;
                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
                return response.ok;
            })
            .catch(error => {
                requestCount++;
                errorCount++;
                return false;
            });
            
            promises.push(requestPromise);
            
            // Throttle requests to avoid overwhelming the server
            await this.sleep(50);
        }
        
        await Promise.all(promises);
        
        const actualDuration = Date.now() - startTime;
        const rps = Math.round((requestCount / actualDuration) * 1000);
        const successRate = Math.round((successCount / requestCount) * 100);
        
        this.results.throughput.push({
            test: 'Requests Per Second',
            rps: rps,
            totalRequests: requestCount,
            successfulRequests: successCount,
            errorRequests: errorCount,
            successRate: successRate,
            duration: actualDuration,
            grade: this.gradeThroughput(rps),
            passed: rps > this.thresholds.acceptable.throughput
        });
        
        console.log(`  📈 Results: ${rps} RPS | ${successCount}/${requestCount} successful (${successRate}%)`);
    }

    async benchmarkResourceLoading() {
        console.log('\n📦 Benchmarking Resource Loading...');
        
        // Test various resource types
        const resources = [
            { name: 'CSS', url: '/css/main.css', type: 'text/css' },
            { name: 'JavaScript', url: '/js/main.js', type: 'application/javascript' },
            { name: 'Image', url: '/images/logo.png', type: 'image' },
            { name: 'Font', url: '/fonts/main.woff2', type: 'font' }
        ];
        
        const resourceResults = [];
        
        for (const resource of resources) {
            console.log(`  📊 Testing ${resource.name} loading...`);
            
            const times = [];
            let foundResource = false;
            
            for (let i = 0; i < Math.min(this.iterations, 3); i++) {
                try {
                    const startTime = Date.now();
                    const response = await fetch(`${this.baseUrl}${resource.url}`, {
                        timeout: 10000
                    });
                    
                    const loadTime = Date.now() - startTime;
                    
                    if (response.ok) {
                        times.push(loadTime);
                        foundResource = true;
                        
                        const size = response.headers.get('content-length');
                        console.log(`    ${resource.name}: ${loadTime}ms | Size: ${size ? Math.round(size / 1024) + 'KB' : 'Unknown'}`);
                    }
                } catch (error) {
                    console.log(`    ${resource.name}: Not found or error`);
                }
            }
            
            if (foundResource && times.length > 0) {
                const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
                
                resourceResults.push({
                    name: resource.name,
                    averageTime: avgTime,
                    found: true,
                    grade: this.gradeResourceLoad(avgTime),
                    passed: avgTime < 2000
                });
            } else {
                resourceResults.push({
                    name: resource.name,
                    found: false,
                    averageTime: null,
                    grade: 'N/A',
                    passed: true // Not finding optional resources is ok
                });
            }
        }
        
        this.results.resource.push({
            test: 'Resource Loading',
            resources: resourceResults,
            foundResources: resourceResults.filter(r => r.found).length,
            totalResources: resourceResults.length,
            passed: resourceResults.filter(r => r.passed).length === resourceResults.length
        });
        
        console.log(`  📈 Results: ${resourceResults.filter(r => r.found).length}/${resourceResults.length} resources found and tested`);
    }

    async benchmarkMemoryUsage() {
        console.log('\n🧠 Benchmarking Memory Usage...');
        
        // Simulate memory-intensive operations
        const memoryTests = [];
        
        // Test multiple page loads
        console.log('  📊 Testing memory with multiple page loads...');
        
        const initialMemory = process.memoryUsage();
        const pages = ['/', '/about', '/projects', '/contact', '/admin/'];
        
        for (const page of pages) {
            try {
                const response = await fetch(`${this.baseUrl}${page}`, {
                    timeout: 5000
                });
                
                if (response.ok) {
                    const html = await response.text();
                    // Simulate processing the HTML
                    const dom = html.length;
                    
                    memoryTests.push({
                        page: page,
                        size: Math.round(html.length / 1024),
                        status: response.status,
                        processed: true
                    });
                }
            } catch (error) {
                memoryTests.push({
                    page: page,
                    error: error.message,
                    processed: false
                });
            }
        }
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024);
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const afterGCMemory = process.memoryUsage();
        const memoryAfterGC = Math.round(afterGCMemory.heapUsed / 1024 / 1024);
        
        this.results.memory.push({
            test: 'Memory Usage',
            initialMemoryMB: Math.round(initialMemory.heapUsed / 1024 / 1024),
            finalMemoryMB: Math.round(finalMemory.heapUsed / 1024 / 1024),
            memoryIncreaseMB: memoryIncrease,
            memoryAfterGCMB: memoryAfterGC,
            pagesProcessed: memoryTests.filter(t => t.processed).length,
            totalPages: memoryTests.length,
            grade: this.gradeMemoryUsage(memoryAfterGC),
            passed: memoryAfterGC < this.thresholds.acceptable.memory
        });
        
        console.log(`  📈 Results: ${memoryAfterGC}MB used | ${memoryIncrease}MB increase | ${memoryTests.filter(t => t.processed).length} pages processed`);
    }

    async benchmarkDatabase() {
        console.log('\n🗄️ Benchmarking Database Performance...');
        
        // Test API endpoints that involve database operations
        const dbEndpoints = [
            { name: 'Health Check', url: '/.netlify/functions/health', method: 'GET' },
            { name: 'Projects API', url: '/.netlify/functions/projects', method: 'GET' },
            { name: 'Auth API', url: '/.netlify/functions/auth', method: 'POST', body: { action: 'test' } }
        ];
        
        const dbResults = [];
        
        for (const endpoint of dbEndpoints) {
            console.log(`  📊 Testing ${endpoint.name}...`);
            
            const times = [];
            let successCount = 0;
            
            for (let i = 0; i < Math.min(this.iterations, 3); i++) {
                try {
                    const options = {
                        method: endpoint.method,
                        timeout: 10000,
                        headers: { 'Content-Type': 'application/json' }
                    };
                    
                    if (endpoint.body) {
                        options.body = JSON.stringify(endpoint.body);
                    }
                    
                    const startTime = Date.now();
                    const response = await fetch(`${this.baseUrl}${endpoint.url}`, options);
                    const responseTime = Date.now() - startTime;
                    
                    times.push(responseTime);
                    
                    if (response.status < 500) { // Any response except server error
                        successCount++;
                    }
                    
                    console.log(`    ${endpoint.name}: ${responseTime}ms (${response.status})`);
                } catch (error) {
                    console.log(`    ${endpoint.name}: Error - ${error.message}`);
                }
            }
            
            if (times.length > 0) {
                const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
                
                dbResults.push({
                    name: endpoint.name,
                    averageTime: avgTime,
                    successRate: Math.round((successCount / times.length) * 100),
                    iterations: times.length,
                    grade: this.gradeDatabaseResponse(avgTime),
                    passed: avgTime < 5000 && successCount > 0
                });
            } else {
                dbResults.push({
                    name: endpoint.name,
                    averageTime: null,
                    successRate: 0,
                    iterations: 0,
                    grade: 'N/A',
                    passed: false
                });
            }
        }
        
        this.results.database.push({
            test: 'Database Performance',
            endpoints: dbResults,
            workingEndpoints: dbResults.filter(r => r.passed).length,
            totalEndpoints: dbResults.length,
            passed: dbResults.filter(r => r.passed).length > 0
        });
        
        console.log(`  📈 Results: ${dbResults.filter(r => r.passed).length}/${dbResults.length} endpoints performing acceptably`);
    }

    async benchmarkConcurrency() {
        console.log('\n🔄 Benchmarking Concurrency...');
        
        // Test concurrent request handling
        const concurrencyLevels = [5, 10, 20];
        const concurrencyResults = [];
        
        for (const level of concurrencyLevels) {
            console.log(`  📊 Testing ${level} concurrent requests...`);
            
            const promises = [];
            const startTime = Date.now();
            
            for (let i = 0; i < level; i++) {
                const promise = fetch(this.baseUrl, {
                    timeout: 15000,
                    headers: { 'Cache-Control': 'no-cache' }
                })
                .then(response => ({
                    success: response.ok,
                    status: response.status,
                    time: Date.now()
                }))
                .catch(error => ({
                    success: false,
                    error: error.message,
                    time: Date.now()
                }));
                
                promises.push(promise);
            }
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            const successful = results.filter(r => r.success).length;
            const successRate = Math.round((successful / level) * 100);
            
            concurrencyResults.push({
                level: level,
                totalTime: totalTime,
                successfulRequests: successful,
                totalRequests: level,
                successRate: successRate,
                grade: this.gradeConcurrency(successRate, totalTime),
                passed: successRate >= 80 && totalTime < 10000
            });
            
            console.log(`    ${level} concurrent: ${totalTime}ms total | ${successful}/${level} successful (${successRate}%)`);
            
            // Pause between concurrency tests
            await this.sleep(1000);
        }
        
        this.results.concurrent.push({
            test: 'Concurrency',
            levels: concurrencyResults,
            maxLevel: Math.max(...concurrencyLevels),
            passedLevels: concurrencyResults.filter(r => r.passed).length,
            passed: concurrencyResults.some(r => r.passed)
        });
        
        console.log(`  📈 Results: ${concurrencyResults.filter(r => r.passed).length}/${concurrencyResults.length} concurrency levels passed`);
    }

    // Grading functions
    gradeLoadTime(time) {
        if (time <= this.thresholds.excellent.loadTime) return 'A';
        if (time <= this.thresholds.good.loadTime) return 'B';
        if (time <= this.thresholds.acceptable.loadTime) return 'C';
        if (time <= this.thresholds.poor.loadTime) return 'D';
        return 'F';
    }

    gradeThroughput(rps) {
        if (rps >= this.thresholds.excellent.throughput) return 'A';
        if (rps >= this.thresholds.good.throughput) return 'B';
        if (rps >= this.thresholds.acceptable.throughput) return 'C';
        if (rps >= this.thresholds.poor.throughput) return 'D';
        return 'F';
    }

    gradeResourceLoad(time) {
        if (time <= 500) return 'A';
        if (time <= 1000) return 'B';
        if (time <= 2000) return 'C';
        if (time <= 5000) return 'D';
        return 'F';
    }

    gradeMemoryUsage(mb) {
        if (mb <= this.thresholds.excellent.memory) return 'A';
        if (mb <= this.thresholds.good.memory) return 'B';
        if (mb <= this.thresholds.acceptable.memory) return 'C';
        if (mb <= this.thresholds.poor.memory) return 'D';
        return 'F';
    }

    gradeDatabaseResponse(time) {
        if (time <= 1000) return 'A';
        if (time <= 2000) return 'B';
        if (time <= 5000) return 'C';
        if (time <= 10000) return 'D';
        return 'F';
    }

    gradeConcurrency(successRate, time) {
        if (successRate >= 95 && time < 5000) return 'A';
        if (successRate >= 90 && time < 8000) return 'B';
        if (successRate >= 80 && time < 10000) return 'C';
        if (successRate >= 70 && time < 15000) return 'D';
        return 'F';
    }

    calculateScore() {
        const weights = {
            loadTime: 0.25,
            throughput: 0.20,
            resource: 0.15,
            memory: 0.15,
            database: 0.15,
            concurrent: 0.10
        };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        // Load time score
        if (this.results.loadTime.length > 0) {
            const grade = this.results.loadTime[0].grade;
            const score = this.gradeToScore(grade);
            totalScore += score * weights.loadTime;
            totalWeight += weights.loadTime;
        }
        
        // Throughput score
        if (this.results.throughput.length > 0) {
            const grade = this.results.throughput[0].grade;
            const score = this.gradeToScore(grade);
            totalScore += score * weights.throughput;
            totalWeight += weights.throughput;
        }
        
        // Resource loading score
        if (this.results.resource.length > 0) {
            const resources = this.results.resource[0].resources;
            const grades = resources.filter(r => r.grade !== 'N/A').map(r => r.grade);
            
            if (grades.length > 0) {
                const avgScore = grades.reduce((sum, grade) => sum + this.gradeToScore(grade), 0) / grades.length;
                totalScore += avgScore * weights.resource;
                totalWeight += weights.resource;
            }
        }
        
        // Memory score
        if (this.results.memory.length > 0) {
            const grade = this.results.memory[0].grade;
            const score = this.gradeToScore(grade);
            totalScore += score * weights.memory;
            totalWeight += weights.memory;
        }
        
        // Database score
        if (this.results.database.length > 0) {
            const endpoints = this.results.database[0].endpoints;
            const workingEndpoints = endpoints.filter(e => e.grade !== 'N/A');
            
            if (workingEndpoints.length > 0) {
                const avgScore = workingEndpoints.reduce((sum, ep) => sum + this.gradeToScore(ep.grade), 0) / workingEndpoints.length;
                totalScore += avgScore * weights.database;
                totalWeight += weights.database;
            }
        }
        
        // Concurrency score
        if (this.results.concurrent.length > 0) {
            const levels = this.results.concurrent[0].levels;
            const avgScore = levels.reduce((sum, level) => sum + this.gradeToScore(level.grade), 0) / levels.length;
            totalScore += avgScore * weights.concurrent;
            totalWeight += weights.concurrent;
        }
        
        const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
        
        this.results.summary.score = finalScore;
        this.results.summary.grade = this.scoreToGrade(finalScore);
        this.results.summary.recommendations = this.generateRecommendations();
    }

    gradeToScore(grade) {
        const scores = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'F': 40 };
        return scores[grade] || 0;
    }

    scoreToGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Load time recommendations
        if (this.results.loadTime.length > 0) {
            const loadResult = this.results.loadTime[0];
            if (loadResult.grade === 'F' || loadResult.grade === 'D') {
                recommendations.push('Optimize page load time by compressing resources and minimizing HTTP requests');
            }
        }
        
        // Throughput recommendations
        if (this.results.throughput.length > 0) {
            const throughputResult = this.results.throughput[0];
            if (throughputResult.grade === 'F' || throughputResult.grade === 'D') {
                recommendations.push('Improve server throughput by optimizing database queries and caching');
            }
        }
        
        // Memory recommendations
        if (this.results.memory.length > 0) {
            const memoryResult = this.results.memory[0];
            if (memoryResult.grade === 'F' || memoryResult.grade === 'D') {
                recommendations.push('Reduce memory usage by optimizing JavaScript and cleaning up resources');
            }
        }
        
        // Database recommendations
        if (this.results.database.length > 0) {
            const dbResult = this.results.database[0];
            const slowEndpoints = dbResult.endpoints.filter(ep => ep.grade === 'F' || ep.grade === 'D');
            if (slowEndpoints.length > 0) {
                recommendations.push('Optimize database queries and consider adding connection pooling');
            }
        }
        
        return recommendations;
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            baseUrl: this.baseUrl,
            duration: Date.now() - this.startTime,
            summary: this.results.summary,
            results: this.results,
            thresholds: this.thresholds
        };
        
        this.printSummary();
        
        return report;
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('⚡ PERFORMANCE BENCHMARK SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n🎯 Target: ${this.baseUrl}`);
        console.log(`📊 Overall Score: ${this.results.summary.score} (Grade: ${this.results.summary.grade})`);
        console.log(`⏱️  Total Duration: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
        
        // Detailed results
        console.log('\n📈 Detailed Results:');
        
        if (this.results.loadTime.length > 0) {
            const lt = this.results.loadTime[0];
            console.log(`   Load Time: ${lt.average}ms (${lt.grade}) | TTFB: ${lt.ttfb}ms`);
        }
        
        if (this.results.throughput.length > 0) {
            const tp = this.results.throughput[0];
            console.log(`   Throughput: ${tp.rps} RPS (${tp.grade}) | Success: ${tp.successRate}%`);
        }
        
        if (this.results.memory.length > 0) {
            const mem = this.results.memory[0];
            console.log(`   Memory Usage: ${mem.memoryAfterGCMB}MB (${mem.grade})`);
        }
        
        if (this.results.concurrent.length > 0) {
            const conc = this.results.concurrent[0];
            console.log(`   Concurrency: ${conc.passedLevels}/${conc.levels.length} levels passed`);
        }
        
        if (this.results.summary.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            this.results.summary.recommendations.forEach(rec => {
                console.log(`   • ${rec}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI execution
if (require.main === module) {
    const baseUrl = process.argv[2] || process.env.DEPLOYED_URL || 'http://localhost:3000';
    const iterations = parseInt(process.argv[3]) || 5;
    
    const benchmarks = new PerformanceBenchmarks({ baseUrl, iterations });
    
    benchmarks.runAllBenchmarks()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 Performance benchmarks completed!');
                if (result.warnings) {
                    console.log('⚠️ Some performance improvements recommended.');
                }
                process.exit(0);
            } else {
                console.log('\n💥 Performance benchmarks failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Benchmark error:', error);
            process.exit(1);
        });
}

module.exports = PerformanceBenchmarks;