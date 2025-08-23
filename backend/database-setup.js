/**
 * Database Setup and Initialization Script
 * Handles database connection, migrations, and seeding
 */

const { sequelize, testConnection, closeConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

class DatabaseSetup {
  constructor() {
    this.sequelize = sequelize;
  }

  async initialize() {
    try {
      logger.info('Starting database initialization...');
      
      // Test connection
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      // Run migrations
      await this.runMigrations();
      
      // Run seeders in development
      if (process.env.NODE_ENV === 'development') {
        await this.runSeeders();
      }

      logger.info('Database initialization completed successfully');
      return true;
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      logger.info('Running database migrations...');
      
      const { execSync } = require('child_process');
      const migrationCommand = 'npx sequelize-cli db:migrate';
      
      execSync(migrationCommand, { stdio: 'inherit' });
      logger.info('Migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  async runSeeders() {
    try {
      logger.info('Running database seeders...');
      
      const { execSync } = require('child_process');
      const seederCommand = 'npx sequelize-cli db:seed:all';
      
      execSync(seederCommand, { stdio: 'inherit' });
      logger.info('Seeders completed successfully');
    } catch (error) {
      logger.error('Seeding failed:', error);
      // Don't throw error for seeding failures in case data already exists
      logger.warn('Continuing without seeding (data may already exist)');
    }
  }

  async resetDatabase() {
    try {
      logger.warn('Resetting database - this will delete all data!');
      
      const { execSync } = require('child_process');
      
      // Undo all migrations
      execSync('npx sequelize-cli db:migrate:undo:all', { stdio: 'inherit' });
      
      // Re-run migrations
      await this.runMigrations();
      
      // Re-run seeders
      await this.runSeeders();
      
      logger.info('Database reset completed');
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const startTime = Date.now();
      await this.sequelize.authenticate();
      const responseTime = Date.now() - startTime;
      
      // Get basic stats
      const stats = await this.getDatabaseStats();
      
      return {
        status: 'healthy',
        responseTime,
        ...stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async getDatabaseStats() {
    try {
      const models = require('./src/models');
      
      const stats = {
        tables: {},
        totalRecords: 0
      };

      // Count records in each table
      const modelNames = Object.keys(models).filter(name => 
        name !== 'sequelize' && name !== 'Sequelize'
      );

      for (const modelName of modelNames) {
        try {
          const count = await models[modelName].count();
          stats.tables[modelName] = count;
          stats.totalRecords += count;
        } catch (error) {
          stats.tables[modelName] = 'error';
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting database stats:', error);
      return { tables: {}, totalRecords: 0, error: error.message };
    }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${timestamp}`;
      
      logger.info(`Creating database backup: ${backupName}`);
      
      const { execSync } = require('child_process');
      const dbConfig = require('./src/config/database').config[process.env.NODE_ENV || 'development'];
      
      const backupCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} > ./backups/${backupName}.sql`;
      
      // Ensure backup directory exists
      const fs = require('fs');
      if (!fs.existsSync('./backups')) {
        fs.mkdirSync('./backups', { recursive: true });
      }
      
      execSync(backupCommand, { 
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: dbConfig.password }
      });
      
      logger.info(`Backup created successfully: ./backups/${backupName}.sql`);
      return backupName;
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async close() {
    try {
      await closeConnection();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const dbSetup = new DatabaseSetup();
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'init':
          await dbSetup.initialize();
          break;
        case 'migrate':
          await dbSetup.runMigrations();
          break;
        case 'seed':
          await dbSetup.runSeeders();
          break;
        case 'reset':
          await dbSetup.resetDatabase();
          break;
        case 'health':
          const health = await dbSetup.checkHealth();
          console.log(JSON.stringify(health, null, 2));
          break;
        case 'backup':
          await dbSetup.createBackup();
          break;
        case 'stats':
          const stats = await dbSetup.getDatabaseStats();
          console.log(JSON.stringify(stats, null, 2));
          break;
        default:
          console.log(`
Database Setup Commands:
  init    - Initialize database (migrate + seed in development)
  migrate - Run migrations only
  seed    - Run seeders only
  reset   - Reset database (WARNING: deletes all data)
  health  - Check database health
  backup  - Create database backup
  stats   - Show database statistics

Usage: node database-setup.js <command>
          `);
      }
    } catch (error) {
      logger.error('Command failed:', error);
      process.exit(1);
    } finally {
      await dbSetup.close();
      process.exit(0);
    }
  })();
}

module.exports = DatabaseSetup;