/**
 * Migration Executor Configuration
 * Centralized configuration for the migration execution system
 */

export const MigrationConfig = {
  // Database connection settings
  database: {
    maxRetries: 3,
    retryDelay: 1000,
    connectionTimeout: 30000,
    queryTimeout: 60000,
    poolSize: 5
  },

  // Migration execution settings
  execution: {
    batchSize: 10,
    parallelExecution: false,
    validateAfterEach: true,
    createBackupBeforeRun: true,
    stopOnFirstError: true,
    dryRun: false
  },

  // Rollback configuration
  rollback: {
    autoGenerateRollbacks: true,
    confirmBeforeRollback: true,
    createBackupBeforeRollback: true,
    maxRollbackSteps: 50
  },

  // Logging configuration
  logging: {
    level: 'info', // debug, info, warning, error
    logToFile: true,
    logToConsole: true,
    includeStackTrace: true,
    logDirectory: './logs',
    maxLogFiles: 10,
    maxLogSizeMB: 10
  },

  // Backup configuration
  backup: {
    enabled: true,
    directory: './backups',
    compression: true,
    retentionDays: 30,
    includeSchema: true,
    includeData: false // For migrations, usually schema only
  },

  // Validation rules
  validation: {
    checkSyntax: true,
    validateReferences: true,
    checkConstraints: true,
    verifyIndexes: true,
    testQueries: [
      'SELECT 1',
      'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\''
    ]
  },

  // File patterns and paths
  paths: {
    migrationDirectory: '../supabase/migrations',
    backupDirectory: '../backups',
    logDirectory: '../logs',
    configDirectory: '../config'
  },

  // Migration file patterns
  patterns: {
    migrationFiles: /^\d{14}_.*\.sql$/,
    rollbackFiles: /^\d{14}_.*_rollback\.sql$/,
    excludeFiles: ['legacy/', 'archive/', 'temp/']
  },

  // Environment-specific settings
  environments: {
    development: {
      strictMode: false,
      allowDestructiveOperations: true,
      debugLevel: 'debug'
    },
    staging: {
      strictMode: true,
      allowDestructiveOperations: false,
      debugLevel: 'info'
    },
    production: {
      strictMode: true,
      allowDestructiveOperations: false,
      debugLevel: 'warning',
      requireApproval: true
    }
  },

  // Security settings
  security: {
    allowDropStatements: false,
    allowTruncateStatements: false,
    requireServiceKey: true,
    validateChecksums: true,
    auditTrail: true
  },

  // Performance monitoring
  performance: {
    trackExecutionTime: true,
    logSlowQueries: true,
    slowQueryThreshold: 5000, // ms
    memoryMonitoring: true
  },

  // Notification settings
  notifications: {
    enabled: false,
    webhook: null,
    email: null,
    onSuccess: true,
    onFailure: true,
    onRollback: true
  },

  // Integration settings
  integrations: {
    claudeFlow: {
      enabled: true,
      useHooks: true,
      memoryKey: 'swarm/migration/executor'
    },
    git: {
      enabled: false,
      autoCommit: false,
      tagReleases: false
    }
  }
};

/**
 * Get configuration for specific environment
 */
export function getEnvironmentConfig(env = 'development') {
  const baseConfig = { ...MigrationConfig };
  const envConfig = MigrationConfig.environments[env] || {};
  
  return {
    ...baseConfig,
    ...envConfig,
    environment: env
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config) {
  const errors = [];

  // Required fields
  const required = [
    'database.maxRetries',
    'execution.batchSize',
    'paths.migrationDirectory'
  ];

  for (const field of required) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    if (value === undefined || value === null) {
      errors.push(`Missing required configuration: ${field}`);
    }
  }

  // Validation rules
  if (config.database?.maxRetries < 1) {
    errors.push('database.maxRetries must be at least 1');
  }

  if (config.execution?.batchSize < 1) {
    errors.push('execution.batchSize must be at least 1');
  }

  if (config.backup?.retentionDays < 1) {
    errors.push('backup.retentionDays must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default MigrationConfig;