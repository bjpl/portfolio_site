const path = require('path');

const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const config = {
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    port: parseInt(process.env.PORT) || 3333,
    host: process.env.HOST || 'localhost',
  },

  database: {
    type: process.env.DB_TYPE || 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'portfolio_db',
    user: process.env.DB_USER || 'portfolio_user',
    password: process.env.DB_PASSWORD || 'changeme',
    ssl: process.env.DB_SSL === 'true',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    keyPrefix: 'portfolio:',
    ttl: 3600, // 1 hour default TTL
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
  },

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:1313', 'http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    maxAge: 86400,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'md', 'txt', 'csv'],
    uploadDir: path.join(__dirname, '../../../static/uploads'),
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@portfolio.com',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '7d',
    colorize: process.env.NODE_ENV === 'development',
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    apmServiceName: process.env.APM_SERVICE_NAME || 'portfolio-site',
    apmEnvironment: process.env.APM_ENVIRONMENT || 'development',
  },

  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      bucketName: process.env.AWS_BUCKET_NAME || '',
      region: process.env.AWS_REGION || 'us-east-1',
    },
    cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  },

  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION === 'true',
    enableComments: process.env.ENABLE_COMMENTS === 'true',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  },

  api: {
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  },

  hugo: {
    environment: process.env.HUGO_ENVIRONMENT || 'development',
    baseUrl: process.env.HUGO_BASE_URL || 'http://localhost:1313',
  },
};

// Validate critical configuration
const validateConfig = () => {
  const errors = [];

  if (config.server.isProduction) {
    if (config.security.jwtSecret === 'default-jwt-secret-change-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
    if (config.security.sessionSecret === 'default-session-secret') {
      errors.push('SESSION_SECRET must be set in production');
    }
    if (!config.database.password || config.database.password === 'changeme') {
      errors.push('DB_PASSWORD must be set properly in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Run validation
validateConfig();

module.exports = config;
