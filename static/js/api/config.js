/**
 * API Configuration Manager
 * Centralized configuration for all API settings
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
      
      // API endpoints configuration
      endpoints: {
        primary: isNetlify ? `${window.location.origin}/.netlify/functions` : null,
        fallback: isProduction ? `${window.location.origin}/.netlify/functions` : null,
        local: 'http://localhost:3001/api',
        localAlt: 'http://localhost:8080/api'
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
          '/health': 60000,    // 1 minute
          '/blog': 600000,     // 10 minutes
          '/projects': 600000, // 10 minutes
          '/contact': 0        // No cache
        }
      },
      
      // Health check configuration
      healthCheck: {
        interval: 30000,     // 30 seconds
        timeout: 5000,       // 5 seconds
        failureThreshold: 3,
        successThreshold: 1
      },
      
      // Request configuration
      request: {
        timeout: 10000,      // 10 seconds
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
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
        return endpoints.primary || endpoints.fallback || endpoints.local;
      case 'fallback':
        return endpoints.fallback || endpoints.local;
      case 'local':
        return endpoints.local;
      default:
        return endpoints[type] || endpoints.primary;
    }
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
   * Validate configuration
   */
  validate() {
    const issues = [];
    
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
      issues
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