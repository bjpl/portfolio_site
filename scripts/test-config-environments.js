#!/usr/bin/env node

/**
 * Environment Configuration Test Suite
 * Tests configuration across different environments
 * Usage: node scripts/test-config-environments.js
 */

const fs = require('fs');
const path = require('path');
const ConfigValidator = require('./validate-env-config');

class EnvironmentTester {
  constructor() {
    this.environments = ['development', 'staging', 'production'];
    this.results = {};
  }

  /**
   * Test all environments
   */
  async testAllEnvironments() {
    console.log('🌍 Testing Configuration Across Environments');
    console.log('='.repeat(60));

    for (const env of this.environments) {
      console.log(`\n🔍 Testing ${env.toUpperCase()} environment...`);
      console.log('-'.repeat(40));
      
      // Set environment for validator
      process.env.NODE_ENV = env;
      
      const validator = new ConfigValidator();
      validator.environment = env;
      
      const result = await validator.validate();
      this.results[env] = result;
      
      console.log(`Result: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
    }

    this.generateSummary();
    return this.results;
  }

  /**
   * Test specific configuration scenarios
   */
  testConfigurationScenarios() {
    console.log('\n🧪 Testing Configuration Scenarios');
    console.log('='.repeat(60));

    const scenarios = [
      {
        name: 'Missing Supabase Configuration',
        env: { NODE_ENV: 'test' },
        expectedErrors: ['Missing required variable: SUPABASE_URL']
      },
      {
        name: 'Weak JWT Secret',
        env: { 
          NODE_ENV: 'production',
          JWT_SECRET: 'weak',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'test-key-' + 'x'.repeat(100)
        },
        expectedErrors: ['JWT_SECRET is too short']
      },
      {
        name: 'Invalid URL Configuration',
        env: {
          NODE_ENV: 'test',
          SUPABASE_URL: 'invalid-url',
          SITE_URL: 'not-a-url'
        },
        expectedErrors: ['Invalid URL for SUPABASE_URL', 'Invalid URL for SITE_URL']
      }
    ];

    scenarios.forEach(scenario => {
      console.log(`\nTesting: ${scenario.name}`);
      
      // Temporarily set environment
      const originalEnv = { ...process.env };
      Object.assign(process.env, scenario.env);
      
      try {
        const validator = new ConfigValidator();
        validator.environment = scenario.env.NODE_ENV || 'test';
        
        // Mock the getConfiguration method to use our test env
        validator.getConfiguration = () => ({
          env: scenario.env,
          files: {}
        });
        
        const result = validator.validate();
        
        // Check if expected errors were found
        const foundExpectedErrors = scenario.expectedErrors.every(expectedError =>
          result.errors.some(error => error.includes(expectedError))
        );
        
        if (foundExpectedErrors) {
          console.log('   ✅ Scenario passed - expected errors detected');
        } else {
          console.log('   ❌ Scenario failed - expected errors not found');
          console.log('   Expected:', scenario.expectedErrors);
          console.log('   Actual:', result.errors);
        }
        
      } catch (error) {
        console.log(`   ❌ Test error: ${error.message}`);
      } finally {
        // Restore original environment
        process.env = originalEnv;
      }
    });
  }

  /**
   * Test environment file consistency
   */
  testFileConsistency() {
    console.log('\n📁 Testing Environment File Consistency');
    console.log('='.repeat(60));

    const files = [
      '.env.example',
      '.env',
      '.env.production',
      'config/environments/.env.unified'
    ];

    const fileContents = {};
    const fileVars = {};

    files.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fileContents[file] = fs.readFileSync(filePath, 'utf8');
        fileVars[file] = this.extractVariables(fileContents[file]);
        console.log(`✅ Found ${file} (${fileVars[file].length} variables)`);
      } else {
        console.log(`⚠️  Missing ${file}`);
      }
    });

    // Check for consistency between files
    this.checkVariableConsistency(fileVars);
  }

  /**
   * Extract variables from file content
   */
  extractVariables(content) {
    const variables = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const varName = trimmed.split('=')[0];
        if (varName) {
          variables.push(varName);
        }
      }
    });
    
    return variables;
  }

  /**
   * Check consistency between environment files
   */
  checkVariableConsistency(fileVars) {
    console.log('\n🔍 Checking Variable Consistency...');
    
    const exampleVars = new Set(fileVars['.env.example'] || []);
    
    Object.entries(fileVars).forEach(([file, vars]) => {
      if (file === '.env.example') return;
      
      const fileVarSet = new Set(vars);
      const missingInExample = vars.filter(v => !exampleVars.has(v));
      const extraInExample = Array.from(exampleVars).filter(v => !fileVarSet.has(v));
      
      if (missingInExample.length > 0) {
        console.log(`⚠️  ${file} has variables not in .env.example:`);
        missingInExample.forEach(v => console.log(`   • ${v}`));
      }
      
      if (extraInExample.length > 0 && file !== 'config/environments/.env.unified') {
        console.log(`ℹ️  .env.example has variables not in ${file}:`);
        extraInExample.slice(0, 5).forEach(v => console.log(`   • ${v}`));
        if (extraInExample.length > 5) {
          console.log(`   • ... and ${extraInExample.length - 5} more`);
        }
      }
    });
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    console.log('\n📊 SUMMARY REPORT');
    console.log('='.repeat(60));
    
    const validEnvironments = Object.values(this.results).filter(r => r.valid).length;
    const totalEnvironments = Object.keys(this.results).length;
    
    console.log(`\n✅ Valid Environments: ${validEnvironments}/${totalEnvironments}`);
    
    if (validEnvironments === totalEnvironments) {
      console.log('🎉 All environments are properly configured!');
    } else {
      console.log('\n❌ Issues found in the following environments:');
      Object.entries(this.results).forEach(([env, result]) => {
        if (!result.valid) {
          console.log(`   • ${env}: ${result.errors.length} errors, ${result.warnings.length} warnings`);
        }
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Fix all errors before deploying to production');
    console.log('   2. Review warnings for optimization opportunities');
    console.log('   3. Rotate secrets regularly (quarterly recommended)');
    console.log('   4. Keep .env.example updated with new variables');
    console.log('   5. Use different secrets for each environment');
  }

  /**
   * Run comprehensive test suite
   */
  async runAll() {
    await this.testAllEnvironments();
    this.testConfigurationScenarios();
    this.testFileConsistency();
    
    console.log('\n🏁 Environment Configuration Testing Complete');
    
    const allValid = Object.values(this.results).every(r => r.valid);
    return allValid;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new EnvironmentTester();
  
  tester.runAll().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = EnvironmentTester;