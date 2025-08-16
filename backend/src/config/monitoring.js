const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const config = require('./index');
const logger = require('../utils/logger');

class MonitoringService {
  constructor() {
    this.initialized = false;
  }

  initialize(app) {
    // Skip if no DSN configured
    if (!config.monitoring?.sentryDsn) {
      logger.info('Sentry monitoring not configured');
      return;
    }

    try {
      Sentry.init({
        dsn: config.monitoring.sentryDsn,
        integrations: [
          // Enable HTTP calls tracing
          new Sentry.Integrations.Http({ tracing: true }),
          // Enable Express.js middleware tracing
          new Sentry.Integrations.Express({ app }),
          // Enable profiling
          nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: config.env === 'production' ? 0.1 : 1.0,
        // Profiling
        profilesSampleRate: config.env === 'production' ? 0.1 : 1.0,
        // Environment
        environment: config.env,
        // Release tracking
        release: process.env.npm_package_version,
        // Before send hook
        beforeSend(event, hint) {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers?.authorization;
            delete event.request.headers?.cookie;
          }
          
          // Don't send events in test environment
          if (config.env === 'test') {
            return null;
          }
          
          return event;
        },
        // Ignore certain errors
        ignoreErrors: [
          // Browser errors
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          // Network errors
          'Network request failed',
          'NetworkError',
          'Failed to fetch',
          // Common non-critical errors
          'AbortError',
          'Non-Error promise rejection',
        ],
      });

      this.initialized = true;
      logger.info('Sentry monitoring initialized');
    } catch (error) {
      logger.error('Failed to initialize Sentry:', error);
    }
  }

  // Capture exception
  captureException(error, context = {}) {
    if (!this.initialized) return;
    
    Sentry.withScope((scope) => {
      // Add context
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
      
      // Capture the exception
      Sentry.captureException(error);
    });
  }

  // Capture message
  captureMessage(message, level = 'info', context = {}) {
    if (!this.initialized) return;
    
    Sentry.withScope((scope) => {
      // Add context
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
      
      // Capture the message
      Sentry.captureMessage(message, level);
    });
  }

  // Add user context
  setUser(user) {
    if (!this.initialized) return;
    
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      ip_address: user.ipAddress,
    });
  }

  // Clear user context
  clearUser() {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb) {
    if (!this.initialized) return;
    Sentry.addBreadcrumb(breadcrumb);
  }

  // Start transaction for performance monitoring
  startTransaction(name, op = 'http.server') {
    if (!this.initialized) return null;
    
    return Sentry.startTransaction({
      op,
      name,
    });
  }

  // Custom metrics
  recordMetric(name, value, unit = 'none', tags = {}) {
    if (!this.initialized) return;
    
    // Send custom metric to Sentry
    this.captureMessage(`Metric: ${name}`, 'info', {
      metric: {
        name,
        value,
        unit,
        tags,
      },
    });
  }

  // Health check for monitoring service
  isHealthy() {
    return {
      service: 'monitoring',
      status: this.initialized ? 'healthy' : 'disabled',
      sentryEnabled: this.initialized,
    };
  }

  // Express error handler middleware
  errorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture 4xx and 5xx errors
        if (error.status >= 400) {
          return true;
        }
        return false;
      },
    });
  }

  // Express request handler middleware
  requestHandler() {
    return Sentry.Handlers.requestHandler({
      user: ['id', 'email', 'username'],
      ip: true,
    });
  }

  // Express tracing handler middleware
  tracingHandler() {
    return Sentry.Handlers.tracingHandler();
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

module.exports = monitoring;