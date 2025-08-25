/**
 * CLIENT-SIDE CONFIGURATION
 * Browser-safe configuration that loads immediately without environment variables
 * Version: 1.0.0 - Browser Context Fix
 */

// Immediately expose configuration on window object
window.CLIENT_CONFIG = {
    // Supabase Configuration (hardcoded for browser compatibility)
    SUPABASE_URL: "https://tdmzayzkqyegvfgxlolj.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM",
    
    // Environment Detection
    environment: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'development' : 'production',
    
    // API Endpoints
    endpoints: {
        auth: "https://tdmzayzkqyegvfgxlolj.supabase.co/auth/v1",
        rest: "https://tdmzayzkqyegvfgxlolj.supabase.co/rest/v1",
        realtime: "wss://tdmzayzkqyegvfgxlolj.supabase.co/realtime/v1/websocket",
        storage: "https://tdmzayzkqyegvfgxlolj.supabase.co/storage/v1"
    },
    
    // Features
    features: {
        debug: window.location.hostname.includes('localhost'),
        analytics: !window.location.hostname.includes('localhost')
    },
    
    // Request Configuration
    request: {
        timeout: 10000,
        retries: 3,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    }
};

// Legacy compatibility - expose as SUPABASE_CONFIG for existing code
window.SUPABASE_CONFIG = {
    url: window.CLIENT_CONFIG.SUPABASE_URL,
    anonKey: window.CLIENT_CONFIG.SUPABASE_ANON_KEY
};

// Environment variables compatibility layer for legacy code
window.ENV = {
    SUPABASE_URL: window.CLIENT_CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: window.CLIENT_CONFIG.SUPABASE_ANON_KEY
};

// Emit configuration ready event for any waiting code
window.dispatchEvent(new CustomEvent('supabaseConfigReady', {
    detail: window.CLIENT_CONFIG
}));

// Console logging for debugging
if (window.CLIENT_CONFIG.features.debug) {
    console.log('🔧 Client Configuration Loaded:', {
        environment: window.CLIENT_CONFIG.environment,
        supabaseUrl: window.CLIENT_CONFIG.SUPABASE_URL,
        hasValidKey: window.CLIENT_CONFIG.SUPABASE_ANON_KEY.length > 100,
        endpoints: Object.keys(window.CLIENT_CONFIG.endpoints)
    });
}

console.log('✅ Client configuration ready for browser context');