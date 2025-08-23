/**
 * Database Module Entry Point
 * Main interface for the portfolio site database system
 */

const config = require('./config/database.config');
const logger = require('./utils/logger');
const { databaseManager, connect, disconnect, getClient } = require('./utils/prisma');
const { performHealthCheck } = require('./utils/health-check');
const { backupManager } = require('./utils/backup');
const { seed, rollback, status } = require('./seeds/seed');

class PortfolioDatabase {
  constructor() {
    this.isInitialized = false;
    this.client = null;
    this.config = config;
  }

  /**
   * Initialize the database system
   */
  async initialize(options = {}) {
    const {
      autoMigrate = false,
      autoSeed = false,
      startBackupSchedule = config.backup.enabled
    } = options;

    try {
      logger.info('Initializing Portfolio Database System...');

      // Connect to database
      this.client = await connect();
      
      // Run migrations if requested
      if (autoMigrate) {
        await this.migrate();
      }

      // Seed database if requested
      if (autoSeed) {
        await this.seedDatabase();
      }

      // Initialize backup system
      if (startBackupSchedule) {
        await backupManager.initialize();
      }

      // Perform initial health check
      const health = await performHealthCheck();
      logger.info('Initial health check completed:', {
        status: health.overall,
        duration: health.checkDuration
      });

      this.isInitialized = true;
      logger.info('Portfolio Database System initialized successfully');

      return {
        success: true,
        client: this.client,
        health: health.overall,
        config: this.getPublicConfig()
      };

    } catch (error) {
      logger.error('Failed to initialize database system:', error);
      throw error;
    }
  }

