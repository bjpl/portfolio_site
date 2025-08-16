const crypto = require('crypto');
const http = require('http');
const path = require('path');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const WebSocket = require('ws');

// Configuration
const config = require('./config');

// Logger
const logger = require('./utils/logger');

// Monitoring
const monitoring = require('./config/monitoring');

// Swagger documentation
const { swaggerSetup } = require('./utils/swagger');

// Security middleware

// Route authentication middleware
const { autoAuth, devToolsAuth, adminPanelAuth, trackApiUsage, publicCors } = require('./middleware/routeAuth');
const { applySecurity, corsOptions } = require('./middleware/security');

// Database
const { sequelize } = require('./models/User');

// Create Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize monitoring (Sentry)
monitoring.initialize(app);

// Apply security middleware
applySecurity(app);

// Sentry request handler (must be first)
if (monitoring.initialized) {
  app.use(monitoring.requestHandler());
  app.use(monitoring.tracingHandler());
}

// CORS - use public CORS for public routes
app.use(publicCors);

// Track API usage
app.use(trackApiUsage);

// Cookie parser
app.use(cookieParser());

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', { stream: logger.stream }));
app.use(logger.requestLogger);

// Public static files (always served)
app.use('/static', express.static(path.join(__dirname, '../../static/public')));
app.use('/uploads', express.static(path.join(__dirname, '../../static/uploads')));
app.use('/images', express.static(path.join(__dirname, '../../static/images')));

// Protected static files (require auth)
app.use('/admin', adminPanelAuth, express.static(path.join(__dirname, '../../static/admin')));
app.use('/tools', devToolsAuth, express.static(path.join(__dirname, '../../static/tools')));

// Setup API documentation
swaggerSetup(app);

// Import routes
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const bulkRoutes = require('./routes/bulk');
const contentRoutes = require('./routes/content');
const dashboardRoutes = require('./routes/dashboard');
const devRoutes = require('./routes/dev');
const healthRoutes = require('./routes/health');
const portfolioRoutes = require('./routes/portfolio');
const publicRoutes = require('./routes/public');
const reviewRoutes = require('./routes/review');
const translateRoutes = require('./routes/translate');
const usersRoutes = require('./routes/users');
const versioningRoutes = require('./routes/versioning');

// Health check routes (no auth required - must be before autoAuth)
app.use('/api', healthRoutes);

// Public API Routes (no auth required)
app.use('/api/public', publicRoutes);

// Apply automatic authentication for protected routes
app.use('/api', autoAuth);

// Mixed routes (public + protected based on endpoint)
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/translate', translateRoutes);

// Protected API Routes (auth required via autoAuth)
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/versions', versioningRoutes);

// Development routes (admin only in production)
if (config.server.isDevelopment || process.env.ENABLE_DEV_ROUTES === 'true') {
  app.use('/api/dev', devToolsAuth, devRoutes);
}

// Enhanced WebSocket management
const wsClients = new Map();

wss.on('connection', async (ws, req) => {
  const clientId = crypto.randomUUID();
  const clientInfo = {
    id: clientId,
    ws,
    userId: null,
    authenticated: false,
    subscriptions: new Set(),
  };

  wsClients.set(clientId, clientInfo);
  logger.info('WebSocket connection established', { clientId });

  ws.on('message', async message => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'authenticate':
          // Authenticate WebSocket connection
          if (data.token) {
            try {
              const decoded = jwt.verify(data.token, config.security.jwtSecret);
              clientInfo.userId = decoded.id;
              clientInfo.authenticated = true;
              ws.send(JSON.stringify({ type: 'authenticated', userId: decoded.id }));
            } catch (error) {
              ws.send(JSON.stringify({ type: 'auth-error', message: 'Invalid token' }));
            }
          }
          break;

        case 'subscribe':
          // Subscribe to specific channels
          if (data.channels && Array.isArray(data.channels)) {
            data.channels.forEach(channel => clientInfo.subscriptions.add(channel));
          }
          break;

        case 'build-status':
          // Broadcast build status to subscribed clients
          broadcastToChannel('build', {
            type: 'build-update',
            data: data.payload,
            userId: clientInfo.userId,
          });
          break;

        case 'content-update':
          // Notify about content changes
          broadcastToChannel('content', {
            type: 'content-changed',
            data: data.payload,
            userId: clientInfo.userId,
          });
          break;
      }
    } catch (error) {
      logger.error('WebSocket message error', { error: error.message, clientId });
    }
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    logger.info('WebSocket connection closed', { clientId });
  });

  ws.on('error', error => {
    logger.error('WebSocket error', { error: error.message, clientId });
  });
});

function broadcastToChannel(channel, data) {
  wsClients.forEach(client => {
    if (client.subscriptions.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.originalUrl} was not found`,
    timestamp: new Date(),
  });
});

// Error logging middleware
app.use(logger.errorLogger);

// Sentry error handler (must be before any other error middleware)
if (monitoring.initialized) {
  app.use(monitoring.errorHandler());
}

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Don't leak error details in production
  const response = {
    error: message,
    statusCode,
    timestamp: new Date(),
  };

  if (config.server.isDevelopment) {
    response.stack = err.stack;
    response.details = err;
  }

  res.status(statusCode).json(response);
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('Graceful shutdown initiated');

  // Close WebSocket connections
  wss.clients.forEach(client => {
    client.send(JSON.stringify({ type: 'server-shutdown' }));
    client.close();
  });

  // Close database connection
  await sequelize.close();

  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Initialize database and start server
async function startServer() {
  try {
    // Sync database (force: false to prevent table recreation)
    await sequelize.sync({ force: false });
    logger.info('Database synchronized');

    // Start server
    server.listen(config.server.port, () => {
      logger.info('🚀 Portfolio Backend Server Started', {
        port: config.server.port,
        environment: config.server.nodeEnv,
        adminUrl: `http://localhost:${config.server.port}/admin`,
        apiUrl: `http://localhost:${config.server.port}/api`,
        wsUrl: `ws://localhost:${config.server.port}`,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
