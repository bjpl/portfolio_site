/**
 * Unified API Client for Admin Panel
 * Handles multiple config sources and authentication methods
 */

class UnifiedAPIClient {
    constructor() {
        this.configSources = ['CentralAPIConfig', 'SUPABASE_CONFIG', 'APIConfig', 'AdminConfig', 'unifiedApiClient'];
        this.config = this.loadBestConfig();
        this.token = this.loadToken();
        this.setupInterceptors();
        this.initialized = false;
        this.init();
    }

    /**
     * Initialize the client
     */
    async init() {
        // Wait for configurations to load
        let attempts = 0;
        while (attempts < 30) {
            if (window.CentralAPIConfig || window.SUPABASE_CONFIG) {
                this.config = this.loadBestConfig();
                this.initialized = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.initialized) {
            console.warn('⚠️ UnifiedAPIClient: No configuration loaded, using fallback');
            this.config = this.getFallbackConfig();
            this.initialized = true;
        }
    }

    /**
     * Load the best available configuration
     */
    loadBestConfig() {
        // Try each config source in order of preference
        for (const source of this.configSources) {
            if (source === 'unifiedApiClient') continue; // Skip self-reference
            
            const config = window[source];
            if (config && this.validateConfig(config)) {
                console.log(`✅ UnifiedAPIClient using ${source} for API configuration`);
                return { source, config };
            }
        }

        // Fallback configuration
        console.warn('⚠️ UnifiedAPIClient using fallback API configuration');
        return this.getFallbackConfig();
    }
    
    /**
     * Get fallback configuration
     */
    getFallbackConfig() {
        return {
            source: 'fallback',
            config: {
                baseUrl: this.getBaseUrl(),
                endpoints: {
                    login: '/auth/v1/token?grant_type=password',
                    logout: '/auth/v1/logout',
                    me: '/auth/v1/user',
                    refresh: '/auth/v1/token?grant_type=refresh_token',
                    dashboard: '/dashboard'
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

        // Check for CentralAPIConfig structure
        if (config.getSupabaseRestURL && typeof config.getSupabaseRestURL === 'function') {
            return true;
        }

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
            case 'CentralAPIConfig':
                if (config.getEndpointURL) {
                    return config.getEndpointURL(endpoint);
                }
                return config.getSupabaseRestURL() + endpoint;
                
            case 'SUPABASE_CONFIG':
                if (endpoint.startsWith('/auth/')) {
                    return config.url + endpoint;
                }
                return config.url + '/rest/v1' + endpoint;
            
            case 'APIConfig':
                return config.buildURL(endpoint);
            
            case 'AdminConfig':
                return config.api.baseUrl + endpoint;
            
            default:
                // For fallback, use Supabase if available, otherwise use base URL
                const supabaseConfig = window.SUPABASE_CONFIG;
                if (supabaseConfig) {
                    if (endpoint.startsWith('/auth/')) {
                        return supabaseConfig.url + endpoint;
                    }
                    return supabaseConfig.url + '/rest/v1' + endpoint;
                }
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
        if (!this.initialized) {
            await this.init();
        }
        
        const url = this.buildUrl(endpoint);
        const supabaseConfig = window.SUPABASE_CONFIG;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Add authentication headers
        if (this.token) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        // Add Supabase API key if available and no custom token
        if (!this.token && supabaseConfig?.anonKey) {
            defaultOptions.headers['apikey'] = supabaseConfig.anonKey;
            defaultOptions.headers['Authorization'] = `Bearer ${supabaseConfig.anonKey}`;
        }

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
                console.warn('Authentication failed for endpoint:', endpoint);
                // Don't clear token immediately - might be endpoint-specific
                const error = new Error('Authentication required');
                error.status = 401;
                throw error;
            }

            return response;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Login with credentials using Supabase authentication
     */
    async login(credentials) {
        const { email, password } = credentials;
        
        try {
            // Use Supabase auth endpoint
            const response = await this.request('/auth/v1/token?grant_type=password', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error_description || error.error || 'Login failed');
            }

            const data = await response.json();
            
            if (data.access_token) {
                this.setToken(data.access_token);
            }
            
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }

            return {
                success: true,
                user: data.user,
                session: data,
                token: data.access_token
            };
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
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
            const response = await this.request('/auth/v1/user');
            
            if (response.ok) {
                const user = await response.json();
                return {
                    id: user.id,
                    email: user.email,
                    username: user.user_metadata?.username || user.email.split('@')[0],
                    role: user.app_metadata?.role || 'user',
                    profile: user.user_metadata || {}
                };
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
            initialized: this.initialized,
            configSource: this.config.source,
            hasToken: !!this.token,
            baseUrl: this.getBaseUrl(),
            availableConfigs: this.configSources.filter(source => source !== 'unifiedApiClient' && !!window[source]),
            supabaseAvailable: !!window.SUPABASE_CONFIG,
            centralConfigAvailable: !!window.CentralAPIConfig
        };
    }
}

// Create global instance
window.unifiedApiClient = new UnifiedAPIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedAPIClient;
}