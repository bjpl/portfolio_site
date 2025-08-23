/**
 * Prisma Client Setup and Connection Management
 * Handles database connection with error handling, logging, and performance monitoring
 */

const { PrismaClient } = require('@prisma/client');
const config = require('../config/database.config');
const logger = require('./logger');

class DatabaseManager {
  constructor() {
    this.prisma = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000;
    this.queryCount = 0;
    this.slowQueries = [];
  }

  /**
   * Initialize Prisma Client with configuration
   */
  async initialize() {
    try {
      // Prisma Client options
      const clientOptions = {
        log: this.getLogConfig(),
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: config.getDatabaseUrl()
          }
        }
      };

      // Add SSL configuration for production
      if (config.ssl.enabled && config.environment === 'production') {
        clientOptions.datasources.db.ssl = {
          rejectUnauthorized: config.ssl.rejectUnauthorized
        };
      }

      this.prisma = new PrismaClient(clientOptions);

      // Add query logging middleware
      this.prisma.$use(this.createQueryMiddleware());

      // Add error handling middleware
      this.prisma.$use(this.createErrorMiddleware());

      // Add performance monitoring middleware
      this.prisma.$use(this.createPerformanceMiddleware());

      logger.info('Prisma client initialized successfully');
      return this.prisma;
    } catch (error) {
      logger.error('Failed to initialize Prisma client:', error);
      throw error;
    }
  }

  /**
   * Connect to database with retry logic
   */
  async connect() {
    if (this.isConnected) {
      return this.prisma;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Database connection attempt ${attempt}/${this.maxRetries}`);
        
        if (!this.prisma) {
          await this.initialize();
        }

        // Test connection
        await this.prisma.$connect();
        await this.prisma.$queryRaw`SELECT 1`;

        this.isConnected = true;
        this.connectionAttempts = attempt;
        
        logger.info('Database connected successfully');
        return this.prisma;
      } catch (error) {
        logger.warn(`Connection attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          logger.error('Max connection attempts exceeded');
          throw new Error(`Failed to connect to database after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    try {
      if (this.prisma && this.isConnected) {
        await this.prisma.$disconnect();
        this.isConnected = false;
        logger.info('Database disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient() {
    if (!this.prisma || !this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.prisma) {
        return { status: 'disconnected', error: 'Client not initialized' };
      }

      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        connected: this.isConnected,
        responseTime,
        queryCount: this.queryCount,
        slowQueries: this.slowQueries.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = {
        connection: {
          status: this.isConnected ? 'connected' : 'disconnected',
          attempts: this.connectionAttempts,
          queryCount: this.queryCount
        },
        performance: {
          slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
          avgResponseTime: this.calculateAverageResponseTime()
        },
        tables: {}
      };

      // Get table counts
      const tableQueries = [
        { name: 'users', query: this.prisma.user.count() },
        { name: 'projects', query: this.prisma.project.count() },
        { name: 'blogPosts', query: this.prisma.blogPost.count() },
        { name: 'comments', query: this.prisma.comment.count() },
        { name: 'media', query: this.prisma.mediaAsset.count() },
        { name: 'tags', query: this.prisma.tag.count() },
        { name: 'skills', query: this.prisma.skill.count() }
      ];

      const results = await Promise.all(tableQueries.map(q => q.query));
      
      tableQueries.forEach((query, index) => {
        stats.tables[query.name] = results[index];
      });

      return stats;
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Execute raw query with error handling
   */
  async executeRaw(query, params = []) {
    try {
      if (!this.prisma) {
        throw new Error('Database not connected');
      }

      const start = Date.now();
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const duration = Date.now() - start;

      this.queryCount++;

      if (duration > config.logging.slowQueryThreshold) {
        this.slowQueries.push({
          query,
          duration,
          timestamp: new Date().toISOString()
        });
        logger.warn(`Slow query detected (${duration}ms):`, query.slice(0, 100));
      }

      return result;
    } catch (error) {
      logger.error('Raw query failed:', { query, error: error.message });
      throw error;
    }
  }

  /**
   * Transaction wrapper
   */
  async transaction(callback, options = {}) {
    try {
      return await this.prisma.$transaction(callback, {
        timeout: config.performance.transactionTimeout,
        ...options
      });
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Create query middleware for logging
   */
  createQueryMiddleware() {
    return async (params, next) => {
      if (config.logging.logQueries) {
        logger.debug(`Query ${params.model}.${params.action}`, {
          args: params.args
        });
      }

      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;

      this.queryCount++;

      if (duration > config.logging.slowQueryThreshold) {
        this.slowQueries.push({
          model: params.model,
          action: params.action,
          duration,
          timestamp: new Date().toISOString()
        });

        logger.warn(`Slow query detected (${duration}ms):`, {
          model: params.model,
          action: params.action
        });
      }

      return result;
    };
  }

  /**
   * Create error handling middleware
   */
  createErrorMiddleware() {
    return async (params, next) => {
      try {
        return await next(params);
      } catch (error) {
        // Log error with context
        logger.error('Database query error:', {
          model: params.model,
          action: params.action,
          error: error.message,
          code: error.code
        });

        // Handle specific Prisma errors
        if (error.code === 'P2002') {
          error.message = 'A record with this value already exists';
        } else if (error.code === 'P2025') {
          error.message = 'Record not found';
        } else if (error.code === 'P2003') {
          error.message = 'Foreign key constraint failed';
        }

        throw error;
      }
    };
  }

  /**
   * Create performance monitoring middleware
   */
  createPerformanceMiddleware() {
    return async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;

      // Track performance metrics
      if (duration > 1000) {
        logger.warn('Long-running query detected:', {
          model: params.model,
          action: params.action,
          duration: `${duration}ms`
        });
      }

      return result;
    };
  }

  /**
   * Get logging configuration
   */
  getLogConfig() {
    if (!config.logging.enabled) {
      return undefined;
    }

    const logLevels = [];
    
    if (config.logging.level === 'debug' || config.environment === 'development') {
      logLevels.push('query', 'info', 'warn', 'error');
    } else {
      logLevels.push('warn', 'error');
    }

    return logLevels.map(level => ({
      emit: 'event',
      level
    }));
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime() {
    if (this.slowQueries.length === 0) return 0;
    
    const totalTime = this.slowQueries.reduce((sum, query) => sum + query.duration, 0);
    return Math.round(totalTime / this.slowQueries.length);
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      await this.disconnect();
      this.queryCount = 0;
      this.slowQueries = [];
      logger.info('Database manager cleaned up');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Export singleton and utilities
module.exports = {
  databaseManager,
  connect: () => databaseManager.connect(),
  disconnect: () => databaseManager.disconnect(),
  getClient: () => databaseManager.getClient(),
  healthCheck: () => databaseManager.healthCheck(),
  getStats: () => databaseManager.getStats(),
  executeRaw: (query, params) => databaseManager.executeRaw(query, params),
  transaction: (callback, options) => databaseManager.transaction(callback, options)
};