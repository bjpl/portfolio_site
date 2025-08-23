// API Configuration for Netlify Deployment
(function() {
    'use strict';
    
    // Detect if running on Netlify or locally
    const isNetlify = window.location.hostname.includes('netlify.app');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Configure API endpoints based on environment
    const getAPIBaseURL = () => {
        if (isNetlify) {
            // Use Netlify Functions
            return '/.netlify/functions';
        } else if (isLocal) {
            // Use local backend
            return 'http://localhost:3000/api';
        } else {
            // Fallback to relative paths
            return '/api';
        }
    };
    
    // Global API configuration
    window.APIConfig = {
        baseURL: getAPIBaseURL(),
        
        // Get full URL for an endpoint
        getURL: function(endpoint) {
            const base = this.baseURL;
            
            // Handle Netlify Functions routing
            if (isNetlify) {
                // Convert /auth/login to /auth-login for Netlify Functions
                const functionName = endpoint.replace(/^\//, '').replace(/\//g, '-');
                return `${base}/${functionName}`;
            }
            
            return `${base}${endpoint}`;
        },
        
        // Check if backend is available
        isBackendAvailable: async function() {
            try {
                const response = await fetch(this.getURL('/auth/me'), {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer test'
                    }
                });
                return response.status !== 404;
            } catch (error) {
                return false;
            }
        },
        
        // Make authenticated request
        makeRequest: async function(endpoint, options = {}) {
            const token = localStorage.getItem('token');
            
            const config = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };
            
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            
            const url = this.getURL(endpoint);
            const response = await fetch(url, config);
            
            if (!response.ok && response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin/login.html';
                throw new Error('Authentication required');
            }
            
            return response;
        }
    };
    
    // Export for use in other scripts
    window.apiConfig = window.APIConfig;
    
    console.log('API Config initialized:', {
        isNetlify,
        isLocal,
        baseURL: window.APIConfig.baseURL
    });
})();