/**
 * SIMPLE API Configuration
 * Clean, working client-side config
 */

const APIConfig = {
    getBaseURL() {
        // SIMPLE: Just check if we're on Netlify
        if (window.location.hostname.includes('netlify.app')) {
            return '/.netlify/functions';
        }
        return '/api';
    },
    
    endpoints: {
        login: '/auth-login',
        simpleAuth: '/simple-auth',
        test: '/test-auth'
    },
    
    async testConnection() {
        try {
            const response = await fetch(this.getBaseURL() + '/test-auth');
            return response.ok;
        } catch {
            return false;
        }
    }
};

// Make it global immediately
window.APIConfig = APIConfig;