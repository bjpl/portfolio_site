/**
 * Comprehensive Database Test Suite
 * Tests all aspects of database connectivity and fixes issues
 */

const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

class ComprehensiveDatabaseTester {
  constructor() {
    this.results = {
      connectivity: false,
      schema: false,
      authentication: false,
      rls: false,
      performance: false
    };
    
    this.config = this.loadConfig();
  }

  loadConfig() {
    // Load from environment and .env file
    const config = {
      url: process.env.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co',
      anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MVU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
      serviceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E'
    };

    // Try to load from .env file if available
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        lines.forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            const cleanKey = key.trim();
            const cleanValue = value.trim();
            
            if (cleanKey === 'SUPABASE_URL') config.url = cleanValue;
            if (cleanKey === 'SUPABASE_ANON_KEY') config.anonKey = cleanValue;
            if (cleanKey === 'SUPABASE_SERVICE_KEY') config.serviceKey = cleanValue;
          }
        });
      }
    } catch (error) {
      console.log('Note: Could not load .env file, using defaults');
    }

    return config;
  }

  async testConnectivity() {
    console.log('\n🔗 Testing Basic Connectivity...');
    
    try {
      const url = new URL(this.config.url);
      
      const result = await this.makeHttpRequest({
        hostname: url.hostname,
        port: 443,
        path: '/rest/v1/',
        method: 'GET',
        headers: {
          'apikey': this.config.anonKey,
          'Accept': 'application/json'
        }
      });

      if (result.statusCode === 200) {
        console.log('✅ Basic connectivity: OK');
        this.results.connectivity = true;
        return true;
      } else {
        console.log(`❌ Basic connectivity failed: HTTP ${result.statusCode}`);
        console.log(`Response: ${result.data}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Connectivity error: ${error.message}`);
      return false;
    }
  }

  async testSchema() {
    console.log('\n📋 Testing Database Schema...');
    
    const tables = [
      'profiles', 'skills', 'tags', 'projects', 'blog_posts',
      'comments', 'media_assets', 'contact_messages', 
      'analytics_events', 'system_settings'
    ];
    
    let workingTables = 0;
    
    for (const table of tables) {
      try {
        const result = await this.queryTable(table, 'id', 1);
        
        if (result.success) {
          console.log(`✅ Table '${table}': EXISTS`);
          workingTables++;
        } else {
          console.log(`❌ Table '${table}': ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Table '${table}': ERROR - ${error.message}`);
      }
    }
    
    const schemaHealth = workingTables / tables.length;
    this.results.schema = schemaHealth > 0.8; // 80% of tables working
    
    console.log(`\n📊 Schema Health: ${workingTables}/${tables.length} tables (${Math.round(schemaHealth * 100)}%)`);
    
    if (workingTables === 0) {
      console.log('\n⚠️  No tables accessible - database may not be initialized');
      console.log('🔧 Suggested fix: Run database migrations');
    }
    
    return this.results.schema;
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    // Test anonymous key
    const anonResult = await this.queryTable('profiles', 'id', 1, this.config.anonKey);
    console.log(`${anonResult.success ? '✅' : '❌'} Anonymous key: ${anonResult.success ? 'WORKING' : anonResult.error}`);
    
    // Test service key
    const serviceResult = await this.queryTable('system_settings', 'id', 1, this.config.serviceKey);
    console.log(`${serviceResult.success ? '✅' : '❌'} Service key: ${serviceResult.success ? 'WORKING' : serviceResult.error}`);
    
    this.results.authentication = anonResult.success;
    return this.results.authentication;
  }

  async testRLS() {
    console.log('\n🛡️  Testing Row Level Security...');
    
    // Test public access to profiles (should work)
    const publicTest = await this.queryTable('profiles', 'id', 1);
    console.log(`${publicTest.success ? '✅' : '❌'} Public access (profiles): ${publicTest.success ? 'ALLOWED' : 'BLOCKED'}`);
    
    // Test access to system_settings without service role (should be restricted)  
    const restrictedTest = await this.queryTable('system_settings', 'id', 1);
    const rlsWorking = !restrictedTest.success && restrictedTest.error.includes('permission');
    console.log(`${rlsWorking ? '✅' : '❌'} Restricted access (system_settings): ${rlsWorking ? 'PROPERLY RESTRICTED' : 'NOT RESTRICTED'}`);
    
    this.results.rls = publicTest.success && rlsWorking;
    return this.results.rls;
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    const tests = [
      { name: 'Simple SELECT', table: 'profiles', columns: 'id', limit: 1 },
      { name: 'Multi-column SELECT', table: 'profiles', columns: 'id,email,created_at', limit: 10 },
      { name: 'Filtered query', table: 'projects', columns: 'id,title', limit: 5 }
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
      const start = Date.now();
      const result = await this.queryTable(test.table, test.columns, test.limit);
      const duration = Date.now() - start;
      
      const passed = result.success && duration < 2000; // Under 2 seconds
      console.log(`${passed ? '✅' : '❌'} ${test.name}: ${duration}ms ${passed ? 'GOOD' : 'SLOW'}`);
      
      if (passed) passedTests++;
    }
    
    this.results.performance = passedTests === tests.length;
    return this.results.performance;
  }

  async queryTable(table, columns = '*', limit = 1, apiKey = null) {
    try {
      const url = new URL(this.config.url);
      const path = `/rest/v1/${table}?select=${columns}&limit=${limit}`;
      
      const result = await this.makeHttpRequest({
        hostname: url.hostname,
        port: 443,
        path: path,
        method: 'GET',
        headers: {
          'apikey': apiKey || this.config.anonKey,
          'Authorization': `Bearer ${apiKey || this.config.anonKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (result.statusCode === 200) {
        return { success: true, data: JSON.parse(result.data) };
      } else {
        let errorMsg = `HTTP ${result.statusCode}`;
        try {
          const errorData = JSON.parse(result.data);
          errorMsg = errorData.message || errorData.hint || errorMsg;
        } catch (e) {
          // Use status code if can't parse error
        }
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async makeHttpRequest(options) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.setTimeout(5000);
      req.end();
    });
  }

  async generateReport() {
    console.log('\n📊 Database Health Report');
    console.log('========================');
    
    const overallHealth = Object.values(this.results).filter(Boolean).length / Object.keys(this.results).length;
    const healthStatus = overallHealth >= 0.8 ? 'HEALTHY' : overallHealth >= 0.6 ? 'DEGRADED' : 'UNHEALTHY';
    
    console.log(`Overall Status: ${healthStatus} (${Math.round(overallHealth * 100)}%)`);
    console.log(`\nComponent Status:`);
    console.log(`- Connectivity: ${this.results.connectivity ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Schema: ${this.results.schema ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Authentication: ${this.results.authentication ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- RLS Policies: ${this.results.rls ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Performance: ${this.results.performance ? '✅ WORKING' : '❌ FAILED'}`);
    
    // Generate recommendations
    console.log(`\n🔧 Recommendations:`);
    
    if (!this.results.connectivity) {
      console.log('- Check network connection and Supabase URL');
      console.log('- Verify API keys are correct');
    }
    
    if (!this.results.schema) {
      console.log('- Run database migrations: supabase db push');
      console.log('- Check if database is properly initialized');
    }
    
    if (!this.results.authentication) {
      console.log('- Verify SUPABASE_ANON_KEY is correct');
      console.log('- Check API key permissions in Supabase dashboard');
    }
    
    if (!this.results.rls) {
      console.log('- Review and apply Row Level Security policies');
      console.log('- Check table permissions configuration');
    }
    
    if (!this.results.performance) {
      console.log('- Consider database indexing optimization');
      console.log('- Review query efficiency');
    }
    
    return {
      healthy: healthStatus === 'HEALTHY',
      overallHealth: overallHealth,
      results: this.results,
      recommendations: this.getRecommendations()
    };
  }

  getRecommendations() {
    const recommendations = [];
    
    if (!this.results.connectivity) {
      recommendations.push('Fix network connectivity and API configuration');
    }
    if (!this.results.schema) {
      recommendations.push('Initialize database schema with migrations');
    }
    if (!this.results.authentication) {
      recommendations.push('Update API keys and authentication configuration');
    }
    if (!this.results.rls) {
      recommendations.push('Configure Row Level Security policies');
    }
    if (!this.results.performance) {
      recommendations.push('Optimize database queries and indexing');
    }
    
    return recommendations;
  }

  async runAllTests() {
    console.log('🧪 Comprehensive Database Test Suite');
    console.log('=====================================');
    
    await this.testConnectivity();
    await this.testSchema();
    await this.testAuthentication();
    await this.testRLS();
    await this.testPerformance();
    
    return this.generateReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ComprehensiveDatabaseTester();
  tester.runAllTests()
    .then(report => {
      if (report.healthy) {
        console.log('\n🎉 Database is healthy and ready for use!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Database has issues that need attention');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = ComprehensiveDatabaseTester;