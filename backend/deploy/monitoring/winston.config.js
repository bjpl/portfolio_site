const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels and colors
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

winston.addColors(logLevels.colors);

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports array
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    })
  );
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Application logs with rotation
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      level: 'info',
      format: logFormat,
    })
  );

  // Error logs with rotation
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      level: 'error',
      format: logFormat,
    })
  );

  // HTTP access logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      level: 'http',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels.levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add performance logging
logger.performance = (label, startTime) => {
  const endTime = process.hrtime(startTime);
  const duration = endTime[0] * 1000 + endTime[1] * 1e-6;
  logger.info(`Performance: ${label} completed in ${duration.toFixed(2)}ms`);
};

// Add request logging middleware
logger.requestMiddleware = (req, res, next) => {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const endTime = process.hrtime(startTime);
    const duration = endTime[0] * 1000 + endTime[1] * 1e-6;
    
    logger.http({
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: parseFloat(duration.toFixed(2)),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
    });
  });
  
  next();
};

// Add structured logging methods
logger.audit = (action, userId, details = {}) => {
  logger.info({
    type: 'audit',
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
};

logger.security = (event, details = {}) => {
  logger.warn({
    type: 'security',
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

logger.business = (event, details = {}) => {
  logger.info({
    type: 'business',
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(process.env.LOG_DIR || './logs', 'exceptions.log'),
    format: logFormat,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(process.env.LOG_DIR || './logs', 'rejections.log'),
    format: logFormat,
  })
);

module.exports = logger;