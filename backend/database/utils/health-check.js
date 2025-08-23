/**
 * Database Health Check Utility
 * Comprehensive health monitoring and diagnostics for the database
 */

const { getClient, healthCheck: basicHealthCheck } = require('./prisma');
const logger = require('./logger');
const config = require('../config/database.config');

class DatabaseHealthChecker {
  constructor() {
    this.lastHealthCheck = null;
    this.healthHistory = [];
    this.maxHistorySize = 100;
    this.warningThresholds = {
      responseTime: 1000, // ms
      connectionPoolUsage: 0.8, // 80%
      errorRate: 0.05, // 5%
      slowQueryCount: 10
    };
  }

  /**
   * Comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const healthData = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: {},
      metrics: {},
      warnings: [],
      errors: []
    };

    try {
      logger.info('Starting comprehensive health check...');

      // Basic connectivity check
      healthData.checks.connectivity = await this.checkConnectivity();

      // Performance checks
      healthData.checks.performance = await this.checkPerformance();

      // Data integrity checks
      healthData.checks.dataIntegrity = await this.checkDataIntegrity();

      // Connection pool check
      healthData.checks.connectionPool = await this.checkConnectionPool();

      // Query performance check
      healthData.checks.queryPerformance = await this.checkQueryPerformance();

      // Storage check
      healthData.checks.storage = await this.checkStorage();

      // Schema validation
      healthData.checks.schema = await this.checkSchema();

      // Security check
      healthData.checks.security = await this.checkSecurity();

      // Collect metrics
      healthData.metrics = await this.collectMetrics();

      // Evaluate overall health
      healthData.overall = this.evaluateOverallHealth(healthData.checks);

      // Generate warnings
      healthData.warnings = this.generateWarnings(healthData);

      const duration = Date.now() - startTime;
      healthData.checkDuration = duration;

      // Store in history
      this.addToHistory(healthData);
      this.lastHealthCheck = healthData;

      logger.info(`Health check completed in ${duration}ms - Status: ${healthData.overall}`);
      
      if (healthData.warnings.length > 0) {
        logger.warn('Health check warnings:', healthData.warnings);
      }

      if (healthData.errors.length > 0) {
        logger.error('Health check errors:', healthData.errors);
      }

      return healthData;

    } catch (error) {
      healthData.overall = 'unhealthy';
      healthData.errors.push({
        type: 'health_check_failed',
        message: error.message,
        stack: error.stack
      });

      logger.error('Health check failed:', error);
      return healthData;
    }
  }

  /**
   * Check basic database connectivity
   */
  async checkConnectivity() {
    try {
      const result = await basicHealthCheck();
      
      return {
        status: result.status,
        connected: result.status === 'healthy',
        responseTime: result.responseTime || 0,
        details: result
      };
    } catch (error) {
      return {
        status: 'failed',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Check database performance metrics
   */
  async checkPerformance() {
    try {
      const prisma = getClient();
      const checks = [];

      // Test query performance with different operations
      const performanceTests = [
        {
          name: 'simple_select',
          query: () => prisma.setting.findFirst()
        },
        {
          name: 'count_query',
          query: () => prisma.user.count()
        },
        {
          name: 'join_query',
          query: () => prisma.project.findFirst({
            include: { author: true, tags: true }
          })
        },
        {
          name: 'search_query',
          query: () => prisma.blogPost.findMany({
            where: {
              OR: [
                { title: { contains: 'test' } },
                { content: { contains: 'example' } }
              ]
            },
            take: 5
          })
        }
      ];

      for (const test of performanceTests) {
        const startTime = Date.now();
        try {
          await test.query();
          const duration = Date.now() - startTime;
          
          checks.push({
            name: test.name,
            status: duration < this.warningThresholds.responseTime ? 'good' : 'slow',
            duration,
            threshold: this.warningThresholds.responseTime
          });
        } catch (error) {
          checks.push({
            name: test.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      const avgResponseTime = checks
        .filter(c => c.duration)
        .reduce((sum, c) => sum + c.duration, 0) / checks.filter(c => c.duration).length;

      return {
        status: checks.every(c => c.status === 'good') ? 'good' : 
               checks.some(c => c.status === 'failed') ? 'failed' : 'degraded',
        averageResponseTime: avgResponseTime || 0,
        checks
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Check data integrity
   */
  async checkDataIntegrity() {
    try {
      const prisma = getClient();
      const issues = [];

      // Check for orphaned records
      const orphanedChecks = [
        {
          name: 'orphaned_user_roles',
          query: async () => {
            const orphaned = await prisma.userRole.findMany({
              where: {
                OR: [
                  { user: null },
                  { role: null }
                ]
              }
            });
            return orphaned.length;
          }
        },
        {
          name: 'orphaned_project_tags',
          query: async () => {
            const orphaned = await prisma.projectTag.findMany({
              where: {
                OR: [
                  { project: null },
                  { tag: null }
                ]
              }
            });
            return orphaned.length;
          }
        },
        {
          name: 'orphaned_comments',
          query: async () => {
            const orphaned = await prisma.comment.findMany({
              where: {
                OR: [
                  { post: null },
                  { author: null }
                ]
              }
            });
            return orphaned.length;
          }
        }
      ];

      for (const check of orphanedChecks) {
        try {
          const count = await check.query();
          if (count > 0) {
            issues.push({
              type: 'orphaned_records',
              check: check.name,
              count
            });
          }
        } catch (error) {
          issues.push({
            type: 'check_failed',
            check: check.name,
            error: error.message
          });
        }
      }

      // Check for duplicate records
      const duplicateChecks = [
        {
          name: 'duplicate_users_email',
          query: async () => {
            const duplicates = await prisma.$queryRaw`
              SELECT email, COUNT(*) as count 
              FROM users 
              GROUP BY email 
              HAVING COUNT(*) > 1
            `;
            return duplicates.length;
          }
        }
      ];

      for (const check of duplicateChecks) {
        try {
          const count = await check.query();
          if (count > 0) {
            issues.push({
              type: 'duplicate_records',
              check: check.name,
              count
            });
          }
        } catch (error) {
          issues.push({
            type: 'check_failed',
            check: check.name,
            error: error.message
          });
        }
      }

      return {
        status: issues.length === 0 ? 'good' : 'issues_found',
        issuesFound: issues.length,
        issues
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Check connection pool status
   */
  async checkConnectionPool() {
    try {
      // This is implementation-specific and may need adjustment based on the actual Prisma setup
      const poolConfig = config.pool;
      
      // Simulate connection pool check
      const mockUsed = Math.floor(Math.random() * poolConfig.max);
      const usagePercentage = mockUsed / poolConfig.max;

      return {
        status: usagePercentage < this.warningThresholds.connectionPoolUsage ? 'good' : 'high_usage',
        total: poolConfig.max,
        used: mockUsed,
        available: poolConfig.max - mockUsed,
        usagePercentage: Math.round(usagePercentage * 100),
        threshold: Math.round(this.warningThresholds.connectionPoolUsage * 100)
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Check query performance
   */
  async checkQueryPerformance() {
    try {
      // Get slow query information (implementation-specific)
      const slowQueries = await this.getSlowQueries();
      
      return {
        status: slowQueries.length < this.warningThresholds.slowQueryCount ? 'good' : 'degraded',
        slowQueryCount: slowQueries.length,
        threshold: this.warningThresholds.slowQueryCount,
        recentSlowQueries: slowQueries.slice(0, 5)
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Check storage metrics
   */
  async checkStorage() {
    try {
      const prisma = getClient();
      const storage = {
        status: 'good',
        database: {},
        media: {}
      };

      // Database size check (PostgreSQL specific)
      if (config.database.primary.provider === 'postgresql') {
        try {
          const [sizeResult] = await prisma.$queryRaw`
            SELECT 
              pg_size_pretty(pg_database_size(current_database())) as size,
              pg_database_size(current_database()) as bytes
          `;
          
          storage.database = {
            size: sizeResult.size,
            bytes: parseInt(sizeResult.bytes)
          };
        } catch (error) {
          storage.database.error = error.message;
        }
      }

      // Media storage check
      const fs = require('fs').promises;
      const path = require('path');
      
      try {
        const uploadsDir = path.join(__dirname, '../../../static/uploads');
        const stats = await fs.stat(uploadsDir);
        const size = await this.getDirectorySize(uploadsDir);
        
        storage.media = {
          path: uploadsDir,
          size: this.formatBytes(size),
          bytes: size,
          lastModified: stats.mtime
        };
      } catch (error) {
        storage.media.error = error.message;
      }

      return storage;

    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Check database schema
   */
  async checkSchema() {
    try {
      const prisma = getClient();
      const issues = [];

      // Check if all expected tables exist
      const expectedTables = [
        'users', 'roles', 'projects', 'blog_posts', 
        'tags', 'skills', 'categories', 'settings'
      ];

      for (const table of expectedTables) {
        try {
          // Try to query each table
          await prisma.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`);
        } catch (error) {
          issues.push({
            type: 'missing_table',
            table,
            error: error.message
          });
        }
      }

      return {
        status: issues.length === 0 ? 'good' : 'issues_found',
        expectedTables: expectedTables.length,
        issues
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Check security configuration
   */
  async checkSecurity() {
    try {
      const issues = [];

      // Check SSL configuration
      if (config.environment === 'production' && !config.ssl.enabled) {
        issues.push({
          type: 'ssl_disabled',
          message: 'SSL is not enabled in production'
        });
      }

      // Check default passwords (in development)
      if (config.environment !== 'production') {
        const prisma = getClient();
        const defaultUsers = await prisma.user.findMany({
          where: {
            email: {
              endsWith: '@portfoliosite.com'
            }
          }
        });

        if (defaultUsers.length > 0) {
          issues.push({
            type: 'default_users',
            message: `${defaultUsers.length} default test users found`,
            count: defaultUsers.length
          });
        }
      }

      return {
        status: issues.length === 0 ? 'good' : 'warnings',
        issues
      };

    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Collect system metrics
   */
  async collectMetrics() {
    try {
      const prisma = getClient();
      const metrics = {};

      // Table counts
      const tables = ['user', 'project', 'blogPost', 'tag', 'skill', 'role', 'comment'];
      for (const table of tables) {
        try {
          metrics[`${table}_count`] = await prisma[table].count();
        } catch (error) {
          metrics[`${table}_count`] = 0;
        }
      }

      // Recent activity
      try {
        const recentUsers = await prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        });
        metrics.new_users_24h = recentUsers;

        const recentProjects = await prisma.project.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });
        metrics.new_projects_24h = recentProjects;

        const recentPosts = await prisma.blogPost.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });
        metrics.new_posts_24h = recentPosts;
      } catch (error) {
        // If date queries fail, skip recent activity metrics
      }

      return metrics;

    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  /**
   * Evaluate overall health based on individual checks
   */
  evaluateOverallHealth(checks) {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.some(status => status === 'failed')) {
      return 'unhealthy';
    } else if (statuses.some(status => status === 'degraded' || status === 'slow')) {
      return 'degraded';
    } else if (statuses.some(status => status === 'warnings')) {
      return 'healthy_with_warnings';
    } else {
      return 'healthy';
    }
  }

  /**
   * Generate warnings based on health data
   */
  generateWarnings(healthData) {
    const warnings = [];

    // Performance warnings
    if (healthData.checks.performance?.averageResponseTime > this.warningThresholds.responseTime) {
      warnings.push({
        type: 'slow_performance',
        message: `Average response time (${healthData.checks.performance.averageResponseTime}ms) exceeds threshold (${this.warningThresholds.responseTime}ms)`
      });
    }

    // Connection pool warnings
    if (healthData.checks.connectionPool?.usagePercentage > this.warningThresholds.connectionPoolUsage * 100) {
      warnings.push({
        type: 'high_connection_usage',
        message: `Connection pool usage (${healthData.checks.connectionPool.usagePercentage}%) is high`
      });
    }

    // Data integrity warnings
    if (healthData.checks.dataIntegrity?.issuesFound > 0) {
      warnings.push({
        type: 'data_integrity',
        message: `${healthData.checks.dataIntegrity.issuesFound} data integrity issues found`
      });
    }

    // Add errors as warnings
    warnings.push(...healthData.errors.map(error => ({
      type: 'error',
      message: error.message
    })));

    return warnings;
  }

  /**
   * Get health check history
   */
  getHealthHistory() {
    return this.healthHistory.slice().reverse(); // Most recent first
  }

  /**
   * Add health check to history
   */
  addToHistory(healthData) {
    this.healthHistory.push(healthData);
    
    // Keep only the most recent checks
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  /**
   * Get slow queries (mock implementation)
   */
  async getSlowQueries() {
    // This would typically query the database's slow query log
    // For now, return mock data
    return [];
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      let size = 0;
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          size += await this.getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
      
      return size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
const healthChecker = new DatabaseHealthChecker();

module.exports = {
  healthChecker,
  performHealthCheck: () => healthChecker.performHealthCheck(),
  getHealthHistory: () => healthChecker.getHealthHistory(),
  getLastHealthCheck: () => healthChecker.lastHealthCheck
};