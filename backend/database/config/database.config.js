/**
 * Database Configuration for Portfolio Site
 * Supports multiple environments with SSL, connection pooling, and backup strategies
 */

const path = require('path');

const config = {
  // Environment Detection
  environment: process.env.NODE_ENV || 'development',
  
  // Database Connection Settings
  database: {
    // Primary Database (PostgreSQL for production, SQLite for development)
    primary: {
      provider: process.env.DATABASE_PROVIDER || 'postgresql',
      url: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      name: process.env.DB_NAME || 'portfolio_db',
      username: process.env.DB_USER || 'portfolio_user',
      password: process.env.DB_PASSWORD || 'portfolio_password',
      schema: process.env.DB_SCHEMA || 'public'
    },
    
    // Test Database
    test: {
      provider: 'sqlite',
      url: 'file:./test.db',
      name: 'test_portfolio_db'
    },
    
    // Development Database
    development: {
      provider: 'sqlite',
      url: 'file:./dev.db',
      name: 'dev_portfolio_db'
    }
  },
  
  // Connection Pool Settings
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    evict: parseInt(process.env.DB_POOL_EVICT) || 1000,
    handleDisconnects: true
  },
  
  // SSL Configuration
  ssl: {
    enabled: process.env.DB_SSL_ENABLED === 'true',
    require: process.env.DB_SSL_REQUIRE === 'true',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_SSL_CA || null,
    cert: process.env.DB_SSL_CERT || null,
    key: process.env.DB_SSL_KEY || null
  },
  
  // Migration Settings
  migrations: {
    directory: path.join(__dirname, '../migrations'),
    tableName: '_migrations',
    schemaName: process.env.DB_SCHEMA || 'public'
  },
  
  // Seed Settings
  seeds: {
    directory: path.join(__dirname, '../seeds'),
    loadExtensions: ['.js', '.ts']
  },
  
  // Backup Configuration
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    directory: path.join(__dirname, '../backup'),
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: {
      daily: parseInt(process.env.BACKUP_DAILY_RETENTION) || 7,
      weekly: parseInt(process.env.BACKUP_WEEKLY_RETENTION) || 4,
      monthly: parseInt(process.env.BACKUP_MONTHLY_RETENTION) || 12
    },
    compression: process.env.BACKUP_COMPRESSION !== 'false',
    encryption: {
      enabled: process.env.BACKUP_ENCRYPTION === 'true',
      key: process.env.BACKUP_ENCRYPTION_KEY
    }
  },
  
  // Logging Configuration
  logging: {
    enabled: process.env.DB_LOGGING !== 'false',
    level: process.env.DB_LOG_LEVEL || 'info',
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD) || 1000,
    logQueries: process.env.NODE_ENV === 'development'
  },
  
  // Performance Settings
  performance: {
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
    transactionTimeout: parseInt(process.env.DB_TRANSACTION_TIMEOUT) || 60000,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 100,
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 300000
  },
  
  // Feature Flags
  features: {
    enableAuditLogs: process.env.ENABLE_AUDIT_LOGS !== 'false',
    enableSoftDeletes: process.env.ENABLE_SOFT_DELETES !== 'false',
    enableVersioning: process.env.ENABLE_VERSIONING !== 'false',
    enableFullTextSearch: process.env.ENABLE_FULLTEXT_SEARCH === 'true',
    enableJsonColumns: process.env.ENABLE_JSON_COLUMNS !== 'false'
  },
  
  // Cache Settings
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL) || 3600,
    prefix: process.env.CACHE_PREFIX || 'portfolio:',
    keyGenerator: (table, query) => `${table}:${JSON.stringify(query)}`
  }
};

// Environment-specific overrides
const environmentConfigs = {
  production: {
    database: {
      primary: {
        provider: 'postgresql',
        ssl: { enabled: true, require: true }
      }
    },
    pool: {
      max: 50,
      min: 5
    },
    logging: {
      enabled: true,
      level: 'warn',
      logQueries: false
    },
    backup: {
      enabled: true
    }
  },
  
  staging: {
    database: {
      primary: {
        provider: 'postgresql'
      }
    },
    logging: {
      level: 'info'
    }
  },
  
  development: {
    database: {
      primary: {
        provider: 'sqlite',
        url: 'file:./dev.db'
      }
    },
    logging: {
      logQueries: true
    }
  },
  
  test: {
    database: {
      primary: {
        provider: 'sqlite',
        url: 'file::memory:'
      }
    },
    logging: {
      enabled: false
    }
  }
};

// Apply environment-specific config
if (environmentConfigs[config.environment]) {
  Object.assign(config, mergeDeep(config, environmentConfigs[config.environment]));
}

// Helper function for deep merging
function mergeDeep(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Generate DATABASE_URL for Prisma
function generateDatabaseUrl() {
  const db = config.database.primary;
  
  if (db.url) {
    return db.url;
  }
  
  switch (db.provider) {
    case 'postgresql':
      return `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.name}?schema=${db.schema}`;
    case 'mysql':
      return `mysql://${db.username}:${db.password}@${db.host}:${db.port}/${db.name}`;
    case 'sqlite':
      return `file:./${db.name}.db`;
    default:
      throw new Error(`Unsupported database provider: ${db.provider}`);
  }
}

// Export configuration
module.exports = {
  ...config,
  getDatabaseUrl: generateDatabaseUrl,
  
  // Prisma-specific configuration
  prisma: {
    datasource: {
      provider: config.database.primary.provider,
      url: generateDatabaseUrl()
    },
    generator: {
      provider: 'prisma-client-js',
      output: path.join(__dirname, '../generated/client')
    }
  },
  
  // Connection string for direct usage
  connectionString: generateDatabaseUrl()
};