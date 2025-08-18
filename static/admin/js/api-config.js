/**
 * Unified API Configuration
 * Single source of truth for all API endpoints
 */

const APIConfig = {
    // Determine base URL based on environment
    getBaseURL() {
        // Check if we're on Netlify
        if (window.location.hostname.includes('netlify.app')) {
            return '/.netlify/functions';
        }
        
        // Check if backend is running locally
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001/api';
        }
        
        // Default to relative API path
        return '/api';
    },

    // Get WebSocket URL
    getWebSocketURL() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'ws://localhost:3001/ws';
        }
        
        // Use wss for production
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
    },

    // API Endpoints
    endpoints: {
        // Auth
        login: '/auth/login',
        logout: '/auth/logout',
        me: '/auth/me',
        refresh: '/auth/refresh',

        // Dashboard
        stats: '/dashboard/stats',
        recent: '/dashboard/recent',

        // Content
        content: '/content',
        contentSearch: '/content/search',

        // Files
        files: '/files',
        upload: '/files/upload',

        // Images
        optimize: '/images/optimize',
        
        // Analytics
        analytics: '/analytics',
        
        // Settings
        settings: '/settings',
        
        // Users
        users: '/users',
        
        // Health
        health: '/health'
    },

    // Build full URL for endpoint
    buildURL(endpoint, params = {}) {
        const baseURL = this.getBaseURL();
        let url = baseURL + endpoint;

        // Add query parameters if provided
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += '?' + queryString;
        }

        return url;
    },

    // Check if API is available
    async checkHealth() {
        try {
            const response = await fetch(this.buildURL(this.endpoints.health));
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    // Initialize and check API availability
    async init() {
        const isHealthy = await this.checkHealth();
        
        if (!isHealthy && window.Log) {
            window.Log.warn('API not available, some features may be limited');
        }

        return isHealthy;
    }
};

// Make available globally
window.APIConfig = APIConfig;