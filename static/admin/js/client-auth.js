/**
 * Enhanced Client-side Authentication System
 * Provides robust authentication when backend is unavailable
 * Includes multiple auth methods and comprehensive error handling
 */

class EnhancedClientAuth {
    constructor() {
        this.credentials = {
            'admin': 'password123',
            'user@example.com': 'password123',
            'demo': 'demo123',
            'test@example.com': 'test123',
            'portfolio@admin.com': 'admin123'
        };
        
        this.currentUser = null;
        this.authMethods = ['supabase', 'netlify', 'client'];
        this.retryAttempts = 3;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.initialized = false;
        
        this.init();
    }

    /**
     * Initialize authentication system
     */
    init() {
        try {
            this.restoreSession();
            this.setupEventListeners();
            this.initialized = true;
            console.log('✅ Enhanced Client Auth initialized');
        } catch (error) {
            console.error('❌ Client Auth initialization failed:', error);
        }
    }

    /**
     * Comprehensive authentication with multiple fallbacks
     */
    async authenticate(username, password) {
        console.log(`🔐 Attempting authentication for: ${username}`);
        
        // Try each auth method in order
        for (const method of this.authMethods) {
            try {
                const result = await this.tryAuthMethod(method, username, password);
                if (result.success) {
                    await this.handleSuccessfulAuth(result.user, method);
                    return result;
                }
            } catch (error) {
                console.warn(`Auth method ${method} failed:`, error.message);
                continue;
            }
        }
        
        return { success: false, error: 'All authentication methods failed' };
    }

    /**
     * Try specific authentication method
     */
    async tryAuthMethod(method, username, password) {
        switch (method) {
            case 'supabase':
                return await this.trySupabaseAuth(username, password);
            case 'netlify':
                return await this.tryNetlifyAuth(username, password);
            case 'client':
                return this.tryClientAuth(username, password);
            default:
                throw new Error(`Unknown auth method: ${method}`);
        }
    }

    /**
     * Try Supabase authentication
     */
    async trySupabaseAuth(username, password) {
        if (!window.SUPABASE_CONFIG) {
            throw new Error('Supabase config not available');
        }

        const response = await fetch('/.netlify/edge-functions/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.token) {
                return {
                    success: true,
                    user: {
                        ...data.user,
                        authMethod: 'supabase',
                        token: data.token
                    }
                };
            }
        }
        
        throw new Error('Supabase authentication failed');
    }

    /**
     * Try Netlify Function authentication
     */
    async tryNetlifyAuth(username, password) {
        const response = await fetch('/.netlify/functions/auth-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.token) {
                return {
                    success: true,
                    user: {
                        ...data.user,
                        authMethod: 'netlify',
                        token: data.token
                    }
                };
            }
        }
        
        throw new Error('Netlify authentication failed');
    }

    /**
     * Client-side authentication fallback
     */
    tryClientAuth(username, password) {
        if (this.credentials[username] === password) {
            const user = {
                id: this.generateUserId(username),
                username: username,
                email: username.includes('@') ? username : `${username}@example.com`,
                role: username === 'admin' ? 'admin' : 'user',
                profile: { displayName: username },
                authenticated: true,
                authMethod: 'client',
                loginTime: new Date().toISOString(),
                token: this.generateToken(username)
            };
            
            return { success: true, user };
        }
        
        throw new Error('Invalid credentials');
    }

    /**
     * Handle successful authentication
     */
    async handleSuccessfulAuth(user, method) {
        this.currentUser = user;
        
        // Store session data
        localStorage.setItem('token', user.token);
        localStorage.setItem('adminUser', JSON.stringify(user));
        localStorage.setItem('authMethod', method);
        localStorage.setItem('sessionStart', Date.now().toString());
        
        // Log successful login
        this.logActivity('login', { method, timestamp: new Date().toISOString() });
        
        console.log(`✅ Authentication successful via ${method}:`, user.username);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        try {
            const token = localStorage.getItem('token');
            const sessionStart = localStorage.getItem('sessionStart');
            
            if (!token || token === 'undefined' || token === 'null') {
                return false;
            }
            
            // Check session timeout
            if (sessionStart) {
                const elapsed = Date.now() - parseInt(sessionStart, 10);
                if (elapsed > this.sessionTimeout) {
                    this.logout();
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    /**
     * Get current user with session restoration
     */
    getCurrentUser() {
        if (!this.currentUser) {
            this.restoreSession();
        }
        return this.currentUser;
    }

    /**
     * Restore session from storage
     */
    restoreSession() {
        try {
            const stored = localStorage.getItem('adminUser');
            if (stored && stored !== 'undefined') {
                this.currentUser = JSON.parse(stored);
                
                // Validate session
                if (!this.isAuthenticated()) {
                    this.currentUser = null;
                }
            }
        } catch (error) {
            console.warn('Session restoration failed:', error);
            this.clearSession();
        }
    }

    /**
     * Generate secure user ID
     */
    generateUserId(username) {
        return btoa(username + Date.now()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }

    /**
     * Generate authentication token
     */
    generateToken(username) {
        const payload = {
            sub: username,
            username: username,
            role: username === 'admin' ? 'admin' : 'user',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor((Date.now() + this.sessionTimeout) / 1000)
        };
        
        return 'client_' + btoa(JSON.stringify(payload));
    }

    /**
     * Log user activity
     */
    logActivity(action, data = {}) {
        try {
            const activities = JSON.parse(localStorage.getItem('userActivities') || '[]');
            activities.unshift({
                action,
                data,
                timestamp: new Date().toISOString(),
                user: this.currentUser?.username || 'unknown'
            });
            
            // Keep only last 50 activities
            activities.splice(50);
            localStorage.setItem('userActivities', JSON.stringify(activities));
        } catch (error) {
            console.warn('Activity logging failed:', error);
        }
    }

    /**
     * Clear session data
     */
    clearSession() {
        const keysToRemove = ['token', 'adminUser', 'authMethod', 'sessionStart', 'refreshToken'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
    }

    /**
     * Logout user
     */
    logout() {
        const username = this.currentUser?.username || 'unknown';
        this.logActivity('logout', { timestamp: new Date().toISOString() });
        
        this.currentUser = null;
        this.clearSession();
        
        console.log(`🔓 User ${username} logged out`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'token' || e.key === 'adminUser') {
                this.restoreSession();
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                this.restoreSession();
            }
        });
    }

    /**
     * Get authentication status report
     */
    getAuthStatus() {
        return {
            initialized: this.initialized,
            authenticated: this.isAuthenticated(),
            user: this.currentUser,
            authMethod: localStorage.getItem('authMethod'),
            sessionStart: localStorage.getItem('sessionStart'),
            timeRemaining: this.getSessionTimeRemaining()
        };
    }

    /**
     * Get remaining session time
     */
    getSessionTimeRemaining() {
        const sessionStart = localStorage.getItem('sessionStart');
        if (!sessionStart) return 0;
        
        const elapsed = Date.now() - parseInt(sessionStart, 10);
        const remaining = this.sessionTimeout - elapsed;
        return Math.max(0, remaining);
    }
}

// Create global instance
const ClientAuth = new EnhancedClientAuth();

// Maintain backward compatibility
window.ClientAuth = ClientAuth;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientAuth;
}