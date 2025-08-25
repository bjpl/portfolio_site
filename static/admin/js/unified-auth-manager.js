/**
 * Unified Authentication Manager
 * Comprehensive authentication system with Supabase integration and emergency fallback
 * Fixes all authentication flow issues
 */

class UnifiedAuthManager {
    constructor() {
        this.initialized = false;
        this.supabaseClient = null;
        this.currentUser = null;
        this.authState = 'unauthenticated';
        
        // Storage keys
        this.keys = {
            token: 'auth_access_token',
            refreshToken: 'auth_refresh_token',
            user: 'auth_current_user',
            session: 'auth_session_data',
            method: 'auth_method'
        };
        
        // Emergency fallback credentials
        this.emergencyCredentials = {
            'admin': 'portfolio2024!',
            'demo': 'demo123',
            'guest': 'guest123'
        };
        
        // Initialize immediately
        this.init();
    }

    /**
     * Initialize the authentication system
     */
    async init() {
        if (this.initialized) return true;
        
        try {
            console.log('🔄 Initializing UnifiedAuthManager...');
            
            // Initialize Supabase client if available
            await this.initializeSupabase();
            
            // Restore existing session
            await this.restoreSession();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('✅ UnifiedAuthManager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize auth manager:', error);
            this.initialized = true; // Still mark as initialized to prevent loops
            return false;
        }
    }

