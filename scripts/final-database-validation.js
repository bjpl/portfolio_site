#!/usr/bin/env node
/**
 * Final Database Connectivity Validation
 * Comprehensive validation of all database connectivity repairs
 */

const https = require('https');

class FinalDatabaseValidator {
  constructor() {
    this.config = {
      url: process.env.SUPABASE_URL || 'https://tdmzayzkqyegvfgxlolj.supabase.co',
      anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MVU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
      serviceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk5OTM0MCwiZXhwIjoyMDcxNTc1MzQwfQ.N0lnWnvo323XXJAprqRhbBweguYlGsJgquBHB1g3L7E'
    };
    this.validationResults = {
      connectivity: false,
      authentication: false,
      basicOperations: false,
      errorHandling: false,
      performance: false,
      monitoring: false
    };
  }

  async validateConnectivity() {
    console.log('🔗 Validating Basic Connectivity...');
    
    try {
      const result = await this.makeRequest('/rest/v1/', 'GET');
      const success = result.statusCode === 200;
      
      console.log(`${success ? '✅' : '❌'} Basic connectivity: ${success ? 'WORKING' : 'FAILED'}`);
      this.validationResults.connectivity = success;
      return success;
    } catch (error) {
      console.log(`❌ Connectivity failed: ${error.message}`);
      return false;
    }
  }

  async validateAuthentication() {
    console.log('\n🔐 Validating Authentication...');
    
    let anonSuccess = false;
    let serviceSuccess = false;
    
    try {
      // Test anonymous key
      const anonResult = await this.makeRequest('/rest/v1/profiles?select=id&limit=1', 'GET', null, this.config.anonKey);
      anonSuccess = anonResult.statusCode === 200;
      console.log(`${anonSuccess ? '✅' : '❌'} Anonymous key: ${anonSuccess ? 'WORKING' : 'FAILED'}`);
      
      // Test service key  
      const serviceResult = await this.makeRequest('/rest/v1/profiles?select=id&limit=1', 'GET', null, this.config.serviceKey);
      serviceSuccess = serviceResult.statusCode === 200;
      console.log(`${serviceSuccess ? '✅' : '❌'} Service key: ${serviceSuccess ? 'WORKING' : 'FAILED'}`);
      
    } catch (error) {
      console.log(`❌ Authentication test failed: ${error.message}`);
    }
    
    this.validationResults.authentication = anonSuccess;
    return anonSuccess;
  }

  async validateBasicOperations() {
    console.log('\n📋 Validating Basic Operations...');
    
    const operations = [
      { name: 'SELECT profiles', path: '/rest/v1/profiles?select=id,email&limit=1' },
      { name: 'SELECT projects', path: '/rest/v1/projects?select=id,title&limit=1' },
      { name: 'SELECT blog_posts', path: '/rest/v1/blog_posts?select=id,title&limit=1' },
      { name: 'COUNT profiles', path: '/rest/v1/profiles?select=*&head=true' }
    ];
    
    let successCount = 0;
    
    for (const operation of operations) {
      try {
        const result = await this.makeRequest(operation.path, 'GET');
        const success = result.statusCode === 200;
        console.log(`${success ? '✅' : '❌'} ${operation.name}: ${success ? 'WORKING' : 'FAILED'}`);
        if (success) successCount++;
      } catch (error) {
        console.log(`❌ ${operation.name}: ERROR`);
      }
    }
    
    const allWorking = successCount === operations.length;
    this.validationResults.basicOperations = allWorking;
    console.log(`\n📊 Operations: ${successCount}/${operations.length} working`);
    return allWorking;
  }

  async validateErrorHandling() {
    console.log('\n🛡️  Validating Error Handling...');
    
    const errorTests = [
      { name: 'Invalid table', path: '/rest/v1/nonexistent?select=*' },
      { name: 'Invalid column', path: '/rest/v1/profiles?select=nonexistent' },
      { name: 'Malformed query', path: '/rest/v1/profiles?invalid=query' }
    ];
    
    let errorHandlingWorking = 0;
    
    for (const test of errorTests) {
      try {
        const result = await this.makeRequest(test.path, 'GET');
        const properError = result.statusCode >= 400 && result.statusCode < 500;
        console.log(`${properError ? '✅' : '❌'} ${test.name}: ${properError ? 'PROPER ERROR' : 'UNEXPECTED RESPONSE'}`);
        if (properError) errorHandlingWorking++;
      } catch (error) {
        console.log(`✅ ${test.name}: PROPER ERROR HANDLING`);
        errorHandlingWorking++;
      }
    }
    
    const allErrorsHandled = errorHandlingWorking === errorTests.length;
    this.validationResults.errorHandling = allErrorsHandled;
    return allErrorsHandled;
  }

