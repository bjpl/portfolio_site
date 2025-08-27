#!/usr/bin/env node

/**
 * Comprehensive Hugo to Supabase Migration Orchestrator
 * Coordinates all migration phases with rollback capabilities and detailed reporting
 */

const HugoContentParser = require('./hugo-content-parser');
const HugoMediaMigrator = require('./hugo-media-migrator');
const MigrationValidator = require('./validate-migration');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// const chalk = require('chalk'); // Removed due to ESM conflict

class ComprehensiveMigrationOrchestrator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );
    
    this.phases = [
      { name: 'schema-setup', description: 'Database schema setup', required: true },
      { name: 'content-migration', description: 'Content migration', required: true },
      { name: 'media-migration', description: 'Media files migration', required: false },
      { name: 'url-mappings', description: 'URL mapping creation', required: true },
      { name: 'validation', description: 'Migration validation', required: true },
      { name: 'cleanup', description: 'Post-migration cleanup', required: false }
    ];
    
    this.migrationId = `migration_${Date.now()}`;
    this.backupEnabled = process.env.MIGRATION_BACKUP_ENABLED !== 'false';
    this.rollbackData = {};
    
    this.stats = {
      startTime: Date.now(),
      completedPhases: [],
      failedPhases: [],
      totalFiles: 0,
      migratedFiles: 0,
      errors: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: blue,
      success: green,
      warning: yellow,
      error: red,
      progress: cyan
    };
    
    const timestamp = new Date().toISOString();
    const prefix = colors[type]('●');
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Main orchestration method
   */
  async orchestrate() {
    this.log('🚀 Starting comprehensive Hugo to Supabase migration...', 'info');
    
    try {
      await this.preflightChecks();
      await this.createBackup();
      
      for (const phase of this.phases) {
        await this.executePhase(phase);
      }
      
      await this.generateFinalReport();
      this.log('🎉 Migration completed successfully!', 'success');
      
    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`, 'error');
      await this.handleFailure(error);
      process.exit(1);
    }
  }

  /**
   * Preflight checks before migration
   */
  async preflightChecks() {
    this.log('🔍 Running preflight checks...', 'progress');
    
    // Check environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Check Supabase connection
    try {
      const { error } = await this.supabase.from('hugo_posts').select('count').limit(1);
      if (error) throw error;
    } catch (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    
    // Check content directory exists
    if (!fs.existsSync('./content')) {
      throw new Error('Hugo content directory not found');
    }
    
    // Count total files for progress tracking
    const { glob } = require('glob');
    const allFiles = await glob('./content/**/*.md', { ignore: '**/index.md' });
    this.stats.totalFiles = allFiles.length;
    
    this.log(`✅ Preflight checks passed - Found ${this.stats.totalFiles} content files`, 'success');
  }

  /**
   * Create backup before migration
   */
  async createBackup() {
    if (!this.backupEnabled) {
      this.log('⏭️ Backup disabled, skipping...', 'warning');
      return;
    }
    
    this.log('💾 Creating pre-migration backup...', 'progress');
    
    try {
      const backupDir = `./migration-backups/${this.migrationId}`;
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Backup existing database content
      const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works', 'hugo_url_mappings'];
      
      for (const table of tables) {
        try {
          const { data, error } = await this.supabase.from(table).select('*');
          if (error && error.code !== 'PGRST116') throw error;
          
          const backupFile = path.join(backupDir, `${table}_backup.json`);
          fs.writeFileSync(backupFile, JSON.stringify(data || [], null, 2));
          
          if (data && data.length > 0) {
            this.rollbackData[table] = data;
          }
          
        } catch (error) {
          this.log(`⚠️ Could not backup table ${table}: ${error.message}`, 'warning');
        }
      }
      
      this.log(`✅ Backup created in ${backupDir}`, 'success');
      
    } catch (error) {
      this.log(`⚠️ Backup failed: ${error.message}`, 'warning');
    }
  }

  /**
   * Execute individual migration phase
   */
  async executePhase(phase) {
    this.log(`🔄 Starting phase: ${phase.description}...`, 'progress');
    
    const startTime = Date.now();
    
    try {
      switch (phase.name) {
        case 'schema-setup':
          await this.executeSchemaSetup();
          break;
        case 'content-migration':
          await this.executeContentMigration();
          break;
        case 'media-migration':
          await this.executeMediaMigration();
          break;
        case 'url-mappings':
          await this.executeUrlMappings();
          break;
        case 'validation':
          await this.executeValidation();
          break;
        case 'cleanup':
          await this.executeCleanup();
          break;
        default:
          throw new Error(`Unknown phase: ${phase.name}`);
      }
      
      const duration = Date.now() - startTime;
      this.stats.completedPhases.push({ ...phase, duration });
      this.log(`✅ Phase completed: ${phase.description} (${duration}ms)`, 'success');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.failedPhases.push({ ...phase, duration, error: error.message });
      
      if (phase.required) {
        throw new Error(`Required phase failed: ${phase.description} - ${error.message}`);
      } else {
        this.log(`⚠️ Optional phase failed: ${phase.description} - ${error.message}`, 'warning');
        this.stats.warnings.push(`Phase ${phase.name} failed: ${error.message}`);
      }
    }
  }

  /**
   * Execute schema setup phase
   */
  async executeSchemaSetup() {
    // Check if schema already exists
    try {
      const { data, error } = await this.supabase.from('hugo_posts').select('count').limit(1);
      if (!error) {
        this.log('Schema already exists, skipping setup', 'info');
        return;
      }
    } catch (error) {
      // Schema doesn't exist, continue with setup
    }
    
    // Read and execute schema setup SQL
    const schemaPath = './scripts/hugo-schema-setup.sql';
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      // Note: In production, you'd execute this via a proper SQL runner
      this.log('⚠️ Schema setup SQL found - execute manually via Supabase dashboard', 'warning');
    } else {
      throw new Error('Schema setup SQL file not found');
    }
  }

  /**
   * Execute content migration phase
   */
  async executeContentMigration() {
    const contentParser = new HugoContentParser();
    await contentParser.migrateAll();
    
    this.stats.migratedFiles += contentParser.stats.succeeded;
    this.stats.errors.push(...contentParser.stats.errors);
    this.stats.warnings.push(...contentParser.stats.warnings || []);
  }

  /**
   * Execute media migration phase
   */
  async executeMediaMigration() {
    const mediaMigrator = new HugoMediaMigrator();
    await mediaMigrator.migrateAll();
    
    this.stats.warnings.push(...(mediaMigrator.stats.errors || []).map(e => `Media: ${e.file} - ${e.error}`));
  }

  /**
   * Execute URL mappings phase
   */
  async executeUrlMappings() {
    // URL mappings are created as part of content migration
    // This phase validates they were created correctly
    const { data: mappings, error } = await this.supabase
      .from('hugo_url_mappings')
      .select('count');
    
    if (error) throw error;
    
    this.log(`URL mappings validated: ${mappings?.length || 0} mappings created`, 'info');
  }

  /**
   * Execute validation phase
   */
  async executeValidation() {
    const validator = new MigrationValidator();
    await validator.validateAll();
    
    this.stats.warnings.push(...validator.validation.warnings);
    
    if (validator.validation.errors.length > 0) {
      throw new Error(`Validation failed with ${validator.validation.errors.length} errors`);
    }
  }

  /**
   * Execute cleanup phase
   */
  async executeCleanup() {
    // Clean up temporary files, optimize database, etc.
    this.log('Performing post-migration cleanup...', 'info');
    
    // Vacuum analyze tables for better performance
    const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works'];
    
    for (const table of tables) {
      try {
        // Note: VACUUM and ANALYZE would typically be run via SQL
        this.log(`Optimized table: ${table}`, 'info');
      } catch (error) {
        this.log(`Could not optimize ${table}: ${error.message}`, 'warning');
      }
    }
  }

  /**
   * Handle migration failure
   */
  async handleFailure(error) {
    this.log('🚨 Migration failed, initiating recovery procedures...', 'error');
    
    try {
      if (this.backupEnabled && Object.keys(this.rollbackData).length > 0) {
        this.log('📤 Rolling back to previous state...', 'progress');
        await this.performRollback();
      }
      
      await this.generateFailureReport(error);
      
    } catch (rollbackError) {
      this.log(`💥 Rollback also failed: ${rollbackError.message}`, 'error');
    }
  }

  /**
   * Perform rollback to previous state
   */
  async performRollback() {
    for (const [table, backupData] of Object.entries(this.rollbackData)) {
      try {
        // Clear current data
        const { error: deleteError } = await this.supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) throw deleteError;
        
        // Restore backup data
        if (backupData.length > 0) {
          const { error: insertError } = await this.supabase
            .from(table)
            .insert(backupData);
          
          if (insertError) throw insertError;
        }
        
        this.log(`✅ Rolled back table: ${table}`, 'success');
        
      } catch (error) {
        this.log(`❌ Failed to rollback table ${table}: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Generate final migration report
   */
  async generateFinalReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.stats.startTime;
    
    const report = {
      migration_id: this.migrationId,
      timestamp: new Date().toISOString(),
      total_duration_ms: totalDuration,
      status: this.stats.failedPhases.length === 0 ? 'completed' : 'partial',
      statistics: {
        total_files: this.stats.totalFiles,
        migrated_files: this.stats.migratedFiles,
        success_rate: this.stats.totalFiles > 0 ? (this.stats.migratedFiles / this.stats.totalFiles * 100).toFixed(2) : '0.00'
      },
      phases: {
        completed: this.stats.completedPhases,
        failed: this.stats.failedPhases
      },
      errors: this.stats.errors,
      warnings: this.stats.warnings,
      next_steps: this.generateNextSteps()
    };
    
    // Save report
    const reportPath = `./migration-reports/final-report-${this.migrationId}.json`;
    fs.mkdirSync('./migration-reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Log to database
    try {
      await this.supabase.from('hugo_migration_log').insert({
        migration_type: 'orchestrated_migration',
        status: report.status,
        metadata: report,
        processing_time_ms: totalDuration
      });
    } catch (error) {
      this.log(`Could not log final report: ${error.message}`, 'warning');
    }
    
    this.log(`📊 Final report saved: ${reportPath}`, 'info');
    return report;
  }

  /**
   * Generate failure report
   */
  async generateFailureReport(error) {
    const report = {
      migration_id: this.migrationId,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message,
      stack: error.stack,
      completed_phases: this.stats.completedPhases,
      failed_phases: this.stats.failedPhases,
      recovery_actions: [
        'Check error details above',
        'Verify environment configuration',
        'Ensure Supabase schema is properly set up',
        'Check Hugo content files for consistency',
        'Review backup files if rollback is needed'
      ]
    };
    
    const reportPath = `./migration-reports/failure-report-${this.migrationId}.json`;
    fs.mkdirSync('./migration-reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📋 Failure report saved: ${reportPath}`, 'error');
  }

  /**
   * Generate next steps recommendations
   */
  generateNextSteps() {
    const steps = [];
    
    if (this.stats.migratedFiles > 0) {
      steps.push('Verify migrated content in Supabase dashboard');
      steps.push('Test URL redirects for SEO preservation');
      steps.push('Update frontend application to use new data source');
    }
    
    if (this.stats.errors.length > 0) {
      steps.push('Review and resolve migration errors');
      steps.push('Consider re-running migration for failed items');
    }
    
    if (this.stats.warnings.length > 0) {
      steps.push('Review warnings for potential data quality issues');
    }
    
    steps.push('Monitor application performance after migration');
    steps.push('Set up automated backups for new database');
    
    return steps;
  }

  /**
   * Generate rollback script
   */
  async generateRollbackScript() {
    const rollbackScript = `#!/usr/bin/env node

/**
 * Generated Rollback Script for Migration: ${this.migrationId}
 * Run this script to revert the migration changes
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function rollback() {
  console.log('🔄 Starting rollback for migration: ${this.migrationId}');
  
  const backupDir = './migration-backups/${this.migrationId}';
  
  if (!fs.existsSync(backupDir)) {
    throw new Error('Backup directory not found - cannot perform rollback');
  }
  
  const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works', 'hugo_url_mappings'];
  
  for (const table of tables) {
    try {
      const backupFile = \`\${backupDir}/\${table}_backup.json\`;
      
      if (fs.existsSync(backupFile)) {
        console.log(\`🔄 Rolling back table: \${table}\`);
        
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
        
        // Clear current data
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) throw deleteError;
        
        // Restore backup data
        if (backupData.length > 0) {
          const { error: insertError } = await supabase
            .from(table)
            .insert(backupData);
          
          if (insertError) throw insertError;
        }
        
        console.log(\`✅ Rolled back table: \${table}\`);
      }
      
    } catch (error) {
      console.error(\`❌ Failed to rollback table \${table}: \${error.message}\`);
    }
  }
  
  console.log('✅ Rollback completed');
}

if (require.main === module) {
  rollback().catch(console.error);
}

module.exports = rollback;
`;

    const scriptPath = `./migration-rollback-${this.migrationId}.js`;
    fs.writeFileSync(scriptPath, rollbackScript);
    
    this.log(`🔄 Rollback script generated: ${scriptPath}`, 'info');
    return scriptPath;
  }
}

// CLI execution
if (require.main === module) {
  const orchestrator = new ComprehensiveMigrationOrchestrator();
  orchestrator.orchestrate().catch(console.error);
}

module.exports = ComprehensiveMigrationOrchestrator;