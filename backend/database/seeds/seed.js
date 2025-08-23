/**
 * Master Seed File
 * Orchestrates all database seeding operations
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Import individual seeders
const { seedRoles, rollbackRoles } = require('./001_default_roles');
const { seedSettings, rollbackSettings } = require('./002_default_settings');
const { seedSampleData, rollbackSampleData } = require('./003_sample_data');

const prisma = new PrismaClient();

class DatabaseSeeder {
  constructor() {
    this.seeders = [
      {
        name: 'roles',
        seed: seedRoles,
        rollback: rollbackRoles,
        required: true,
        description: 'Default user roles and permissions'
      },
      {
        name: 'settings',
        seed: seedSettings,
        rollback: rollbackSettings,
        required: true,
        description: 'System configuration settings'
      },
      {
        name: 'sample_data',
        seed: seedSampleData,
        rollback: rollbackSampleData,
        required: false,
        description: 'Sample users, projects, and blog posts'
      }
    ];
  }

  /**
   * Run all seeders
   */
  async seed(options = {}) {
    const {
      includeSampleData = process.env.NODE_ENV === 'development',
      force = false,
      only = null
    } = options;

    try {
      logger.info('Starting database seeding...');
      
      const startTime = Date.now();
      const results = {};

      // Filter seeders based on options
      let seedersToRun = this.seeders.filter(seeder => {
        if (only) {
          return Array.isArray(only) ? only.includes(seeder.name) : seeder.name === only;
        }
        
        if (!includeSampleData && seeder.name === 'sample_data') {
          return false;
        }
        
        return true;
      });

      // Check if database needs seeding (unless forced)
      if (!force) {
        const needsSeeding = await this.checkIfSeedingNeeded();
        if (!needsSeeding) {
          logger.info('Database already seeded, skipping (use --force to override)');
          return { skipped: true, reason: 'Already seeded' };
        }
      }

      // Run seeders in order
      for (const seeder of seedersToRun) {
        try {
          logger.info(`Running seeder: ${seeder.name} - ${seeder.description}`);
          
          const seederStartTime = Date.now();
          const result = await seeder.seed();
          const seederDuration = Date.now() - seederStartTime;
          
          results[seeder.name] = {
            ...result,
            duration: seederDuration,
            success: true
          };
          
          logger.info(`Seeder '${seeder.name}' completed in ${seederDuration}ms`);
          
        } catch (error) {
          logger.error(`Seeder '${seeder.name}' failed:`, error);
          
          results[seeder.name] = {
            success: false,
            error: error.message,
            duration: 0
          };
          
          // Stop on required seeder failure
          if (seeder.required) {
            throw new Error(`Required seeder '${seeder.name}' failed: ${error.message}`);
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      
      // Record seeding completion
      await this.recordSeedingCompletion(results);
      
      logger.info(`Database seeding completed in ${totalDuration}ms`);
      
      return {
        success: true,
        duration: totalDuration,
        results
      };

    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Rollback all seeders
   */
  async rollback(options = {}) {
    const { only = null } = options;

    try {
      logger.info('Starting database rollback...');
      
      const startTime = Date.now();
      const results = {};

      // Filter and reverse order for rollback
      let seedersToRollback = this.seeders.filter(seeder => {
        if (only) {
          return Array.isArray(only) ? only.includes(seeder.name) : seeder.name === only;
        }
        return true;
      }).reverse();

      // Run rollbacks in reverse order
      for (const seeder of seedersToRollback) {
        try {
          logger.info(`Rolling back seeder: ${seeder.name}`);
          
          const rollbackStartTime = Date.now();
          const result = await seeder.rollback();
          const rollbackDuration = Date.now() - rollbackStartTime;
          
          results[seeder.name] = {
            deletedCount: result,
            duration: rollbackDuration,
            success: true
          };
          
          logger.info(`Rollback '${seeder.name}' completed in ${rollbackDuration}ms`);
          
        } catch (error) {
          logger.error(`Rollback '${seeder.name}' failed:`, error);
          
          results[seeder.name] = {
            success: false,
            error: error.message,
            duration: 0
          };
        }
      }

      const totalDuration = Date.now() - startTime;
      
      // Clear seeding record
      await this.clearSeedingRecord();
      
      logger.info(`Database rollback completed in ${totalDuration}ms`);
      
      return {
        success: true,
        duration: totalDuration,
        results
      };

    } catch (error) {
      logger.error('Database rollback failed:', error);
      throw error;
    }
  }

  /**
   * Check if database needs seeding
   */
  async checkIfSeedingNeeded() {
    try {
      // Check if we have any roles (indicator of seeded database)
      const roleCount = await prisma.role.count();
      const userCount = await prisma.user.count();
      
      // If no roles or no users, probably needs seeding
      return roleCount === 0 || userCount === 0;
      
    } catch (error) {
      // If tables don't exist, definitely needs seeding
      logger.debug('Database structure not found, seeding needed:', error.message);
      return true;
    }
  }

  /**
   * Record seeding completion in settings
   */
  async recordSeedingCompletion(results) {
    try {
      const seedingRecord = {
        completed_at: new Date().toISOString(),
        results,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      await prisma.setting.upsert({
        where: { key: 'system.seeding_completed' },
        update: { 
          value: seedingRecord,
          updatedAt: new Date()
        },
        create: {
          key: 'system.seeding_completed',
          value: seedingRecord,
          type: 'object',
          category: 'system',
          description: 'Database seeding completion record',
          isPublic: false,
          isEditable: false
        }
      });

    } catch (error) {
      logger.warn('Could not record seeding completion:', error.message);
    }
  }

  /**
   * Clear seeding record
   */
  async clearSeedingRecord() {
    try {
      await prisma.setting.deleteMany({
        where: { key: 'system.seeding_completed' }
      });
    } catch (error) {
      logger.warn('Could not clear seeding record:', error.message);
    }
  }

  /**
   * Get seeding status
   */
  async getStatus() {
    try {
      const seedingRecord = await prisma.setting.findUnique({
        where: { key: 'system.seeding_completed' }
      });

      const tableStats = {};
      
      // Get counts for major tables
      const tables = ['user', 'role', 'project', 'blogPost', 'tag', 'skill', 'setting'];
      
      for (const table of tables) {
        try {
          tableStats[table] = await prisma[table].count();
        } catch (error) {
          tableStats[table] = 0;
        }
      }

      return {
        isSeeded: !!seedingRecord,
        lastSeeded: seedingRecord?.value?.completed_at || null,
        version: seedingRecord?.value?.version || null,
        environment: seedingRecord?.value?.environment || null,
        results: seedingRecord?.value?.results || {},
        tableStats
      };

    } catch (error) {
      logger.error('Error getting seeding status:', error);
      return {
        isSeeded: false,
        error: error.message,
        tableStats: {}
      };
    }
  }

  /**
   * Reset database (rollback + seed)
   */
  async reset(options = {}) {
    logger.info('Starting database reset...');
    
    try {
      await this.rollback(options);
      await this.seed(options);
      
      logger.info('Database reset completed successfully');
      return { success: true };
      
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const seeder = new DatabaseSeeder();

// Export methods
module.exports = {
  seed: (options) => seeder.seed(options),
  rollback: (options) => seeder.rollback(options),
  reset: (options) => seeder.reset(options),
  status: () => seeder.getStatus(),
  seeder
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'seed';
  
  const options = {};
  
  // Parse CLI arguments
  args.forEach(arg => {
    if (arg === '--sample-data') options.includeSampleData = true;
    if (arg === '--force') options.force = true;
    if (arg.startsWith('--only=')) options.only = arg.split('=')[1].split(',');
  });

  const runCommand = async () => {
    try {
      let result;
      
      switch (command) {
        case 'seed':
          result = await seeder.seed(options);
          console.log('✅ Database seeding completed:', result);
          break;
          
        case 'rollback':
          result = await seeder.rollback(options);
          console.log('✅ Database rollback completed:', result);
          break;
          
        case 'reset':
          result = await seeder.reset(options);
          console.log('✅ Database reset completed:', result);
          break;
          
        case 'status':
          result = await seeder.getStatus();
          console.log('📊 Database seeding status:', result);
          break;
          
        default:
          console.log('Usage: node seed.js [seed|rollback|reset|status] [--sample-data] [--force] [--only=seeder1,seeder2]');
          process.exit(1);
      }
      
      process.exit(0);
      
    } catch (error) {
      console.error(`❌ Command '${command}' failed:`, error.message);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  };

  runCommand();
}