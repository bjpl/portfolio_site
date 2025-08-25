/**
 * Admin Configuration Integration Test Suite
 * Comprehensive tests for configuration loading, validation, and functionality
 */

class AdminConfigIntegrationTest {
  constructor() {
    this.results = {
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };
    this.startTime = Date.now();
  }

  // Test result logging
  logTest(testName, passed, message = '', details = null) {
    const result = {
      name: testName,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    this.results.summary.total++;
    
    if (passed) {
      this.results.summary.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.results.summary.failed++;
      console.error(`❌ ${testName}: ${message}`, details);
    }
    
    return result;
  }

  // Configuration availability tests
  async testConfigurationAvailability() {
    console.log('\n🔧 Testing Configuration Availability...');
    
    try {
      // Test window.CONFIG exists
      const hasWindowConfig = typeof window !== 'undefined' && window.CONFIG;
      this.logTest(
        'Window CONFIG Available',
        !!hasWindowConfig,
        hasWindowConfig ? 'window.CONFIG is available' : 'window.CONFIG not found'
      );

      // Test SUPABASE_CONFIG exists
      const hasSupabaseConfig = typeof window !== 'undefined' && window.SUPABASE_CONFIG;
      this.logTest(
        'Supabase CONFIG Available',
        !!hasSupabaseConfig,
        hasSupabaseConfig ? 'window.SUPABASE_CONFIG is available' : 'window.SUPABASE_CONFIG not found'
      );

      // Test config values
      if (hasSupabaseConfig) {
        const config = window.SUPABASE_CONFIG;
        
        this.logTest(
          'Supabase URL Valid',
          !!(config.url && config.url.includes('supabase.co')),
          `URL: ${config.url || 'missing'}`
        );
        
        this.logTest(
          'Supabase Anon Key Valid',
          !!(config.anonKey && config.anonKey.startsWith('eyJ')),
          `Key length: ${config.anonKey ? config.anonKey.length : 0} characters`
        );
      }

      // Test environment detection
      const isProduction = window.location.hostname !== 'localhost';
      this.logTest(
        'Environment Detection',
        true,
        `Running in ${isProduction ? 'production' : 'development'} mode`
      );

    } catch (error) {
      this.logTest('Configuration Availability', false, 'Test suite error', error);
    }
  }

  // Supabase client initialization tests
  async testSupabaseClientInit() {
    console.log('\n🔐 Testing Supabase Client Initialization...');
    
    try {
      // Check if Supabase library is loaded
      const hasSupabase = typeof window !== 'undefined' && window.supabase;
      this.logTest(
        'Supabase Library Loaded',
        !!hasSupabase,
        hasSupabase ? 'Supabase library is available' : 'Supabase library not found'
      );

      if (!hasSupabase) {
        // Try to load from CDN for testing
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
          setTimeout(resolve, 5000); // Timeout after 5 seconds
        });
      }

      // Test client creation
      if (window.SUPABASE_CONFIG && (window.supabase || window.createClient)) {
        const config = window.SUPABASE_CONFIG;
        const createClient = window.supabase?.createClient || window.createClient;
        
        if (createClient) {
          const client = createClient(config.url, config.anonKey);
          
          this.logTest(
            'Supabase Client Creation',
            !!client,
            client ? 'Client created successfully' : 'Failed to create client'
          );

          // Test client methods
          if (client) {
            this.logTest(
              'Auth Methods Available',
              !!(client.auth && typeof client.auth.signInWithPassword === 'function'),
              'Client has auth methods'
            );
            
            this.logTest(
              'Database Methods Available',
              !!(client.from && typeof client.from === 'function'),
              'Client has database methods'
            );
          }
        }
      }

    } catch (error) {
      this.logTest('Supabase Client Init', false, 'Client initialization error', error);
    }
  }

  // API configuration tests
  async testApiConfiguration() {
    console.log('\n🌐 Testing API Configuration...');
    
    try {
      // Test API endpoint availability
      const apiBase = window.location.origin;
      const testEndpoints = [
        '/.netlify/functions/health',
        '/.netlify/functions/auth',
        '/api/health'
      ];

      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(apiBase + endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          this.logTest(
            `API Endpoint ${endpoint}`,
            response.status < 500,
            `Status: ${response.status} ${response.statusText}`
          );

        } catch (fetchError) {
          this.logTest(
            `API Endpoint ${endpoint}`,
            false,
            'Network error or endpoint unavailable',
            fetchError.message
          );
        }
      }

      // Test CORS configuration
      try {
        const corsTest = await fetch(window.location.origin + '/.netlify/functions/health', {
          method: 'OPTIONS'
        });
        
        this.logTest(
          'CORS Configuration',
          corsTest.ok,
          `CORS headers: ${corsTest.headers.get('Access-Control-Allow-Origin') || 'none'}`
        );
      } catch (corsError) {
        this.logTest('CORS Configuration', false, 'CORS test failed', corsError);
      }

    } catch (error) {
      this.logTest('API Configuration', false, 'API test error', error);
    }
  }

  // Authentication flow tests
  async testAuthenticationFlow() {
    console.log('\n🔑 Testing Authentication Flow...');
    
    try {
      // Test if auth manager exists
      const hasAuthManager = typeof window !== 'undefined' && window.UnifiedAuthManager;
      this.logTest(
        'Auth Manager Available',
        !!hasAuthManager,
        hasAuthManager ? 'UnifiedAuthManager found' : 'Auth manager not found'
      );

      if (hasAuthManager) {
        const authManager = window.UnifiedAuthManager;
        
        // Test initialization
        if (typeof authManager.init === 'function') {
          try {
            await authManager.init();
            this.logTest(
              'Auth Manager Init',
              authManager.initialized,
              'Auth manager initialized successfully'
            );
          } catch (initError) {
            this.logTest('Auth Manager Init', false, 'Initialization failed', initError);
          }
        }

        // Test authentication state check
        if (typeof authManager.isAuthenticated === 'function') {
          const isAuth = authManager.isAuthenticated();
          this.logTest(
            'Auth State Check',
            typeof isAuth === 'boolean',
            `Current auth state: ${isAuth}`
          );
        }

        // Test session management
        if (typeof authManager.getSession === 'function') {
          const session = authManager.getSession();
          this.logTest(
            'Session Management',
            true,
            `Session status: ${session ? 'active' : 'none'}`
          );
        }
      }

    } catch (error) {
      this.logTest('Authentication Flow', false, 'Auth test error', error);
    }
  }

  // Performance tests
  async testPerformanceMetrics() {
    console.log('\n⚡ Testing Performance Metrics...');
    
    try {
      // Test page load time
      const loadTime = Date.now() - this.startTime;
      this.logTest(
        'Page Load Performance',
        loadTime < 5000,
        `Load time: ${loadTime}ms (target: <5000ms)`
      );

      // Test memory usage (if available)
      if (performance.memory) {
        const memory = performance.memory;
        const memoryMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        this.logTest(
          'Memory Usage',
          memoryMB < 50,
          `Memory usage: ${memoryMB}MB (target: <50MB)`
        );
      }

      // Test resource loading
      if (performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource');
        const slowResources = resources.filter(r => r.duration > 1000);
        
        this.logTest(
          'Resource Load Speed',
          slowResources.length < 3,
          `${slowResources.length} slow resources (>1s)`
        );
      }

    } catch (error) {
      this.logTest('Performance Metrics', false, 'Performance test error', error);
    }
  }

  // Security tests
  async testSecurityConfiguration() {
    console.log('\n🛡️  Testing Security Configuration...');
    
    try {
      // Test HTTPS
      const isHTTPS = window.location.protocol === 'https:';
      this.logTest(
        'HTTPS Enabled',
        isHTTPS || window.location.hostname === 'localhost',
        `Protocol: ${window.location.protocol}`
      );

      // Test CSP headers (if available)
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      this.logTest(
        'Content Security Policy',
        !!cspMeta,
        cspMeta ? 'CSP meta tag found' : 'No CSP meta tag'
      );

      // Test secure cookie settings
      const hasSecureCookies = document.cookie.includes('Secure') || window.location.hostname === 'localhost';
      this.logTest(
        'Secure Cookie Configuration',
        hasSecureCookies || !document.cookie,
        'Cookie security settings'
      );

      // Test no sensitive data in localStorage
      const localStorageKeys = Object.keys(localStorage);
      const sensitiveKeys = localStorageKeys.filter(key => 
        key.toLowerCase().includes('password') || 
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('private')
      );
      
      this.logTest(
        'LocalStorage Security',
        sensitiveKeys.length === 0,
        `${sensitiveKeys.length} potentially sensitive keys in localStorage`
      );

    } catch (error) {
      this.logTest('Security Configuration', false, 'Security test error', error);
    }
  }

  // Network connectivity tests
  async testNetworkConnectivity() {
    console.log('\n🌍 Testing Network Connectivity...');
    
    try {
      // Test basic connectivity
      const online = navigator.onLine;
      this.logTest(
        'Network Status',
        online,
        `Browser reports: ${online ? 'online' : 'offline'}`
      );

      // Test Supabase connectivity
      if (window.SUPABASE_CONFIG) {
        try {
          const response = await fetch(window.SUPABASE_CONFIG.url + '/health', {
            method: 'GET',
            timeout: 5000
          });
          
          this.logTest(
            'Supabase Connectivity',
            response.ok,
            `Supabase response: ${response.status}`
          );
        } catch (supabaseError) {
          this.logTest(
            'Supabase Connectivity',
            false,
            'Cannot reach Supabase instance',
            supabaseError.message
          );
        }
      }

      // Test CDN resources
      const testImage = new Image();
      testImage.src = '/images/logo.png?' + Date.now();
      
      await new Promise((resolve) => {
        testImage.onload = () => {
          this.logTest('Static Asset Loading', true, 'Logo image loaded successfully');
          resolve();
        };
        testImage.onerror = () => {
          this.logTest('Static Asset Loading', false, 'Failed to load logo image');
          resolve();
        };
        setTimeout(resolve, 3000);
      });

    } catch (error) {
      this.logTest('Network Connectivity', false, 'Network test error', error);
    }
  }

  // Generate comprehensive report
  generateReport() {
    const duration = Date.now() - this.startTime;
    const successRate = Math.round((this.results.summary.passed / this.results.summary.total) * 100);
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        ...this.results.summary,
        successRate: `${successRate}%`
      },
      tests: this.results.tests,
      recommendations: this.generateRecommendations(),
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        javaEnabled: navigator.javaEnabled,
        platform: navigator.platform
      }
    };

    console.log('\n📊 Integration Test Report:');
    console.log(`Success Rate: ${successRate}% (${this.results.summary.passed}/${this.results.summary.total})`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.results.summary.failed > 0) {
      console.log('\n⚠️  Failed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`- ${test.name}: ${test.message}`);
        });
    }
    
    return report;
  }

  // Generate recommendations based on test results
  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.results.tests.filter(test => !test.passed);
    
    failedTests.forEach(test => {
      switch (true) {
        case test.name.includes('CONFIG'):
          recommendations.push('Check configuration file loading and ensure all required config files are present');
          break;
        case test.name.includes('Supabase'):
          recommendations.push('Verify Supabase credentials and network connectivity to Supabase instance');
          break;
        case test.name.includes('API'):
          recommendations.push('Check API endpoint availability and ensure Netlify functions are deployed correctly');
          break;
        case test.name.includes('Auth'):
          recommendations.push('Review authentication configuration and ensure auth manager is properly initialized');
          break;
        case test.name.includes('Performance'):
          recommendations.push('Optimize resource loading and consider implementing performance improvements');
          break;
        case test.name.includes('Security'):
          recommendations.push('Review security configurations and ensure proper HTTPS and CSP settings');
          break;
        case test.name.includes('Network'):
          recommendations.push('Check network connectivity and ensure all external resources are accessible');
          break;
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Admin Configuration Integration Tests...');
    console.log('=' .repeat(60));
    
    try {
      await this.testConfigurationAvailability();
      await this.testSupabaseClientInit();
      await this.testApiConfiguration();
      await this.testAuthenticationFlow();
      await this.testPerformanceMetrics();
      await this.testSecurityConfiguration();
      await this.testNetworkConnectivity();
      
      const report = this.generateReport();
      
      // Store results in global scope for diagnostic page
      window.INTEGRATION_TEST_RESULTS = report;
      
      // Dispatch completion event
      window.dispatchEvent(new CustomEvent('integrationTestsComplete', {
        detail: report
      }));
      
      return report;
      
    } catch (error) {
      console.error('Integration test suite failed:', error);
      return {
        error: error.message,
        summary: this.results.summary,
        tests: this.results.tests
      };
    }
  }
}

// Auto-run tests if not in test environment
if (typeof window !== 'undefined' && !window.TESTING_MODE) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new AdminConfigIntegrationTest().runAllTests();
    });
  } else {
    new AdminConfigIntegrationTest().runAllTests();
  }
}

// Export for use in other scripts
window.AdminConfigIntegrationTest = AdminConfigIntegrationTest;