  /**
   * Get database client
   */
  getClient() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return getClient();
  }

  /**
   * Check if database is ready
   */
  async isReady() {
    try {
      if (!this.isInitialized) return false;
      const health = await performHealthCheck();
      return health.overall === 'healthy' || health.overall === 'healthy_with_warnings';
    } catch (error) {
      return false;
    }
  }

  /**
   * Run database migrations
   */
  async migrate(options = {}) {
    const { 
      environment = config.environment,
      force = false 
    } = options;

    try {
      logger.info(`Running database migrations for ${environment}...`);

      if (environment === 'production' && force) {
        throw new Error('Force migrations not allowed in production');
      }

      // For Prisma, we would use prisma migrate deploy or prisma db push
      // This is a placeholder for the actual migration logic
      const { spawn } = require('child_process');
      
      const migrateCommand = environment === 'production' 
        ? 'prisma migrate deploy'
        : 'prisma migrate dev';

      return new Promise((resolve, reject) => {
        const migration = spawn('npx', migrateCommand.split(' '), {
          cwd: __dirname,
          stdio: 'pipe'
        });

        let output = '';
        let errors = '';

        migration.stdout.on('data', (data) => {
          output += data.toString();
        });

        migration.stderr.on('data', (data) => {
          errors += data.toString();
        });

        migration.on('close', (code) => {
          if (code === 0) {
            logger.info('Migrations completed successfully');
            resolve({ success: true, output });
          } else {
            logger.error('Migration failed:', errors);
            reject(new Error(`Migration failed with code ${code}: ${errors}`));
          }
        });
      });

    } catch (error) {
      logger.error('Migration error:', error);
      throw error;
    }
  }

  /**
   * Seed database with initial data
   */
  async seedDatabase(options = {}) {
    try {
      logger.info('Seeding database...');
      const result = await seed(options);
      logger.info('Database seeding completed:', result);
      return result;
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Get database status and metrics
   */
  async getStatus() {
    try {
      const [health, seedStatus, backupStatus] = await Promise.all([
        performHealthCheck(),
        status(),
        this.getBackupStatus()
      ]);

      return {
        health: {
          overall: health.overall,
          checks: Object.keys(health.checks).reduce((acc, key) => {
            acc[key] = health.checks[key].status;
            return acc;
          }, {}),
          metrics: health.metrics,
          warnings: health.warnings.length,
          lastCheck: health.timestamp
        },
        seeding: seedStatus,
        backup: backupStatus,
        connection: {
          provider: config.database.primary.provider,
          environment: config.environment,
          connected: this.isInitialized
        },
        uptime: this.getUptime()
      };
    } catch (error) {
      logger.error('Error getting database status:', error);
      return {
        error: error.message,
        connected: false
      };
    }
  }

  /**
   * Get backup status
   */
  async getBackupStatus() {
    try {
      const backups = await backupManager.listBackups();
      return {
        enabled: config.backup.enabled,
        scheduled: backupManager.isScheduled,
        totalBackups: backups.length,
        latestBackup: backups[0] || null,
        retention: config.backup.retention
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  /**
   * Create manual backup
   */
  async createBackup(options = {}) {
    try {
      logger.info('Creating manual database backup...');
      const result = await backupManager.createBackup(options);
      logger.info('Manual backup completed:', result.name);
      return result;
    } catch (error) {
      logger.error('Manual backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupPath, options = {}) {
    try {
      logger.info(`Restoring database from backup: ${backupPath}`);
      const result = await backupManager.restoreBackup(backupPath, options);
      logger.info('Database restore completed');
      return result;
    } catch (error) {
      logger.error('Database restore failed:', error);
      throw error;
    }
  }

  /**
   * Perform maintenance tasks
   */
  async performMaintenance(tasks = []) {
    const results = {};
    
    try {
      logger.info('Starting database maintenance tasks...');

      // Default maintenance tasks
      const defaultTasks = [
        'health_check',
        'cleanup_old_sessions',
        'update_statistics',
        'vacuum_analyze'
      ];

      const tasksToRun = tasks.length > 0 ? tasks : defaultTasks;

      for (const task of tasksToRun) {
        try {
          logger.info(`Running maintenance task: ${task}`);
          results[task] = await this.runMaintenanceTask(task);
        } catch (error) {
          logger.error(`Maintenance task failed: ${task}`, error);
          results[task] = { error: error.message };
        }
      }

      logger.info('Database maintenance completed:', results);
      return results;

    } catch (error) {
      logger.error('Database maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Run individual maintenance task
   */
  async runMaintenanceTask(task) {
    const client = getClient();

    switch (task) {
      case 'health_check':
        return await performHealthCheck();

      case 'cleanup_old_sessions':
        const deletedSessions = await client.userSession.deleteMany({
          where: {
            expiresAt: {
              lt: new Date()
            }
          }
        });
        return { deletedSessions: deletedSessions.count };

      case 'cleanup_old_activities':
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

        const deletedActivities = await client.userActivity.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        });
        return { deletedActivities: deletedActivities.count };

      case 'update_statistics':
        // Update usage statistics for tags, categories, etc.
        const tagStats = await this.updateTagStatistics();
        const categoryStats = await this.updateCategoryStatistics();
        const skillStats = await this.updateSkillStatistics();
        
        return {
          updatedTags: tagStats,
          updatedCategories: categoryStats,
          updatedSkills: skillStats
        };

      case 'vacuum_analyze':
        // Database-specific optimization
        if (config.database.primary.provider === 'postgresql') {
          await client.$executeRaw`VACUUM ANALYZE`;
          return { vacuumed: true };
        }
        return { skipped: 'Not supported for this database' };

      default:
        throw new Error(`Unknown maintenance task: ${task}`);
    }
  }

  /**
   * Update tag usage statistics
   */
  async updateTagStatistics() {
    const client = getClient();
    const tags = await client.tag.findMany();
    let updated = 0;

    for (const tag of tags) {
      const [projectCount, blogCount] = await Promise.all([
        client.projectTag.count({ where: { tagId: tag.id } }),
        client.blogTag.count({ where: { tagId: tag.id } })
      ]);

      if (tag.projectCount !== projectCount || tag.blogCount !== blogCount) {
        await client.tag.update({
          where: { id: tag.id },
          data: { projectCount, blogCount }
        });
        updated++;
      }
    }

    return updated;
  }

  /**
   * Update category usage statistics
   */
  async updateCategoryStatistics() {
    const client = getClient();
    const categories = await client.category.findMany();
    let updated = 0;

    for (const category of categories) {
      const postCount = await client.blogCategory.count({
        where: { categoryId: category.id }
      });

      if (category.postCount !== postCount) {
        await client.category.update({
          where: { id: category.id },
          data: { postCount }
        });
        updated++;
      }
    }

    return updated;
  }

  /**
   * Update skill usage statistics
   */
  async updateSkillStatistics() {
    const client = getClient();
    const skills = await client.skill.findMany();
    let updated = 0;

    for (const skill of skills) {
      const projectCount = await client.projectSkill.count({
        where: { skillId: skill.id }
      });

      if (skill.projectCount !== projectCount) {
        await client.skill.update({
          where: { id: skill.id },
          data: { projectCount }
        });
        updated++;
      }
    }

    return updated;
  }

  /**
   * Get public configuration (safe to expose)
   */
  getPublicConfig() {
    return {
      provider: config.database.primary.provider,
      environment: config.environment,
      features: config.features,
      backup: {
        enabled: config.backup.enabled,
        retention: config.backup.retention
      },
      cache: {
        enabled: config.cache.enabled,
        defaultTtl: config.cache.ttl
      }
    };
  }

  /**
   * Get system uptime
   */
  getUptime() {
    return process.uptime();
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down database system...');
      
      // Stop scheduled backups
      if (backupManager.isScheduled) {
        backupManager.stopScheduledBackups();
      }

      // Close database connection
      await disconnect();
      
      this.isInitialized = false;
      logger.info('Database system shutdown completed');
      
    } catch (error) {
      logger.error('Error during database shutdown:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const database = new PortfolioDatabase();

// Export main interface
module.exports = database;

// Export individual components for direct access
module.exports.config = config;
module.exports.logger = logger;
module.exports.seed = seed;
module.exports.rollback = rollback;
module.exports.status = status;
module.exports.performHealthCheck = performHealthCheck;
module.exports.backupManager = backupManager;

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await database.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await database.shutdown();
  process.exit(0);
});