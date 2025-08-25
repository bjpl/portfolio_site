/**
 * Initial Configuration Script
 * Sets up all configurations immediately when the page loads
 * 
 * This script runs synchronously and sets up:
 * - Supabase configuration
 * - Netlify function endpoints
 * - Environment detection
 * - Fallback values
 */

(function() {
    'use strict';
    
    // Environment detection
    const isNetlify = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1' && 
                      !window.location.hostname.includes('local');
    
    const isDev = !isNetlify;
    
    // Supabase Configuration
    window.SUPABASE_CONFIG = {
        url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
        options: {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    };
    
    // Netlify Configuration with environment-specific endpoints
    window.NETLIFY_CONFIG = {
        functions: {
            // Authentication endpoints
            login: isNetlify ? '/.netlify/functions/auth-login' : '/api/auth/login',
            logout: isNetlify ? '/.netlify/functions/auth-logout' : '/api/auth/logout',
            verify: isNetlify ? '/.netlify/functions/auth-verify' : '/api/auth/verify',
            refresh: isNetlify ? '/.netlify/functions/auth-refresh' : '/api/auth/refresh',
            
            // Content management endpoints
            content: isNetlify ? '/.netlify/functions/content-manager' : '/api/content',
            portfolio: isNetlify ? '/.netlify/functions/portfolio-manager' : '/api/portfolio',
            media: isNetlify ? '/.netlify/functions/media-manager' : '/api/media',
            
            // Analytics endpoints
            analytics: isNetlify ? '/.netlify/functions/analytics' : '/api/analytics',
            
            // Utility endpoints
            health: isNetlify ? '/.netlify/functions/health-check' : '/api/health',
            config: isNetlify ? '/.netlify/functions/get-config' : '/api/config'
        },
        
        // Environment detection
        environment: isNetlify ? 'production' : 'development',
        isNetlify: isNetlify,
        isDevelopment: isDev,
        
        // Base URLs
        baseURL: isNetlify ? window.location.origin : 'http://localhost:3000',
        apiBase: isNetlify ? window.location.origin + '/.netlify/functions' : 'http://localhost:3000/api'
    };
    
    // Application Configuration
    window.APP_CONFIG = {
        // API settings
        api: {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000
        },
        
        // Authentication settings
        auth: {
            tokenKey: 'admin_token',
            sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
            refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
            loginRedirect: '/static/admin/dashboard.html',
            logoutRedirect: '/static/admin/login.html'
        },
        
        // UI settings
        ui: {
            theme: 'modern',
            animations: true,
            notifications: true,
            autoSave: true,
            autoSaveInterval: 30000 // 30 seconds
        },
        
        // Features flags
        features: {
            analytics: true,
            media: true,
            multilingual: true,
            seo: true,
            bulkUpload: true,
            realTimeSync: true
        }
    };
    
    // Debug Configuration (only in development)
    if (isDev) {
        window.DEBUG_CONFIG = {
            enabled: true,
            level: 'info',
            components: ['auth', 'api', 'ui', 'routing'],
            logToConsole: true,
            logToServer: false
        };
        
        // Add debug logger
        window.debugLog = function(component, level, message, data) {
            if (!window.DEBUG_CONFIG.enabled) return;
            if (!window.DEBUG_CONFIG.components.includes(component)) return;
            
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] ${component.toUpperCase()}: ${message}`;
            
            if (window.DEBUG_CONFIG.logToConsole) {
                console[level] ? console[level](logMessage, data || '') : console.log(logMessage, data || '');
            }
        };
    } else {
        // Production: minimal debug
        window.debugLog = function() {};
    }
    
    // Fallback configurations
    window.FALLBACK_CONFIG = {
        supabase: {
            url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
        },
        api: {
            baseURL: 'https://portfolio-site-brand.netlify.app',
            endpoints: {
                auth: '/.netlify/functions/auth-login',
                content: '/.netlify/functions/content-manager',
                health: '/.netlify/functions/health-check'
            }
        }
    };
    
    // Validation function
    window.validateConfig = function() {
        const errors = [];
        
        // Validate Supabase config
        if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) {
            errors.push('Invalid Supabase configuration');
        }
        
        // Validate Netlify config
        if (!window.NETLIFY_CONFIG || !window.NETLIFY_CONFIG.functions) {
            errors.push('Invalid Netlify configuration');
        }
        
        // Validate App config
        if (!window.APP_CONFIG || !window.APP_CONFIG.auth) {
            errors.push('Invalid App configuration');
        }
        
        if (errors.length > 0) {
            console.error('Configuration validation failed:', errors);
            return false;
        }
        
        return true;
    };
    
    // Initialize configuration status
    window.CONFIG_STATUS = {
        initialized: true,
        timestamp: Date.now(),
        environment: window.NETLIFY_CONFIG.environment,
        valid: window.validateConfig()
    };
    
    // Dispatch configuration ready event
    document.addEventListener('DOMContentLoaded', function() {
        const configEvent = new CustomEvent('configReady', {
            detail: {
                status: window.CONFIG_STATUS,
                supabase: window.SUPABASE_CONFIG,
                netlify: window.NETLIFY_CONFIG,
                app: window.APP_CONFIG
            }
        });
        
        document.dispatchEvent(configEvent);
    });
    
    // Global error handler for configuration issues
    window.addEventListener('error', function(event) {
        if (event.message && event.message.includes('config')) {
            console.error('Configuration error detected:', event.message);
            
            // Attempt to use fallback configuration
            if (window.FALLBACK_CONFIG) {
                console.warn('Attempting to use fallback configuration...');
                window.SUPABASE_CONFIG = window.FALLBACK_CONFIG.supabase;
                window.NETLIFY_CONFIG.functions = window.FALLBACK_CONFIG.api.endpoints;
            }
        }
    });
    
    // Log initialization
    if (isDev) {
        console.log('🚀 Configuration initialized:', {
            environment: window.NETLIFY_CONFIG.environment,
            supabase: !!window.SUPABASE_CONFIG.url,
            netlify: !!window.NETLIFY_CONFIG.functions,
            timestamp: new Date().toISOString()
        });
    }
    
})();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG: window.SUPABASE_CONFIG,
        NETLIFY_CONFIG: window.NETLIFY_CONFIG,
        APP_CONFIG: window.APP_CONFIG
    };
}