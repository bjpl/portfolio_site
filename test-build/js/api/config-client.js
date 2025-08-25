/**
 * Modern API Client using Build-time Configuration
 * Uses window.CONFIG instead of environment variables or complex configuration loading
 */

class ConfigAPIClient {
  constructor() {
    this.config = null;
    this.supabaseClient = null;
    this.cache = new Map();
    this.init();
  }

  /**
   * Initialize the API client with build-time configuration
   */
  init() {
    if (!window.CONFIG) {
      console.error('❌ Build-time configuration not available. Ensure config-injection.html is loaded.');
      throw new Error('Configuration not available');
    }

    this.config = window.CONFIG;
    console.log('✅ ConfigAPIClient initialized with build-time configuration');
    console.log('🌍 Environment:', this.config.ENVIRONMENT);
    console.log('🔗 Supabase URL:', this.config.SUPABASE_URL);

    // Initialize Supabase client if available
    if (window.supabase && window.supabase.createClient) {
      this.initSupabaseClient();
    } else {
      console.warn('⚠️ Supabase client not available. Load @supabase/supabase-js first.');
    }

    // Validate configuration
    const validation = this.config.validate();
    if (!validation.valid) {
      console.error('❌ Configuration validation failed:', validation.issues);
    }
  }

  /**
   * Initialize Supabase client with build-time configuration
   */
  initSupabaseClient() {
    try {
      this.supabaseClient = window.supabase.createClient(
        this.config.SUPABASE_URL,
        this.config.SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: this.config.AUTH.AUTO_REFRESH,
            persistSession: this.config.AUTH.PERSIST_SESSION,
            detectSessionInUrl: this.config.AUTH.DETECT_SESSION_IN_URL,
            storage: window.localStorage,
            storageKey: this.config.AUTH.SESSION_STORAGE_KEY
          },
          global: {
            headers: {
              'x-client-info': `${this.config.SITE.TITLE}/1.0.0`
            }
          }
        }
      );
      
      console.log('✅ Supabase client initialized successfully');
      
      // Setup auth state change listener
      this.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('authStateChange', {
          detail: { event, session, user: session?.user }
        }));
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  /**
   * Get configuration value with dot notation
   */
  getConfig(path, fallback = null) {
    return this.config.get(path, fallback);
  }

  /**
   * Get API endpoint URL
   */
  getEndpoint(type = 'supabase') {
    const endpoints = this.config.API_ENDPOINTS;
    
    switch (type) {
      case 'supabase':
      case 'rest':
        return endpoints.supabase.rest;
      case 'auth':
        return endpoints.supabase.auth;
      case 'realtime':
        return endpoints.supabase.realtime;
      case 'storage':
        return endpoints.supabase.storage;
      case 'local':
        return endpoints.local;
      case 'fallback':
        return endpoints.fallback;
      default:
        return endpoints.supabase.url;
    }
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.getEndpoint('rest')}${endpoint}`;
    
    // Get current session for authentication
    let headers = {
      'Content-Type': 'application/json',
      'apikey': this.config.SUPABASE_ANON_KEY,
      ...options.headers
    };

    // Add user token if authenticated
    if (this.supabaseClient) {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    }

    const requestOptions = {
      method: options.method || 'GET',
      headers,
      timeout: this.config.REQUEST.TIMEOUT,
      ...options,
      headers // Ensure headers are last to override any options.headers
    };

    // Add body for non-GET requests
    if (options.body && requestOptions.method !== 'GET') {
      requestOptions.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    try {
      console.log(`🌐 API Request: ${requestOptions.method} ${url}`);
      
      const response = await this.fetchWithRetry(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response: ${response.status}`, data);
      
      return { data, response, status: response.status };
      
    } catch (error) {
      console.error(`❌ API Request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(url, options, attempt = 1) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (attempt < this.config.REQUEST.MAX_RETRIES) {
        const delay = this.config.REQUEST.RETRY_DELAY * Math.pow(this.config.REQUEST.RETRY_BACKOFF, attempt - 1);
        console.warn(`⏳ Retrying request (${attempt}/${this.config.REQUEST.MAX_RETRIES}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Authentication methods using Supabase
   */
  async login(email, password) {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('✅ Login successful:', data.user?.email);
      return { user: data.user, session: data.session };
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async logout() {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.supabaseClient.auth.signOut();
      if (error) throw error;

      console.log('✅ Logout successful');
      
    } catch (error) {
      console.error('❌ Logout failed:', error.message);
      throw error;
    }
  }

  async getCurrentUser() {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data: { user }, error } = await this.supabaseClient.auth.getUser();
      if (error) throw error;

      return user;
      
    } catch (error) {
      console.error('❌ Get user failed:', error.message);
      return null;
    }
  }

  async getCurrentSession() {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data: { session }, error } = await this.supabaseClient.auth.getSession();
      if (error) throw error;

      return session;
      
    } catch (error) {
      console.error('❌ Get session failed:', error.message);
      return null;
    }
  }

  /**
   * Database query methods
   */
  async query(table, options = {}) {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    try {
      let query = this.supabaseClient.from(table);

      // Apply query options
      if (options.select) {
        query = query.select(options.select);
      }
      
      if (options.filter) {
        Object.entries(options.filter).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      }
      
      if (options.order) {
        query = query.order(options.order.column, { 
          ascending: options.order.ascending !== false 
        });
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
      
    } catch (error) {
      console.error(`❌ Database query failed for ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Health check using build-time configuration
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.getEndpoint('rest')}/`, {
        method: 'GET',
        headers: {
          'apikey': this.config.SUPABASE_ANON_KEY
        },
        timeout: this.config.REQUEST.TIMEOUT
      });

      const healthy = response.status === 200 || response.status === 404; // 404 is OK for REST root
      
      return {
        healthy,
        status: response.status,
        environment: this.config.ENVIRONMENT,
        timestamp: new Date().toISOString(),
        buildTime: this.config.BUILD_TIME,
        buildHash: this.config.BUILD_HASH
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        environment: this.config.ENVIRONMENT,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      config: {
        environment: this.config.ENVIRONMENT,
        supabaseURL: this.config.SUPABASE_URL,
        buildTime: this.config.BUILD_TIME,
        features: this.config.FEATURES
      },
      client: {
        supabaseInitialized: !!this.supabaseClient,
        cacheSize: this.cache.size
      },
      validation: this.config.validate()
    };
  }
}

// Initialize global API client instance
let apiClient = null;

// Wait for configuration to be ready
if (window.CONFIG) {
  // Configuration is already available
  try {
    apiClient = new ConfigAPIClient();
    window.apiClient = apiClient;
    console.log('🚀 ConfigAPIClient initialized immediately');
  } catch (error) {
    console.error('❌ Failed to initialize ConfigAPIClient:', error);
  }
} else {
  // Wait for configuration ready event
  window.addEventListener('configReady', () => {
    try {
      apiClient = new ConfigAPIClient();
      window.apiClient = apiClient;
      console.log('🚀 ConfigAPIClient initialized after config ready');
    } catch (error) {
      console.error('❌ Failed to initialize ConfigAPIClient:', error);
    }
  });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigAPIClient;
}

console.log('📦 ConfigAPIClient module loaded');