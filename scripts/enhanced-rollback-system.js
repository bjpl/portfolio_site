#!/usr/bin/env node

/**
 * Enhanced Rollback System for Hugo to Supabase Migration
 * Provides comprehensive rollback capabilities with multiple recovery options
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class EnhancedRollbackSystem {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.rollbackTypes = [
      'full_rollback',      // Complete rollback to pre-migration state
      'content_rollback',   // Rollback content only
      'media_rollback',     // Rollback media only
      'url_rollback',       // Rollback URL mappings only
      'selective_rollback'  // Rollback specific items
    ];
    
    this.backupDir = './migration-backups';
    this.rollbackId = `rollback_${Date.now()}`;
    
    this.stats = {
      startTime: Date.now(),
      tablesRolledBack: [],
      recordsRestored: 0,
      filesRestored: 0,
      errors: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      progress: chalk.cyan
    };
    
    const timestamp = new Date().toISOString();
    const prefix = colors[type]('●');
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Main rollback orchestrator
   */
  async executeRollback(rollbackType = 'full_rollback', options = {}) {
    this.log(`🔄 Starting ${rollbackType.replace('_', ' ')} rollback...`, 'info');
    
    try {
      await this.validateRollbackCapability();
      await this.createPreRollbackSnapshot();
      
      switch (rollbackType) {
        case 'full_rollback':
          await this.performFullRollback(options);
          break;
        case 'content_rollback':
          await this.performContentRollback(options);
          break;
        case 'media_rollback':
          await this.performMediaRollback(options);
          break;
        case 'url_rollback':
          await this.performUrlRollback(options);
          break;
        case 'selective_rollback':
          await this.performSelectiveRollback(options);
          break;
        default:
          throw new Error(`Unknown rollback type: ${rollbackType}`);
      }
      
      await this.validateRollbackResults();
      await this.generateRollbackReport();
      
      this.log('✅ Rollback completed successfully!', 'success');
      
    } catch (error) {
      this.log(`💥 Rollback failed: ${error.message}`, 'error');
      await this.handleRollbackFailure(error);
      process.exit(1);
    }
  }

  /**
   * Validate rollback capability
   */
  async validateRollbackCapability() {
    this.log('🔍 Validating rollback capability...', 'progress');
    
    // Check if backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      throw new Error(`Backup directory not found: ${this.backupDir}`);
    }
    
    // Find available backups
    const backupDirs = fs.readdirSync(this.backupDir)
      .filter(dir => dir.startsWith('migration_'))
      .sort()
      .reverse(); // Most recent first
    
    if (backupDirs.length === 0) {
      throw new Error('No migration backups found - cannot perform rollback');
    }
    
    this.latestBackupDir = path.join(this.backupDir, backupDirs[0]);
    this.log(`📦 Using backup: ${backupDirs[0]}`, 'info');
    
    // Validate backup integrity
    await this.validateBackupIntegrity();
    
    // Test database connection
    try {
      const { error } = await this.supabase.from('hugo_posts').select('count').limit(1);
      if (error) throw error;
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    this.log('✅ Rollback validation passed', 'success');
  }

  /**
   * Validate backup integrity
   */
  async validateBackupIntegrity() {
    const requiredBackupFiles = [
      'hugo_posts_backup.json',
      'hugo_projects_backup.json',
      'hugo_academic_content_backup.json',
      'hugo_creative_works_backup.json',
      'hugo_url_mappings_backup.json'
    ];
    
    const missingFiles = requiredBackupFiles.filter(file => 
      !fs.existsSync(path.join(this.latestBackupDir, file))
    );
    
    if (missingFiles.length > 0) {
      this.log(`⚠️ Missing backup files: ${missingFiles.join(', ')}`, 'warning');
    }
    
    // Validate backup file formats
    for (const file of requiredBackupFiles) {
      const filePath = path.join(this.latestBackupDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (!Array.isArray(data)) {
            throw new Error(`Invalid backup format in ${file}`);
          }
        } catch (error) {
          throw new Error(`Corrupt backup file ${file}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Create snapshot before rollback
   */
  async createPreRollbackSnapshot() {
    this.log('📸 Creating pre-rollback snapshot...', 'progress');
    
    try {
      const snapshotDir = path.join('./rollback-snapshots', this.rollbackId);
      fs.mkdirSync(snapshotDir, { recursive: true });
      
      const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works', 'hugo_url_mappings'];
      
      for (const table of tables) {
        try {
          const { data, error } = await this.supabase.from(table).select('*');
          if (error && error.code !== 'PGRST116') throw error;
          
          const snapshotFile = path.join(snapshotDir, `${table}_pre_rollback.json`);
          fs.writeFileSync(snapshotFile, JSON.stringify(data || [], null, 2));
          
        } catch (error) {
          this.log(`⚠️ Could not snapshot table ${table}: ${error.message}`, 'warning');
        }
      }
      
      this.log(`✅ Pre-rollback snapshot saved to ${snapshotDir}`, 'success');
      
    } catch (error) {
      this.log(`⚠️ Snapshot creation failed: ${error.message}`, 'warning');
    }
  }

  /**
   * Perform full rollback to pre-migration state
   */
  async performFullRollback(options) {
    this.log('🔄 Performing full rollback...', 'progress');
    
    const tables = [
      'hugo_url_mappings',
      'hugo_creative_works', 
      'hugo_academic_content',
      'hugo_projects',
      'hugo_posts'
    ]; // Order matters for foreign key constraints
    
    for (const table of tables) {
      await this.rollbackTable(table);
    }
    
    // Clear migration logs if requested
    if (options.clearLogs) {
      await this.clearMigrationLogs();
    }
    
    // Rollback media files
    await this.rollbackMediaFiles();
  }

  /**
   * Perform content-only rollback
   */
  async performContentRollback(options) {
    this.log('📝 Performing content rollback...', 'progress');
    
    const contentTables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works'];
    
    for (const table of contentTables) {
      await this.rollbackTable(table);
    }
  }

  /**
   * Perform media-only rollback
   */
  async performMediaRollback(options) {
    this.log('📸 Performing media rollback...', 'progress');
    
    // Clear media migration records
    try {
      const { error } = await this.supabase
        .from('hugo_media_migration')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
    } catch (error) {
      this.log(`⚠️ Could not clear media migration records: ${error.message}`, 'warning');
    }
    
    // Delete files from Supabase Storage
    await this.rollbackMediaFiles();
  }

  /**
   * Perform URL mappings rollback
   */
  async performUrlRollback(options) {
    this.log('🔗 Performing URL mappings rollback...', 'progress');
    
    await this.rollbackTable('hugo_url_mappings');
  }

  /**
   * Perform selective rollback
   */
  async performSelectiveRollback(options) {
    this.log('🎯 Performing selective rollback...', 'progress');
    
    const { tables = [], records = [], files = [] } = options;
    
    // Rollback specific tables
    for (const table of tables) {
      await this.rollbackTable(table);
    }
    
    // Rollback specific records
    for (const record of records) {
      await this.rollbackSpecificRecord(record.table, record.id);
    }
    
    // Rollback specific files
    for (const file of files) {
      await this.rollbackSpecificFile(file);
    }
  }

  /**
   * Rollback specific table
   */
  async rollbackTable(tableName) {
    this.log(`🔄 Rolling back table: ${tableName}`, 'progress');
    
    try {
      const backupFile = path.join(this.latestBackupDir, `${tableName}_backup.json`);
      
      if (!fs.existsSync(backupFile)) {
        this.log(`⚠️ No backup found for table ${tableName}`, 'warning');
        return;
      }
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      
      // Clear current data
      const { error: deleteError } = await this.supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) throw deleteError;
      
      // Restore backup data in batches
      if (backupData.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < backupData.length; i += batchSize) {
          const batch = backupData.slice(i, i + batchSize);
          
          const { error: insertError } = await this.supabase
            .from(tableName)
            .insert(batch);
          
          if (insertError) throw insertError;
        }
      }
      
      this.stats.tablesRolledBack.push(tableName);
      this.stats.recordsRestored += backupData.length;
      
      this.log(`✅ Rolled back table ${tableName}: ${backupData.length} records restored`, 'success');
      
    } catch (error) {
      this.stats.errors.push(`Table rollback failed for ${tableName}: ${error.message}`);
      throw new Error(`Failed to rollback table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Rollback specific record
   */
  async rollbackSpecificRecord(tableName, recordId) {
    this.log(`🎯 Rolling back specific record: ${tableName}[${recordId}]`, 'progress');
    
    try {
      const backupFile = path.join(this.latestBackupDir, `${tableName}_backup.json`);
      
      if (!fs.existsSync(backupFile)) {
        throw new Error(`No backup found for table ${tableName}`);
      }
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      const recordBackup = backupData.find(record => record.id === recordId);
      
      if (!recordBackup) {
        throw new Error(`Record ${recordId} not found in backup`);
      }
      
      // Delete current version
      const { error: deleteError } = await this.supabase
        .from(tableName)
        .delete()
        .eq('id', recordId);
      
      if (deleteError) throw deleteError;
      
      // Restore backup version
      const { error: insertError } = await this.supabase
        .from(tableName)
        .insert(recordBackup);
      
      if (insertError) throw insertError;
      
      this.log(`✅ Restored record ${tableName}[${recordId}]`, 'success');
      
    } catch (error) {
      this.stats.errors.push(`Record rollback failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rollback media files from Supabase Storage
   */
  async rollbackMediaFiles() {
    this.log('📸 Rolling back media files from storage...', 'progress');
    
    try {
      // Get list of migrated media files
      const { data: mediaFiles, error } = await this.supabase
        .from('hugo_media_migration')
        .select('*')
        .eq('migration_status', 'completed');
      
      if (error) throw error;
      
      if (!mediaFiles || mediaFiles.length === 0) {
        this.log('No migrated media files found', 'info');
        return;
      }
      
      const bucket = 'portfolio-media';
      let deletedCount = 0;
      
      // Delete files in batches
      for (const mediaFile of mediaFiles) {
        try {
          const filePath = mediaFile.supabase_url.split(`/${bucket}/`)[1];
          if (filePath) {
            const { error: deleteError } = await this.supabase.storage
              .from(bucket)
              .remove([filePath]);
            
            if (!deleteError) {
              deletedCount++;
            }
          }
        } catch (error) {
          this.log(`⚠️ Could not delete media file: ${mediaFile.original_path}`, 'warning');
        }
      }
      
      this.stats.filesRestored = deletedCount;
      this.log(`✅ Deleted ${deletedCount} media files from storage`, 'success');
      
    } catch (error) {
      this.log(`⚠️ Media rollback failed: ${error.message}`, 'warning');
      this.stats.warnings.push(`Media rollback failed: ${error.message}`);
    }
  }

  /**
   * Clear migration logs
   */
  async clearMigrationLogs() {
    this.log('📝 Clearing migration logs...', 'progress');
    
    try {
      const { error } = await this.supabase
        .from('hugo_migration_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      
      this.log('✅ Migration logs cleared', 'success');
      
    } catch (error) {
      this.log(`⚠️ Could not clear migration logs: ${error.message}`, 'warning');
    }
  }

  /**
   * Validate rollback results
   */
  async validateRollbackResults() {
    this.log('🔍 Validating rollback results...', 'progress');
    
    try {
      const results = {};
      
      for (const tableName of this.stats.tablesRolledBack) {
        const { count, error } = await this.supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        results[tableName] = count || 0;
      }
      
      this.log(`✅ Rollback validation completed:`, 'success');
      Object.entries(results).forEach(([table, count]) => {
        this.log(`  ${table}: ${count} records`, 'info');
      });
      
    } catch (error) {
      this.log(`⚠️ Rollback validation failed: ${error.message}`, 'warning');
    }
  }

  /**
   * Generate rollback report
   */
  async generateRollbackReport() {
    const endTime = Date.now();
    const duration = endTime - this.stats.startTime;
    
    const report = {
      rollback_id: this.rollbackId,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      duration_seconds: Math.round(duration / 1000),
      backup_used: path.basename(this.latestBackupDir),
      statistics: {
        tables_rolled_back: this.stats.tablesRolledBack.length,
        records_restored: this.stats.recordsRestored,
        files_restored: this.stats.filesRestored
      },
      tables_affected: this.stats.tablesRolledBack,
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      success: this.stats.errors.length === 0
    };
    
    // Save report
    const reportPath = `./rollback-reports/rollback-report-${this.rollbackId}.json`;
    fs.mkdirSync('./rollback-reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 Rollback report saved: ${reportPath}`, 'info');
    
    // Print summary
    this.log('\n📊 ROLLBACK SUMMARY', 'info');
    this.log('==========================================', 'info');
    this.log(`Duration: ${Math.round(duration / 1000)} seconds`, 'info');
    this.log(`Tables rolled back: ${this.stats.tablesRolledBack.length}`, 'info');
    this.log(`Records restored: ${this.stats.recordsRestored}`, 'info');
    this.log(`Files restored: ${this.stats.filesRestored}`, 'info');
    this.log(`Errors: ${this.stats.errors.length}`, this.stats.errors.length > 0 ? 'error' : 'success');
    this.log(`Warnings: ${this.stats.warnings.length}`, this.stats.warnings.length > 0 ? 'warning' : 'info');
    
    return report;
  }

  /**
   * Handle rollback failure
   */
  async handleRollbackFailure(error) {
    this.log('🚨 Handling rollback failure...', 'error');
    
    const failureReport = {
      rollback_id: this.rollbackId,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      partial_completion: {
        tables_completed: this.stats.tablesRolledBack,
        records_restored: this.stats.recordsRestored
      },
      recovery_recommendations: [
        'Check error details above for specific issues',
        'Verify database connection and permissions',
        'Ensure backup files are not corrupted',
        'Consider manual rollback of specific components',
        'Contact system administrator if issues persist'
      ]
    };
    
    const reportPath = `./rollback-reports/rollback-failure-${this.rollbackId}.json`;
    fs.mkdirSync('./rollback-reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(failureReport, null, 2));
    
    this.log(`📋 Failure report saved: ${reportPath}`, 'error');
  }

  /**
   * Interactive rollback menu
   */
  async interactiveRollback() {
    console.log(chalk.blue('\n🔄 Interactive Rollback Menu'));
    console.log('================================');
    
    // This would normally use a CLI library like inquirer for interactive prompts
    // For now, showing the structure
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      console.log('\nAvailable rollback options:');
      console.log('1. Full rollback (complete restoration)');
      console.log('2. Content rollback (content tables only)');
      console.log('3. Media rollback (media files only)');
      console.log('4. URL rollback (URL mappings only)');
      console.log('5. Selective rollback (custom selection)');
      console.log('6. Exit');
      
      rl.question('\nSelect rollback type (1-6): ', (answer) => {
        rl.close();
        
        const options = {};
        switch (answer.trim()) {
          case '1':
            resolve(this.executeRollback('full_rollback', options));
            break;
          case '2':
            resolve(this.executeRollback('content_rollback', options));
            break;
          case '3':
            resolve(this.executeRollback('media_rollback', options));
            break;
          case '4':
            resolve(this.executeRollback('url_rollback', options));
            break;
          case '5':
            // Would normally gather selective options here
            resolve(this.executeRollback('selective_rollback', options));
            break;
          case '6':
            console.log('Rollback cancelled.');
            process.exit(0);
            break;
          default:
            console.log('Invalid selection. Exiting.');
            process.exit(1);
        }
      });
    });
  }
}

// CLI execution
if (require.main === module) {
  const rollbackSystem = new EnhancedRollbackSystem();
  
  const args = process.argv.slice(2);
  const rollbackType = args[0] || 'interactive';
  const options = {};
  
  // Parse command line options
  if (args.includes('--clear-logs')) options.clearLogs = true;
  if (args.includes('--selective')) {
    options.tables = args.filter((arg, index) => args[index - 1] === '--tables');
  }
  
  if (rollbackType === 'interactive') {
    rollbackSystem.interactiveRollback().catch(console.error);
  } else {
    rollbackSystem.executeRollback(rollbackType, options).catch(console.error);
  }
}

module.exports = EnhancedRollbackSystem;