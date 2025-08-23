/**
 * Supabase Authentication Frontend Client
 * Handles authentication, session management, and protected routes
 */

class SupabaseAuth {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || window.location.origin;
    this.authEndpoint = `${this.apiUrl}/.netlify/functions/supabase-auth`;
    this.redirectUrl = options.redirectUrl || `${window.location.origin}/auth/callback`;
    
    // Session storage keys
    this.SESSION_KEY = 'supabase-auth-session';
    this.USER_KEY = 'supabase-auth-user';
    this.REFRESH_KEY = 'supabase-auth-refresh';
    
    // State management
    this.currentUser = null;
    this.currentSession = null;
    this.isAuthenticated = false;
    this.listeners = new Set();
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the auth client
   */
  async init() {
    try {
      // Load stored session
      await this.loadStoredSession();
      
      // Set up session refresh timer
      this.setupSessionRefresh();
      
      // Handle auth state changes
      this.setupAuthStateHandling();
      
      console.log('SupabaseAuth initialized');
    } catch (error) {
      console.error('SupabaseAuth initialization error:', error);
    }
  }

  /**
   * Load stored session from localStorage
   */
  async loadStoredSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      const userData = localStorage.getItem(this.USER_KEY);
      
      if (sessionData && userData) {
        const session = JSON.parse(sessionData);
        const user = JSON.parse(userData);
        
        // Validate session is not expired
        if (session.expires_at && Date.now() < session.expires_at * 1000) {
          this.currentSession = session;
          this.currentUser = user;
          this.isAuthenticated = true;
          
          // Verify with server
          const isValid = await this.verifySession();
          if (!isValid) {
            await this.clearSession();
          }
        } else {
          // Try to refresh if we have a refresh token
          await this.refreshSession();
        }
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
      await this.clearSession();
    }
  }

  /**
   * Set up automatic session refresh
   */
  setupSessionRefresh() {
    setInterval(async () => {
      if (this.currentSession && this.isAuthenticated) {
        const expiresAt = this.currentSession.expires_at * 1000;
        const timeUntilExpiry = expiresAt - Date.now();
        
        // Refresh 5 minutes before expiry
        if (timeUntilExpiry < 300000) {
          try {
            await this.refreshSession();
          } catch (error) {
            console.error('Auto-refresh failed:', error);
            await this.signOut();
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Set up auth state change handling
   */
  setupAuthStateHandling() {
    // Handle storage events (for multi-tab synchronization)
    window.addEventListener('storage', (e) => {
      if (e.key === this.SESSION_KEY) {
        if (e.newValue) {
          this.loadStoredSession();
        } else {
          this.clearSession();
        }
      }
    });

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isAuthenticated) {
        this.verifySession();
      }
    });
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password, userData = {}) {
    try {
      const response = await this.makeRequest('/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          userData
        })
      });

      if (response.session) {
        await this.setSession(response.session, response.user);
      }

      return response;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password, remember = false) {
    try {
      const response = await this.makeRequest('/signin', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          remember
        })
      });

      if (response.session) {
        await this.setSession(response.session, response.user);
      }

      return response;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      if (this.currentSession) {
        await this.makeRequest('/signout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.currentSession.access_token}`
          }
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      await this.clearSession();
      this.notifyListeners('signOut');
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email) {
    try {
      const response = await this.makeRequest('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      return response;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(email, token, type = 'email') {
    try {
      const response = await this.makeRequest('/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email,
          token,
          type
        })
      });

      if (response.session) {
        await this.setSession(response.session, response.user);
      }

      return response;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Refresh session
   */
  async refreshSession() {
    try {
      const refreshToken = localStorage.getItem(this.REFRESH_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.makeRequest('/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });

      if (response.session) {
        await this.setSession(response.session, response.user);
      }

      return response;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearSession();
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getUser() {
    try {
      if (!this.isAuthenticated || !this.currentSession) {
        return null;
      }

      const response = await this.makeRequest('/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.currentSession.access_token}`
        }
      });

      this.currentUser = response.user;
      this.saveUserToStorage(response.user);
      
      return response.user;
    } catch (error) {
      console.error('Get user error:', error);
      if (error.code === 'INVALID_TOKEN') {
        await this.clearSession();
      }
      return null;
    }
  }

  /**
   * Update user
   */
  async updateUser(updates) {
    try {
      if (!this.isAuthenticated || !this.currentSession) {
        throw new Error('User not authenticated');
      }

      const response = await this.makeRequest('/update-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.currentSession.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.user) {
        this.currentUser = { ...this.currentUser, ...response.user };
        this.saveUserToStorage(this.currentUser);
        this.notifyListeners('userUpdate', this.currentUser);
      }

      return response;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  /**
   * OAuth sign in
   */
  async signInWithOAuth(provider, redirectTo = null) {
    try {
      const response = await this.makeRequest('/oauth', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          redirectTo: redirectTo || this.redirectUrl
        })
      });

      // Redirect to OAuth provider
      if (response.url) {
        window.location.href = response.url;
      }

      return response;
    } catch (error) {
      console.error('OAuth sign in error:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code, state, error = null) {
    try {
      const response = await this.makeRequest('/oauth-callback', {
        method: 'POST',
        body: JSON.stringify({
          code,
          state,
          error
        })
      });

      if (response.session) {
        await this.setSession(response.session, response.user);
      }

      return response;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(newPassword) {
    try {
      if (!this.isAuthenticated || !this.currentSession) {
        throw new Error('User not authenticated');
      }

      const response = await this.makeRequest('/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.currentSession.access_token}`
        },
        body: JSON.stringify({
          password: newPassword
        })
      });

      return response;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmation(email) {
    try {
      const response = await this.makeRequest('/resend-confirmation', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      return response;
    } catch (error) {
      console.error('Resend confirmation error:', error);
      throw error;
    }
  }

  /**
   * Verify current session with server
   */
  async verifySession() {
    try {
      if (!this.currentSession) {
        return false;
      }

      const user = await this.getUser();
      return !!user;
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  }

  /**
   * Set session and user data
   */
  async setSession(session, user) {
    this.currentSession = session;
    this.currentUser = user;
    this.isAuthenticated = true;

    // Store in localStorage
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    if (session.refresh_token) {
      localStorage.setItem(this.REFRESH_KEY, session.refresh_token);
    }

    this.notifyListeners('signIn', user);
  }

  /**
   * Clear session data
   */
  async clearSession() {
    this.currentSession = null;
    this.currentUser = null;
    this.isAuthenticated = false;

    // Clear from localStorage
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  /**
   * Save user to storage
   */
  saveUserToStorage(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Make authenticated request
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.authEndpoint}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Info': 'supabase-auth-js/1.0.0'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Request failed');
      error.code = data.code;
      error.status = response.status;
      throw error;
    }

    return data;
  }

  /**
   * Check if user has required role
   */
  hasRole(role) {
    if (!this.currentUser) return false;
    
    const userRole = this.currentUser.role || 'user';
    
    // Role hierarchy
    const roleHierarchy = {
      'admin': 3,
      'editor': 2,
      'user': 1
    };

    const userRoleLevel = roleHierarchy[userRole] || 1;
    const requiredRoleLevel = roleHierarchy[role] || 1;

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user has specific permissions
   */
  hasPermissions(permissions) {
    if (!this.currentUser) return false;
    
    const userPermissions = this.currentUser.app_metadata?.permissions || [];
    
    if (Array.isArray(permissions)) {
      return permissions.every(perm => userPermissions.includes(perm));
    }
    
    return userPermissions.includes(permissions);
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify listeners of auth state changes
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback({
          event,
          data,
          user: this.currentUser,
          session: this.currentSession,
          isAuthenticated: this.isAuthenticated
        });
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  /**
   * Protected route handler
   */
  requireAuth(redirectTo = '/login') {
    if (!this.isAuthenticated) {
      // Store current location for redirect after login
      sessionStorage.setItem('auth-redirect', window.location.pathname);
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  /**
   * Admin route handler
   */
  requireAdmin(redirectTo = '/unauthorized') {
    if (!this.requireAuth()) return false;
    
    if (!this.hasRole('admin')) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  /**
   * Editor route handler
   */
  requireEditor(redirectTo = '/unauthorized') {
    if (!this.requireAuth()) return false;
    
    if (!this.hasRole('editor')) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  /**
   * Get auth redirect URL
   */
  getAuthRedirect() {
    const redirect = sessionStorage.getItem('auth-redirect');
    sessionStorage.removeItem('auth-redirect');
    return redirect || '/';
  }

  /**
   * Format user display name
   */
  getDisplayName() {
    if (!this.currentUser) return null;
    
    return this.currentUser.user_metadata?.name || 
           this.currentUser.user_metadata?.full_name || 
           this.currentUser.email?.split('@')[0] || 
           'User';
  }

  /**
   * Get user avatar URL
   */
  getAvatarUrl() {
    if (!this.currentUser) return null;
    
    return this.currentUser.user_metadata?.avatar_url || 
           this.currentUser.user_metadata?.picture || 
           null;
  }

  /**
   * Check if email is confirmed
   */
  isEmailConfirmed() {
    return this.currentUser?.email_confirmed_at !== null;
  }

  /**
   * Get session expiry
   */
  getSessionExpiry() {
    if (!this.currentSession) return null;
    return new Date(this.currentSession.expires_at * 1000);
  }

  /**
   * Check if session is about to expire (within 5 minutes)
   */
  isSessionExpiring() {
    const expiry = this.getSessionExpiry();
    if (!expiry) return false;
    
    const timeUntilExpiry = expiry.getTime() - Date.now();
    return timeUntilExpiry < 300000; // 5 minutes
  }
}

// Create global instance
window.supabaseAuth = new SupabaseAuth();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseAuth;
}