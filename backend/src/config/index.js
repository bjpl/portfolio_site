require('dotenv').config();
const path = require('path');

// Environment detection
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const isDevelopment = environment === 'development';
const isTest = environment === 'test';

// Base configuration
const config = {
  environment,
  isProduction,
  isDevelopment,
  isTest,
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    host: process.env.HOST || 'localhost',
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:1313'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 100 : 1000, // requests per window
      standardHeaders: true,
      legacyHeaders: false
    },
    compression: {
      level: 6,
      threshold: 1024
    }
  },

  // Database configuration
  database: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'portfolio_cms',
    username: process.env.DB_USER || 'portfolio_user',
    password: process.env.DB_PASSWORD || 'portfolio_password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000
    },
    logging: isDevelopment ? console.log : false
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'portfolio:',
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000
  },

  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    }
  },

  // Email configuration
  email: {
    service: process.env.EMAIL_SERVICE || 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Portfolio CMS',
      address: process.env.EMAIL_FROM_ADDRESS || 'noreply@portfolio.com'
    },
    templates: {
      path: path.join(__dirname, '../../templates/emails'),
      engine: 'handlebars'
    },
    defaults: {
      subject: 'Portfolio CMS Notification',
      encoding: 'utf8'
    }
  },

  // File storage configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local', 's3', 'cloudinary'
    local: {
      uploadsPath: process.env.UPLOADS_PATH || path.join(__dirname, '../../../uploads'),
      publicPath: '/uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 50MB
      allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,svg,pdf,doc,docx').split(',')
    },
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET,
      acl: 'public-read'
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    }
  },

  // Search configuration
  search: {
    type: process.env.SEARCH_TYPE || 'memory', // 'memory', 'elasticsearch', 'algolia'
    elasticsearch: {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_AUTH ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      } : null,
      maxRetries: 3,
      requestTimeout: 30000,
      sniffOnStart: false,
      sniffOnConnectionFault: false
    },
    algolia: {
      applicationId: process.env.ALGOLIA_APPLICATION_ID,
      adminApiKey: process.env.ALGOLIA_ADMIN_API_KEY,
      searchApiKey: process.env.ALGOLIA_SEARCH_API_KEY,
      indexPrefix: process.env.ALGOLIA_INDEX_PREFIX || 'portfolio_'
    }
  },

  // Cache configuration
  cache: {
    type: process.env.CACHE_TYPE || 'redis', // 'memory', 'redis'
    ttl: {
      default: parseInt(process.env.CACHE_TTL_DEFAULT, 10) || 300, // 5 minutes
      short: parseInt(process.env.CACHE_TTL_SHORT, 10) || 60, // 1 minute
      medium: parseInt(process.env.CACHE_TTL_MEDIUM, 10) || 900, // 15 minutes
      long: parseInt(process.env.CACHE_TTL_LONG, 10) || 3600, // 1 hour
      veryLong: parseInt(process.env.CACHE_TTL_VERY_LONG, 10) || 86400 // 24 hours
    },
    keyPrefix: 'cache:',
    memory: {
      max: parseInt(process.env.CACHE_MEMORY_MAX, 10) || 500,
      maxAge: parseInt(process.env.CACHE_MEMORY_MAX_AGE, 10) || 300000
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: process.env.LOG_FORMAT || 'combined',
    directory: process.env.LOG_DIRECTORY || path.join(__dirname, '../../logs'),
    filename: process.env.LOG_FILENAME || 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    errorFilename: 'error-%DATE%.log',
    exceptionFilename: 'exceptions.log',
    rejectionFilename: 'rejections.log'
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: environment,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1
    },
    health: {
      endpoint: '/health',
      checks: {
        database: true,
        redis: true,
        disk: true,
        memory: true
      }
    }
  },

  // API configuration
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
    pagination: {
      defaultLimit: parseInt(process.env.API_DEFAULT_LIMIT, 10) || 20,
      maxLimit: parseInt(process.env.API_MAX_LIMIT, 10) || 100
    },
    documentation: {
      enabled: process.env.API_DOCS_ENABLED !== 'false',
      path: '/api-docs',
      title: 'Portfolio CMS API',
      version: '1.0.0',
      description: 'RESTful API for Portfolio Content Management System'
    }
  },

  // Features configuration
  features: {
    registration: process.env.FEATURE_REGISTRATION !== 'false',
    emailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
    twoFactorAuth: process.env.FEATURE_TWO_FACTOR_AUTH === 'true',
    passwordReset: process.env.FEATURE_PASSWORD_RESET !== 'false',
    fileUpload: process.env.FEATURE_FILE_UPLOAD !== 'false',
    search: process.env.FEATURE_SEARCH !== 'false',
    analytics: process.env.FEATURE_ANALYTICS === 'true',
    notifications: process.env.FEATURE_NOTIFICATIONS === 'true',
    workflows: process.env.FEATURE_WORKFLOWS === 'true',
    versioning: process.env.FEATURE_VERSIONING === 'true'
  },

  // Hugo configuration
  hugo: {
    contentPath: path.join(__dirname, '../../../content'),
    configPath: path.join(__dirname, '../../../config'),
    staticPath: path.join(__dirname, '../../../static'),
    publicPath: path.join(__dirname, '../../../public'),
    baseURL: process.env.HUGO_BASE_URL || 'http://localhost:1313',
    buildCommand: process.env.HUGO_BUILD_COMMAND || 'hugo --minify',
    serveCommand: process.env.HUGO_SERVE_COMMAND || 'hugo server -D',
    autoBuild: process.env.HUGO_AUTO_BUILD === 'true',
    autoReload: process.env.HUGO_AUTO_RELOAD !== 'false'
  },

  // Backup configuration
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: parseInt(process.env.BACKUP_RETENTION, 10) || 30, // 30 days
    s3: {
      bucket: process.env.BACKUP_S3_BUCKET,
      prefix: process.env.BACKUP_S3_PREFIX || 'backups/'
    }
  }
};

// Environment-specific overrides
if (isProduction) {
  // Production-specific configurations
  config.server.rateLimiting.max = 100;
  config.logging.level = 'info';
  config.features.emailVerification = true;
} else if (isDevelopment) {
  // Development-specific configurations
  config.server.rateLimiting.max = 1000;
  config.logging.level = 'debug';
  config.features.emailVerification = false;
} else if (isTest) {
  // Test-specific configurations
  config.database.name = 'portfolio_cms_test';
  config.redis.db = 1;
  config.logging.level = 'error';
  config.features.emailVerification = false;
}

// Validation
const validateConfig = () => {
  const errors = [];

  // Required environment variables
  if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
    if (!process.env.DB_PASSWORD) {
      errors.push('DB_PASSWORD must be set in production');
    }
    if (config.email.service === 'smtp' && !config.email.smtp.auth.user) {
      errors.push('SMTP credentials must be set when using SMTP email service');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
};

// Validate configuration
validateConfig();

module.exports = config;