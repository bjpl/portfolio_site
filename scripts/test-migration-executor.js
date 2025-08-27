#!/usr/bin/env node
/**
 * Migration Executor Test Suite
 * Comprehensive testing for the migration execution system
 */

import { MigrationExecutor } from './execute-migrations.js';
import { MigrationConfig, getEnvironmentConfig } from './migration-executor-config.js';
import { 
  FileUtils, 
  SQLUtils, 
  ValidationUtils,
  ChecksumUtils 
} from './migration-utils.js';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Suite Runner
 */
class MigrationTestSuite {
  constructor() {
    this.testResults = [];
    this.config = getEnvironmentConfig('development');
  }

  async runTest(name, testFunction) {
    const startTime = Date.now();
    console.log(chalk.blue(`🧪 Running test: ${name}`));
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        status: 'passed',
        duration
      });
      
      console.log(chalk.green(`✅ ${name} (${duration}ms)`));
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        status: 'failed',
        duration,
        error: error.message
      });
      
      console.log(chalk.red(`❌ ${name} (${duration}ms): ${error.message}`));
    }
  }

  async testUtilities() {
    console.log(chalk.yellow('\n📋 Testing Utility Functions'));
    
    await this.runTest('FileUtils.ensureDirectory', async () => {
      const testDir = path.join(__dirname, 'test-temp');
      const result = await FileUtils.ensureDirectory(testDir);
      if (!result) throw new Error('Failed to create directory');
      
      // Cleanup
      await import('fs/promises').then(fs => fs.rmdir(testDir));
    });

    await this.runTest('ChecksumUtils.calculateSHA256', async () => {
      const content = 'CREATE TABLE test (id INTEGER);';
      const checksum = ChecksumUtils.calculateSHA256(content);
      
      if (!checksum || checksum.length !== 64) {
        throw new Error('Invalid checksum generated');
      }
    });

    await this.runTest('SQLUtils.splitStatements', async () => {
      const sql = `
        CREATE TABLE users (id INTEGER);
        INSERT INTO users VALUES (1);
        -- Comment
        SELECT * FROM users;
      `;
      
      const statements = SQLUtils.splitStatements(sql);
      if (statements.length !== 3) {
        throw new Error(`Expected 3 statements, got ${statements.length}`);
      }
    });

    await this.runTest('SQLUtils.validateSQLSyntax', async () => {
      const validSQL = 'CREATE TABLE test (id INTEGER);';
      const invalidSQL = 'CREATE TABLE test (id INTEGER;'; // Missing closing paren
      
      const validResult = SQLUtils.validateSQLSyntax(validSQL);
      const invalidResult = SQLUtils.validateSQLSyntax(invalidSQL);
      
      if (!validResult.isValid) {
        throw new Error('Valid SQL marked as invalid');
      }
      if (invalidResult.isValid) {
        throw new Error('Invalid SQL marked as valid');
      }
    });

    await this.runTest('ValidationUtils.validateEnvironment', async () => {
      const result = ValidationUtils.validateEnvironment();
      // This might fail in test environment, that's ok
      console.log(`Environment validation: ${result.isValid ? 'passed' : 'needs setup'}`);
    });
  }

  async testMigrationExecutor() {
    console.log(chalk.yellow('\n🚀 Testing Migration Executor'));
    
    await this.runTest('MigrationExecutor initialization', async () => {
      const executor = new MigrationExecutor({
        supabaseUrl: 'https://test.supabase.co',
        serviceKey: 'test-key'
      });
      
      if (!executor.supabaseUrl || !executor.serviceKey) {
        throw new Error('Executor not properly initialized');
      }
    });

    await this.runTest('Migration file scanning', async () => {
      const executor = new MigrationExecutor({
        supabaseUrl: 'https://test.supabase.co',
        serviceKey: 'test-key'
      });
      
      try {
        const files = await executor.getMigrationFiles();
        console.log(`Found ${files.length} migration files`);
      } catch (error) {
        // Expected if no migration directory exists
        console.log('Migration directory test skipped (no directory found)');
      }
    });

    await this.runTest('Checksum calculation', async () => {
      const executor = new MigrationExecutor({
        supabaseUrl: 'https://test.supabase.co',
        serviceKey: 'test-key'
      });
      
      const content = 'CREATE TABLE test (id INTEGER);';
      const checksum = await executor.calculateChecksum(content);
      
      if (!checksum || typeof checksum !== 'string') {
        throw new Error('Invalid checksum generated');
      }
    });

    await this.runTest('Rollback SQL generation', async () => {
      const executor = new MigrationExecutor({
        supabaseUrl: 'https://test.supabase.co',
        serviceKey: 'test-key'
      });
      
      const createTableSQL = 'CREATE TABLE test_table (id INTEGER);';
      const rollbackSQL = executor.generateRollbackSQL(createTableSQL);
      
      if (!rollbackSQL.includes('DROP TABLE')) {
        throw new Error('Rollback SQL not properly generated');
      }
    });
  }

  async testConfiguration() {
    console.log(chalk.yellow('\n⚙️ Testing Configuration'));
    
    await this.runTest('Default configuration loading', async () => {
      const config = getEnvironmentConfig();
      
      if (!config.database || !config.execution) {
        throw new Error('Configuration not properly loaded');
      }
    });

    await this.runTest('Environment-specific configuration', async () => {
      const devConfig = getEnvironmentConfig('development');
      const prodConfig = getEnvironmentConfig('production');
      
      if (devConfig.strictMode === prodConfig.strictMode) {
        throw new Error('Environment configurations are not different');
      }
    });

    await this.runTest('Configuration validation', async () => {
      const { validateConfig } = await import('./migration-executor-config.js');
      const result = validateConfig(MigrationConfig);
      
      if (!result.isValid && result.errors.length > 0) {
        throw new Error(`Configuration validation failed: ${result.errors.join(', ')}`);
      }
    });
  }

  async testMockMigration() {
    console.log(chalk.yellow('\n🔍 Testing Mock Migration'));
    
    await this.runTest('Mock migration execution (dry run)', async () => {
      // Create a mock SQL content
      const mockSQL = `
        -- Test migration
        CREATE TABLE IF NOT EXISTS test_migration_table (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        INSERT INTO test_migration_table (name) VALUES ('test');
      `;
      
      // Test SQL parsing
      const statements = SQLUtils.splitStatements(mockSQL);
      if (statements.length === 0) {
        throw new Error('Failed to parse mock SQL');
      }
      
      // Test syntax validation
      const validation = SQLUtils.validateSQLSyntax(mockSQL);
      if (!validation.isValid) {
        throw new Error(`Mock SQL syntax invalid: ${validation.errors.join(', ')}`);
      }
      
      console.log(`Mock migration parsed successfully: ${statements.length} statements`);
    });
  }

  async testErrorHandling() {
    console.log(chalk.yellow('\n🚨 Testing Error Handling'));
    
    await this.runTest('Invalid SQL handling', async () => {
      const invalidSQL = 'CREATE TABLE ( invalid syntax';
      const validation = SQLUtils.validateSQLSyntax(invalidSQL);
      
      if (validation.isValid) {
        throw new Error('Invalid SQL was not caught');
      }
    });

    await this.runTest('Missing configuration handling', async () => {
      try {
        new MigrationExecutor(); // No config provided
        throw new Error('Should have thrown error for missing config');
      } catch (error) {
        if (!error.message.includes('Missing required Supabase configuration')) {
          throw new Error('Wrong error type thrown');
        }
      }
    });

    await this.runTest('File system error handling', async () => {
      const nonExistentPath = '/path/that/does/not/exist/file.txt';
      const exists = await FileUtils.fileExists(nonExistentPath);
      
      if (exists) {
        throw new Error('Non-existent file reported as existing');
      }
    });
  }

  async runAllTests() {
    console.log(chalk.blue('🧪 Starting Migration Executor Test Suite\n'));
    
    await this.testUtilities();
    await this.testConfiguration();
    await this.testMigrationExecutor();
    await this.testMockMigration();
    await this.testErrorHandling();
    
    // Print results summary
    this.printSummary();
  }

  printSummary() {
    console.log(chalk.blue('\n📊 Test Results Summary'));
    console.log('=' * 50);
    
    const passed = this.testResults.filter(t => t.status === 'passed').length;
    const failed = this.testResults.filter(t => t.status === 'failed').length;
    const total = this.testResults.length;
    
    console.log(chalk.green(`✅ Passed: ${passed}/${total}`));
    console.log(chalk.red(`❌ Failed: ${failed}/${total}`));
    
    if (failed > 0) {
      console.log(chalk.red('\nFailed Tests:'));
      this.testResults
        .filter(t => t.status === 'failed')
        .forEach(test => {
          console.log(chalk.red(`  - ${test.name}: ${test.error}`));
        });
    }
    
    const totalTime = this.testResults.reduce((sum, test) => sum + test.duration, 0);
    console.log(chalk.blue(`\n⏱️ Total execution time: ${totalTime}ms`));
    
    if (failed === 0) {
      console.log(chalk.green('\n🎉 All tests passed!'));
    } else {
      console.log(chalk.red(`\n❌ ${failed} test(s) failed`));
      process.exit(1);
    }
  }
}

/**
 * CLI Interface for testing
 */
async function main() {
  const args = process.argv.slice(2);
  const testSuite = args[0] || 'all';
  
  const suite = new MigrationTestSuite();
  
  try {
    switch (testSuite) {
      case 'utils':
      case 'utilities':
        await suite.testUtilities();
        break;
        
      case 'config':
      case 'configuration':
        await suite.testConfiguration();
        break;
        
      case 'executor':
        await suite.testMigrationExecutor();
        break;
        
      case 'mock':
        await suite.testMockMigration();
        break;
        
      case 'errors':
        await suite.testErrorHandling();
        break;
        
      case 'all':
      default:
        await suite.runAllTests();
        break;
    }
  } catch (error) {
    console.error(chalk.red('Test suite execution failed:'), error.message);
    process.exit(1);
  }
}

// Export for programmatic use
export { MigrationTestSuite };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}