/**
 * Authentication Manager
 * Handles user authentication state and provides auth utilities
 */

class AuthManager {
    constructor(api) {
        this.api = api;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.listeners = [];
        
        this.init();
    }

    init() {
        // Check if user is already authenticated
        this.checkAuthStatus();
        
        // Listen for auth events
        window.addEventListener('auth:login', (event) => {
            this.currentUser = event.detail;
            this.isAuthenticated = true;
            this.notifyListeners('login', event.detail);
        });
        
        window.addEventListener('auth:logout', () => {
            this.currentUser = null;
            this.isAuthenticated = false;
            this.notifyListeners('logout');
        });
    }

    async checkAuthStatus() {
        try {
            const response = await this.api.request('/auth/me', { skipCache: true });
            if (response.success && response.user) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                this.notifyListeners('login', response.user);
            }
        } catch (error) {
            console.log('No authenticated user found');
        }
    }

    async login(credentials) {
        try {
            const response = await this.api.login(credentials);
            if (response.success) {
                // User data will be set via event listener
                return { success: true, user: response.user };
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await this.api.register(userData);
            if (response.success) {
                return { success: true, message: response.message };
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.api.logout();
            // User state will be cleared via event listener
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local state even if server request fails
            this.currentUser = null;
            this.isAuthenticated = false;
            this.notifyListeners('logout');
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            const response = await this.api.post('/auth/reset-password', { email });
            return response;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const response = await this.api.put('/auth/change-password', {
                currentPassword,
                newPassword
            });
            return response;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    async updateProfile(profileData) {
        try {
            const response = await this.api.put('/auth/profile', profileData);
            if (response.success) {
                this.currentUser = { ...this.currentUser, ...response.user };
                this.notifyListeners('profileUpdate', this.currentUser);
            }
            return response;
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        }
    }

    // Permission checking
    hasPermission(permission) {
        if (!this.isAuthenticated || !this.currentUser) {
            return false;
        }
        
        return this.currentUser.permissions?.includes(permission) || 
               this.currentUser.role === 'admin';
    }

    hasRole(role) {
        if (!this.isAuthenticated || !this.currentUser) {
            return false;
        }
        
        return this.currentUser.role === role;
    }

    isAdmin() {
        return this.hasRole('admin');
    }

    // Event listeners
    addAuthListener(callback) {
        this.listeners.push(callback);
    }

    removeAuthListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Auth listener error:', error);
            }
        });
    }

    // Utility methods
    getToken() {
        return this.api.auth.token;
    }

    getUser() {
        return this.currentUser;
    }

    getUserId() {
        return this.currentUser?.id;
    }

    getUsername() {
        return this.currentUser?.username || this.currentUser?.email;
    }

    getDisplayName() {
        return this.currentUser?.displayName || 
               this.currentUser?.firstName + ' ' + this.currentUser?.lastName ||
               this.getUsername();
    }

    // Protected route helper
    requireAuth() {
        if (!this.isAuthenticated) {
            throw new Error('Authentication required');
        }
        return true;
    }

    requirePermission(permission) {
        this.requireAuth();
        if (!this.hasPermission(permission)) {
            throw new Error(`Permission required: ${permission}`);
        }
        return true;
    }

    requireRole(role) {
        this.requireAuth();
        if (!this.hasRole(role)) {
            throw new Error(`Role required: ${role}`);
        }
        return true;
    }
}

// Initialize auth manager with the global API instance
window.authManager = new AuthManager(window.universalAPI);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}