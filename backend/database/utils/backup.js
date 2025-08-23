/**
 * Database Backup Utility
 * Handles automated backups, restoration, and backup management
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const archiver = require('archiver');
const extract = require('extract-zip');
const crypto = require('crypto');
const cron = require('node-cron');
const config = require('../config/database.config');
const logger = require('./logger');
const { getClient } = require('./prisma');

class BackupManager {
  constructor() {
    this.backupDir = config.backup.directory;
    this.isScheduled = false;
    this.currentJob = null;
  }

  /**
   * Initialize backup system
   */
  async initialize() {
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();
      
      // Start scheduled backups if enabled
      if (config.backup.enabled) {
        this.startScheduledBackups();
      }
      
      logger.info('Backup manager initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize backup manager:', error);
      throw error;
    }
  }

  /**
   * Create a database backup
   */
  async createBackup(options = {}) {
    const {
      name = this.generateBackupName(),
      includeMedia = true,
      compress = config.backup.compression,
      encrypt = config.backup.encryption.enabled
    } = options;

    try {
      logger.info(`Starting backup: ${name}`);
      const startTime = Date.now();

      const backupPath = path.join(this.backupDir, name);
      await fs.mkdir(backupPath, { recursive: true });

      // Create database dump
      const dbDumpPath = await this.createDatabaseDump(backupPath);
      
      // Create metadata
      const metadata = await this.createBackupMetadata(backupPath, {
        name,
        includeMedia,
        compress,
        encrypt
      });

      // Include media files if requested
      if (includeMedia) {
        await this.includeMediaFiles(backupPath);
      }

      let finalPath = backupPath;

      // Compress backup
      if (compress) {
        finalPath = await this.compressBackup(backupPath, `${backupPath}.zip`);
        await this.removeDirectory(backupPath);
      }

      // Encrypt backup
      if (encrypt && config.backup.encryption.key) {
        finalPath = await this.encryptBackup(finalPath);
        await fs.unlink(compress ? `${backupPath}.zip` : backupPath);
      }

      const duration = Date.now() - startTime;
      const stats = await fs.stat(finalPath);

      const result = {
        name,
        path: finalPath,
        size: stats.size,
        duration,
        metadata,
        compressed: compress,
        encrypted: encrypt,
        createdAt: new Date()
      };

      // Update backup registry
      await this.updateBackupRegistry(result);

      logger.info(`Backup completed: ${name} (${this.formatBytes(stats.size)}, ${duration}ms)`);
      return result;

    } catch (error) {
      logger.error(`Backup failed: ${name}`, error);
      throw error;
    }
  }

  /**
   * Create database dump using pg_dump or equivalent
   */
  async createDatabaseDump(backupPath) {
    const dumpFile = path.join(backupPath, 'database.sql');
    
    try {
      // For PostgreSQL
      if (config.database.primary.provider === 'postgresql') {
        await this.createPostgresDump(dumpFile);
      }
      // For SQLite
      else if (config.database.primary.provider === 'sqlite') {
        await this.createSQLiteDump(dumpFile);
      }
      // For other databases, use Prisma's data export
      else {
        await this.createPrismaDataDump(dumpFile);
      }

      logger.info(`Database dump created: ${dumpFile}`);
      return dumpFile;
      
    } catch (error) {
      logger.error('Failed to create database dump:', error);
      throw error;
    }
  }

  /**
   * Create PostgreSQL dump
   */
  async createPostgresDump(dumpFile) {
    return new Promise((resolve, reject) => {
      const db = config.database.primary;
      const args = [
        '-h', db.host,
        '-p', db.port.toString(),
        '-U', db.username,
        '-d', db.name,
        '--no-password',
        '--clean',
        '--if-exists',
        '--create',
        '-f', dumpFile
      ];

      const pgDump = spawn('pg_dump', args, {
        env: {
          ...process.env,
          PGPASSWORD: db.password
        }
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve(dumpFile);
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      pgDump.on('error', reject);
    });
  }

  /**
   * Create SQLite dump
   */
  async createSQLiteDump(dumpFile) {
    const prisma = getClient();
    
    // For SQLite, we can copy the database file directly
    const dbPath = config.database.primary.url.replace('file:', '');
    const stats = await fs.stat(dbPath);
    
    await fs.copyFile(dbPath, dumpFile.replace('.sql', '.db'));
    
    // Also create SQL dump for portability
    return new Promise((resolve, reject) => {
      const sqlite3 = spawn('sqlite3', [dbPath, '.dump'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const writeStream = require('fs').createWriteStream(dumpFile);
      sqlite3.stdout.pipe(writeStream);

      sqlite3.on('close', (code) => {
        writeStream.end();
        if (code === 0) {
          resolve(dumpFile);
        } else {
          reject(new Error(`sqlite3 dump exited with code ${code}`));
        }
      });

      sqlite3.on('error', reject);
    });
  }

  /**
   * Create data dump using Prisma
   */
  async createPrismaDataDump(dumpFile) {
    const prisma = getClient();
    
    try {
      const data = {
        users: await prisma.user.findMany(),
        roles: await prisma.role.findMany(),
        projects: await prisma.project.findMany(),
        blogPosts: await prisma.blogPost.findMany(),
        tags: await prisma.tag.findMany(),
        skills: await prisma.skill.findMany(),
        categories: await prisma.category.findMany(),
        settings: await prisma.setting.findMany(),
        // Add other tables as needed
      };

      await fs.writeFile(dumpFile.replace('.sql', '.json'), JSON.stringify(data, null, 2));
      
      // Create SQL INSERT statements
      const sqlStatements = this.generateInsertStatements(data);
      await fs.writeFile(dumpFile, sqlStatements);
      
      return dumpFile;
      
    } catch (error) {
      logger.error('Failed to create Prisma data dump:', error);
      throw error;
    }
  }

  /**
   * Generate SQL INSERT statements from data
   */
  generateInsertStatements(data) {
    let sql = '';
    
    for (const [table, records] of Object.entries(data)) {
      if (records.length === 0) continue;
      
      const columns = Object.keys(records[0]);
      const tableName = this.getTableName(table);
      
      sql += `-- ${table}\n`;
      
      for (const record of records) {
        const values = columns.map(col => {
          const value = record[col];
          if (value === null || value === undefined) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (value instanceof Date) return `'${value.toISOString()}'`;
          if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          return value.toString();
        });
        
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      
      sql += '\n';
    }
    
    return sql;
  }

  /**
   * Get database table name from Prisma model name
   */
  getTableName(modelName) {
    const tableMap = {
      users: 'users',
      roles: 'roles',
      projects: 'projects',
      blogPosts: 'blog_posts',
      tags: 'tags',
      skills: 'skills',
      categories: 'categories',
      settings: 'settings'
    };
    
    return tableMap[modelName] || modelName.toLowerCase();
  }

  /**
   * Create backup metadata
   */
  async createBackupMetadata(backupPath, options) {
    const prisma = getClient();
    
    try {
      const stats = await this.getDatabaseStats();
      
      const metadata = {
        version: '1.0.0',
        type: 'full',
        created_at: new Date().toISOString(),
        database: {
          provider: config.database.primary.provider,
          version: await this.getDatabaseVersion(),
          stats
        },
        options,
        environment: process.env.NODE_ENV,
        hostname: require('os').hostname(),
        node_version: process.version
      };

      const metadataPath = path.join(backupPath, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      return metadata;
      
    } catch (error) {
      logger.error('Failed to create backup metadata:', error);
      throw error;
    }
  }

  /**
   * Include media files in backup
   */
  async includeMediaFiles(backupPath) {
    try {
      const mediaSourceDir = path.join(__dirname, '../../../static/uploads');
      const mediaBackupDir = path.join(backupPath, 'media');
      
      // Check if media directory exists
      try {
        await fs.access(mediaSourceDir);
      } catch {
        logger.info('No media directory found, skipping media backup');
        return;
      }

      await fs.mkdir(mediaBackupDir, { recursive: true });
      
      // Copy media files
      await this.copyDirectory(mediaSourceDir, mediaBackupDir);
      
      logger.info(`Media files backed up to: ${mediaBackupDir}`);
      
    } catch (error) {
      logger.error('Failed to include media files:', error);
      throw error;
    }
  }

  /**
   * Compress backup directory
   */
  async compressBackup(sourcePath, targetPath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(targetPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`Backup compressed: ${archive.pointer()} bytes`);
        resolve(targetPath);
      });

      archive.on('error', reject);
      archive.pipe(output);
      
      archive.directory(sourcePath, false);
      archive.finalize();
    });
  }

  /**
   * Encrypt backup file
   */
  async encryptBackup(filePath) {
    if (!config.backup.encryption.key) {
      throw new Error('Encryption key not configured');
    }

    const encryptedPath = `${filePath}.enc`;
    const key = Buffer.from(config.backup.encryption.key, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    const input = require('fs').createReadStream(filePath);
    const output = require('fs').createWriteStream(encryptedPath);

    // Write IV at the beginning
    output.write(iv);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);
      
      output.on('finish', () => {
        logger.info(`Backup encrypted: ${encryptedPath}`);
        resolve(encryptedPath);
      });
      
      output.on('error', reject);
      cipher.on('error', reject);
    });
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupPath, options = {}) {
    const {
      includeMedia = true,
      skipExisting = false
    } = options;

    try {
      logger.info(`Starting restore from: ${backupPath}`);
      const startTime = Date.now();

      let workingPath = backupPath;

      // Decrypt if necessary
      if (path.extname(backupPath) === '.enc') {
        workingPath = await this.decryptBackup(backupPath);
      }

      // Extract if compressed
      if (path.extname(workingPath) === '.zip') {
        const extractPath = path.join(this.backupDir, 'restore_temp');
        await extract(workingPath, { dir: extractPath });
        workingPath = extractPath;
      }

      // Validate backup
      await this.validateBackup(workingPath);

      // Restore database
      await this.restoreDatabase(workingPath, options);

      // Restore media files
      if (includeMedia) {
        await this.restoreMediaFiles(workingPath);
      }

      const duration = Date.now() - startTime;
      logger.info(`Restore completed in ${duration}ms`);

      return {
        success: true,
        duration,
        restored_at: new Date()
      };

    } catch (error) {
      logger.error('Restore failed:', error);
      throw error;
    }
  }

  /**
   * Start scheduled backups
   */
  startScheduledBackups() {
    if (this.isScheduled) {
      logger.warn('Scheduled backups already running');
      return;
    }

    const schedule = config.backup.schedule;
    
    this.currentJob = cron.schedule(schedule, async () => {
      try {
        logger.info('Running scheduled backup...');
        const result = await this.createBackup({
          name: this.generateBackupName('scheduled')
        });
        
        // Clean up old backups
        await this.cleanupOldBackups();
        
        logger.info('Scheduled backup completed:', result.name);
        
      } catch (error) {
        logger.error('Scheduled backup failed:', error);
      }
    }, {
      scheduled: false
    });

    this.currentJob.start();
    this.isScheduled = true;
    
    logger.info(`Scheduled backups started with cron: ${schedule}`);
  }

  /**
   * Stop scheduled backups
   */
  stopScheduledBackups() {
    if (this.currentJob) {
      this.currentJob.stop();
      this.currentJob = null;
      this.isScheduled = false;
      logger.info('Scheduled backups stopped');
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      const registry = await this.getBackupRegistry();
      const retention = config.backup.retention;
      
      const now = new Date();
      const backupsToDelete = [];

      for (const backup of registry.backups) {
        const backupDate = new Date(backup.createdAt);
        const daysDiff = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));

        let shouldDelete = false;

        // Apply retention rules
        if (daysDiff > retention.daily && daysDiff <= 7) {
          // Keep daily for last 7 days
          shouldDelete = false;
        } else if (daysDiff > 7 && daysDiff <= 30) {
          // Keep weekly for last 30 days
          const weekOfYear = this.getWeekOfYear(backupDate);
          const existingWeekly = registry.backups.find(b => 
            this.getWeekOfYear(new Date(b.createdAt)) === weekOfYear &&
            b.name !== backup.name
          );
          shouldDelete = !!existingWeekly;
        } else if (daysDiff > 30) {
          // Keep monthly
          const monthYear = `${backupDate.getMonth()}-${backupDate.getFullYear()}`;
          const existingMonthly = registry.backups.find(b => {
            const bDate = new Date(b.createdAt);
            return `${bDate.getMonth()}-${bDate.getFullYear()}` === monthYear &&
                   b.name !== backup.name;
          });
          shouldDelete = !!existingMonthly;
        }

        if (shouldDelete) {
          backupsToDelete.push(backup);
        }
      }

      // Delete old backups
      for (const backup of backupsToDelete) {
        try {
          await fs.unlink(backup.path);
          logger.info(`Deleted old backup: ${backup.name}`);
        } catch (error) {
          logger.warn(`Failed to delete backup ${backup.name}:`, error.message);
        }
      }

      // Update registry
      registry.backups = registry.backups.filter(b => 
        !backupsToDelete.some(d => d.name === b.name)
      );
      
      await this.saveBackupRegistry(registry);

      logger.info(`Cleanup completed: ${backupsToDelete.length} old backups removed`);
      
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Get backup registry
   */
  async getBackupRegistry() {
    const registryPath = path.join(this.backupDir, 'registry.json');
    
    try {
      const data = await fs.readFile(registryPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { backups: [], created_at: new Date().toISOString() };
    }
  }

  /**
   * Save backup registry
   */
  async saveBackupRegistry(registry) {
    const registryPath = path.join(this.backupDir, 'registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
  }

  /**
   * Update backup registry with new backup
   */
  async updateBackupRegistry(backup) {
    const registry = await this.getBackupRegistry();
    registry.backups.push(backup);
    registry.updated_at = new Date().toISOString();
    await this.saveBackupRegistry(registry);
  }

  /**
   * List all backups
   */
  async listBackups() {
    const registry = await this.getBackupRegistry();
    return registry.backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Generate backup name
   */
  generateBackupName(prefix = 'backup') {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0];
    
    return `${prefix}_${timestamp}`;
  }

  /**
   * Utility functions
   */
  async ensureBackupDirectory() {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async getDatabaseStats() {
    const prisma = getClient();
    
    try {
      const stats = {};
      const tables = ['user', 'project', 'blogPost', 'tag', 'skill', 'role'];
      
      for (const table of tables) {
        try {
          stats[table] = await prisma[table].count();
        } catch (error) {
          stats[table] = 0;
        }
      }
      
      return stats;
    } catch (error) {
      logger.warn('Could not get database stats:', error.message);
      return {};
    }
  }

  async getDatabaseVersion() {
    try {
      const prisma = getClient();
      const result = await prisma.$queryRaw`SELECT version()`;
      return result[0]?.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getWeekOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((date.getDay() + days) / 7);
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = await fs.stat(srcPath);
      
      if (stat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async removeDirectory(dir) {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// Export singleton instance
const backupManager = new BackupManager();

module.exports = {
  backupManager,
  createBackup: (options) => backupManager.createBackup(options),
  restoreBackup: (path, options) => backupManager.restoreBackup(path, options),
  listBackups: () => backupManager.listBackups(),
  initialize: () => backupManager.initialize(),
  startScheduledBackups: () => backupManager.startScheduledBackups(),
  stopScheduledBackups: () => backupManager.stopScheduledBackups()
};