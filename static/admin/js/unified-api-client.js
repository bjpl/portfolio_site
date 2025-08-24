/**
 * Unified API Client for Admin Panel
 * Handles multiple config sources and authentication methods
 */

class UnifiedAPIClient {
    constructor() {
        this.configSources = ['APIConfig', 'AdminConfig', 'CentralAPIConfig', 'SUPABASE_CONFIG'];
        this.config = this.loadBestConfig();
        this.token = this.loadToken();
        this.setupInterceptors();
    }

    /**
     * Load the best available configuration
     */
    loadBestConfig() {
        // Try each config source in order of preference
        for (const source of this.configSources) {
            const config = window[source];
            if (config && this.validateConfig(config)) {
                console.log(`✅ Using ${source} for API configuration`);
                return { source, config };
            }
        }

        // Fallback configuration
        console.warn('⚠️ Using fallback API configuration');
        return {
            source: 'fallback',
            config: {
                baseUrl: this.getBaseUrl(),
                endpoints: {
                    login: this.getBaseUrl() + '/auth-login',
                    logout: this.getBaseUrl() + '/auth-logout',
                    me: this.getBaseUrl() + '/auth-me',
                    dashboard: this.getBaseUrl() + '/dashboard'
                },
                timeout: 10000,
                retries: 3
            }
        };
    }

    /**
     * Get base URL based on environment
     */
    getBaseUrl() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
            return '/.netlify/functions';
        }
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        
        return '/api';
    }

    /**
     * Validate configuration object
     */
    validateConfig(config) {
        if (!config) return false;

        // Check for APIConfig structure
        if (config.buildURL && typeof config.buildURL === 'function') {
            return true;
        }

        // Check for AdminConfig structure
        if (config.api && config.api.baseUrl) {
            return true;
        }

        // Check for Supabase config
        if (config.url && config.anonKey) {
            return true;
        }

        // Check for basic config structure
        if (config.endpoints || config.baseUrl) {
            return true;
        }

        return false;
    }

    /**
     * Build API URL using best available method
     */
    buildUrl(endpoint) {
        const { source, config } = this.config;

        switch (source) {
            case 'APIConfig':
                return config.buildURL(endpoint);
            
            case 'AdminConfig':
                return config.api.baseUrl + endpoint;
            
            case 'CentralAPIConfig':
                return config.getEndpointURL(endpoint);
            
            case 'SUPABASE_CONFIG':
                return config.url + '/rest/v1' + endpoint;
            
            default:
                return config.baseUrl + endpoint;
        }
    }

    /**
     * Load authentication token from storage
     */
    loadToken() {
        // Check multiple storage keys
        const tokenKeys = ['token', 'adminToken', 'accessToken', 'supabase.auth.token'];
        
        for (const key of tokenKeys) {
            const token = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (token && token !== 'undefined' && token !== 'null') {
                return token;
            }
        }

        return null;
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
        
        // Update config-specific storage
        if (this.config.source === 'CentralAPIConfig') {
            window.CentralAPIConfig?.setToken?.(token);
        }
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        this.token = null;
        
        // Clear from all possible storage locations
        const keys = ['token', 'adminToken', 'accessToken', 'refreshToken'];
        keys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    /**
     * Make authenticated request
     */
    async request(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication required');
            }

            return response;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Login with credentials
     */
    async login(credentials) {
        const response = await this.request('/auth-login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        
        if (data.token) {
            this.setToken(data.token);
        }

        return data;
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await this.request('/auth-logout', { method: 'POST' });
        } catch (error) {
            console.warn('Logout request failed:', error);
        } finally {
            this.clearToken();
        }
    }

    /**
     * Get current user info
     */
    async getCurrentUser() {
        if (!this.token) {
            return null;
        }

        try {
            const response = await this.request('/auth-me');
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to get current user:', error);
        }

        return null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Setup request interceptors
     */
    setupInterceptors() {
        // Monitor config changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'token' || e.key === 'adminToken') {
                this.token = this.loadToken();
            }
        });

        // Monitor for new config availability
        const configCheckInterval = setInterval(() => {
            const newConfig = this.loadBestConfig();
            if (newConfig.source !== this.config.source) {
                console.log(`🔄 Switching to ${newConfig.source} configuration`);
                this.config = newConfig;
                clearInterval(configCheckInterval);
            }
        }, 1000);

        // Stop checking after 10 seconds
        setTimeout(() => {
            clearInterval(configCheckInterval);
        }, 10000);
    }

    /**
     * Get configuration info for debugging
     */
    getDebugInfo() {
        return {
            configSource: this.config.source,
            hasToken: !!this.token,
            baseUrl: this.getBaseUrl(),
            availableConfigs: this.configSources.filter(source => !!window[source])
        };
    }
}

// Create global instance
window.unifiedApiClient = new UnifiedAPIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedAPIClient;
}