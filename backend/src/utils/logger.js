const fs = require('fs');
const path = require('path');

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const config = require('../config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: config.logging.colorize }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Define transports
const transports = [];

// Console transport (always enabled in development)
if (config.server.isDevelopment || config.logging.level === 'debug') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level,
    })
  );
}

// File transport with daily rotation
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: config.logging.maxSize || '10m',
  maxFiles: config.logging.maxFiles || '7d',
  format,
  level: config.logging.level,
});

transports.push(fileRotateTransport);

// Error file transport
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: config.logging.maxSize || '10m',
  maxFiles: config.logging.maxFiles || '7d',
  format,
  level: 'error',
});

transports.push(errorFileTransport);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Add stream for Morgan HTTP logging
logger.stream = {
  write: message => {
    logger.http(message.trim());
  },
};

// Express middleware for request logging
logger.requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Add user info if authenticated
    if (req.user) {
      logData.userId = req.user.id;
      logData.userEmail = req.user.email;
    }

    // Choose log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client Error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

// Express middleware for error logging
logger.errorLogger = (err, req, res, next) => {
  const errorData = {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  // Add user info if authenticated
  if (req.user) {
    errorData.userId = req.user.id;
    errorData.userEmail = req.user.email;
  }

  logger.error('Application Error', errorData);
  next(err);
};

// Helper methods for structured logging
logger.logError = (message, error, metadata = {}) => {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    ...metadata,
  });
};

logger.logWarning = (message, metadata = {}) => {
  logger.warn(message, metadata);
};

logger.logInfo = (message, metadata = {}) => {
  logger.info(message, metadata);
};

logger.logDebug = (message, metadata = {}) => {
  logger.debug(message, metadata);
};

// Audit logging for sensitive operations
logger.audit = (action, userId, details = {}) => {
  logger.info('AUDIT', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Performance logging
logger.performance = (operation, duration, metadata = {}) => {
  logger.info('PERFORMANCE', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

// Database query logging
logger.query = (sql, duration, metadata = {}) => {
  if (config.server.isDevelopment || config.logging.level === 'debug') {
    logger.debug('DATABASE QUERY', {
      sql,
      duration: `${duration}ms`,
      ...metadata,
    });
  }
};

// Handle uncaught exceptions
if (!config.server.isTest) {
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason,
      promise,
    });
  });
}

// Export logger instance
module.exports = logger;
