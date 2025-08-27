#!/usr/bin/env node

/**
 * Migration CLI Tool
 * Command-line interface for Hugo to Supabase migration operations
 */

const { Command } = require('commander');
// Remove chalk for now - use console colors directly
const fs = require('fs');
const path = require('path');

// Import migration modules
const ComprehensiveMigrationOrchestrator = require('./comprehensive-migration-orchestrator');
const HugoContentParser = require('./hugo-content-parser');
const HugoMediaMigrator = require('./hugo-media-migrator');
const MigrationValidator = require('./validate-migration');
const MigrationReportGenerator = require('./migration-report-generator');
const EnhancedRollbackSystem = require('./enhanced-rollback-system');

const program = new Command();

// Global configuration
program
  .name('migration-cli')
  .description('Hugo to Supabase Migration Tool')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--dry-run', 'Perform dry run without making changes')
  .option('--config <file>', 'Configuration file path', './migration.config.json');

/**
 * Initialize migration environment
 */
program
  .command('init')
  .description('Initialize migration environment and configuration')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      console.log(blue('🚀 Initializing migration environment...'));
      
      // Create directory structure
      const directories = [
        './migration-backups',
        './migration-reports',
        './rollback-reports',
        './rollback-snapshots'
      ];
      
      directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(green(`✅ Created directory: ${dir}`));
        }
      });
      
      // Create default configuration
      const configPath = './migration.config.json';
      const defaultConfig = {
        migration: {
          batch_size: 10,
          parallel_processing: true,
          backup_enabled: true,
          validate_after_migration: true,
          retry_failed_items: true,
          max_retries: 3
        },
        content: {
          preserve_hugo_structure: true,
          extract_frontmatter: true,
          process_shortcodes: true,
          handle_multilingual: true
        },
        media: {
          supported_formats: ['.jpg', '.png', '.gif', '.pdf', '.mp4'],
          max_file_size_mb: 50,
          optimize_images: false,
          create_thumbnails: false
        },
        urls: {
          preserve_seo_urls: true,
          redirect_type: 301,
          generate_sitemap: true
        },
        storage: {
          bucket_name: 'portfolio-media',
          cdn_enabled: false,
          compression_enabled: true
        }
      };
      
      if (!fs.existsSync(configPath) || options.force) {
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(green(`✅ Created configuration: ${configPath}`));
      } else {
        console.log(yellow(`⚠️ Configuration already exists: ${configPath}`));
      }
      
      // Check environment variables
      const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.log(red('❌ Missing required environment variables:'));
        missingVars.forEach(varName => {
          console.log(red(`   ${varName}`));
        });
        console.log(yellow('💡 Set these in your .env file or environment'));
      } else {
        console.log(green('✅ Environment variables configured'));
      }
      
      console.log(blue('\\n🎉 Migration environment initialized!'));
      console.log(gray('Next steps:'));
      console.log(gray('1. Review configuration in migration.config.json'));
      console.log(gray('2. Ensure environment variables are set'));
      console.log(gray('3. Run: migration-cli migrate --type full'));
      
    } catch (error) {
      console.error(red('💥 Initialization failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Run complete migration
 */
program
  .command('migrate')
  .description('Execute migration process')
  .option('--type <type>', 'Migration type: full, content, media, urls', 'full')
  .option('--skip-backup', 'Skip backup creation')
  .option('--skip-validation', 'Skip post-migration validation')
  .action(async (options) => {
    try {
      console.log(blue(`🚀 Starting ${options.type} migration...`));
      
      const orchestrator = new ComprehensiveMigrationOrchestrator();
      
      // Override options if provided
      if (options.skipBackup) {
        process.env.MIGRATION_BACKUP_ENABLED = 'false';
      }
      
      await orchestrator.orchestrate();
      
    } catch (error) {
      console.error(red('💥 Migration failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Run content migration only
 */
program
  .command('content')
  .description('Migrate content files only')
  .option('--path <path>', 'Specific content path to migrate')
  .option('--type <type>', 'Content type: blog, projects, academic, creative')
  .action(async (options) => {
    try {
      console.log(blue('📝 Starting content migration...'));
      
      const parser = new HugoContentParser();
      
      if (options.type) {
        switch (options.type) {
          case 'blog':
            await parser.migrateBlogPosts();
            break;
          case 'projects':
            await parser.migratePortfolioProjects();
            break;
          case 'academic':
            await parser.migrateAcademicContent();
            break;
          case 'creative':
            await parser.migrateCreativeWorks();
            break;
          default:
            throw new Error(`Unknown content type: ${options.type}`);
        }
      } else {
        await parser.migrateAll();
      }
      
    } catch (error) {
      console.error(red('💥 Content migration failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Run media migration only
 */
program
  .command('media')
  .description('Migrate media files only')
  .option('--category <category>', 'Media category: images, videos, documents')
  .option('--batch-size <size>', 'Batch size for processing', '5')
  .action(async (options) => {
    try {
      console.log(blue('📸 Starting media migration...'));
      
      const migrator = new HugoMediaMigrator();
      await migrator.migrateAll();
      
    } catch (error) {
      console.error(red('💥 Media migration failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Validate migration
 */
program
  .command('validate')
  .description('Validate migration results')
  .option('--type <type>', 'Validation type: all, content, media, urls', 'all')
  .option('--fix', 'Attempt to fix discovered issues')
  .action(async (options) => {
    try {
      console.log(blue('🔍 Starting migration validation...'));
      
      const validator = new MigrationValidator();
      await validator.validateAll();
      
      if (options.fix && validator.validation.errors.length > 0) {
        console.log(yellow('🔧 Attempting to fix issues...'));
        // Add fix logic here
      }
      
    } catch (error) {
      console.error(red('💥 Validation failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Generate reports
 */
program
  .command('report')
  .description('Generate migration reports')
  .option('--type <type>', 'Report type: summary, detailed, visual', 'summary')
  .option('--output <format>', 'Output format: json, html, txt', 'json')
  .action(async (options) => {
    try {
      console.log(blue('📊 Generating migration report...'));
      
      const generator = new MigrationReportGenerator();
      await generator.generateReport();
      
    } catch (error) {
      console.error(red('💥 Report generation failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Rollback operations
 */
program
  .command('rollback')
  .description('Rollback migration changes')
  .option('--type <type>', 'Rollback type: full, content, media, urls, selective', 'interactive')
  .option('--backup <id>', 'Specific backup ID to restore from')
  .option('--tables <tables>', 'Comma-separated list of tables for selective rollback')
  .option('--confirm', 'Skip confirmation prompts')
  .action(async (options) => {
    try {
      if (!options.confirm && options.type !== 'interactive') {
        console.log(yellow('⚠️ This will rollback migration changes. Use --confirm to proceed.'));
        return;
      }
      
      console.log(blue('🔄 Starting rollback process...'));
      
      const rollbackSystem = new EnhancedRollbackSystem();
      
      const rollbackOptions = {};
      if (options.tables) {
        rollbackOptions.tables = options.tables.split(',').map(t => t.trim());
      }
      
      if (options.type === 'interactive') {
        await rollbackSystem.interactiveRollback();
      } else {
        await rollbackSystem.executeRollback(options.type, rollbackOptions);
      }
      
    } catch (error) {
      console.error(red('💥 Rollback failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Status and monitoring
 */
program
  .command('status')
  .description('Show migration status and statistics')
  .option('--detailed', 'Show detailed statistics')
  .action(async (options) => {
    try {
      console.log(blue('📊 Migration Status'));
      console.log('===================\\n');
      
      // This would check current migration state
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
      );
      
      const tables = ['hugo_posts', 'hugo_projects', 'hugo_academic_content', 'hugo_creative_works'];
      
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error && error.code !== 'PGRST116') throw error;
          
          const displayName = table.replace('hugo_', '').replace('_', ' ');
          console.log(green(`✅ ${displayName}: ${count || 0} records`));
          
        } catch (error) {
          const displayName = table.replace('hugo_', '').replace('_', ' ');
          console.log(red(`❌ ${displayName}: Error - ${error.message}`));
        }
      }
      
      // Check for recent migration logs
      try {
        const { data: logs, error } = await supabase
          .from('hugo_migration_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!error && logs && logs.length > 0) {
          console.log('\\n📝 Recent Migration Activity:');
          logs.forEach(log => {
            const time = new Date(log.created_at).toLocaleString();
            const status = log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '⏳';
            console.log(`  ${status} ${log.migration_type} - ${time}`);
          });
        }
        
      } catch (error) {
        console.log(gray('No migration logs available'));
      }
      
    } catch (error) {
      console.error(red('💥 Status check failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Cleanup operations
 */
program
  .command('cleanup')
  .description('Clean up migration files and temporary data')
  .option('--backups', 'Clean old backup files')
  .option('--reports', 'Clean old report files')
  .option('--logs', 'Clean migration logs')
  .option('--days <days>', 'Keep files newer than N days', '30')
  .action(async (options) => {
    try {
      console.log(blue('🧹 Starting cleanup process...'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(options.days));
      
      let cleanedCount = 0;
      
      if (options.backups && fs.existsSync('./migration-backups')) {
        const backupDirs = fs.readdirSync('./migration-backups');
        for (const dir of backupDirs) {
          const dirPath = path.join('./migration-backups', dir);
          const stats = fs.statSync(dirPath);
          
          if (stats.mtime < cutoffDate) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(yellow(`🗑️ Removed old backup: ${dir}`));
            cleanedCount++;
          }
        }
      }
      
      if (options.reports && fs.existsSync('./migration-reports')) {
        const reportFiles = fs.readdirSync('./migration-reports');
        for (const file of reportFiles) {
          const filePath = path.join('./migration-reports', file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            console.log(yellow(`🗑️ Removed old report: ${file}`));
            cleanedCount++;
          }
        }
      }
      
      if (options.logs) {
        try {
          const { createClient } = require('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
          );
          
          const { error } = await supabase
            .from('hugo_migration_log')
            .delete()
            .lt('created_at', cutoffDate.toISOString());
          
          if (!error) {
            console.log(yellow('🗑️ Cleaned old migration logs'));
            cleanedCount++;
          }
          
        } catch (error) {
          console.log(red(`❌ Could not clean logs: ${error.message}`));
        }
      }
      
      console.log(green(`\\n✅ Cleanup completed: ${cleanedCount} items removed`));
      
    } catch (error) {
      console.error(red('💥 Cleanup failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Help and documentation
 */
program
  .command('docs')
  .description('Open migration documentation')
  .action(() => {
    console.log(blue('📚 Hugo to Supabase Migration Documentation'));
    console.log('==========================================\\n');
    
    console.log(yellow('Quick Start:'));
    console.log('  1. migration-cli init          # Initialize environment');
    console.log('  2. migration-cli migrate       # Run full migration');
    console.log('  3. migration-cli validate      # Validate results');
    console.log('  4. migration-cli report        # Generate report\\n');
    
    console.log(yellow('Common Commands:'));
    console.log('  migration-cli status           # Check current status');
    console.log('  migration-cli content          # Migrate content only');
    console.log('  migration-cli media            # Migrate media only');
    console.log('  migration-cli rollback         # Interactive rollback\\n');
    
    console.log(yellow('Advanced Usage:'));
    console.log('  migration-cli migrate --type content');
    console.log('  migration-cli rollback --type selective --tables hugo_posts');
    console.log('  migration-cli cleanup --backups --days 7\\n');
    
    console.log(gray('For detailed help: migration-cli <command> --help'));
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}