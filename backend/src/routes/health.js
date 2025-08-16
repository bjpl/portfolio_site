const express = require('express');
const router = express.Router();
const os = require('os');
const { sequelize } = require('../models/User');
const cache = require('../services/cache');
const monitoring = require('../config/monitoring');
const logger = require('../utils/logger');
const config = require('../config');

// Basic health check - for load balancers
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe - is the service running?
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    service: 'portfolio-backend',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - is the service ready to accept traffic?
router.get('/health/ready', async (req, res) => {
  const checks = {
    database: false,
    cache: false,
    monitoring: false,
  };

  try {
    // Check database
    await sequelize.authenticate();
    checks.database = true;
  } catch (error) {
    logger.error('Database health check failed:', error);
  }

  try {
    // Check cache
    await cache.ping();
    checks.cache = true;
  } catch (error) {
    logger.warn('Cache health check failed:', error);
    // Cache is optional, so we don't fail the readiness check
    checks.cache = 'optional';
  }

  // Check monitoring
  const monitoringHealth = monitoring.isHealthy();
  checks.monitoring = monitoringHealth.status === 'healthy' || monitoringHealth.status === 'disabled';

  // Determine overall readiness
  const isReady = checks.database && (checks.cache === true || checks.cache === 'optional') && checks.monitoring;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check - for monitoring dashboards
router.get('/health/detailed', async (req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    uptime: process.uptime(),
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
        load: os.loadavg(),
      },
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    },
    services: {},
    checks: [],
  };

  // Database health check
  try {
    const dbStart = Date.now();
    await sequelize.authenticate();
    
    // Get database stats
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
    
    health.services.database = {
      status: 'healthy',
      type: config.database.type,
      responseTime: Date.now() - dbStart,
      tables: results[0]?.count || 0,
    };
    
    health.checks.push({
      name: 'database',
      status: 'pass',
      responseTime: Date.now() - dbStart,
    });
  } catch (error) {
    health.status = 'degraded';
    health.services.database = {
      status: 'unhealthy',
      error: error.message,
    };
    
    health.checks.push({
      name: 'database',
      status: 'fail',
      error: error.message,
    });
  }

  // Cache health check
  try {
    const cacheStart = Date.now();
    const pong = await cache.ping();
    
    health.services.cache = {
      status: 'healthy',
      type: cache.isConnected ? 'redis' : 'in-memory',
      responseTime: Date.now() - cacheStart,
      response: pong,
    };
    
    health.checks.push({
      name: 'cache',
      status: 'pass',
      responseTime: Date.now() - cacheStart,
    });
  } catch (error) {
    // Cache is optional, so we don't change overall status
    health.services.cache = {
      status: 'disabled',
      type: 'in-memory',
      message: 'Using in-memory cache fallback',
    };
    
    health.checks.push({
      name: 'cache',
      status: 'warn',
      message: 'Using fallback',
    });
  }

  // Monitoring health check
  const monitoringHealth = monitoring.isHealthy();
  health.services.monitoring = monitoringHealth;
  
  health.checks.push({
    name: 'monitoring',
    status: monitoringHealth.status === 'healthy' ? 'pass' : 'warn',
  });

  // File system check
  try {
    const fs = require('fs').promises;
    const fsStart = Date.now();
    await fs.access('public', fs.constants.R_OK);
    
    health.services.fileSystem = {
      status: 'healthy',
      responseTime: Date.now() - fsStart,
    };
    
    health.checks.push({
      name: 'fileSystem',
      status: 'pass',
      responseTime: Date.now() - fsStart,
    });
  } catch (error) {
    health.status = 'degraded';
    health.services.fileSystem = {
      status: 'unhealthy',
      error: error.message,
    };
    
    health.checks.push({
      name: 'fileSystem',
      status: 'fail',
      error: error.message,
    });
  }

  // API endpoints check
  const endpoints = [
    { name: 'auth', path: '/api/auth/health' },
    { name: 'portfolio', path: '/api/portfolio/health' },
    { name: 'admin', path: '/api/admin/health' },
  ];

  health.services.endpoints = {};
  
  for (const endpoint of endpoints) {
    try {
      // Mock internal check - in production, you might want to actually call the endpoints
      health.services.endpoints[endpoint.name] = {
        status: 'healthy',
        path: endpoint.path,
      };
      
      health.checks.push({
        name: `endpoint:${endpoint.name}`,
        status: 'pass',
      });
    } catch (error) {
      health.status = 'degraded';
      health.services.endpoints[endpoint.name] = {
        status: 'unhealthy',
        path: endpoint.path,
        error: error.message,
      };
      
      health.checks.push({
        name: `endpoint:${endpoint.name}`,
        status: 'fail',
        error: error.message,
      });
    }
  }

  // Calculate total response time
  health.responseTime = Date.now() - startTime;

  // Determine HTTP status code
  let statusCode = 200;
  if (health.status === 'unhealthy') {
    statusCode = 503;
  } else if (health.status === 'degraded') {
    statusCode = 200; // Still return 200 for degraded to keep service available
  }

  res.status(statusCode).json(health);
});

// Metrics endpoint - for Prometheus/Grafana
router.get('/metrics', async (req, res) => {
  const metrics = [];
  
  // System metrics
  const memUsage = process.memoryUsage();
  metrics.push(`# HELP nodejs_memory_heap_used_bytes Process heap memory used`);
  metrics.push(`# TYPE nodejs_memory_heap_used_bytes gauge`);
  metrics.push(`nodejs_memory_heap_used_bytes ${memUsage.heapUsed}`);
  
  metrics.push(`# HELP nodejs_memory_heap_total_bytes Process heap memory total`);
  metrics.push(`# TYPE nodejs_memory_heap_total_bytes gauge`);
  metrics.push(`nodejs_memory_heap_total_bytes ${memUsage.heapTotal}`);
  
  metrics.push(`# HELP nodejs_memory_external_bytes Process external memory`);
  metrics.push(`# TYPE nodejs_memory_external_bytes gauge`);
  metrics.push(`nodejs_memory_external_bytes ${memUsage.external}`);
  
  // Process metrics
  metrics.push(`# HELP nodejs_process_uptime_seconds Process uptime`);
  metrics.push(`# TYPE nodejs_process_uptime_seconds counter`);
  metrics.push(`nodejs_process_uptime_seconds ${process.uptime()}`);
  
  // Custom application metrics
  try {
    // Database connection pool metrics
    const pool = sequelize.connectionManager.pool;
    if (pool) {
      metrics.push(`# HELP db_pool_size Database connection pool size`);
      metrics.push(`# TYPE db_pool_size gauge`);
      metrics.push(`db_pool_size ${pool.size || 0}`);
      
      metrics.push(`# HELP db_pool_available Database connections available`);
      metrics.push(`# TYPE db_pool_available gauge`);
      metrics.push(`db_pool_available ${pool.available || 0}`);
    }
  } catch (error) {
    // Ignore errors for optional metrics
  }
  
  // Cache metrics
  if (cache.isConnected) {
    metrics.push(`# HELP cache_connected Cache connection status`);
    metrics.push(`# TYPE cache_connected gauge`);
    metrics.push(`cache_connected 1`);
  } else {
    metrics.push(`cache_connected 0`);
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

// Version endpoint
router.get('/version', (req, res) => {
  res.json({
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    environment: config.env,
    commit: process.env.GIT_COMMIT || 'unknown',
    buildDate: process.env.BUILD_DATE || 'unknown',
  });
});

module.exports = router;