    /**
     * Initialize Supabase client
     */
    async initializeSupabase() {
        if (!window.SUPABASE_CONFIG?.url || !window.SUPABASE_CONFIG?.anonKey) {
            console.warn('⚠️ Supabase configuration not found, using fallback mode');
            return;
        }
        
        try {
            // Try to load Supabase from global or create simple client
            if (window.supabase && window.supabase.createClient) {
                this.supabaseClient = window.supabase.createClient(
                    window.SUPABASE_CONFIG.url,
                    window.SUPABASE_CONFIG.anonKey,
                    {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: false,
                            storage: window.localStorage
                        }
                    }
                );
                console.log('✅ Supabase client initialized');
            } else {
                // Create simple Supabase-compatible client
                this.supabaseClient = this.createSimpleSupabaseClient();
                console.log('✅ Simple Supabase client created');
            }
        } catch (error) {
            console.warn('⚠️ Supabase client initialization failed:', error);
            this.supabaseClient = null;
        }
    }

    /**
     * Create a simple Supabase-compatible client
     */
    createSimpleSupabaseClient() {
        const config = window.SUPABASE_CONFIG;
        
        return {
            auth: {
                signInWithPassword: async ({ email, password }) => {
                    try {
                        const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': config.anonKey,
                                'Authorization': `Bearer ${config.anonKey}`
                            },
                            body: JSON.stringify({ email, password })
                        });
                        
                        const data = await response.json();
                        
                        if (!response.ok) {
                            return {
                                data: { user: null, session: null },
                                error: { message: data.error_description || data.error || 'Login failed' }
                            };
                        }
                        
                        return {
                            data: {
                                user: data.user,
                                session: data
                            },
                            error: null
                        };
                    } catch (error) {
                        return {
                            data: { user: null, session: null },
                            error: { message: error.message }
                        };
                    }
                },
                
                signOut: async () => {
                    try {
                        const token = this.getStoredToken();
                        if (token) {
                            await fetch(`${config.url}/auth/v1/logout`, {
                                method: 'POST',
                                headers: {
                                    'apikey': config.anonKey,
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                        }
                        return { error: null };
                    } catch (error) {
                        return { error: { message: error.message } };
                    }
                },
                
                getSession: async () => {
                    try {
                        const sessionData = localStorage.getItem(this.keys.session);
                        const userData = localStorage.getItem(this.keys.user);
                        
                        if (sessionData && userData) {
                            const session = JSON.parse(sessionData);
                            const user = JSON.parse(userData);
                            
                            // Check if session is expired
                            if (session.expires_at && Date.now() / 1000 < session.expires_at) {
                                return {
                                    data: { session: session, user: user },
                                    error: null
                                };
                            }
                        }
                        
                        return {
                            data: { session: null, user: null },
                            error: null
                        };
                    } catch (error) {
                        return {
                            data: { session: null, user: null },
                            error: { message: error.message }
                        };
                    }
                }
            }
        };
    }

    /**
     * Restore existing session from storage
     */
    async restoreSession() {
        try {
            // Check for existing valid session
            const token = this.getStoredToken();
            const user = this.getStoredUser();
            const authMethod = localStorage.getItem(this.keys.method);
            
            if (!token || !user) {
                this.authState = 'unauthenticated';
                return;
            }
            
            // Validate token is not expired
            if (this.isTokenExpired(token)) {
                await this.clearSession();
                this.authState = 'unauthenticated';
                return;
            }
            
            // Set current user and state
            this.currentUser = user;
            this.authState = 'authenticated';
            
            console.log(`✅ Session restored for user: ${user.username || user.email}`);
            
        } catch (error) {
            console.warn('⚠️ Failed to restore session:', error);
            await this.clearSession();
            this.authState = 'unauthenticated';
        }
    }

    /**
     * Authenticate user with email/password
     */
    async authenticate(emailOrUsername, password) {
        try {
            console.log('🔐 Attempting authentication...');
            
            // Try Supabase authentication first
            if (this.supabaseClient) {
                const result = await this.authenticateWithSupabase(emailOrUsername, password);
                if (result.success) {
                    return result;
                }
                console.warn('⚠️ Supabase auth failed, trying fallback');
            }
            
            // Fallback to emergency credentials
            return await this.authenticateWithFallback(emailOrUsername, password);
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            return {
                success: false,
                error: error.message,
                method: 'error'
            };
        }
    }

    /**
     * Authenticate with Supabase
     */
    async authenticateWithSupabase(emailOrUsername, password) {
        try {
            // Convert username to email format if needed
            const email = emailOrUsername.includes('@') 
                ? emailOrUsername 
                : `${emailOrUsername}@portfolio.com`;
            
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                throw new Error(error.message);
            }
            
            if (data.user && data.session) {
                // Store session data
                await this.storeSession(data.session, data.user, 'supabase');
                
                return {
                    success: true,
                    user: this.normalizeUser(data.user),
                    token: data.session.access_token,
                    method: 'supabase'
                };
            }
            
            throw new Error('No user data received from Supabase');
            
        } catch (error) {
            console.error('❌ Supabase authentication failed:', error);
            throw error;
        }
    }

    /**
     * Authenticate with emergency fallback
     */
    async authenticateWithFallback(username, password) {
        // Check emergency credentials
        if (this.emergencyCredentials[username] === password) {
            const user = {
                id: `fallback_${username}`,
                username: username,
                email: `${username}@portfolio.com`,
                role: username === 'admin' ? 'admin' : 'user',
                profile: {
                    displayName: username.charAt(0).toUpperCase() + username.slice(1)
                }
            };
            
            const token = this.generateFallbackToken(user);
            
            // Store session
            await this.storeSession({ access_token: token }, user, 'fallback');
            
            return {
                success: true,
                user: user,
                token: token,
                method: 'fallback'
            };
        }
        
        return {
            success: false,
            error: 'Invalid credentials',
            method: 'fallback'
        };
    }

    /**
     * Generate fallback JWT token
     */
    generateFallbackToken(user) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
            iss: 'portfolio-fallback-auth'
        }));
        const signature = btoa('fallback-signature');
        
        return `${header}.${payload}.${signature}`;
    }

    /**
     * Store session data
     */
    async storeSession(session, user, method) {
        try {
            const normalizedUser = this.normalizeUser(user);
            
            localStorage.setItem(this.keys.token, session.access_token);
            localStorage.setItem(this.keys.user, JSON.stringify(normalizedUser));
            localStorage.setItem(this.keys.method, method);
            localStorage.setItem(this.keys.session, JSON.stringify(session));
            
            if (session.refresh_token) {
                localStorage.setItem(this.keys.refreshToken, session.refresh_token);
            }
            
            this.currentUser = normalizedUser;
            this.authState = 'authenticated';
            
            console.log(`✅ Session stored for user: ${normalizedUser.username}`);
            
        } catch (error) {
            console.error('❌ Failed to store session:', error);
            throw error;
        }
    }

    /**
     * Normalize user object
     */
    normalizeUser(user) {
        return {
            id: user.id,
            username: user.username || user.user_metadata?.username || user.email?.split('@')[0],
            email: user.email,
            role: user.role || user.app_metadata?.role || 'user',
            profile: {
                displayName: user.user_metadata?.name || user.user_metadata?.full_name || 
                           user.username || user.email?.split('@')[0],
                avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture
            },
            metadata: user.user_metadata || {},
            app_metadata: user.app_metadata || {}
        };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        if (this.authState === 'authenticated' && this.currentUser) {
            const token = this.getStoredToken();
            if (token && !this.isTokenExpired(token)) {
                return true;
            }
        }
        
        // Clear invalid session
        this.clearSession();
        return false;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        if (this.isAuthenticated()) {
            return this.currentUser;
        }
        return null;
    }

    /**
     * Get user info for display
     */
    getUserInfo() {
        const user = this.getCurrentUser();
        if (!user) return null;
        
        return {
            username: user.username,
            email: user.email,
            role: user.role,
            displayName: user.profile?.displayName || user.username,
            avatar: user.profile?.avatar
        };
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            const authMethod = localStorage.getItem(this.keys.method);
            
            // Logout from Supabase if applicable
            if (authMethod === 'supabase' && this.supabaseClient) {
                await this.supabaseClient.auth.signOut();
            }
            
            // Clear local session
            await this.clearSession();
            
            console.log('✅ User logged out successfully');
            
        } catch (error) {
            console.warn('⚠️ Logout error:', error);
            // Always clear local session even if remote logout fails
            await this.clearSession();
        }
    }

    /**
     * Clear session data
     */
    async clearSession() {
        // Clear all auth-related storage
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Clear legacy keys
        const legacyKeys = ['token', 'adminToken', 'username', 'currentUser', 'authMethod', 'loginTime'];
        legacyKeys.forEach(key => localStorage.removeItem(key));
        
        // Reset state
        this.currentUser = null;
        this.authState = 'unauthenticated';
    }

    /**
     * Get stored token
     */
    getStoredToken() {
        return localStorage.getItem(this.keys.token) || 
               localStorage.getItem('token') || 
               localStorage.getItem('adminToken');
    }

    /**
     * Get stored user
     */
    getStoredUser() {
        try {
            const userData = localStorage.getItem(this.keys.user) || 
                           localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if token is expired
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp && payload.exp < now;
        } catch (error) {
            return true; // Treat invalid tokens as expired
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Handle storage events (multi-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key === this.keys.token) {
                if (e.newValue === null) {
                    // Token removed in another tab
                    this.clearSession();
                    this.redirectToLogin();
                }
            }
        });
        
        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.authState === 'authenticated') {
                // Validate session when page becomes visible
                if (!this.isAuthenticated()) {
                    this.redirectToLogin();
                }
            }
        });
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        if (window.location.pathname !== '/admin/login.html') {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/admin/login.html?returnTo=${returnUrl}`;
        }
    }

    /**
     * Require authentication (guard function)
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && (user.role === role || user.role === 'admin');
    }

    /**
     * Get authentication status for debugging
     */
    getAuthStatus() {
        return {
            initialized: this.initialized,
            authState: this.authState,
            isAuthenticated: this.isAuthenticated(),
            currentUser: this.currentUser,
            supabaseAvailable: !!this.supabaseClient,
            method: localStorage.getItem(this.keys.method)
        };
    }
}

// Create global instance
window.UnifiedAuthManager = new UnifiedAuthManager();

// Legacy compatibility
window.AuthManager = window.UnifiedAuthManager;
window.ClientAuth = window.UnifiedAuthManager;

// Wait for initialization and make available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await window.UnifiedAuthManager.init();
        console.log('🔐 Authentication system ready');
    });
} else {
    window.UnifiedAuthManager.init().then(() => {
        console.log('🔐 Authentication system ready');
    });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedAuthManager;
}
