/**
 * API Configuration Manager
 * Centralized configuration for Supabase backend integration
 * Version: 4.0.0 - Supabase Backend Configuration
 */

class APIConfig {
  constructor() {
    this.config = this.loadConfig();
    this.setupConfigWatcher();
  }

  /**
   * Load configuration based on environment
   */
  loadConfig() {
    const hostname = window.location.hostname;
    const isProduction = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
    const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
    
    return {
      // Environment detection
      environment: isProduction ? 'production' : 'development',
      isNetlify,
      
      // Supabase API endpoints configuration
      endpoints: {
        supabase: {
          url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
          rest: 'https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1',
          auth: 'https://tdmzayzkqyegvfgxlolj.supabase.co/auth/v1',
          realtime: 'wss://tdmzayzkqyegvfgxlolj.supabase.co/realtime/v1/websocket',
          storage: 'https://tdmzayzkqyegvfgxlolj.supabase.co/storage/v1'
        },
        primary: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
        fallback: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
        local: 'http://localhost:54321', // Local Supabase
        localAlt: 'http://localhost:3001/api' // Alternative local API
      },
      
      // Retry configuration
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      
      // Cache configuration
      cache: {
        defaultTTL: 300000, // 5 minutes
        maxSize: 100,
        endpoints: {
          '/rest/v1/': 60000,        // 1 minute for health
          '/rest/v1/blogs': 600000,   // 10 minutes
          '/rest/v1/projects': 600000, // 10 minutes
          '/rest/v1/contacts': 0,     // No cache
          '/auth/v1/user': 300000     // 5 minutes for user data
        }
      },
      
      // Health check configuration
      healthCheck: {
        interval: 30000,     // 30 seconds
        timeout: 5000,       // 5 seconds
        failureThreshold: 3,
        successThreshold: 1
      },
      
      // Supabase request configuration
      request: {
        timeout: 10000,      // 10 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': this.getSupabaseAnonKey()
        }
      },
      
      // Supabase specific configuration
      supabase: {
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        schema: 'public',
        maxRetries: 3
      },
      
      // Demo mode configuration
      demo: {
        autoEnable: true,
        showNotification: true,
        mockDelay: 500 // Simulate network delay
      },
      
      // Features flags
      features: {
        offlineSupport: true,
        serviceWorker: true,
        backgroundSync: true,
        pushNotifications: false,
        analytics: isProduction
      },
      
      // Logging configuration
      logging: {
        level: isProduction ? 'warn' : 'debug',
        enableNetworkLogs: !isProduction,
        enablePerformanceLogs: true
      }
    };
  }

  /**
   * Get configuration value by path
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  /**
   * Set configuration value by path
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    
    target[lastKey] = value;
    this.saveConfig();
  }

  /**
   * Update configuration
   */
  update(updates) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.config = this.loadConfig();
    this.saveConfig();
  }

  /**
   * Get environment-specific endpoint
   */
  getEndpoint(type = 'primary') {
    const endpoints = this.config.endpoints;
    
    switch (type) {
      case 'primary':
        return endpoints.supabase.url || endpoints.primary;
      case 'rest':
        return endpoints.supabase.rest;
      case 'auth':
        return endpoints.supabase.auth;
      case 'realtime':
        return endpoints.supabase.realtime;
      case 'storage':
        return endpoints.supabase.storage;
      case 'fallback':
        return endpoints.fallback;
      case 'local':
        return endpoints.local;
      default:
        return endpoints[type] || endpoints.supabase.url;
    }
  }

  /**
   * Get Supabase anonymous key with fallback chain
   */
  getSupabaseAnonKey() {
    // Try environment variables first
    const envKey = window.ENV?.SUPABASE_ANON_KEY || 
                   window.process?.env?.VITE_SUPABASE_ANON_KEY ||
                   window.process?.env?.REACT_APP_SUPABASE_ANON_KEY ||
                   window.process?.env?.SUPABASE_ANON_KEY;
    
    if (envKey && envKey !== 'undefined') {
      return envKey;
    }
    
    // Fallback to hardcoded key for reliability
    return this.config.supabase?.anonKey || 
           'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';
  }

  /**
   * Get Supabase configuration with environment detection
   */
  getSupabaseConfig() {
    return {
      ...this.config.supabase,
      url: this.getSupabaseUrl(),
      anonKey: this.getSupabaseAnonKey()
    };
  }

  /**
   * Get Supabase URL with fallback chain
   */
  getSupabaseUrl() {
    // Try environment variables first
    const envUrl = window.ENV?.SUPABASE_URL || 
                   window.process?.env?.VITE_SUPABASE_URL ||
                   window.process?.env?.REACT_APP_SUPABASE_URL ||
                   window.process?.env?.SUPABASE_URL;
    
    if (envUrl && envUrl !== 'undefined') {
      return envUrl;
    }
    
    // Fallback to hardcoded URL for reliability
    return this.config.endpoints?.supabase?.url || 
           'https://tdmzayzkqyegvfgxlolj.supabase.co';
  }

  /**
   * Get cache TTL for endpoint
   */
  getCacheTTL(endpoint) {
    const cacheConfig = this.config.cache;
    return cacheConfig.endpoints[endpoint] || cacheConfig.defaultTTL;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    return this.config.features[feature] || false;
  }

  /**
   * Get retry configuration
   */
  getRetryConfig() {
    return this.config.retry;
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig() {
    return this.config.healthCheck;
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem('api_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save API config to localStorage:', error);
    }
  }

  /**
   * Load configuration from localStorage
   */
  loadStoredConfig() {
    try {
      const stored = localStorage.getItem('api_config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        // Merge with defaults to handle new config options
        this.config = { ...this.loadConfig(), ...parsedConfig };
      }
    } catch (error) {
      console.warn('Failed to load API config from localStorage:', error);
    }
  }

  /**
   * Setup configuration watcher for changes
   */
  setupConfigWatcher() {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'api_config' && event.newValue) {
        try {
          this.config = JSON.parse(event.newValue);
          console.log('📋 API configuration updated from another tab');
        } catch (error) {
          console.warn('Failed to parse config from storage event:', error);
        }
      }
    });

    // Load stored config on initialization
    this.loadStoredConfig();
  }

  /**
   * Export configuration for debugging
   */
  export() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  import(configJson) {
    try {
      const imported = JSON.parse(configJson);
      this.config = { ...this.loadConfig(), ...imported };
      this.saveConfig();
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * Get performance monitoring settings
   */
  getPerformanceConfig() {
    return {
      measureRequests: this.config.logging.enablePerformanceLogs,
      measureCache: true,
      measureRetries: true,
      reportInterval: 60000 // 1 minute
    };
  }

  /**
   * Validate configuration including Supabase setup
   */
  validate() {
    const issues = [];
    
    // Check Supabase configuration
    const supabaseUrl = this.getSupabaseUrl();
    const supabaseKey = this.getSupabaseAnonKey();
    
    if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
      issues.push('Invalid or missing Supabase URL');
    }
    
    if (!supabaseKey || supabaseKey.length < 100) {
      issues.push('Invalid or missing Supabase anonymous key');
    }
    
    // Check required fields
    if (!this.config.endpoints.local) {
      issues.push('Missing local endpoint configuration');
    }
    
    // Check retry settings
    if (this.config.retry.maxAttempts < 1) {
      issues.push('Retry maxAttempts must be at least 1');
    }
    
    // Check cache settings
    if (this.config.cache.defaultTTL < 0) {
      issues.push('Cache TTL cannot be negative');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      supabase: {
        url: supabaseUrl,
        hasValidKey: supabaseKey && supabaseKey.length > 100,
        configured: issues.filter(i => i.includes('Supabase')).length === 0
      }
    };
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      config: this.config,
      validation: this.validate(),
      environment: {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        localStorage: typeof Storage !== 'undefined'
      }
    };
  }
}

// Create global configuration instance
window.apiConfig = new APIConfig();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIConfig;
}