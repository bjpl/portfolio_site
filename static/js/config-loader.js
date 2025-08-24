/**
 * Configuration Loader
 * Loads immediately on page load and sets up global configuration
 */

(function() {
    'use strict';

    // Hardcoded Supabase configuration
    const SUPABASE_CONFIG = {
        url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
    };

    // API endpoint configuration
    const API_CONFIG = {
        baseUrl: 'https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1',
        headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    // Initialize global configuration
    function initializeConfig() {
        // Set up global window objects
        window.SUPABASE_CONFIG = SUPABASE_CONFIG;
        window.API_CONFIG = API_CONFIG;

        // Additional configuration helpers
        window.CONFIG_UTILS = {
            getApiHeaders: function() {
                return { ...API_CONFIG.headers };
            },
            
            getApiUrl: function(endpoint) {
                return `${API_CONFIG.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
            },
            
            makeAuthenticatedRequest: async function(url, options = {}) {
                const defaultOptions = {
                    headers: this.getApiHeaders()
                };
                
                const mergedOptions = {
                    ...defaultOptions,
                    ...options,
                    headers: {
                        ...defaultOptions.headers,
                        ...options.headers
                    }
                };
                
                return fetch(url, mergedOptions);
            }
        };

        console.log('Configuration loaded successfully');
        
        // Dispatch configuration ready event
        const configReadyEvent = new CustomEvent('configReady', {
            detail: {
                supabase: SUPABASE_CONFIG,
                api: API_CONFIG,
                timestamp: new Date().toISOString()
            }
        });
        
        document.dispatchEvent(configReadyEvent);
    }

    // Load configuration immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeConfig);
    } else {
        initializeConfig();
    }

    // Also dispatch on window load for any late listeners
    window.addEventListener('load', function() {
        const configLoadedEvent = new CustomEvent('configLoaded', {
            detail: {
                supabase: window.SUPABASE_CONFIG,
                api: window.API_CONFIG,
                timestamp: new Date().toISOString()
            }
        });
        
        document.dispatchEvent(configLoadedEvent);
    });

})();