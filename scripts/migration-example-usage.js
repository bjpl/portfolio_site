#!/usr/bin/env node
/**
 * Migration Executor Example Usage
 * Demonstrates how to use the migration execution system
 */

import { MigrationExecutor } from './execute-migrations.js';
import { getEnvironmentConfig } from './migration-executor-config.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example usage scenarios
 */
class MigrationExamples {
  
  /**
   * Basic migration execution
   */
  static async basicExecution() {
    console.log(chalk.blue('📋 Example 1: Basic Migration Execution'));
    
    try {
      const executor = new MigrationExecutor();
      
      console.log('1. Checking migration status...');
      const status = await executor.getStatus();
      console.log(`   - Executed: ${status.executed.length} migrations`);
      console.log(`   - Pending: ${status.pending.length} migrations`);
      
      if (status.pending.length > 0) {
        console.log('2. Executing pending migrations...');
        const result = await executor.executeAll();
        
        if (result.success) {
          console.log(chalk.green('✅ All migrations executed successfully!'));
        } else {
          console.log(chalk.red('❌ Migration execution failed'));
        }
      } else {
        console.log('✅ No pending migrations');
      }
      
    } catch (error) {
      console.error(chalk.red('Error in basic execution:'), error.message);
    }
  }

  /**
   * Custom configuration usage
   */
  static async customConfiguration() {
    console.log(chalk.blue('\n📋 Example 2: Custom Configuration'));
    
    try {
      const config = getEnvironmentConfig('production');
      
      const executor = new MigrationExecutor({
        supabaseUrl: process.env.SUPABASE_URL,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        // Custom options
        logLevel: 'debug',
        dryRun: false
      });
      
      console.log('Configuration loaded:');
      console.log(`- Environment: production`);
      console.log(`- Strict mode: ${config.strictMode}`);
      console.log(`- Debug level: ${config.debugLevel}`);
      
      // Get status without executing
      const status = await executor.getStatus();
      console.log(`Current status: ${status.executed.length} executed, ${status.pending.length} pending`);
      
    } catch (error) {
      console.error(chalk.red('Error in custom configuration:'), error.message);
    }
  }

  /**
   * Rollback operations
   */
  static async rollbackOperations() {
    console.log(chalk.blue('\n📋 Example 3: Rollback Operations'));
    
    try {
      const executor = new MigrationExecutor();
      
      console.log('1. Checking current migration status...');
      const status = await executor.getStatus();
      
      if (status.executed.length > 0) {
        console.log(`2. Rolling back last migration...`);
        
        // Rollback last migration only
        await executor.rollback(1);
        
        console.log(chalk.green('✅ Rollback completed'));
        
        // Check status again
        const newStatus = await executor.getStatus();
        console.log(`Updated status: ${newStatus.executed.length} executed, ${newStatus.pending.length} pending`);
        
      } else {
        console.log('No migrations to rollback');
      }
      
    } catch (error) {
      console.error(chalk.red('Error in rollback operations:'), error.message);
    }
  }

  /**
   * Validation and testing
   */
  static async validationExample() {
    console.log(chalk.blue('\n📋 Example 4: Validation and Testing'));
    
    try {
      const executor = new MigrationExecutor();
      
      console.log('1. Initializing executor...');
      await executor.initialize();
      
      console.log('2. Getting migration files...');
      const files = await executor.getMigrationFiles();
      
      if (files.length > 0) {
        console.log(`3. Validating ${files.length} migration files...`);
        
        for (const file of files.slice(0, 3)) { // Test first 3 files
          const isExecuted = await executor.isMigrationExecuted(file);
          console.log(`   - ${file}: ${isExecuted ? 'executed' : 'pending'}`);
          
          if (isExecuted) {
            const valid = await executor.validateMigration(file);
            console.log(`     Validation: ${valid ? 'passed' : 'failed'}`);
          }
        }
        
      } else {
        console.log('No migration files found for validation');
      }
      
    } catch (error) {
      console.error(chalk.red('Error in validation example:'), error.message);
    }
  }

  /**
   * Advanced usage with hooks
   */
  static async advancedUsageWithHooks() {
    console.log(chalk.blue('\n📋 Example 5: Advanced Usage with Hooks'));
    
    try {
      // This would be used in production with actual Claude Flow hooks
      console.log('1. Pre-task hook (simulated)...');
      // await exec('npx claude-flow@alpha hooks pre-task --description "Migration execution"');
      
      const executor = new MigrationExecutor();
      
      console.log('2. Creating backup before migration...');
      const backupId = await executor.createBackup();
      console.log(`   Backup created: ${backupId}`);
      
      console.log('3. Getting migration status...');
      const status = await executor.getStatus();
      
      console.log('4. Post-task notification (simulated)...');
      // await exec(`npx claude-flow@alpha hooks notify --message "Migration status: ${status.executed.length} executed"`);
      
      console.log('Advanced usage completed successfully');
      
    } catch (error) {
      console.error(chalk.red('Error in advanced usage:'), error.message);
    }
  }

  /**
   * Error handling demonstration
   */
  static async errorHandlingExample() {
    console.log(chalk.blue('\n📋 Example 6: Error Handling'));
    
    try {
      console.log('1. Testing with invalid configuration...');
      
      try {
        new MigrationExecutor({
          supabaseUrl: null,
          serviceKey: null
        });
      } catch (error) {
        console.log(chalk.yellow(`   Expected error caught: ${error.message}`));
      }
      
      console.log('2. Testing with valid configuration...');
      const executor = new MigrationExecutor();
      
      console.log('3. Testing connection validation...');
      // This will likely fail in demo environment, which is expected
      try {
        const status = await executor.getStatus();
        console.log(chalk.green('   Database connection successful'));
      } catch (error) {
        console.log(chalk.yellow(`   Connection test result: ${error.message}`));
      }
      
    } catch (error) {
      console.error(chalk.red('Error in error handling example:'), error.message);
    }
  }

  /**
   * Run all examples
   */
  static async runAll() {
    console.log(chalk.green('🚀 Migration Executor Usage Examples\n'));
    
    await this.basicExecution();
    await this.customConfiguration();
    // await this.rollbackOperations(); // Skip in demo to avoid side effects
    await this.validationExample();
    await this.advancedUsageWithHooks();
    await this.errorHandlingExample();
    
    console.log(chalk.green('\n✅ All examples completed!'));
    console.log(chalk.blue('\nUsage Notes:'));
    console.log('- Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
    console.log('- Run with NODE_ENV=production for production configuration');
    console.log('- Use --dry-run flag to simulate migrations without executing');
    console.log('- Check logs in the scripts directory for detailed execution info');
  }
}

/**
 * CLI Interface
 */
async function main() {
  const example = process.argv[2] || 'all';
  
  console.log(chalk.blue('Migration Executor Examples'));
  console.log(chalk.gray('=' * 40));
  
  try {
    switch (example) {
      case 'basic':
        await MigrationExamples.basicExecution();
        break;
        
      case 'config':
        await MigrationExamples.customConfiguration();
        break;
        
      case 'rollback':
        await MigrationExamples.rollbackOperations();
        break;
        
      case 'validation':
        await MigrationExamples.validationExample();
        break;
        
      case 'hooks':
        await MigrationExamples.advancedUsageWithHooks();
        break;
        
      case 'errors':
        await MigrationExamples.errorHandlingExample();
        break;
        
      case 'all':
      default:
        await MigrationExamples.runAll();
        break;
    }
    
  } catch (error) {
    console.error(chalk.red('\nExample execution failed:'), error.message);
    process.exit(1);
  }
}

// Export for programmatic use
export { MigrationExamples };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}