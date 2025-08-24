/**
 * Universal API Client with Supabase Integration
 * Handles Supabase backend with smart fallback and error resilience
 * Version: 4.0.0 - Supabase Backend Integration
 */

class UniversalAPIClient {
  constructor() {
    this.endpoints = [];
    this.currentEndpoint = null;
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
    this.cache = new Map();
    this.healthStatus = new Map();
    this.isOnline = navigator.onLine;
    this.demoMode = false;
    
    this.initializeEndpoints();
    this.setupEventListeners();
    this.startHealthChecks();
  }

  /**
   * Initialize endpoint chain based on environment detection
   */
  initializeEndpoints() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Build Supabase endpoint chain with priorities
    this.endpoints = [
      // 1. Supabase Production (primary)
      {
        name: 'supabase-production',
        url: this.getSupabaseUrl(),
        restUrl: `${this.getSupabaseUrl()}/rest/v1`,
        authUrl: `${this.getSupabaseUrl()}/auth/v1`,
        priority: 1,
        detect: () => true
      },
      
      // 2. Supabase via Edge Functions (enhanced security)
      {
        name: 'supabase-edge',
        url: `${protocol}//${hostname}/.netlify/edge-functions/supabase`,
        restUrl: `${this.getSupabaseUrl()}/rest/v1`,
        authUrl: `${this.getSupabaseUrl()}/auth/v1`,
        priority: 2,
        detect: () => hostname.includes('netlify.app') || hostname.includes('netlify.com')
      },
      
      // 3. Local development (if configured)
      {
        name: 'local-supabase',
        url: 'http://localhost:54321',
        restUrl: 'http://localhost:54321/rest/v1',
        authUrl: 'http://localhost:54321/auth/v1',
        priority: 3,
        detect: () => hostname.includes('localhost') && this.isSupabaseLocalRunning()
      },
      
      // 4. Demo mode (always available as last resort)
      {
        name: 'demo',
        url: 'demo://mock',
        priority: 99,
        detect: () => true
      }
    ];

    // Sort by priority and filter by detection
    this.endpoints = this.endpoints
      .filter(endpoint => endpoint.detect())
      .sort((a, b) => a.priority - b.priority);
    
