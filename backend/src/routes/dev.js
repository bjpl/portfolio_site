const express = require('express');

const router = express.Router();
const { sequelize } = require('../models/User');
const cache = require('../services/cache');
const logger = require('../utils/logger');

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Development Tools Routes
 * These routes are only available to admins in production
 * and provide debugging/development utilities
 */

// Get all registered routes
router.get('/routes', (req, res) => {
  const routes = [];

  // Extract routes from Express app
  req.app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Direct routes
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).filter(m => m !== '_all'),
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const prefix = middleware.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\/g, '/')
            .replace('^', '');

          routes.push({
            path: prefix + handler.route.path,
            methods: Object.keys(handler.route.methods).filter(m => m !== '_all'),
          });
        }
      });
    }
  });

  // Sort routes
  routes.sort((a, b) => a.path.localeCompare(b.path));

  res.json({
    total: routes.length,
    routes,
    timestamp: new Date().toISOString(),
  });
});

// Get current configuration (sanitized)
router.get('/config', (req, res) => {
  const config = require('../config');

  // Sanitize sensitive information
  const sanitized = JSON.parse(JSON.stringify(config));

  // Remove sensitive values
  if (sanitized.security) {
    sanitized.security.jwtSecret = '***HIDDEN***';
  }
  if (sanitized.database) {
    sanitized.database.password = '***HIDDEN***';
  }
  if (sanitized.redis) {
    sanitized.redis.password = '***HIDDEN***';
  }
  if (sanitized.email) {
    sanitized.email.password = '***HIDDEN***';
  }

  res.json(sanitized);
});

// Get cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cache.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache stats',
      message: error.message,
    });
  }
});

// Inspect cache keys
router.get('/cache/keys', async (req, res) => {
  try {
    const keys = await cache.getKeys();
    res.json({
      total: keys.length,
      keys: keys.slice(0, 100), // Limit to first 100 keys
      truncated: keys.length > 100,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache keys',
      message: error.message,
    });
  }
});

// Get specific cache value
router.get('/cache/get/:key', async (req, res) => {
  try {
    const value = await cache.get(req.params.key);
    res.json({
      key: req.params.key,
      value,
      exists: value !== null,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache value',
      message: error.message,
    });
  }
});

// Clear cache
router.post('/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;

    if (pattern) {
      await cache.del(pattern);
      res.json({ message: `Cache cleared for pattern: ${pattern}` });
    } else {
      await cache.flush();
      res.json({ message: 'All cache cleared' });
    }

    logger.audit('cache_cleared', req.user?.id || 'system', { pattern });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message,
    });
  }
});

// Get database schema
router.get('/db/schema', async (req, res) => {
  try {
    const models = {};

    // Get all Sequelize models
    Object.keys(sequelize.models).forEach(modelName => {
      const model = sequelize.models[modelName];
      models[modelName] = {
        tableName: model.tableName,
        attributes: Object.keys(model.rawAttributes).map(attr => ({
          name: attr,
          type: model.rawAttributes[attr].type?.key || 'UNKNOWN',
          allowNull: model.rawAttributes[attr].allowNull,
          defaultValue: model.rawAttributes[attr].defaultValue,
          primaryKey: model.rawAttributes[attr].primaryKey,
          unique: model.rawAttributes[attr].unique,
        })),
        associations: Object.keys(model.associations || {}).map(assoc => ({
          name: assoc,
          type: model.associations[assoc].associationType,
          target: model.associations[assoc].target.name,
        })),
      };
    });

    res.json({
      database: sequelize.config.database,
      dialect: sequelize.config.dialect,
      models,
      modelCount: Object.keys(models).length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get database schema',
      message: error.message,
    });
  }
});

// Run database query (read-only)
router.post('/db/query', async (req, res) => {
  try {
    const { query } = req.body;

    // Only allow SELECT queries
    if (!query || !query.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(400).json({
        error: 'Only SELECT queries are allowed',
      });
    }

    const [results, metadata] = await sequelize.query(query);

    res.json({
      results,
      rowCount: results.length,
      metadata,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Query failed',
      message: error.message,
    });
  }
});

// Seed database with test data
router.post('/db/seed', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Database seeding is not allowed in production',
    });
  }

  try {
    // Import seed data
    const seedData = require('../seeders/testData');
    await seedData.seed();

    res.json({
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString(),
    });

    logger.audit('database_seeded', req.user?.id || 'system');
  } catch (error) {
    res.status(500).json({
      error: 'Failed to seed database',
      message: error.message,
    });
  }
});

// Get recent logs
router.get('/logs/recent', async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    const logPath = path.join(__dirname, '../../../logs');

    // Read the most recent log file
    const files = await fs.readdir(logPath);
    const logFiles = files
      .filter(f => f.endsWith('.log'))
      .sort()
      .reverse();

    if (logFiles.length === 0) {
      return res.json({ logs: [], message: 'No log files found' });
    }

    const recentLog = await fs.readFile(path.join(logPath, logFiles[0]), 'utf8');
    const lines = recentLog.split('\n').filter(line => line.trim());

    // Parse and filter logs
    const logs = lines
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      })
      .filter(log => !level || log.level === level);

    res.json({
      file: logFiles[0],
      total: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read logs',
      message: error.message,
    });
  }
});

// Get system metrics
router.get('/metrics', (req, res) => {
  const metrics = {
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      cpus: os.cpus().length,
      totalmem: os.totalmem(),
      freemem: os.freemem(),
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      versions: process.versions,
    },
    app: {
      env: process.env.NODE_ENV,
      port: process.env.PORT,
      version: process.env.APP_VERSION || '1.0.0',
    },
    timestamp: new Date().toISOString(),
  };

  res.json(metrics);
});

// Test error handling
router.post('/test-error', (req, res) => {
  const { type = 'generic' } = req.body;

  logger.warn('Test error triggered', { type, userId: req.user?.id });

  switch (type) {
    case 'async':
      setTimeout(() => {
        throw new Error('Async test error');
      }, 100);
      res.json({ message: 'Async error triggered' });
      break;

    case 'promise':
      Promise.reject(new Error('Promise rejection test'));
      res.json({ message: 'Promise rejection triggered' });
      break;

    case 'syntax':
      eval('this is not valid javascript');
      break;

    case 'reference':
      nonExistentFunction();
      break;

    default:
      throw new Error('Generic test error');
  }
});

// Get session information
router.get('/session-info', (req, res) => {
  res.json({
    session: req.session,
    user: req.user
      ? {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        }
      : null,
    cookies: req.cookies,
    headers: req.headers,
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    secure: req.secure,
    xhr: req.xhr,
  });
});

// Health check with detailed info
router.get('/health-detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check database
  try {
    await sequelize.authenticate();
    health.checks.database = { status: 'healthy' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }

  // Check cache
  try {
    await cache.set('health-check', Date.now(), 10);
    const value = await cache.get('health-check');
    health.checks.cache = { status: value ? 'healthy' : 'unhealthy' };
  } catch (error) {
    health.checks.cache = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }

  // Check disk space
  const stats = await fs.stat(__dirname);
  health.checks.disk = {
    status: 'healthy',
    free: stats.blocks * stats.blksize,
  };

  // Memory check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'healthy' : 'warning',
    usage: memUsage,
  };

  res.json(health);
});

module.exports = router;
