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
    
    // Verify token with backend
    async function verifyToken(token) {
        try {
            const response = await fetch('http://localhost:3000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
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
                console.log('Authentication verified:', data.user.username);
                
                // Dispatch custom event to signal auth is ready
                window.dispatchEvent(new CustomEvent('auth-ready', { 
                    detail: { user: data.user } 
                }));
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            // Don't redirect on network errors, let the user work offline if token exists
            window.dispatchEvent(new CustomEvent('auth-ready', { 
                detail: { offline: true } 
            }));
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
            
            const config = {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            };
            
            const response = await fetch(url, config);
            
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