    console.log('🔗 API Client initialized with endpoints:', 
      this.endpoints.map(e => `${e.name} (${e.url})`));
  }

  /**
   * Setup event listeners for network changes
   */
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.demoMode = false;
      console.log('🌐 Network restored, switching back to live APIs');
      this.findWorkingEndpoint();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📡 Network lost, switching to offline mode');
      this.enableDemoMode();
    });
  }

  /**
   * Start periodic health checks for all endpoints
   */
  startHealthChecks() {
    setInterval(() => {
      if (this.isOnline && !this.demoMode) {
        this.checkEndpointHealth();
      }
    }, 30000); // Check every 30 seconds

    // Initial health check
    this.findWorkingEndpoint();
  }

  /**
   * Find the first working endpoint in priority order
   */
  async findWorkingEndpoint() {
    for (const endpoint of this.endpoints) {
      if (endpoint.name === 'demo') continue; // Skip demo unless forced
      
      const isHealthy = await this.checkEndpoint(endpoint);
      if (isHealthy) {
        this.currentEndpoint = endpoint;
        this.healthStatus.set(endpoint.name, true);
        console.log(`✅ Active endpoint: ${endpoint.name} (${endpoint.url})`);
        return endpoint;
      }
    }
    
    // If no endpoints work, enable demo mode
    console.warn('⚠️ No endpoints available, enabling demo mode');
    this.enableDemoMode();
    return this.endpoints.find(e => e.name === 'demo');
  }

  /**
   * Check if an endpoint is healthy
   */
  async checkEndpoint(endpoint) {
    if (endpoint.name === 'demo') return true;
    
    try {
      // For Supabase, check the REST API health
      const healthUrl = endpoint.restUrl || `${endpoint.url}/rest/v1`;
      const response = await fetch(healthUrl, {
        method: 'HEAD',
        timeout: 5000,
        signal: AbortSignal.timeout(5000),
        headers: {
          'apikey': this.getSupabaseAnonKey(),
          'Accept': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      this.healthStatus.set(endpoint.name, false);
      return false;
    }
  }

  /**
   * Check if local Supabase is running
   */
  async isSupabaseLocalRunning() {
    try {
      const response = await fetch('http://localhost:54321/rest/v1/', {
        method: 'HEAD',
        timeout: 2000,
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check health of all endpoints
   */
  async checkEndpointHealth() {
    const healthPromises = this.endpoints
      .filter(e => e.name !== 'demo')
      .map(async endpoint => {
        const isHealthy = await this.checkEndpoint(endpoint);
        this.healthStatus.set(endpoint.name, isHealthy);
        return { endpoint: endpoint.name, healthy: isHealthy };
      });

    const results = await Promise.allSettled(healthPromises);
    const healthyCount = results.filter(r => r.status === 'fulfilled' && r.value.healthy).length;
    
    if (healthyCount === 0 && !this.demoMode) {
      console.warn('🚨 All endpoints unhealthy, switching to demo mode');
      this.enableDemoMode();
    } else if (healthyCount > 0 && this.demoMode) {
      console.log('🔄 Endpoints recovered, switching back to live mode');
      this.demoMode = false;
      await this.findWorkingEndpoint();
    }
  }

  /**
   * Enable demo mode with mock data
   */
  enableDemoMode() {
    this.demoMode = true;
    this.currentEndpoint = this.endpoints.find(e => e.name === 'demo');
    console.log('🎭 Demo mode enabled - using mock data');
  }

  /**
   * Make API request with retry logic and fallback chain
   */
  async request(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    
    // Return cached response if available and fresh
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < (options.cacheTime || 300000)) { // 5 min default
        console.log(`📦 Cache hit for ${endpoint}`);
        return cached.data;
      }
    }

    // If offline or in demo mode, return mock data
    if (!this.isOnline || this.demoMode) {
      return this.getMockData(endpoint);
    }

    let lastError = null;
    
    // Try each endpoint in priority order
    for (const apiEndpoint of this.endpoints) {
      if (apiEndpoint.name === 'demo') continue;
      
      try {
        const result = await this.requestWithRetry(apiEndpoint, endpoint, options);
        
        // Cache successful response
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        // Update current endpoint if this one worked
        if (this.currentEndpoint?.name !== apiEndpoint.name) {
          this.currentEndpoint = apiEndpoint;
          console.log(`🔄 Switched to endpoint: ${apiEndpoint.name}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`❌ ${apiEndpoint.name} failed:`, error.message);
        this.healthStatus.set(apiEndpoint.name, false);
        continue;
      }
    }
    
    // All endpoints failed, use demo mode
    console.error('🚨 All endpoints failed, falling back to demo mode');
    this.enableDemoMode();
    return this.getMockData(endpoint);
  }

  /**
   * Make Supabase request with authentication and retry logic
   */
  async requestWithRetry(apiEndpoint, endpoint, options, attempt = 1) {
    try {
      // Determine the correct URL based on endpoint type
      let url;
      if (endpoint.startsWith('/auth/')) {
        url = `${apiEndpoint.authUrl || apiEndpoint.url + '/auth/v1'}${endpoint.replace('/auth', '')}`;
      } else if (endpoint.startsWith('/rest/') || endpoint.startsWith('/projects') || endpoint.startsWith('/blogs')) {
        url = `${apiEndpoint.restUrl || apiEndpoint.url + '/rest/v1'}${endpoint.replace('/rest/v1', '')}`;
      } else {
        url = `${apiEndpoint.url}${endpoint}`;
      }
      
      // Get authentication headers
      const authHeaders = this.getSupabaseAuthHeaders();
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(options.timeout || 10000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (attempt >= this.retryConfig.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
        this.retryConfig.maxDelay
      );
      
      console.log(`🔄 Retry ${attempt + 1}/${this.retryConfig.maxAttempts} after ${delay}ms`);
      await this.sleep(delay);
      
      return this.requestWithRetry(apiEndpoint, endpoint, options, attempt + 1);
    }
  }

  /**
   * Get Supabase authentication headers
   */
  getSupabaseAuthHeaders() {
    const headers = {};
    
    // Always include the anon key
    const anonKey = this.getSupabaseAnonKey();
    if (anonKey) {
      headers['apikey'] = anonKey;
    }
    
    // Include access token if user is authenticated
    const accessToken = this.getSupabaseAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    return headers;
  }

  /**
   * Get Supabase anonymous key with comprehensive fallback chain
   */
  getSupabaseAnonKey() {
    // Try multiple environment variable patterns
    const envKey = window.ENV?.SUPABASE_ANON_KEY || 
                   window.process?.env?.VITE_SUPABASE_ANON_KEY ||
                   window.process?.env?.REACT_APP_SUPABASE_ANON_KEY ||
                   window.process?.env?.SUPABASE_ANON_KEY ||
                   window.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (envKey && envKey !== 'undefined' && envKey.length > 100) {
      return envKey;
    }
    
    // Try to get from API config if available
    if (window.apiConfig?.getSupabaseAnonKey) {
      const configKey = window.apiConfig.getSupabaseAnonKey();
      if (configKey && configKey.length > 100) {
        return configKey;
      }
    }
    
    // Fallback to hardcoded key (updated with correct key)
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';
  }

  /**
   * Get Supabase access token from session
   */
  getSupabaseAccessToken() {
    try {
      // Try to get from Supabase client if available
      if (window.supabase?.auth?.getSession) {
        const session = window.supabase.auth.getSession();
        return session?.data?.session?.access_token;
      }
      
      // Fallback to localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.includes('auth-token'));
      for (const key of keys) {
        const session = JSON.parse(localStorage.getItem(key) || '{}');
        if (session.access_token) {
          return session.access_token;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error getting Supabase access token:', error);
      return null;
    }
  }

  /**
   * Get mock data for demo mode
   */
  getMockData(endpoint) {
    const mockData = {
      '/health': { status: 'ok', mode: 'demo' },
      '/contact': { success: true, message: 'Demo: Message sent successfully!' },
      '/blog': {
        posts: [
          {
            id: 1,
            title: 'Demo Post: Building Modern Web Applications',
            excerpt: 'This is a demo post showing how the application works offline.',
            date: new Date().toISOString(),
            slug: 'demo-building-modern-web-apps'
          },
          {
            id: 2,
            title: 'Demo Post: API Design Best Practices',
            excerpt: 'Another demo post about creating robust APIs.',
            date: new Date(Date.now() - 86400000).toISOString(),
            slug: 'demo-api-design-practices'
          }
        ]
      },
      '/projects': {
        projects: [
          {
            id: 1,
            name: 'Demo Project',
            description: 'A demonstration project showing offline capabilities',
            technologies: ['React', 'Node.js', 'Demo Mode'],
            status: 'demo'
          }
        ]
      }
    };

    const data = mockData[endpoint] || { error: false, data: null, demo: true };
    console.log(`🎭 Returning demo data for ${endpoint}`);
    return Promise.resolve(data);
  }

  /**
   * Get current API status
   */
  getStatus() {
    return {
      online: this.isOnline,
      demoMode: this.demoMode,
      currentEndpoint: this.currentEndpoint?.name,
      healthStatus: Object.fromEntries(this.healthStatus),
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ API cache cleared');
  }

  /**
   * Utility: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get Supabase URL with comprehensive fallback chain
   */
  getSupabaseUrl() {
    // Try multiple environment variable patterns
    const envUrl = window.ENV?.SUPABASE_URL || 
                   window.process?.env?.VITE_SUPABASE_URL ||
                   window.process?.env?.REACT_APP_SUPABASE_URL ||
                   window.process?.env?.SUPABASE_URL ||
                   window.process?.env?.NEXT_PUBLIC_SUPABASE_URL;
    
    if (envUrl && envUrl !== 'undefined' && envUrl.startsWith('https://')) {
      return envUrl;
    }
    
    // Try to get from API config if available
    if (window.apiConfig?.getSupabaseUrl) {
      const configUrl = window.apiConfig.getSupabaseUrl();
      if (configUrl && configUrl.startsWith('https://')) {
        return configUrl;
      }
    }
    
    // Fallback to hardcoded URL
    return 'https://tdmzayzkqyegvfgxlolj.supabase.co';
  }

  /**
   * Utility: Force endpoint switch (for testing)
   */
  async switchToEndpoint(endpointName) {
    const endpoint = this.endpoints.find(e => e.name === endpointName);
    if (endpoint) {
      if (endpointName === 'demo') {
        this.enableDemoMode();
      } else {
        this.demoMode = false;
        const isHealthy = await this.checkEndpoint(endpoint);
        if (isHealthy) {
          this.currentEndpoint = endpoint;
          console.log(`🔄 Manually switched to ${endpointName}`);
        } else {
          console.warn(`⚠️ Cannot switch to ${endpointName} - endpoint unhealthy`);
        }
      }
    }
  }

  /**
   * Get detailed status including configuration validation
   */
  getDetailedStatus() {
    const status = this.getStatus();
    return {
      ...status,
      configuration: {
        supabaseUrl: this.getSupabaseUrl(),
        hasValidKey: this.getSupabaseAnonKey().length > 100,
        endpointsConfigured: this.endpoints.length,
        environmentDetection: this.detectEnvironment()
      }
    };
  }

  /**
   * Detect current environment
   */
  detectEnvironment() {
    const hostname = window.location.hostname;
    if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
      return 'netlify-production';
    }
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'local-development';
    }
    return 'production';
  }
}

// Create global API client instance
window.apiClient = new UniversalAPIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalAPIClient;
}