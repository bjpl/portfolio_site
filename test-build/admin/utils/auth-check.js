// Authentication Check Module
// Include this in all admin pages to ensure authentication

(function() {
    'use strict';
    
    // Check authentication status on page load
    function checkAuthentication() {
        const token = localStorage.getItem('token');
        const demoMode = localStorage.getItem('demoMode');
        const currentPath = window.location.pathname;
        
        // Skip auth check for login pages and test pages
        const publicPages = [
            '/admin/login.html',
            '/admin/login-fixed.html', 
            '/admin/auth-test.html',
            '/admin/test-connection.html',
            '/admin/fix-demo-mode.html'
        ];
        
        if (publicPages.some(page => currentPath.endsWith(page))) {
            return;
        }
        
        // Redirect if in demo mode
        if (demoMode === 'true') {
            console.warn('Demo mode detected - clearing and redirecting to login');
            localStorage.clear();
            window.location.href = '/admin/login.html';
            return;
        }
        
        // Redirect if no token
        if (!token) {
            console.warn('No authentication token found - redirecting to login');
            window.location.href = '/admin/login.html?redirect=' + encodeURIComponent(currentPath);
            return;
        }
        
        // Verify token is valid
        verifyToken(token);
    }
    
    // Verify token with backend using universal API config
    async function verifyToken(token) {
        try {
            let authURL;
            
            // Use universal API configuration if available
            if (window.CentralAPIConfig) {
                authURL = window.CentralAPIConfig.getEndpointURL('/auth/me');
            } else {
                // Fallback logic
                const hostname = window.location.hostname;
                if (hostname.includes('netlify.app') || hostname === 'vocal-pony-24e3de.netlify.app') {
                    authURL = '/.netlify/functions/auth-me';
                } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    authURL = 'http://localhost:3000/api/auth/me';
                } else {
                    authURL = '/api/auth/me';
                }
            }
            
            const response = await fetch(authURL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn('Token validation failed - redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            } else {
                const data = await response.json();
                console.log('Authentication verified:', data.user?.username || 'admin');
                
                // Dispatch custom event to signal auth is ready
                window.dispatchEvent(new CustomEvent('auth-ready', { 
                    detail: { user: data.user || { username: 'admin' } } 
                }));
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            
            // Handle specific error cases
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.warn('Network error during auth verification - allowing offline access');
                // Allow offline access if token exists
                window.dispatchEvent(new CustomEvent('auth-ready', { 
                    detail: { offline: true, user: { username: 'admin' } } 
                }));
            } else {
                // Other errors might indicate invalid token
                console.warn('Authentication error - clearing token');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }
        }
    }
    
    // Add global auth helper functions
    window.authUtils = {
        getToken: function() {
            return localStorage.getItem('token');
        },
        
        getUser: function() {
            const userStr = localStorage.getItem('adminUser');
            try {
                return userStr ? JSON.parse(userStr) : null;
            } catch (e) {
                return null;
            }
        },
        
        isAuthenticated: function() {
            return !!localStorage.getItem('token') && localStorage.getItem('demoMode') !== 'true';
        },
        
        logout: function() {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('demoMode');
            window.location.href = '/admin/login.html';
        },
        
        makeAuthenticatedRequest: async function(url, options = {}) {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token');
            }
            
            // Use universal API config if available
            let requestURL = url;
            if (window.CentralAPIConfig && !url.startsWith('http')) {
                // Convert relative URLs using universal config
                requestURL = window.CentralAPIConfig.getEndpointURL(url);
            }
            
            const config = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            };
            
            const response = await fetch(requestURL, config);
            
            if (response.status === 401) {
                // Token expired or invalid
                console.warn('Authentication failed - redirecting to login');
                this.logout();
                throw new Error('Authentication required');
            }
            
            return response;
        }
    };
    
    // Run auth check when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuthentication);
    } else {
        checkAuthentication();
    }
})();