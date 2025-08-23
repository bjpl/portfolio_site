/**
 * Central API Configuration
 * Single source of truth for all API endpoints and settings
 * Version: 2.0.0
 */

class CentralAPIConfig {
    constructor() {
        this.initialized = false;
        this.backendAvailable = null;
        this.config = this.loadConfig();
        
        // Initialize immediately
        this.init();
    }

    /**
     * Load configuration based on environment
     */
    loadConfig() {
        const isDev = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('localhost');
        
        const isNetlify = window.location.hostname.includes('netlify.app') ||
                         window.location.hostname.includes('netlify.com');

        return {
            // Environment detection
            environment: isDev ? 'development' : isNetlify ? 'netlify' : 'production',
            isDevelopment: isDev,
            isNetlify: isNetlify,
            isProduction: !isDev && !isNetlify,

            // API Base URLs
            api: {
                development: {
                    http: 'http://localhost:3000/api',
                    ws: 'ws://localhost:3000/ws'
                },
                netlify: {
                    http: '/api',
                    functionsPath: '/.netlify/functions',
                    ws: null // WebSocket not available on Netlify
                },
                production: {
                    http: '/api',
                    ws: `wss://${window.location.host}/ws`
                }
            },

            // Fallback endpoints for when backend is unavailable
            fallback: {
                enabled: true,
                mockResponses: true,
                endpoints: ['/health', '/auth/login']
            },

            // Retry configuration
            retry: {
                attempts: 3,
                delay: 1000,
                exponentialBackoff: true
            },

            // Timeout configuration
            timeout: {
                default: 10000,
                login: 15000,
                upload: 60000
            }
        };
    }

    /**
     * Get current API base URL
     */
    getAPIBaseURL() {
        const env = this.config.environment;
        if (env === 'netlify') {
            return this.config.api[env]?.http || '/api';
        }
        return this.config.api[env]?.http || this.config.api.production.http;
    }

    /**
     * Get WebSocket URL
     */
    getWebSocketURL() {
        const env = this.config.environment;
        return this.config.api[env]?.ws;
    }

    /**
     * Get full endpoint URL
     */
    getEndpointURL(endpoint, params = {}) {
        const baseURL = this.getAPIBaseURL();
        let url = `${baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        return url;
    }

    /**
     * Initialize and check API availability
     */
    async init() {
        if (this.initialized) return;

        try {
            this.backendAvailable = await this.checkBackendAvailability();
            
            if (!this.backendAvailable) {
                console.warn(`[API Config] Backend not available at ${this.getAPIBaseURL()}`);
                
                if (this.config.fallback.enabled) {
                    console.info('[API Config] Fallback mode enabled');
                }
            } else {
                console.info(`[API Config] Backend available at ${this.getAPIBaseURL()}`);
            }

            this.initialized = true;
            this.dispatchEvent('apiConfigReady', { 
                backendAvailable: this.backendAvailable,
                config: this.config 
            });

        } catch (error) {
            console.error('[API Config] Initialization failed:', error);
            this.backendAvailable = false;
            this.initialized = true;
        }
    }

    /**
     * Check if backend is available
     */
    async checkBackendAvailability(retryCount = 0) {
        const maxRetries = this.config.retry.attempts;
        const delay = this.config.retry.delay * (this.config.retry.exponentialBackoff ? Math.pow(2, retryCount) : 1);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(this.getEndpointURL('/health'), {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);
            
            return response.ok;
            
        } catch (error) {
            if (retryCount < maxRetries - 1) {
                console.log(`[API Config] Backend check failed, retrying in ${delay}ms... (${retryCount + 1}/${maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.checkBackendAvailability(retryCount + 1);
            }
            
            return false;
        }
    }

    /**
     * Make authenticated request
     */
    async makeRequest(endpoint, options = {}) {
        const url = this.getEndpointURL(endpoint);
        const token = this.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: this.config.timeout.default,
            ...options
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await this.fetchWithTimeout(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
            
        } catch (error) {
            // Handle network errors and provide fallback
            if (!this.backendAvailable && this.config.fallback.enabled && this.config.fallback.mockResponses) {
                return this.handleFallbackResponse(endpoint, options);
            }
            
            throw error;
        }
    }

    /**
     * Fetch with timeout
     */
    async fetchWithTimeout(url, config) {
        const timeout = config.timeout || this.config.timeout.default;
        const controller = new AbortController();
        
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Handle fallback responses for offline mode
     */
    handleFallbackResponse(endpoint, options) {
        console.log(`[API Config] Using fallback response for ${endpoint}`);
        
        // Mock responses for common endpoints
        const mockResponses = {
            '/health': { 
                status: 'healthy', 
                mode: 'netlify-functions',
                environment: 'production',
                message: 'Portfolio site API is running on Netlify Functions'
            },
            '/auth/login': { error: 'Authentication service temporarily unavailable.' },
            '/content/projects': {
                success: true,
                data: [],
                message: 'Using fallback mode - content service unavailable'
            }
        };

        const mockResponse = mockResponses[endpoint];
        if (mockResponse) {
            if (mockResponse.error) {
                throw new Error(mockResponse.error);
            }
            return Promise.resolve(mockResponse);
        }

        throw new Error(`Backend unavailable and no fallback for ${endpoint}`);
    }

    /**
     * Token management
     */
    getToken() {
        return localStorage.getItem('token') || localStorage.getItem('accessToken');
    }

    setToken(token) {
        localStorage.setItem('token', token);
    }

    clearToken() {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        // Clear tokens
        this.clearToken();
        
        // Clear other auth-related items
        const keysToRemove = [
            'currentUser', 'userKey', 'remember', 'lastLogin', 
            'sessionData', 'authState', 'userPreferences'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        console.log('[API Config] Cache cleared');
        
        this.dispatchEvent('cacheCleared');
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        const issues = [];
        
        if (!this.getAPIBaseURL()) {
            issues.push('No API base URL configured');
        }

        if (this.config.isDevelopment && !this.backendAvailable) {
            issues.push('Development mode but backend not available');
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Get configuration status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            environment: this.config.environment,
            apiBaseURL: this.getAPIBaseURL(),
            webSocketURL: this.getWebSocketURL(),
            backendAvailable: this.backendAvailable,
            validation: this.validateConfig()
        };
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(type, detail = {}) {
        const event = new CustomEvent(type, { detail });
        window.dispatchEvent(event);
    }

    /**
     * Refresh backend availability check
     */
    async refreshBackendStatus() {
        this.backendAvailable = await this.checkBackendAvailability();
        
        this.dispatchEvent('backendStatusChanged', {
            available: this.backendAvailable
        });

        return this.backendAvailable;
    }
}

// Create singleton instance
const centralAPIConfig = new CentralAPIConfig();

// Make globally available
window.CentralAPIConfig = centralAPIConfig;

// Export common methods for convenience
window.apiConfig = {
    getURL: (endpoint, params) => centralAPIConfig.getEndpointURL(endpoint, params),
    makeRequest: (endpoint, options) => centralAPIConfig.makeRequest(endpoint, options),
    getToken: () => centralAPIConfig.getToken(),
    setToken: (token) => centralAPIConfig.setToken(token),
    clearCache: () => centralAPIConfig.clearCache(),
    getStatus: () => centralAPIConfig.getStatus(),
    isBackendAvailable: () => centralAPIConfig.backendAvailable
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        centralAPIConfig.init();
    });
} else {
    centralAPIConfig.init();
}

console.log('[API Config] Central configuration loaded');