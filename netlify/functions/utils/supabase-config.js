/**
 * Supabase Configuration and Environment Setup
 * Centralized configuration for Supabase authentication
 */

// Environment validation
function validateEnvironment() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URL format
  try {
    new URL(process.env.SUPABASE_URL);
  } catch (error) {
    throw new Error('SUPABASE_URL must be a valid URL');
  }

  // Validate keys are not empty
  if (process.env.SUPABASE_ANON_KEY.length < 100) {
    throw new Error('SUPABASE_ANON_KEY appears to be invalid');
  }

  if (process.env.SUPABASE_SERVICE_KEY.length < 100) {
    throw new Error('SUPABASE_SERVICE_KEY appears to be invalid');
  }
}

// Get configuration object
function getConfig() {
  validateEnvironment();

  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    
    // Site configuration
    siteUrl: process.env.URL || process.env.SITE_URL || 'http://localhost:3000',
    
    // Auth configuration
    auth: {
      // JWT settings
      jwt: {
        expiresIn: '1h',
        refreshThreshold: 300, // 5 minutes
        algorithm: 'HS256'
      },
      
      // Session settings
      session: {
        persistSession: true,
        storage: 'localStorage',
        storageKey: 'supabase-auth-session',
        autoRefresh: true
      },
      
      // OAuth settings
      oauth: {
        redirectTo: process.env.OAUTH_REDIRECT_URL || `${process.env.URL || 'http://localhost:3000'}/auth/callback`,
        providers: {
          github: {
            enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
          },
          google: {
            enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          },
          discord: {
            enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET
          },
          twitter: {
            enabled: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET
          }
        }
      },
      
      // Email settings
      email: {
        confirmSignup: true,
        confirmPasswordReset: true,
        templates: {
          confirmationSubject: 'Welcome! Please confirm your email',
          resetPasswordSubject: 'Reset your password',
          inviteSubject: 'You have been invited'
        }
      },
      
      // Security settings
      security: {
        captchaEnabled: process.env.ENABLE_CAPTCHA === 'true',
        captchaThreshold: parseInt(process.env.CAPTCHA_THRESHOLD) || 3,
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400, // 24 hours
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
        maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900 // 15 minutes
      }
    },

    // Rate limiting
    rateLimit: {
      // General API requests
      general: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      },
      
      // Authentication requests (more restrictive)
      auth: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5
      },
      
      // Password reset requests (very restrictive)
      passwordReset: {
        windowMs: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW) || 3600000, // 1 hour
        maxRequests: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS) || 3
      }
    },

    // Database settings
    database: {
      // Connection pool settings
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
      },
      
      // Query settings
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
      
      // SSL settings
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    },

    // Logging configuration
    logging: {
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
      enableConsole: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
      enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
      logFile: process.env.LOG_FILE || './logs/auth.log',
      
      // What to log
      logRequests: process.env.LOG_REQUESTS === 'true',
      logErrors: process.env.LOG_ERRORS !== 'false',
      logSqlQueries: process.env.LOG_SQL_QUERIES === 'true'
    },

    // CORS configuration
    cors: {
      origin: process.env.CORS_ORIGIN ? 
        process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
        ['http://localhost:3000', 'https://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'x-client-info',
        'apikey'
      ],
      credentials: true
    },

    // Development settings
    development: {
      enableDebugRoutes: process.env.NODE_ENV === 'development',
      mockServices: process.env.MOCK_SERVICES === 'true',
      seedDatabase: process.env.SEED_DATABASE === 'true'
    }
  };
}

// Get Supabase client options
function getSupabaseClientOptions(isServiceRole = false) {
  const config = getConfig();
  
  const baseOptions = {
    auth: {
      autoRefreshToken: !isServiceRole,
      persistSession: !isServiceRole && config.auth.session.persistSession,
      detectSessionInUrl: !isServiceRole
    },
    global: {
      headers: {
        'x-client-info': 'portfolio-auth/1.0.0'
      }
    }
  };

  if (isServiceRole) {
    // Service role client - no user session
    baseOptions.auth.persistSession = false;
    baseOptions.auth.autoRefreshToken = false;
  }

  return baseOptions;
}

// Get CORS headers
function getCORSHeaders() {
  const config = getConfig();
  
  return {
    'Access-Control-Allow-Origin': config.cors.origin.includes('*') ? '*' : 
      config.cors.origin.join(','),
    'Access-Control-Allow-Methods': config.cors.methods.join(','),
    'Access-Control-Allow-Headers': config.cors.allowedHeaders.join(','),
    'Access-Control-Allow-Credentials': config.cors.credentials.toString(),
    'Vary': 'Origin'
  };
}

// Environment-specific configurations
const environments = {
  development: {
    debug: true,
    logging: { level: 'debug' },
    cors: { origin: ['http://localhost:3000', 'https://localhost:3000'] }
  },
  
  staging: {
    debug: false,
    logging: { level: 'info' },
    cors: { origin: [process.env.STAGING_URL] }
  },
  
  production: {
    debug: false,
    logging: { level: 'warn' },
    cors: { origin: [process.env.PRODUCTION_URL] },
    security: {
      sessionTimeout: 86400, // 24 hours
      maxFailedAttempts: 3,
      lockoutDuration: 1800 // 30 minutes
    }
  }
};

// Get environment-specific config
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = getConfig();
  const envConfig = environments[env] || environments.development;

  return {
    ...baseConfig,
    ...envConfig,
    auth: { ...baseConfig.auth, ...envConfig.auth },
    security: { ...baseConfig.auth.security, ...envConfig.security },
    cors: { ...baseConfig.cors, ...envConfig.cors },
    logging: { ...baseConfig.logging, ...envConfig.logging }
  };
}

// Validate configuration at startup
function validateConfig() {
  try {
    const config = getConfig();
    
    // Check critical settings
    if (!config.url || !config.anonKey || !config.serviceKey) {
      throw new Error('Missing critical Supabase configuration');
    }
    
    // Validate rate limiting settings
    if (config.rateLimit.general.maxRequests <= 0) {
      throw new Error('Rate limit max requests must be positive');
    }
    
    // Validate OAuth configuration
    Object.entries(config.auth.oauth.providers).forEach(([provider, settings]) => {
      if (settings.enabled && (!settings.clientId || !settings.clientSecret)) {
        console.warn(`OAuth provider ${provider} is enabled but missing credentials`);
      }
    });
    
    console.log('✅ Configuration validated successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    return false;
  }
}

// Export configuration utilities
module.exports = {
  getConfig,
  getEnvironmentConfig,
  getSupabaseClientOptions,
  getCORSHeaders,
  validateConfig,
  validateEnvironment
};

// Validate configuration when module is loaded
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}