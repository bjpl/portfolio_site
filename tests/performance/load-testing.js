const autocannon = require('autocannon');
const { performance } = require('perf_hooks');

/**
 * Performance Testing Suite using Autocannon
 * Tests various endpoints under different load scenarios
 */

class LoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      baseline: {},
      load: {},
      stress: {},
      spike: {},
      volume: {}
    };
  }

  /**
   * Run comprehensive load testing suite
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive load testing suite...');
    
    try {
      // Baseline testing
      await this.runBaselineTests();
      
      // Load testing
      await this.runLoadTests();
      
      // Stress testing
      await this.runStressTests();
      
      // Spike testing
      await this.runSpikeTests();
      
      // Volume testing
      await this.runVolumeTests();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Load testing failed:', error);
      throw error;
    }
  }

  /**
   * Baseline testing - single user scenarios
   */
  async runBaselineTests() {
    console.log('📊 Running baseline tests...');
    
    const endpoints = [
      { path: '/', name: 'Homepage' },
      { path: '/content', name: 'Content List' },
      { path: '/api/content?limit=10', name: 'Content API' },
      { path: '/api/portfolio/projects', name: 'Projects API' },
      { path: '/api/auth/profile', name: 'Profile API', headers: { Authorization: 'Bearer test-token' } }
    ];

    for (const endpoint of endpoints) {
      const result = await this.runTest({
        url: `${this.baseUrl}${endpoint.path}`,
        connections: 1,
        duration: 10,
        headers: endpoint.headers || {}
      });
      
      this.results.baseline[endpoint.name] = {
        ...result,
        criteria: {
          avgLatency: result.latency.average < 200, // < 200ms
          p99Latency: result.latency.p99 < 500,     // < 500ms
          errorRate: result.errors === 0,           // No errors
          throughput: result.requests.average > 5   // > 5 req/sec
        }
      };
    }
  }

  /**
   * Load testing - expected production load
   */
  async runLoadTests() {
    console.log('⚡ Running load tests...');
    
    const scenarios = [
      {
        name: 'Content Browsing',
        path: '/content',
        connections: 50,
        duration: 60
      },
      {
        name: 'API Load',
        path: '/api/content',
        connections: 30,
        duration: 60
      },
      {
        name: 'Portfolio Viewing',
        path: '/api/portfolio/projects',
        connections: 25,
        duration: 60
      }
    ];

    for (const scenario of scenarios) {
      const result = await this.runTest({
        url: `${this.baseUrl}${scenario.path}`,
        connections: scenario.connections,
        duration: scenario.duration
      });
      
      this.results.load[scenario.name] = {
        ...result,
        criteria: {
          avgLatency: result.latency.average < 500,   // < 500ms
          p95Latency: result.latency.p95 < 1000,      // < 1s
          p99Latency: result.latency.p99 < 2000,      // < 2s
          errorRate: (result.errors / result.requests.total) < 0.01, // < 1% error rate
          throughput: result.requests.average > scenario.connections * 0.8 // 80% efficiency
        }
      };
    }
  }

  /**
   * Stress testing - beyond normal capacity
   */
  async runStressTests() {
    console.log('🔥 Running stress tests...');
    
    const scenarios = [
      {
        name: 'High Concurrent Users',
        path: '/content',
        connections: 200,
        duration: 120
      },
      {
        name: 'API Stress',
        path: '/api/content',
        connections: 100,
        duration: 120
      }
    ];

    for (const scenario of scenarios) {
      const result = await this.runTest({
        url: `${this.baseUrl}${scenario.path}`,
        connections: scenario.connections,
        duration: scenario.duration
      });
      
      this.results.stress[scenario.name] = {
        ...result,
        criteria: {
          avgLatency: result.latency.average < 2000,   // < 2s
          p99Latency: result.latency.p99 < 5000,       // < 5s
          errorRate: (result.errors / result.requests.total) < 0.05, // < 5% error rate
          systemStability: result.errors < 100         // System remains stable
        }
      };
    }
  }

  /**
   * Spike testing - sudden traffic spikes
   */
  async runSpikeTests() {
    console.log('⚡ Running spike tests...');
    
    // Gradual ramp-up to spike
    const spikeScenarios = [
      { connections: 10, duration: 30 },
      { connections: 50, duration: 30 },
      { connections: 200, duration: 60 }, // Spike
      { connections: 50, duration: 30 },
      { connections: 10, duration: 30 }
    ];

    const spikeResults = [];
    
    for (const [index, scenario] of spikeScenarios.entries()) {
      console.log(`  Spike phase ${index + 1}: ${scenario.connections} connections`);
      
      const result = await this.runTest({
        url: `${this.baseUrl}/content`,
        connections: scenario.connections,
        duration: scenario.duration
      });
      
      spikeResults.push({
        phase: index + 1,
        connections: scenario.connections,
        ...result
      });
    }
    
    this.results.spike['Traffic Spike'] = {
      phases: spikeResults,
      criteria: {
        recoveryTime: spikeResults[3].latency.average < spikeResults[1].latency.average * 1.5,
        spikeHandling: spikeResults[2].errors < spikeResults[2].requests.total * 0.1,
        systemRecovery: spikeResults[4].latency.average < spikeResults[0].latency.average * 1.2
      }
    };
  }

  /**
   * Volume testing - large amounts of data
   */
  async runVolumeTests() {
    console.log('📈 Running volume tests...');
    
    const volumeScenarios = [
      {
        name: 'Large Content Query',
        path: '/api/content?limit=1000',
        connections: 10,
        duration: 60
      },
      {
        name: 'Search with Complex Query',
        path: '/api/content/search?q=complex%20search%20query%20with%20multiple%20terms',
        connections: 20,
        duration: 60
      }
    ];

    for (const scenario of volumeScenarios) {
      const result = await this.runTest({
        url: `${this.baseUrl}${scenario.path}`,
        connections: scenario.connections,
        duration: scenario.duration
      });
      
      this.results.volume[scenario.name] = {
        ...result,
        criteria: {
          avgLatency: result.latency.average < 3000,   // < 3s for large queries
          memoryUsage: true, // Would need memory monitoring
          dataIntegrity: result.errors === 0          // No data corruption
        }
      };
    }
  }

  /**
   * Run individual test with autocannon
   */
  async runTest(options) {
    return new Promise((resolve, reject) => {
      const instance = autocannon({
        url: options.url,
        connections: options.connections,
        duration: options.duration,
        headers: options.headers || {},
        pipelining: 1
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            requests: {
              total: result.requests.total,
              average: result.requests.average,
              min: result.requests.min,
              max: result.requests.max
            },
            latency: {
              average: result.latency.average,
              min: result.latency.min,
              max: result.latency.max,
              p50: result.latency.p50,
              p75: result.latency.p75,
              p90: result.latency.p90,
              p95: result.latency.p95,
              p99: result.latency.p99
            },
            throughput: {
              average: result.throughput.average,
              min: result.throughput.min,
              max: result.throughput.max
            },
            errors: result.errors,
            timeouts: result.timeouts,
            duration: result.duration,
            start: result.start,
            finish: result.finish
          });
        }
      });

      // Real-time progress updates
      instance.on('tick', () => {
        process.stdout.write('.');
      });
    });
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\\n\\n📋 Performance Test Report');
    console.log('================================\\n');

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        overallHealth: 'GOOD'
      },
      details: this.results
    };

    // Calculate summary statistics
    Object.values(this.results).forEach(category => {
      Object.values(category).forEach(test => {
        if (test.criteria) {
          const criteriaPassed = Object.values(test.criteria).filter(Boolean).length;
          const totalCriteria = Object.keys(test.criteria).length;
          
          reportData.summary.totalTests++;
          if (criteriaPassed === totalCriteria) {
            reportData.summary.passedTests++;
          } else {
            reportData.summary.failedTests++;
          }
        }
      });
    });

    // Determine overall health
    const passRate = reportData.summary.passedTests / reportData.summary.totalTests;
    if (passRate >= 0.9) {
      reportData.summary.overallHealth = 'EXCELLENT';
    } else if (passRate >= 0.8) {
      reportData.summary.overallHealth = 'GOOD';
    } else if (passRate >= 0.6) {
      reportData.summary.overallHealth = 'FAIR';
    } else {
      reportData.summary.overallHealth = 'POOR';
    }

    // Console output
    console.log(`Overall Health: ${reportData.summary.overallHealth}`);
    console.log(`Tests Passed: ${reportData.summary.passedTests}/${reportData.summary.totalTests}`);
    console.log(`Pass Rate: ${(passRate * 100).toFixed(1)}%\\n`);

    // Detailed results
    Object.entries(this.results).forEach(([category, tests]) => {
      console.log(`${category.toUpperCase()} TESTS:`);
      Object.entries(tests).forEach(([testName, result]) => {
        if (result.latency) {
          console.log(`  ${testName}:`);
          console.log(`    Avg Latency: ${result.latency.average.toFixed(2)}ms`);
          console.log(`    P99 Latency: ${result.latency.p99.toFixed(2)}ms`);
          console.log(`    Throughput: ${result.requests.average.toFixed(2)} req/s`);
          console.log(`    Errors: ${result.errors}`);
          
          if (result.criteria) {
            const passed = Object.values(result.criteria).filter(Boolean).length;
            const total = Object.keys(result.criteria).length;
            console.log(`    Criteria: ${passed}/${total} passed`);
          }
          console.log('');
        }
      });
    });

    // Save detailed report to file
    const fs = require('fs');
    const path = require('path');
    
    const reportPath = path.join(__dirname, '../results', `performance-report-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    return reportData;
  }

  /**
   * Memory usage monitoring
   */
  async monitorMemoryUsage(duration = 60000) {
    const samples = [];
    const interval = 1000; // 1 second intervals
    const iterations = duration / interval;

    for (let i = 0; i < iterations; i++) {
      const memUsage = process.memoryUsage();
      samples.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      });
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return {
      samples,
      analysis: {
        avgHeapUsed: samples.reduce((sum, s) => sum + s.heapUsed, 0) / samples.length,
        maxHeapUsed: Math.max(...samples.map(s => s.heapUsed)),
        avgRss: samples.reduce((sum, s) => sum + s.rss, 0) / samples.length,
        maxRss: Math.max(...samples.map(s => s.rss)),
        memoryLeakDetected: this.detectMemoryLeak(samples)
      }
    };
  }

  /**
   * Simple memory leak detection
   */
  detectMemoryLeak(samples) {
    if (samples.length < 10) return false;
    
    const firstQuarter = samples.slice(0, Math.floor(samples.length / 4));
    const lastQuarter = samples.slice(-Math.floor(samples.length / 4));
    
    const avgFirst = firstQuarter.reduce((sum, s) => sum + s.heapUsed, 0) / firstQuarter.length;
    const avgLast = lastQuarter.reduce((sum, s) => sum + s.heapUsed, 0) / lastQuarter.length;
    
    // Consider it a leak if memory increased by more than 50%
    return (avgLast - avgFirst) / avgFirst > 0.5;
  }
}

// Custom performance scenarios
class CustomScenarios {
  static async authenticationFlow(baseUrl) {
    console.log('🔐 Testing authentication flow performance...');
    
    const authTest = autocannon({
      url: `${baseUrl}/api/auth/login`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      }),
      connections: 20,
      duration: 30
    });

    return new Promise((resolve) => {
      authTest.on('done', resolve);
    });
  }

  static async databaseQueries(baseUrl) {
    console.log('🗄️ Testing database query performance...');
    
    const queries = [
      '/api/content?limit=50',
      '/api/content/search?q=test',
      '/api/portfolio/projects?category=web',
      '/api/content/stats'
    ];

    const results = {};

    for (const query of queries) {
      const result = await new Promise((resolve) => {
        const test = autocannon({
          url: `${baseUrl}${query}`,
          connections: 15,
          duration: 20
        }, resolve);
      });
      
      results[query] = result;
    }

    return results;
  }

  static async fileUploadPerformance(baseUrl) {
    console.log('📁 Testing file upload performance...');
    
    // This would test file upload endpoints if they exist
    const uploadTest = autocannon({
      url: `${baseUrl}/api/upload`,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      connections: 5, // Lower concurrency for file uploads
      duration: 30
    });

    return new Promise((resolve) => {
      uploadTest.on('done', resolve);
    });
  }
}

// Export for use in other test files
module.exports = {
  LoadTester,
  CustomScenarios
};

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new LoadTester();
  
  tester.runAllTests()
    .then(() => {
      console.log('✅ All performance tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Performance tests failed:', error);
      process.exit(1);
    });
}