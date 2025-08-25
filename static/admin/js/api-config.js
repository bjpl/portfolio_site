/**
 * Unified API Configuration
 * Single source of truth for all API endpoints
 */

const APIConfig = {
    // Supabase Configuration
    supabase: {
        url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
    },

    // Determine base URL based on environment
    getBaseURL() {
        // Check if we're on Netlify (check for '.netlify.app' in hostname)
        if (this.isNetlify()) {
            return '/.netlify/functions';
        }
        
        // Check if backend is running locally
        if (this.isLocal()) {
            return 'http://localhost:3000/api';
        }
        
        // Default to relative API path for other environments
        return '/api';
    },

    // Check if running on Netlify
    isNetlify() {
        const hostname = window.location.hostname;
        return hostname.includes('.netlify.app') || hostname.includes('netlify.com');
    },

    // Check if running locally
    isLocal() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1';
    },

    // Get WebSocket URL
    getWebSocketURL() {
        if (this.isLocal()) {
            return 'ws://localhost:3000/ws';
        }
        
        // Use wss for production
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
    },

    // API Endpoints
    endpoints: {
        // Auth - Updated for Netlify Functions
        login: '/auth-login',
        logout: '/auth-logout',
        me: '/auth-me',
        refresh: '/auth-refresh',

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

    // Get environment information
    getEnvironmentInfo() {
        return {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            isNetlify: this.isNetlify(),
            isLocal: this.isLocal(),
            baseURL: this.getBaseURL(),
            websocketURL: this.getWebSocketURL()
        };
    },

    // Initialize and check API availability
    async init() {
        // Log environment information for debugging
        if (window.console) {
            console.log('APIConfig Environment:', this.getEnvironmentInfo());
        }
        
        const isHealthy = await this.checkHealth();
        
        if (!isHealthy && window.Log) {
            window.Log.warn('API not available, some features may be limited');
        }

        return isHealthy;
    }
};

// Make available globally
window.APIConfig = APIConfig;