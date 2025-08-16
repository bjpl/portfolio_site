/**
 * Authentication utility for admin pages
 * Include this script in all admin pages to ensure authentication
 */

// Detect if we're in production (Netlify) or local development
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const AUTH_CONFIG = {
    API_BASE: isProduction ? '/.netlify/functions' : 'http://localhost:3335/api',
    TOKEN_KEY: 'adminToken',
    USER_KEY: 'adminUser',
    REFRESH_TOKEN_KEY: 'adminRefreshToken'
};

class AuthManager {
    constructor() {
        this.token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        this.user = this.getStoredUser();
        this.refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
    }
    
    getStoredUser() {
        try {
            const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }
    
    isAuthenticated() {
        return !!this.token && !!this.user;
    }
    
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
    
    async verifyToken() {
        if (!this.token) return false;
        
        try {
            const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/me`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(data.user));
                return true;
            }
            
            // Try to refresh token if available
            if (this.refreshToken) {
                return await this.refreshAccessToken();
            }
            
            return false;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }
    
    async refreshAccessToken() {
        if (!this.refreshToken) return false;
        
        try {
            const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.accessToken;
                localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.accessToken);
                
                if (data.refreshToken) {
                    this.refreshToken = data.refreshToken;
                    localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
    
    async logout() {
        try {
            await fetch(`${AUTH_CONFIG.API_BASE}/auth/logout`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        }
        
        this.clearAuth();
        window.location.href = 'login.html';
    }
    
    clearAuth() {
        this.token = null;
        this.user = null;
        this.refreshToken = null;
        localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
        localStorage.removeItem(AUTH_CONFIG.USER_KEY);
        localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
    }
    
    redirectToLogin(returnUrl = null) {
        const currentUrl = returnUrl || window.location.pathname + window.location.search;
        window.location.href = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
    }
    
    async makeAuthenticatedRequest(url, options = {}) {
        const config = {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...(options.headers || {})
            }
        };
        
        let response = await fetch(url, config);
        
        // If unauthorized, try to refresh token
        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                // Retry the request with new token
                config.headers['Authorization'] = `Bearer ${this.token}`;
                response = await fetch(url, config);
            } else {
                // Refresh failed, redirect to login
                this.redirectToLogin();
                throw new Error('Authentication failed');
            }
        }
        
        return response;
    }
    
    displayUserInfo() {
        if (this.user) {
            // Update any user info displays on the page
            const userNameElements = document.querySelectorAll('.user-name');
            const userRoleElements = document.querySelectorAll('.user-role');
            const userEmailElements = document.querySelectorAll('.user-email');
            
            userNameElements.forEach(el => {
                el.textContent = this.user.username || this.user.email;
            });
            
            userRoleElements.forEach(el => {
                el.textContent = this.user.role || 'User';
            });
            
            userEmailElements.forEach(el => {
                el.textContent = this.user.email;
            });
        }
    }
    
    hasRole(role) {
        return this.user && this.user.role === role;
    }
    
    isAdmin() {
        return this.hasRole('admin');
    }
    
    isEditor() {
        return this.hasRole('editor') || this.hasRole('admin');
    }
}

// Create global auth instance
const auth = new AuthManager();

// Auto-check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Skip auth check on login page
    if (window.location.pathname.includes('login.html')) {
        return;
    }
    
    // Show loading state
    const body = document.body;
    body.style.opacity = '0.5';
    
    const isValid = await auth.verifyToken();
    
    if (!isValid) {
        auth.redirectToLogin();
        return;
    }
    
    // Authentication successful
    body.style.opacity = '1';
    auth.displayUserInfo();
    
    // Add logout button if it doesn't exist
    if (!document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'btn-logout';
        logoutBtn.innerHTML = '🚪 Logout';
        logoutBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            background: #f56565;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
            transition: all 0.3s;
        `;
        logoutBtn.onmouseover = () => logoutBtn.style.background = '#e53e3e';
        logoutBtn.onmouseout = () => logoutBtn.style.background = '#f56565';
        logoutBtn.onclick = () => auth.logout();
        document.body.appendChild(logoutBtn);
    }
});

// Export for use in other scripts
window.auth = auth;
window.AUTH_CONFIG = AUTH_CONFIG;