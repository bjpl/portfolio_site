/**
 * Authentication Manager
 * Handles Supabase user authentication state and provides auth utilities
 * Version: 4.0.0 - Supabase Integration
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
            // Check for Supabase session first
            const supabaseSession = this.getSupabaseSession();
            if (supabaseSession?.access_token) {
                // Verify with Supabase API
                const response = await this.api.request('/auth/v1/user', { 
                    skipCache: true,
                    headers: {
                        'Authorization': `Bearer ${supabaseSession.access_token}`
                    }
                });
                
                if (response && !response.error) {
                    this.currentUser = response;
                    this.isAuthenticated = true;
                    this.notifyListeners('login', response);
                }
            }
        } catch (error) {
            console.log('No authenticated user found:', error.message);
            this.clearAuthState();
        }
    }

    /**
     * Get Supabase session from localStorage
     */
    getSupabaseSession() {
        try {
            // Supabase stores sessions with project ref in the key
            const keys = Object.keys(localStorage).filter(key => 
                key.startsWith('sb-') && key.includes('auth-token')
            );
            
            for (const key of keys) {
                const session = JSON.parse(localStorage.getItem(key) || '{}');
                if (session.access_token && session.expires_at > Date.now() / 1000) {
                    return session;
                }
            }
            return null;
        } catch (error) {
            console.warn('Error reading Supabase session:', error);
            return null;
        }
    }

    /**
     * Clear authentication state
     */
    clearAuthState() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.clearSupabaseSession();
    }

    /**
     * Clear Supabase session data
     */
    clearSupabaseSession() {
        // Clear all Supabase session keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        });
    }

    async login(credentials) {
        try {
            // Use Supabase auth endpoint
            const response = await this.api.request('/auth/v1/token?grant_type=password', {
                method: 'POST',
                body: {
                    email: credentials.email || credentials.username,
                    password: credentials.password
                },
                skipCache: true
            });
            
            if (response.access_token) {
                // Store session and get user data
                this.storeSupabaseSession(response);
                await this.checkAuthStatus();
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(response.error_description || response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Store Supabase session in localStorage
     */
    storeSupabaseSession(authResponse) {
        const session = {
            access_token: authResponse.access_token,
            refresh_token: authResponse.refresh_token,
            expires_in: authResponse.expires_in,
            expires_at: Math.floor(Date.now() / 1000) + authResponse.expires_in,
            token_type: authResponse.token_type || 'bearer',
            user: authResponse.user
        };
        
        // Use the same key format as Supabase client
        const projectRef = 'tdmzayzkqyegvfgxlolj'; // Our Supabase project ref
        const key = `sb-${projectRef}-auth-token`;
        localStorage.setItem(key, JSON.stringify(session));
    }

    async register(userData) {
        try {
            // Use Supabase auth signup endpoint
            const response = await this.api.request('/auth/v1/signup', {
                method: 'POST',
                body: {
                    email: userData.email,
                    password: userData.password,
                    data: userData.metadata || {}
                },
                skipCache: true
            });
            
            if (response.user || response.id) {
                // Registration successful - may require email confirmation
                return { 
                    success: true, 
                    message: response.confirmation_sent_at ? 
                        'Please check your email to confirm your account' : 
                        'Registration successful',
                    user: response.user,
                    confirmationRequired: !!response.confirmation_sent_at
                };
            } else {
                throw new Error(response.error_description || response.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            const session = this.getSupabaseSession();
            if (session?.access_token) {
                // Call Supabase logout endpoint
                await this.api.request('/auth/v1/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    skipCache: true
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local state
            this.clearAuthState();
            this.notifyListeners('logout');
        }
        
        return { success: true };
    }

    async resetPassword(email) {
        try {
            const response = await this.api.request('/auth/v1/recover', {
                method: 'POST',
                body: { email },
                skipCache: true
            });
            
            return {
                success: true,
                message: 'Password reset email sent. Please check your inbox.'
            };
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
        const session = this.getSupabaseSession();
        return session?.access_token || null;
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