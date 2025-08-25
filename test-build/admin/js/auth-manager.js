/**
 * Unified Authentication Manager
 * Simple, practical auth handling for all admin pages
 */

const AuthManager = {
    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getToken();
        const isValid = token && token !== 'undefined' && token !== 'null';
        
        // Also check client-side auth if available
        if (!isValid && window.ClientAuth) {
            return window.ClientAuth.isAuthenticated();
        }
        
        return isValid;
    },

    // Get token from storage
    getToken() {
        return localStorage.getItem('token') || 
               localStorage.getItem('adminToken') || 
               sessionStorage.getItem('token');
    },

    // Set token
    setToken(token) {
        localStorage.setItem('token', token);
        // Clean up old keys
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
    },

    // Clear authentication
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        sessionStorage.clear();
    },

    // Redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/admin/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        return true;
    },

    // Get user info from token (if JWT)
    getUserInfo() {
        const token = this.getToken();
        
        // Try client-side auth first
        if (window.ClientAuth && window.ClientAuth.isAuthenticated()) {
            return window.ClientAuth.getCurrentUser();
        }
        
        if (!token) return null;

        try {
            // Try to decode JWT
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                return {
                    username: payload.username || payload.sub || 'Admin',
                    email: payload.email || '',
                    role: payload.role || 'admin'
                };
            }
        } catch (e) {
            // Not a valid JWT, return default
        }

        return {
            username: 'Admin',
            email: '',
            role: 'admin'
        };
    },

    // Add auth header to fetch requests
    async authenticatedFetch(url, options = {}) {
        const token = this.getToken();
        
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

        const response = await fetch(url, config);

        // Handle auth errors
        if (response.status === 401) {
            this.logout();
            window.location.href = '/admin/login.html';
            throw new Error('Authentication expired');
        }

        return response;
    },

    // Initialize auth check on page load
    init() {
        // Skip auth check on login page
        if (window.location.pathname.includes('/login.html')) {
            return;
        }

        // Check auth on other admin pages
        if (window.location.pathname.includes('/admin/')) {
            this.requireAuth();
            this.updateUserDisplay();
        }
    },

    // Update user display in UI
    updateUserDisplay() {
        const userInfo = this.getUserInfo();
        
        // Update username display
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = userInfo.username;
        }

        // Update user email display
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = userInfo.email;
        }

        // Update role display
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = userInfo.role;
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthManager.init());
} else {
    AuthManager.init();
}

// Make available globally
window.AuthManager = AuthManager;