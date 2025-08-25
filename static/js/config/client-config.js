/**
 * CLIENT-SIDE CONFIGURATION
 * Browser-safe configuration that loads immediately without environment variables
 * This file is referenced in the Hugo baseof.html template
 * Version: 2.0.0 - Admin Panel Integration Fix
 */

// Immediately expose configuration on window object
window.CLIENT_CONFIG = {
    // Supabase Configuration (hardcoded for browser compatibility)
    SUPABASE_URL: "https://tdmzayzkqyegvfgxlolj.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM",
    
    // Environment Detection
    environment: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'development' : 'production',
    
    // API Endpoints (unified for admin panel)
    endpoints: {
        auth: "https://tdmzayzkqyegvfgxlolj.supabase.co/auth/v1",
        rest: "https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1",
        realtime: "wss://tdmzayzkqyegvfgxlolj.supabase.co/realtime/v1/websocket",
        storage: "https://tdmzayzkqyegvfgxlolj.supabase.co/storage/v1",
        // Netlify Functions for admin operations
        adminAuth: "/.netlify/functions/auth-login",
        adminLogout: "/.netlify/functions/auth-logout",
        adminRefresh: "/.netlify/functions/auth-refresh",
        adminMe: "/.netlify/functions/auth-me",
        health: "/.netlify/functions/health"
    },
    
    // Admin Panel Configuration
    admin: {
        enabled: true,
        basePath: "/admin",
        cacheBusting: true,
        emergencyAccess: {
            enabled: true,
            username: "admin",
            password: "portfolio2024!"
        }
    },
    
    // Features
    features: {
        debug: window.location.hostname.includes('localhost'),
        analytics: !window.location.hostname.includes('localhost'),
        adminPanel: true,
        cacheBusting: true,
        realtime: true
    },
    
    // Request Configuration
    request: {
        timeout: 10000,
        retries: 3,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },

    // Cache busting configuration
    cache: {
        version: "2025-08-25-v5",
        adminAssets: true,
        staticFiles: false // Don't cache admin panel files
    }
};

// Legacy compatibility - expose as SUPABASE_CONFIG for existing code
window.SUPABASE_CONFIG = {
    url: window.CLIENT_CONFIG.SUPABASE_URL,
    anonKey: window.CLIENT_CONFIG.SUPABASE_ANON_KEY,
    auth: {
        session: {
            persistSession: true,
            storage: localStorage,
            storageKey: 'supabase-auth-session',
            autoRefresh: true
        }
    }
};

// Environment variables compatibility layer for legacy code
window.ENV = {
    SUPABASE_URL: window.CLIENT_CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: window.CLIENT_CONFIG.SUPABASE_ANON_KEY
};

// Central API Configuration for unified client
window.CentralAPIConfig = {
    getSupabaseRestURL: () => window.CLIENT_CONFIG.SUPABASE_URL + '/rest/v1',
    getSupabaseAuthURL: () => window.CLIENT_CONFIG.SUPABASE_URL + '/auth/v1',
    getEndpointURL: (endpoint) => {
        if (endpoint.startsWith('/auth/')) {
            return window.CLIENT_CONFIG.SUPABASE_URL + endpoint;
        }
        if (endpoint.startsWith('/admin/') || endpoint.startsWith('auth-')) {
            return window.CLIENT_CONFIG.endpoints[endpoint.replace(/^\/?(admin\/)?/, '').replace('-', '')] || 
                   `/.netlify/functions/${endpoint.replace(/^\/?(admin\/)?/, '')}`;
        }
        return window.CLIENT_CONFIG.SUPABASE_URL + '/rest/v1' + endpoint;
    },
    setToken: (token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('adminToken', token);
    },
    getToken: () => {
        return localStorage.getItem('token') || localStorage.getItem('adminToken');
    }
};

// Admin configuration for admin panel
window.AdminConfig = {
    api: {
        baseUrl: window.CLIENT_CONFIG.admin.basePath,
        endpoints: window.CLIENT_CONFIG.endpoints
    },
    auth: {
        loginUrl: window.CLIENT_CONFIG.endpoints.adminAuth,
        logoutUrl: window.CLIENT_CONFIG.endpoints.adminLogout
    },
    cache: window.CLIENT_CONFIG.cache
};

// Mark configuration as initialized
window.CONFIG_READY = true;
window.SUPABASE_CONFIG_READY = true;

// Emit configuration ready event for any waiting code
window.dispatchEvent(new CustomEvent('supabaseConfigReady', {
    detail: {
        ...window.CLIENT_CONFIG,
        timestamp: new Date().toISOString()
    }
}));

// Additional compatibility events
window.dispatchEvent(new CustomEvent('configReady', { detail: window.CLIENT_CONFIG }));
window.dispatchEvent(new CustomEvent('adminConfigReady', { detail: window.AdminConfig }));

// Console logging for debugging
if (window.CLIENT_CONFIG.features.debug) {
    console.log('🔧 Client Configuration Loaded:', {
        environment: window.CLIENT_CONFIG.environment,
        supabaseUrl: window.CLIENT_CONFIG.SUPABASE_URL,
        hasValidKey: window.CLIENT_CONFIG.SUPABASE_ANON_KEY.length > 100,
        endpoints: Object.keys(window.CLIENT_CONFIG.endpoints),
        adminEnabled: window.CLIENT_CONFIG.admin.enabled,
        cacheBusting: window.CLIENT_CONFIG.features.cacheBusting
    });
}

console.log('✅ Client configuration ready for browser context with admin panel support');