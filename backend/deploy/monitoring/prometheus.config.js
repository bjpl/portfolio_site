const client = require('prom-client');
const logger = require('./winston.config');

class PrometheusMetrics {
  constructor() {
    // Create a Registry to register the metrics
    this.register = new client.Registry();
    
    // Add default metrics
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'portfolio_backend_',
    });

    this.initializeMetrics();
  }

  initializeMetrics() {
    // HTTP Request metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'portfolio_backend_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5, 10],
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'portfolio_backend_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestSizeBytes = new client.Histogram({
      name: 'portfolio_backend_http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [1, 100, 1000, 10000, 100000, 1000000],
    });

    this.httpResponseSizeBytes = new client.Histogram({
      name: 'portfolio_backend_http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [1, 100, 1000, 10000, 100000, 1000000],
    });

    // Database metrics
    this.dbConnectionsActive = new client.Gauge({
      name: 'portfolio_backend_db_connections_active',
      help: 'Number of active database connections',
    });

    this.dbConnectionsIdle = new client.Gauge({
      name: 'portfolio_backend_db_connections_idle',
      help: 'Number of idle database connections',
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'portfolio_backend_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.dbQueriesTotal = new client.Counter({
      name: 'portfolio_backend_db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
    });

    // Cache metrics
    this.cacheHits = new client.Counter({
      name: 'portfolio_backend_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
    });

    this.cacheMisses = new client.Counter({
      name: 'portfolio_backend_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
    });

    this.cacheOperationDuration = new client.Histogram({
      name: 'portfolio_backend_cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'cache_name'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
    });

    // Application metrics
    this.activeUsers = new client.Gauge({
      name: 'portfolio_backend_active_users',
      help: 'Number of currently active users',
    });

    this.authenticationAttempts = new client.Counter({
      name: 'portfolio_backend_authentication_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['status'],
    });

    this.uploadedFiles = new client.Counter({
      name: 'portfolio_backend_uploaded_files_total',
      help: 'Total number of uploaded files',
      labelNames: ['file_type', 'status'],
    });

    this.uploadSizeBytes = new client.Histogram({
      name: 'portfolio_backend_upload_size_bytes',
      help: 'Size of uploaded files in bytes',
      labelNames: ['file_type'],
      buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600],
    });

    // Business metrics
    this.portfolioViews = new client.Counter({
      name: 'portfolio_backend_portfolio_views_total',
      help: 'Total number of portfolio views',
      labelNames: ['portfolio_id'],
    });

    this.projectViews = new client.Counter({
      name: 'portfolio_backend_project_views_total',
      help: 'Total number of project views',
      labelNames: ['project_id'],
    });

    this.contentOperations = new client.Counter({
      name: 'portfolio_backend_content_operations_total',
      help: 'Total number of content operations',
      labelNames: ['operation', 'content_type'],
    });

    // Error metrics
    this.errorsTotal = new client.Counter({
      name: 'portfolio_backend_errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'error_code'],
    });

    this.rateLimitExceeded = new client.Counter({
      name: 'portfolio_backend_rate_limit_exceeded_total',
      help: 'Total number of rate limit exceeded events',
      labelNames: ['endpoint'],
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestsTotal);
    this.register.registerMetric(this.httpRequestSizeBytes);
    this.register.registerMetric(this.httpResponseSizeBytes);
    this.register.registerMetric(this.dbConnectionsActive);
    this.register.registerMetric(this.dbConnectionsIdle);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.dbQueriesTotal);
    this.register.registerMetric(this.cacheHits);
    this.register.registerMetric(this.cacheMisses);
    this.register.registerMetric(this.cacheOperationDuration);
    this.register.registerMetric(this.activeUsers);
    this.register.registerMetric(this.authenticationAttempts);
    this.register.registerMetric(this.uploadedFiles);
    this.register.registerMetric(this.uploadSizeBytes);
    this.register.registerMetric(this.portfolioViews);
    this.register.registerMetric(this.projectViews);
    this.register.registerMetric(this.contentOperations);
    this.register.registerMetric(this.errorsTotal);
    this.register.registerMetric(this.rateLimitExceeded);

    logger.info('Prometheus metrics initialized');
  }

  // Middleware to collect HTTP metrics
  httpMetricsMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const method = req.method;
        const statusCode = res.statusCode.toString();
        
        // Record metrics
        this.httpRequestDuration.observe(
          { method, route, status_code: statusCode },
          duration
        );
        
        this.httpRequestsTotal.inc({
          method,
          route,
          status_code: statusCode,
        });
        
        // Request size
        if (req.get('content-length')) {
          this.httpRequestSizeBytes.observe(
            { method, route },
            parseInt(req.get('content-length'))
          );
        }
        
        // Response size
        if (res.get('content-length')) {
          this.httpResponseSizeBytes.observe(
            { method, route, status_code: statusCode },
            parseInt(res.get('content-length'))
          );
        }
      });
      
      next();
    };
  }

  // Database query metrics
  recordDbQuery(operation, table, duration, status = 'success') {
    this.dbQueryDuration.observe({ operation, table }, duration / 1000);
    this.dbQueriesTotal.inc({ operation, table, status });
  }

  // Cache metrics
  recordCacheHit(cacheName) {
    this.cacheHits.inc({ cache_name: cacheName });
  }

  recordCacheMiss(cacheName) {
    this.cacheMisses.inc({ cache_name: cacheName });
  }

  recordCacheOperation(operation, cacheName, duration) {
    this.cacheOperationDuration.observe(
      { operation, cache_name: cacheName },
      duration / 1000
    );
  }

  // Authentication metrics
  recordAuthAttempt(status) {
    this.authenticationAttempts.inc({ status });
  }

  // File upload metrics
  recordFileUpload(fileType, size, status = 'success') {
    this.uploadedFiles.inc({ file_type: fileType, status });
    if (status === 'success') {
      this.uploadSizeBytes.observe({ file_type: fileType }, size);
    }
  }

  // Business metrics
  recordPortfolioView(portfolioId) {
    this.portfolioViews.inc({ portfolio_id: portfolioId });
  }

  recordProjectView(projectId) {
    this.projectViews.inc({ project_id: projectId });
  }

  recordContentOperation(operation, contentType) {
    this.contentOperations.inc({ operation, content_type: contentType });
  }

  // Error metrics
  recordError(errorType, errorCode = 'unknown') {
    this.errorsTotal.inc({ error_type: errorType, error_code: errorCode });
  }

  recordRateLimitExceeded(endpoint) {
    this.rateLimitExceeded.inc({ endpoint });
  }

  // Update database connection metrics
  updateDbConnections(active, idle) {
    this.dbConnectionsActive.set(active);
    this.dbConnectionsIdle.set(idle);
  }

  // Update active users
  updateActiveUsers(count) {
    this.activeUsers.set(count);
  }

  // Get metrics for Prometheus endpoint
  getMetrics() {
    return this.register.metrics();
  }

  // Custom metrics collection
  async collectCustomMetrics() {
    try {
      // Collect any custom application-specific metrics
      logger.debug('Custom metrics collected');
    } catch (error) {
      logger.error('Error collecting custom metrics:', error);
    }
  }
}

// Create middleware for metrics endpoint
const createMetricsEndpoint = (metrics) => {
  const router = require('express').Router();
  
  router.get('/metrics', async (req, res) => {
    try {
      await metrics.collectCustomMetrics();
      res.set('Content-Type', metrics.register.contentType);
      res.end(await metrics.getMetrics());
    } catch (error) {
      logger.error('Metrics endpoint error:', error);
      res.status(500).send('Error collecting metrics');
    }
  });
  
  return router;
};

module.exports = {
  PrometheusMetrics,
  createMetricsEndpoint,
};