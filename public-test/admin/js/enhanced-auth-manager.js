/**
 * Enhanced Authentication Manager
 * Integrates with backend security system
 */

class EnhancedAuthManager {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.tokenKey = 'accessToken';
        this.refreshTokenKey = 'refreshToken';
        this.userKey = 'currentUser';
        this.sessionKey = 'sessionId';
        this.refreshPromise = null;
        this.refreshTimer = null;
    }

    // Initialize enhanced auth manager
    init() {
        this.setupTokenRefresh();
        this.setupStorageListener();
        this.validateStoredTokens();
        
        // Auto-refresh tokens if needed
        if (this.isAuthenticated() && this.isTokenExpiring()) {
            this.refreshToken();
        }
    }

    // Enhanced authentication check
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = this.decodeJWT(token);
            return payload.exp > Date.now() / 1000;
        } catch (error) {
            console.warn('Invalid token format:', error);
            return false;
        }
    }

    // Get stored access token
    getToken() {
        return localStorage.getItem(this.tokenKey) || 
               localStorage.getItem('token') || // Legacy support
               localStorage.getItem('adminToken');
    }

    // Set access token
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
        // Clean up legacy tokens
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        this.scheduleTokenRefresh();
    }

    // Get refresh token
    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey);
    }

    // Set refresh token
    setRefreshToken(token) {
        if (token) {
            localStorage.setItem(this.refreshTokenKey, token);
        }
    }

    // Enhanced login with 2FA support
    async login(email, password, twoFactorCode = null) {
        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    password,
                    twoFactorCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle 2FA requirement
                if (response.status === 423 && data.requires2FA) {
                    return {
                        success: false,
                        requires2FA: true,
                        tempToken: data.tempToken,
                        message: 'Two-factor authentication required'
                    };
                }
                throw new Error(data.error || 'Login failed');
            }

            // Store tokens and user data
            this.setToken(data.accessToken);
            if (data.refreshToken) {
                this.setRefreshToken(data.refreshToken);
            }
            this.setUser(data.user);

            return {
                success: true,
                user: data.user,
                message: data.message
            };
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // Verify 2FA code
    async verify2FA(tempToken, code, isBackupCode = false) {
        try {
            const response = await fetch(`${this.apiBase}/auth/verify-2fa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tempToken}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    code,
                    isBackupCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '2FA verification failed');
            }

            // Store tokens and user data
            this.setToken(data.accessToken);
            if (data.refreshToken) {
                this.setRefreshToken(data.refreshToken);
            }
            this.setUser(data.user);

            return {
                success: true,
                user: data.user,
                backupCodeUsed: data.backupCodeUsed
            };
        } catch (error) {
            console.error('2FA verification failed:', error);
            throw error;
        }
    }

    // Enhanced logout
    async logout() {
        try {
            // Call logout endpoint if authenticated
            if (this.isAuthenticated()) {
                await this.authenticatedFetch('/auth/logout', {
                    method: 'POST'
                });
            }
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            this.clearAuth();
        }
    }

    // Logout from all devices
    async logoutAll() {
        try {
            await this.authenticatedFetch('/auth/logout-all', {
                method: 'POST'
            });
        } catch (error) {
            console.warn('Logout all failed:', error);
        } finally {
            this.clearAuth();
        }
    }

    // Refresh access token
    async refreshToken() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.doRefreshToken();
        
        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.refreshPromise = null;
        }
    }

    async doRefreshToken() {
        try {
            const response = await fetch(`${this.apiBase}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            if (data.accessToken) {
                this.setToken(data.accessToken);
                return data.accessToken;
            }

            throw new Error('No access token received');
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
            this.redirectToLogin();
            throw error;
        }
    }

    // Make authenticated request with auto-retry
    async authenticatedFetch(endpoint, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            throw new Error('No authentication token available');
        }

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            credentials: 'include'
        };

        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, config);
            
            // Handle token expiration
            if (response.status === 401) {
                const errorData = await response.json().catch(() => ({}));
                
                if (errorData.code === 'TOKEN_EXPIRED') {
                    // Try to refresh token and retry
                    await this.refreshToken();
                    const newToken = this.getToken();
                    
                    if (newToken) {
                        config.headers['Authorization'] = `Bearer ${newToken}`;
                        return fetch(`${this.apiBase}${endpoint}`, config);
                    }
                }
                
                // Authentication failed
                this.clearAuth();
                this.redirectToLogin();
                throw new Error('Authentication expired');
            }

            return response;
        } catch (error) {
            if (error.message === 'Authentication expired') {
                throw error;
            }
            
            // For network errors, try refresh once
            if (!options._retried) {
                try {
                    await this.refreshToken();
                    const newToken = this.getToken();
                    
                    if (newToken) {
                        config.headers['Authorization'] = `Bearer ${newToken}`;
                        config._retried = true;
                        return this.authenticatedFetch(endpoint, config);
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed during retry:', refreshError);
                }
            }
            
            throw error;
        }
    }

    // Password management
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await this.authenticatedFetch('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Password change failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Password change failed:', error);
            throw error;
        }
    }

    // 2FA Management
    async setup2FA() {
        try {
            const response = await this.authenticatedFetch('/auth/2fa/setup');
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '2FA setup failed');
            }

            return await response.json();
        } catch (error) {
            console.error('2FA setup failed:', error);
            throw error;
        }
    }

    async enable2FA(token) {
        try {
            const response = await this.authenticatedFetch('/auth/2fa/enable', {
                method: 'POST',
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '2FA enable failed');
            }

            return await response.json();
        } catch (error) {
            console.error('2FA enable failed:', error);
            throw error;
        }
    }

    async disable2FA(password) {
        try {
            const response = await this.authenticatedFetch('/auth/2fa/disable', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '2FA disable failed');
            }

            return await response.json();
        } catch (error) {
            console.error('2FA disable failed:', error);
            throw error;
        }
    }

    async regenerateBackupCodes(password) {
        try {
            const response = await this.authenticatedFetch('/auth/2fa/backup-codes', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Backup codes regeneration failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Backup codes regeneration failed:', error);
            throw error;
        }
    }

    // Session management
    async getSessions() {
        try {
            const response = await this.authenticatedFetch('/auth/sessions');
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get sessions');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get sessions:', error);
            throw error;
        }
    }

    async revokeSession(sessionId) {
        try {
            const response = await this.authenticatedFetch(`/auth/sessions/${sessionId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to revoke session');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to revoke session:', error);
            throw error;
        }
    }

    // User management
    getUser() {
        const userJson = localStorage.getItem(this.userKey);
        return userJson ? JSON.parse(userJson) : null;
    }

    setUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    getUserInfo() {
        const user = this.getUser();
        if (user) {
            return {
                username: user.firstName || user.email.split('@')[0],
                email: user.email,
                role: user.role,
                permissions: user.permissions || []
            };
        }
        
        // Fallback to token decode
        const token = this.getToken();
        if (token) {
            try {
                const payload = this.decodeJWT(token);
                return {
                    username: payload.email?.split('@')[0] || 'User',
                    email: payload.email,
                    role: payload.role || 'user',
                    permissions: payload.permissions || []
                };
            } catch (error) {
                console.warn('Failed to decode token:', error);
            }
        }
        
        return null;
    }

    // Permission checks
    hasPermission(permission) {
        const user = this.getUser();
        if (!user) return false;
        
        // Admin has all permissions
        if (user.role === 'admin') return true;
        
        const permissions = user.permissions || [];
        return permissions.includes(permission);
    }

    hasRole(role) {
        const user = this.getUser();
        return user?.role === role || user?.role === 'admin';
    }

    // Token utilities
    decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            throw new Error('Invalid token format');
        }
    }

    isTokenExpiring(minutesThreshold = 5) {
        const token = this.getToken();
        if (!token) return true;

        try {
            const payload = this.decodeJWT(token);
            const now = Date.now() / 1000;
            const timeUntilExpiry = payload.exp - now;
            return timeUntilExpiry <= (minutesThreshold * 60);
        } catch (error) {
            return true;
        }
    }

    // Auto-refresh management
    scheduleTokenRefresh() {
        this.clearRefreshTimer();
        
        const token = this.getToken();
        if (!token) return;

        try {
            const payload = this.decodeJWT(token);
            const now = Date.now() / 1000;
            const timeUntilExpiry = payload.exp - now;
            const refreshTime = Math.max(timeUntilExpiry - 300, 60); // 5 min before expiry, min 1 min

            this.refreshTimer = setTimeout(() => {
                this.refreshToken().catch(error => {
                    console.error('Automatic token refresh failed:', error);
                });
            }, refreshTime * 1000);
        } catch (error) {
            console.warn('Failed to schedule token refresh:', error);
        }
    }

    clearRefreshTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    setupTokenRefresh() {
        if (this.isAuthenticated()) {
            this.scheduleTokenRefresh();
        }
    }

    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.tokenKey) {
                if (event.newValue === null) {
                    // Token was removed in another tab
                    this.clearAuth();
                    this.redirectToLogin();
                } else if (event.oldValue !== event.newValue) {
                    // Token was updated in another tab
                    this.scheduleTokenRefresh();
                }
            }
        });
    }

    validateStoredTokens() {
        const token = this.getToken();
        if (token && !this.isAuthenticated()) {
            this.clearAuth();
        }
    }

    // Utility methods
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    redirectToLogin() {
        const currentPath = window.location.pathname;
        const loginUrl = `/admin/login.html${currentPath !== '/admin/login.html' ? '?redirect=' + encodeURIComponent(currentPath) : ''}`;
        
        if (window.location.pathname !== '/admin/login.html') {
            window.location.href = loginUrl;
        }
    }

    clearAuth() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.sessionKey);
        
        // Legacy cleanup
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        
        this.clearRefreshTimer();
    }

    updateUserDisplay() {
        const userInfo = this.getUserInfo();
        if (!userInfo) return;
        
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

    // Initialize on page load
    initPageAuth() {
        // Skip auth check on login page
        if (window.location.pathname.includes('/login.html')) {
            return;
        }

        // Check auth on admin pages
        if (window.location.pathname.includes('/admin/')) {
            this.requireAuth();
            this.updateUserDisplay();
        }
    }
}

// Create enhanced auth manager instance
const AuthManager = new EnhancedAuthManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AuthManager.init();
        AuthManager.initPageAuth();
    });
} else {
    AuthManager.init();
    AuthManager.initPageAuth();
}

// Make available globally
window.AuthManager = AuthManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
