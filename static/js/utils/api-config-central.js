/**
 * Universal API Configuration
 * Single source of truth for all API endpoints and environments
 * Version: 4.0.0 - Updated for Supabase backend integration
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
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // Enhanced environment detection
        const isDev = hostname === 'localhost' || 
                      hostname === '127.0.0.1' ||
                      hostname.startsWith('localhost') ||
                      port === '1313' || port === '3000';
        
        const isNetlify = hostname.includes('netlify.app') ||
                         hostname.includes('netlify.com') ||
                         hostname === 'vocal-pony-24e3de.netlify.app';

        return {
            // Environment detection
            environment: isDev ? 'development' : isNetlify ? 'netlify' : 'production',
            isDevelopment: isDev,
            isNetlify: isNetlify,
            isProduction: !isDev && !isNetlify,

            // Supabase API Configuration
            api: {
                development: {
                    http: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
                    rest: 'https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1',
                    auth: 'https://tdmzayzkqyegvfgxlolj.supabase.co/auth/v1',
                    realtime: 'wss://tdmzayzkqyegvfgxlolj.supabase.co/realtime/v1/websocket',
                    storage: 'https://tdmzayzkqyegvfgxlolj.supabase.co/storage/v1'
                },
                netlify: {
                    // Supabase through Netlify Edge Functions for enhanced security
                    http: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
                    rest: 'https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1',
                    auth: 'https://tdmzayzkqyegvfgxlolj.supabase.co/auth/v1',
                    functionsPath: '/.netlify/edge-functions',
                    realtime: 'wss://tdmzayzkqyegvfgxlolj.supabase.co/realtime/v1/websocket',
                    storage: 'https://tdmzayzkqyegvfgxlolj.supabase.co/storage/v1'
                },
                production: {
                    http: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
                    rest: 'https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1',
                    auth: 'https://tdmzayzkqyegvfgxlolj.supabase.co/auth/v1',
                    realtime: 'wss://tdmzayzkqyegvfgxlolj.supabase.co/realtime/v1/websocket',
                    storage: 'https://tdmzayzkqyegvfgxlolj.supabase.co/storage/v1'
                }
            },

            // Fallback endpoints for when backend is unavailable
            fallback: {
                enabled: true,
                mockResponses: true,
                endpoints: ['/health', '/auth-login', '/auth-me']
            },

            // Retry configuration
            retry: {
                attempts: 3,
                delay: 1000,
                exponentialBackoff: true
            },

            // Timeout configuration
            timeout: {
                default: 5000,
                login: 10000,
                upload: 60000
            }
        };
    }

    /**
     * Get current API base URL
     */
    getAPIBaseURL() {
        const env = this.config.environment;
        return this.config.api[env]?.http || this.config.api.production.http;
    }

    /**
     * Get Supabase REST API URL
     */
    getSupabaseRestURL() {
        const env = this.config.environment;
        return this.config.api[env]?.rest || this.config.api.production.rest;
    }

    /**
     * Get Supabase Auth URL
     */
    getSupabaseAuthURL() {
        const env = this.config.environment;
        return this.config.api[env]?.auth || this.config.api.production.auth;
    }

    /**
     * Get Supabase Storage URL
     */
    getSupabaseStorageURL() {
        const env = this.config.environment;
        return this.config.api[env]?.storage || this.config.api.production.storage;
    }

    /**
     * Get WebSocket URL (Supabase Realtime)
     */
    getWebSocketURL() {
        const env = this.config.environment;
        return this.config.api[env]?.realtime;
    }

    /**
     * Get full endpoint URL with proper Netlify function mapping
     */
    getEndpointURL(endpoint, params = {}) {
        const baseURL = this.getAPIBaseURL();
        let url;
        
        if (this.config.isNetlify) {
            // Map API endpoints to Netlify functions
            const functionName = this.mapToNetlifyFunction(endpoint);
            url = `${baseURL}/${functionName}`;
        } else {
            url = `${baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        }

        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        return url;
    }

    /**
     * Map API endpoints to Supabase endpoints
     */
    mapToSupabaseEndpoint(endpoint) {
        const mappings = {
            // Auth endpoints
            '/auth/login': '/auth/v1/token?grant_type=password',
            '/auth/signup': '/auth/v1/signup',
            '/auth/me': '/auth/v1/user',
            '/auth/logout': '/auth/v1/logout',
            '/auth/refresh': '/auth/v1/token?grant_type=refresh_token',
            '/auth/reset': '/auth/v1/recover',
            
            // Data endpoints
            '/projects': '/rest/v1/projects',
            '/blogs': '/rest/v1/blogs', 
            '/contacts': '/rest/v1/contacts',
            '/users': '/rest/v1/profiles',
            
            // Health check
            '/health': '/rest/v1/'
        };
        
        return mappings[endpoint] || endpoint;
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
     * Check if backend is available with proper endpoint selection
     */
    async checkBackendAvailability(retryCount = 0) {
        const maxRetries = this.config.retry.attempts;
        const delay = this.config.retry.delay * (this.config.retry.exponentialBackoff ? Math.pow(2, retryCount) : 1);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            // Use Supabase health endpoint
            const baseURL = this.getSupabaseRestURL();
            const healthURL = `${baseURL}/`;

            const response = await fetch(healthURL, {
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
            
            console.warn('[API Config] Backend unavailable after all retries:', error.message);
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
                mode: 'demo',
                environment: this.config.environment,
                message: 'Demo mode - backend service unavailable'
            },
            '/auth-login': { 
                error: 'Authentication service unavailable. Redirecting to demo mode...'
            },
            '/auth-me': { 
                error: 'Token validation unavailable. Please login again.'
            },
            '/content/projects': {
                success: true,
                data: [],
                message: 'Using fallback mode - content service unavailable'
            }
        };

        // Handle both /auth/login and /auth-login formats
        const normalizedEndpoint = endpoint.replace('/auth/login', '/auth-login');
        const mockResponse = mockResponses[normalizedEndpoint] || mockResponses[endpoint];
        
        if (mockResponse) {
            if (mockResponse.error) {
                throw new Error(mockResponse.error);
            }
            return Promise.resolve(mockResponse);
        }

        throw new Error(`Service unavailable for ${endpoint}. Please try again later.`);
    }

    /**
     * Supabase token management
     */
    getToken() {
        // Try to get from Supabase session first
        const session = this.getSupabaseSession();
        if (session?.access_token) {
            return session.access_token;
        }
        // Fallback to localStorage
        return localStorage.getItem('supabase.auth.token') || localStorage.getItem('token');
    }

    setToken(token) {
        localStorage.setItem('token', token);
        // Also update Supabase token if needed
        if (window.supabase?.auth) {
            localStorage.setItem('supabase.auth.token', token);
        }
    }

    clearToken() {
        // Clear all possible token storage locations
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('supabase.auth.token');
        // Clear Supabase session
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * Get Supabase session from localStorage
     */
    getSupabaseSession() {
        try {
            // Supabase stores session with project ref as key
            const keys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
            for (const key of keys) {
                if (key.includes('auth-token')) {
                    const session = JSON.parse(localStorage.getItem(key));
                    return session;
                }
            }
            return null;
        } catch (error) {
            console.warn('Error reading Supabase session:', error);
            return null;
        }
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