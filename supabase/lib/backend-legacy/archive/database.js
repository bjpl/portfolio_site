const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('../utils/logger');

// Database configuration based on environment
const dbConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.username,
  password: config.database.password,
  dialect: config.database.dialect,
  logging: config.environment === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: config.database.pool.max,
    min: config.database.pool.min,
    acquire: config.database.pool.acquire,
    idle: config.database.pool.idle
  },
  define: {
    underscored: false,
    freezeTableName: true,
    charset: 'utf8mb4',
    dialectOptions: {
      collate: 'utf8mb4_unicode_ci'
    }
  },
  dialectOptions: {
    ssl: config.database.ssl ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
  },
  retry: {
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/
    ],
    max: 3
  },
  benchmark: config.environment === 'development'
};

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    return false;
  }
};

// Initialize database with retry logic
const initializeDatabase = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connected = await testConnection();
      if (connected) {
        logger.info('Database initialized successfully');
        return true;
      }
    } catch (error) {
      logger.warn(`Database connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        logger.error('Failed to initialize database after all retries');
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  return false;
};

// Sync database models
const syncDatabase = async (force = false, alter = false) => {
  try {
    const syncOptions = { force, alter };
    
    if (config.environment === 'production' && force) {
      throw new Error('Cannot use force sync in production');
    }

    await sequelize.sync(syncOptions);
    logger.info(`Database synced successfully ${force ? '(forced)' : alter ? '(altered)' : ''}`);
    return true;
  } catch (error) {
    logger.error('Database sync failed:', error);
    throw error;
  }
};

// Close database connection
const closeDatabase = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Database health check
const healthCheck = async () => {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query('SELECT 1 as health');
    return {
      status: 'healthy',
      connection: 'active',
      timestamp: new Date().toISOString(),
      details: results[0]
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connection: 'failed',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Get database statistics
const getDatabaseStats = async () => {
  try {
    const stats = {};
    
    // Get table counts
    const models = Object.keys(sequelize.models);
    for (const modelName of models) {
      const model = sequelize.models[modelName];
      stats[modelName] = await model.count();
    }

    // Get database size (PostgreSQL specific)
    if (config.database.dialect === 'postgres') {
      const [sizeResult] = await sequelize.query(
        `SELECT pg_size_pretty(pg_database_size('${config.database.name}')) as size`
      );
      stats.databaseSize = sizeResult[0].size;
    }

    return {
      tables: stats,
      connectionPool: {
        total: sequelize.connectionManager.pool.max,
        used: sequelize.connectionManager.pool.used,
        waiting: sequelize.connectionManager.pool.pending
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    throw error;
  }
};

// Transaction wrapper
const withTransaction = async (callback, options = {}) => {
  const transaction = await sequelize.transaction(options);
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Query with retry logic
const queryWithRetry = async (sql, options = {}, retries = 3) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await sequelize.query(sql, options);
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        logger.warn(`Query attempt ${i + 1} failed, retrying:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

// Export sequelize instance and utility functions
module.exports = sequelize;
module.exports.sequelize = sequelize;
module.exports.testConnection = testConnection;
module.exports.initializeDatabase = initializeDatabase;
module.exports.syncDatabase = syncDatabase;
module.exports.closeDatabase = closeDatabase;
module.exports.healthCheck = healthCheck;
module.exports.getDatabaseStats = getDatabaseStats;
module.exports.withTransaction = withTransaction;
module.exports.queryWithRetry = queryWithRetry;