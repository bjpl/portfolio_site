const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry
const initializeSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-critical errors in production
      if (process.env.NODE_ENV === 'production') {
        const error = hint.originalException;
        
        // Skip validation errors
        if (error && error.name === 'ValidationError') {
          return null;
        }
        
        // Skip 4xx client errors (except 401, 403)
        if (event.tags && event.tags.status_code) {
          const statusCode = parseInt(event.tags.status_code);
          if (statusCode >= 400 && statusCode < 500 && statusCode !== 401 && statusCode !== 403) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      // HTTP integration
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Express integration
      new Sentry.Integrations.Express({
        app,
        router: true,
      }),
      
      // Node.js integrations
      new Sentry.Integrations.OnUncaughtException({
        onFatalError: (err) => {
          console.error('Fatal error:', err);
          process.exit(1);
        },
      }),
      
      new Sentry.Integrations.OnUnhandledRejection({
        mode: 'warn',
      }),
      
      // Performance profiling
      nodeProfilingIntegration(),
      
      // Custom integration for database queries
      new Sentry.Integrations.Postgres(),
      new Sentry.Integrations.Mysql(),
    ],
    
    // Additional options
    serverName: process.env.SERVER_NAME || require('os').hostname(),
    attachStacktrace: true,
    sendDefaultPii: false,
    maxBreadcrumbs: 50,
    
    // Configure allowed URLs
    allowUrls: [
      /\/node_modules\/@sentry/,
      /\/src\//,
    ],
    
    // Configure ignored errors
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      /ChunkLoadError/,
      /Loading chunk \d+ failed/,
      /Can't resolve/,
    ],
  });

  // Set up request handler middleware (must be first)
  app.use(Sentry.Handlers.requestHandler({
    user: ['id', 'username', 'email'],
    request: ['method', 'url', 'headers', 'query_string'],
    serverName: false,
  }));

  // Set up tracing middleware
  app.use(Sentry.Handlers.tracingHandler());

  return Sentry;
};

// Custom error handler middleware (must be last)
const errorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only capture errors that should be reported
      if (error.status === 404) return false;
      if (error.status >= 400 && error.status < 500) return false;
      return true;
    },
  });
};

// Custom transaction naming for better organization
const setTransactionName = (req, res, next) => {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
  if (transaction) {
    transaction.setName(`${req.method} ${req.route?.path || req.path}`);
  }
  next();
};

// Custom context setting
const setSentryContext = (req, res, next) => {
  Sentry.configureScope((scope) => {
    // Set user context
    if (req.user) {
      scope.setUser({
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
      });
    }
    
    // Set request context
    scope.setTag('method', req.method);
    scope.setTag('url', req.originalUrl);
    scope.setTag('user_agent', req.get('User-Agent'));
    scope.setTag('ip', req.ip);
    
    // Set custom context
    scope.setContext('request', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });
  });
  
  next();
};

// Performance monitoring helpers
const capturePerformance = (name, operation) => {
  return Sentry.startTransaction({ name, op: operation });
};

const finishPerformance = (transaction, status = 'ok') => {
  transaction.setStatus(status);
  transaction.finish();
};

// Custom breadcrumb logging
const addBreadcrumb = (message, category = 'custom', level = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

// Business logic error tracking
const captureBusinessError = (error, context = {}) => {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'business');
    scope.setContext('business', context);
    Sentry.captureException(error);
  });
};

// Security event tracking
const captureSecurityEvent = (event, details = {}) => {
  Sentry.withScope((scope) => {
    scope.setTag('event_type', 'security');
    scope.setLevel('warning');
    scope.setContext('security', details);
    Sentry.captureMessage(event);
  });
};

module.exports = {
  initializeSentry,
  errorHandler,
  setTransactionName,
  setSentryContext,
  capturePerformance,
  finishPerformance,
  addBreadcrumb,
  captureBusinessError,
  captureSecurityEvent,
  Sentry,
};