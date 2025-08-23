const { promisify } = require('util');
const logger = require('./winston.config');

class HealthCheckManager {
  constructor() {
    this.checks = new Map();
    this.isShuttingDown = false;
    this.healthCheckInterval = null;
    
    // Default configuration
    this.config = {
      interval: process.env.HEALTH_CHECK_INTERVAL || 30000,
      timeout: process.env.HEALTH_CHECK_TIMEOUT || 5000,
      retries: process.env.HEALTH_CHECK_RETRIES || 3,
      gracefulShutdownTimeout: 30000,
    };
  }

  // Register a health check
  register(name, checkFunction, options = {}) {
    if (typeof checkFunction !== 'function') {
      throw new Error('Health check must be a function');
    }

    this.checks.set(name, {
      name,
      check: checkFunction,
      timeout: options.timeout || this.config.timeout,
      retries: options.retries || this.config.retries,
      critical: options.critical !== false,
      lastResult: null,
      lastCheck: null,
      consecutiveFailures: 0,
    });

    logger.info(`Health check registered: ${name}`);
  }

  // Execute a single health check
  async executeCheck(checkConfig) {
    const { name, check, timeout, retries } = checkConfig;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.withTimeout(check(), timeout);
        
        // Successful check
        checkConfig.lastResult = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          attempt,
          details: result || {},
        };
        
        checkConfig.lastCheck = Date.now();
        checkConfig.consecutiveFailures = 0;
        
        return checkConfig.lastResult;
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }

    // Failed check
    checkConfig.consecutiveFailures++;
    checkConfig.lastResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: lastError.message,
        stack: lastError.stack,
        code: lastError.code,
      },
      attempts: retries,
    };
    
    checkConfig.lastCheck = Date.now();
    return checkConfig.lastResult;
  }

  // Execute all health checks
  async executeAll() {
    if (this.isShuttingDown) {
      return {
        status: 'shutting_down',
        timestamp: new Date().toISOString(),
        checks: {},
      };
    }

    const results = {};
    const promises = Array.from(this.checks.values()).map(async (checkConfig) => {
      try {
        const result = await this.executeCheck(checkConfig);
        results[checkConfig.name] = result;
      } catch (error) {
        logger.error(`Health check ${checkConfig.name} failed:`, error);
        results[checkConfig.name] = {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: {
            message: error.message,
            stack: error.stack,
          },
        };
      }
    });

    await Promise.all(promises);

    // Determine overall health status
    const healthyChecks = Object.values(results).filter(r => r.status === 'healthy');
    const criticalChecks = Array.from(this.checks.values())
      .filter(c => c.critical)
      .map(c => results[c.name]);
    
    const criticalUnhealthy = criticalChecks.filter(r => r.status !== 'healthy');
    
    let overallStatus = 'healthy';
    if (criticalUnhealthy.length > 0) {
      overallStatus = 'unhealthy';
    } else if (healthyChecks.length < Object.keys(results).length) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      summary: {
        total: Object.keys(results).length,
        healthy: healthyChecks.length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length,
        errors: Object.values(results).filter(r => r.status === 'error').length,
      },
    };
  }

  // Get quick health status (liveness probe)
  async getHealthStatus() {
    try {
      const result = await this.executeAll();
      return {
        status: result.status === 'unhealthy' ? 'unhealthy' : 'healthy',
        timestamp: result.timestamp,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  // Get detailed ready status (readiness probe)
  async getReadyStatus() {
    const result = await this.executeAll();
    return result;
  }

  // Start periodic health checks
  startPeriodicChecks() {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const result = await this.executeAll();
        
        if (result.status === 'unhealthy') {
          logger.warn('Health check failed:', result);
        } else {
          logger.debug('Health check passed:', {
            status: result.status,
            healthy: result.summary.healthy,
            total: result.summary.total,
          });
        }
      } catch (error) {
        logger.error('Periodic health check error:', error);
      }
    }, this.config.interval);

    logger.info(`Periodic health checks started (interval: ${this.config.interval}ms)`);
  }

  // Stop periodic health checks
  stopPeriodicChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Periodic health checks stopped');
    }
  }

  // Graceful shutdown
  async gracefulShutdown() {
    logger.info('Starting graceful shutdown...');
    this.isShuttingDown = true;
    
    this.stopPeriodicChecks();
    
    // Wait for ongoing requests to complete
    await this.sleep(this.config.gracefulShutdownTimeout);
    
    logger.info('Graceful shutdown completed');
  }

  // Utility methods
  async withTimeout(promise, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default health checks
const setupDefaultHealthChecks = (app, dependencies = {}) => {
  const healthCheck = new HealthCheckManager();

  // Application health check
  healthCheck.register('application', async () => {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      version: process.env.npm_package_version || '1.0.0',
    };
  });

  // Database health check
  if (dependencies.database) {
    healthCheck.register('database', async () => {
      await dependencies.database.authenticate();
      
      const result = await dependencies.database.query('SELECT 1 as health_check');
      
      return {
        connected: true,
        query_result: result[0],
        dialect: dependencies.database.getDialect(),
      };
    }, { critical: true });
  }

  // Redis health check
  if (dependencies.redis) {
    healthCheck.register('redis', async () => {
      const result = await dependencies.redis.ping();
      
      return {
        connected: true,
        ping_result: result,
        memory_usage: await dependencies.redis.memory('usage'),
      };
    }, { critical: false });
  }

  // External API health check
  if (dependencies.externalAPIs) {
    Object.entries(dependencies.externalAPIs).forEach(([name, api]) => {
      healthCheck.register(`external_api_${name}`, async () => {
        const response = await fetch(api.healthUrl, {
          method: 'GET',
          timeout: 5000,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return {
          status: response.status,
          url: api.healthUrl,
        };
      }, { critical: false });
    });
  }

  // File system health check
  healthCheck.register('filesystem', async () => {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    
    const testFile = path.join(os.tmpdir(), 'health-check-test.txt');
    const testData = `health-check-${Date.now()}`;
    
    // Write test
    await fs.writeFile(testFile, testData);
    
    // Read test
    const readData = await fs.readFile(testFile, 'utf8');
    
    // Cleanup
    await fs.unlink(testFile);
    
    if (readData !== testData) {
      throw new Error('File system read/write test failed');
    }
    
    return {
      read_write: true,
      temp_dir: os.tmpdir(),
    };
  });

  return healthCheck;
};

// Express middleware for health endpoints
const createHealthEndpoints = (healthCheck) => {
  const router = require('express').Router();

  // Liveness probe - simple health check
  router.get('/health', async (req, res) => {
    try {
      const result = await healthCheck.getHealthStatus();
      const statusCode = result.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Health endpoint error:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Readiness probe - detailed health check
  router.get('/health/ready', async (req, res) => {
    try {
      const result = await healthCheck.getReadyStatus();
      const statusCode = result.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Ready endpoint error:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Detailed health check for monitoring
  router.get('/health/detail', async (req, res) => {
    try {
      const result = await healthCheck.getReadyStatus();
      res.json(result);
    } catch (error) {
      logger.error('Detail endpoint error:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  return router;
};

module.exports = {
  HealthCheckManager,
  setupDefaultHealthChecks,
  createHealthEndpoints,
};