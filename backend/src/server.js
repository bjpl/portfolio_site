require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import configuration and utilities
const config = require('./config');
const logger = require('./utils/logger');
const { swaggerUi, swaggerSpec } = require('./utils/swagger');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');
const cacheMiddleware = require('./middleware/cache');

// Import services
const { initializeDatabase, syncDatabase, healthCheck: dbHealthCheck } = require('./config/database');
const emailService = require('./services/emailService');
const searchService = require('./services/searchService');
const cacheService = require('./services/cache');

// Import routes
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/api/portfolios');
const projectRoutes = require('./routes/api/projects');
const workflowRoutes = require('./routes/api/workflow');
const versionRoutes = require('./routes/api/versions');
const searchRoutes = require('./routes/api/search');
const healthRoutes = require('./routes/api/health');

// Initialize Express app
const app = express();

// Trust proxy for rate limiting and security headers
app.set('trust proxy', 1);

// Global middleware
app.use(helmet({
  contentSecurityPolicy: config.isProduction,
  crossOriginEmbedderPolicy: false
}));

app.use(cors(config.server.cors));
app.use(compression(config.server.compression));

// Rate limiting
const limiter = rateLimit(config.server.rateLimiting);
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Health check endpoint (before other middleware)
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbHealthCheck();
    const cacheHealth = await cacheService.healthCheck();
    const searchHealth = await searchService.healthCheck();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth,
        cache: cacheHealth,
        search: searchHealth,
        email: emailService.getStatus()
      },
      system: {
        node: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Determine overall health
    const allHealthy = Object.values(health.services).every(service => 
      service.status === 'healthy' || service.status === 'degraded'
    );

    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API Documentation
if (config.api.documentation.enabled) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  logger.info(`API documentation available at http://${config.server.host}:${config.server.port}/api-docs`);
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/health', healthRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: config.api.documentation.title,
    version: config.api.documentation.version,
    description: config.api.documentation.description,
    documentation: config.api.documentation.enabled ? '/api-docs' : null,
    endpoints: {
      auth: '/api/auth',
      portfolios: '/api/portfolios',
      projects: '/api/projects',
      workflow: '/api/workflow',
      versions: '/api/versions',
      search: '/api/search',
      health: '/api/health'
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint not found: ${req.method} ${req.path}`,
    availableEndpoints: ['/api/auth', '/api/portfolios', '/api/projects', '/api/workflow', '/api/versions', '/api/search']
  });
});

// Global error handler
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  const services = [];

  try {
    // Initialize database
    logger.info('Initializing database...');
    await initializeDatabase();
    
    if (config.isDevelopment) {
      await syncDatabase(false, true); // alter tables in development
    }
    services.push('Database');

    // Initialize cache service
    logger.info('Initializing cache service...');
    await cacheService.initialize();
    services.push('Cache');

    // Initialize email service
    logger.info('Initializing email service...');
    await emailService.initialize();
    services.push('Email');

    // Initialize search service
    logger.info('Initializing search service...');
    await searchService.initialize();
    services.push('Search');

    logger.info(`Successfully initialized services: ${services.join(', ')}`);
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connections
    const { closeDatabase } = require('./config/database');
    await closeDatabase();
    
    // Close cache connections
    await cacheService.close();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    // Initialize all services
    await initializeServices();
    
    // Start listening
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 Server running on http://${config.server.host}:${config.server.port}`);
      logger.info(`📝 Environment: ${config.environment}`);
      logger.info(`📚 API Documentation: http://${config.server.host}:${config.server.port}/api-docs`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.server.port} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };