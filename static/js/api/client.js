/**
 * Universal API Client with Smart Environment Detection
 * Handles all environments seamlessly with fallback chain and error resilience
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
    
    // Build endpoint chain with priorities
    this.endpoints = [
      // 1. Netlify Functions (production/preview)
      {
        name: 'netlify',
        url: `${protocol}//${hostname}/.netlify/functions`,
        priority: 1,
        detect: () => hostname.includes('netlify.app') || hostname.includes('netlify.com')
      },
      
      // 2. Custom domain with Netlify Functions
      {
        name: 'production',
        url: `${protocol}//${hostname}/.netlify/functions`,
        priority: 2,
        detect: () => !hostname.includes('localhost') && !hostname.includes('127.0.0.1')
      },
      
      // 3. Local backend server
      {
        name: 'local',
        url: 'http://localhost:3001/api',
        priority: 3,
        detect: () => hostname.includes('localhost') || hostname.includes('127.0.0.1')
      },
      
      // 4. Alternative local port
      {
        name: 'local-alt',
        url: 'http://localhost:8080/api',
        priority: 4,
        detect: () => hostname.includes('localhost') || hostname.includes('127.0.0.1')
      },
      
      // 5. Demo mode (always available as last resort)
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
      const response = await fetch(`${endpoint.url}/health`, {
        method: 'GET',
        timeout: 5000,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      this.healthStatus.set(endpoint.name, false);
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
   * Make request with exponential backoff retry
   */
  async requestWithRetry(apiEndpoint, endpoint, options, attempt = 1) {
    try {
      const url = `${apiEndpoint.url}${endpoint}`;
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(options.timeout || 10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
}

// Create global API client instance
window.apiClient = new UniversalAPIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalAPIClient;
}