/**
 * Frontend Supabase Configuration
 * Client-side configuration for Supabase authentication
 * Note: Only includes public configuration, no sensitive keys
 */

// Default Supabase configuration for the new instance
window.SUPABASE_CONFIG = {
  // Public configuration only - no sensitive keys
  url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
  // Anon key for client-side authentication
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
  
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
      redirectTo: window.location.origin + '/auth/callback',
      providers: {
        github: { enabled: false },
        google: { enabled: false },
        discord: { enabled: false },
        twitter: { enabled: false }
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
    
    // Security settings (client-side validation)
    security: {
      passwordMinLength: 8,
      sessionTimeout: 86400, // 24 hours
      maxFailedAttempts: 5,
      lockoutDuration: 900 // 15 minutes
    }
  },

  // Rate limiting (informational for client)
  rateLimit: {
    general: {
      windowMs: 60000, // 1 minute
      maxRequests: 100
    },
    auth: {
      windowMs: 900000, // 15 minutes
      maxRequests: 5
    },
    passwordReset: {
      windowMs: 3600000, // 1 hour
      maxRequests: 3
    }
  },

  // Development settings
  development: {
    enableDebugRoutes: false,
    mockServices: false
  }
};

// Validation function for client-side config
window.validateSupabaseConfig = function() {
  const config = window.SUPABASE_CONFIG;
  
  if (!config.url) {
    console.error('Supabase URL not configured');
    return false;
  }
  
  if (!config.anonKey || config.anonKey.includes('{{')) {
    console.warn('Supabase anonymous key not properly configured');
    return false;
  }
  
  try {
    new URL(config.url);
  } catch (error) {
    console.error('Invalid Supabase URL:', error);
    return false;
  }
  
  console.log('✅ Client-side Supabase configuration validated');
  return true;
};

// Get Supabase client options for frontend use
window.getSupabaseClientOptions = function() {
  const config = window.SUPABASE_CONFIG;
  
  return {
    auth: {
      autoRefreshToken: config.auth.session.autoRefresh,
      persistSession: config.auth.session.persistSession,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: config.auth.session.storageKey
    },
    global: {
      headers: {
        'x-client-info': 'portfolio-frontend/1.0.0'
      }
    }
  };
};

/**
 * Environment-aware configuration loading
 */
function getSupabaseUrl() {
  // Try environment variables first (from build process)
  if (typeof window !== 'undefined' && window.ENV?.SUPABASE_URL) {
    return window.ENV.SUPABASE_URL;
  }
  
  // Try process.env (for SSR/build time)
  if (typeof process !== 'undefined' && process.env?.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  
  // Fallback to hardcoded URL
  return 'https://tdmzayzkqyegvfgxlolj.supabase.co';
}

function getSupabaseAnonKey() {
  // Try environment variables first
  if (typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY) {
    return window.ENV.SUPABASE_ANON_KEY;
  }
  
  // Try process.env (for SSR/build time)
  if (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) {
    return process.env.SUPABASE_ANON_KEY;
  }
  
  // Fallback to hardcoded key
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MVU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';
}

/**
 * Environment detection
 */
function detectEnvironment() {
  if (typeof window === 'undefined') return 'server';
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  } else if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
    return 'production';
  } else if (hostname.includes('staging') || hostname.includes('preview')) {
    return 'staging';
  }
  
  return 'production'; // Default to production for unknown environments
}

// Initialize configuration on load with enhanced error handling
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    try {
      const environment = detectEnvironment();
      console.log(`🌍 Environment detected: ${environment}`);
      
      if (window.validateSupabaseConfig()) {
        console.log('✅ Supabase configuration loaded successfully');
        console.log('📊 Supabase URL:', window.SUPABASE_CONFIG.url);
        console.log('🔑 Anon key length:', window.SUPABASE_CONFIG.anonKey.length);
        
        // Dispatch event for other scripts that depend on Supabase config
        window.dispatchEvent(new CustomEvent('supabaseConfigReady', {
          detail: {
            ...window.SUPABASE_CONFIG,
            environment: environment,
            timestamp: new Date().toISOString()
          }
        }));
      } else {
        console.warn('⚠️ Supabase configuration validation failed');
        
        // Dispatch error event
        window.dispatchEvent(new CustomEvent('supabaseConfigError', {
          detail: {
            error: 'Configuration validation failed',
            config: window.SUPABASE_CONFIG,
            environment: environment
          }
        }));
      }
    } catch (error) {
      console.error('❌ Error initializing Supabase configuration:', error);
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('supabaseConfigError', {
        detail: {
          error: error.message,
          environment: detectEnvironment()
        }
      }));
    }
  });
} else {
  // Server-side initialization
  console.log('🖥️ Supabase config loaded on server-side');
}

// Enhanced export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    config: window.SUPABASE_CONFIG,
    validateSupabaseConfig: window.validateSupabaseConfig,
    getSupabaseClientOptions: window.getSupabaseClientOptions,
    getSupabaseUrl,
    getSupabaseAnonKey,
    detectEnvironment
  };
}

// CommonJS compatibility
if (typeof exports !== 'undefined') {
  exports.SUPABASE_CONFIG = window.SUPABASE_CONFIG;
  exports.validateSupabaseConfig = window.validateSupabaseConfig;
  exports.getSupabaseClientOptions = window.getSupabaseClientOptions;
}