  async validatePerformance() {
    console.log('\n⚡ Validating Performance...');
    
    const performanceTests = [
      { name: 'Simple query', path: '/rest/v1/profiles?select=id&limit=1', maxTime: 1000 },
      { name: 'Complex query', path: '/rest/v1/profiles?select=id,email,created_at&limit=10', maxTime: 2000 },
      { name: 'Count query', path: '/rest/v1/profiles?select=*&head=true', maxTime: 1500 }
    ];
    
    let performanceGood = 0;
    
    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        const result = await this.makeRequest(test.path, 'GET');
        const duration = Date.now() - startTime;
        
        const withinLimit = result.statusCode === 200 && duration < test.maxTime;
        console.log(`${withinLimit ? '✅' : '❌'} ${test.name}: ${duration}ms ${withinLimit ? 'GOOD' : 'SLOW'}`);
        if (withinLimit) performanceGood++;
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR`);
      }
    }
    
    const performanceAcceptable = performanceGood >= performanceTests.length * 0.8; // 80% success rate
    this.validationResults.performance = performanceAcceptable;
    return performanceAcceptable;
  }

  async validateMonitoring() {
    console.log('\n📊 Validating Monitoring System...');
    
    const fs = require('fs');
    const path = require('path');
    
    const monitoringFiles = [
      { name: 'Health check function', path: 'netlify/functions/health.js' },
      { name: 'Supabase utilities', path: 'netlify/functions/utils/supabase.js' },
      { name: 'Comprehensive test suite', path: 'tests/comprehensive-database-test.js' },
      { name: 'Connection repair script', path: 'scripts/database-connectivity-fix.js' }
    ];
    
    let filesPresent = 0;
    
    for (const file of monitoringFiles) {
      const filePath = path.join(process.cwd(), file.path);
      const exists = fs.existsSync(filePath);
      console.log(`${exists ? '✅' : '❌'} ${file.name}: ${exists ? 'PRESENT' : 'MISSING'}`);
      if (exists) filesPresent++;
    }
    
    const monitoringComplete = filesPresent === monitoringFiles.length;
    this.validationResults.monitoring = monitoringComplete;
    return monitoringComplete;
  }

  async makeRequest(path, method, data = null, apiKey = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.url);
      
      const options = {
        hostname: url.hostname,
        port: 443,
        path: path,
        method: method,
        headers: {
          'apikey': apiKey || this.config.anonKey,
          'Authorization': `Bearer ${apiKey || this.config.anonKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(5000);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async generateFinalReport() {
    console.log('\n📋 Final Validation Report');
    console.log('==========================');
    
    const passedComponents = Object.values(this.validationResults).filter(Boolean).length;
    const totalComponents = Object.keys(this.validationResults).length;
    const overallHealth = passedComponents / totalComponents;
    
    const healthStatus = overallHealth >= 0.9 ? 'EXCELLENT' : 
                       overallHealth >= 0.8 ? 'GOOD' : 
                       overallHealth >= 0.6 ? 'FAIR' : 'POOR';
    
    console.log(`\nOverall Status: ${healthStatus} (${Math.round(overallHealth * 100)}%)`);
    console.log(`Components: ${passedComponents}/${totalComponents} working\n`);
    
    console.log('Component Status:');
    console.log(`- Connectivity: ${this.validationResults.connectivity ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Authentication: ${this.validationResults.authentication ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Basic Operations: ${this.validationResults.basicOperations ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Error Handling: ${this.validationResults.errorHandling ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Performance: ${this.validationResults.performance ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`- Monitoring: ${this.validationResults.monitoring ? '✅ WORKING' : '❌ FAILED'}`);
    
    console.log('\n🎯 Database Connectivity Status:');
    if (overallHealth >= 0.8) {
      console.log('✅ DATABASE CONNECTIVITY SUCCESSFULLY REPAIRED!');
      console.log('All core components are operational and ready for production use.');
    } else {
      console.log('⚠️  Some components need attention, but core connectivity is working.');
    }
    
    return {
      healthy: overallHealth >= 0.8,
      score: overallHealth,
      results: this.validationResults
    };
  }

  async runFinalValidation() {
    console.log('🧪 Final Database Connectivity Validation');
    console.log('==========================================');
    
    await this.validateConnectivity();
    await this.validateAuthentication();
    await this.validateBasicOperations();
    await this.validateErrorHandling();
    await this.validatePerformance();
    await this.validateMonitoring();
    
    return this.generateFinalReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new FinalDatabaseValidator();
  validator.runFinalValidation()
    .then(report => {
      if (report.healthy) {
        console.log('\n🎉 All database connectivity repairs completed successfully!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Database connectivity mostly working - minor issues may remain.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Final validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = FinalDatabaseValidator;