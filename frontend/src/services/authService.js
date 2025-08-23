/**
 * Frontend Authentication Service
 * Handles all client-side authentication operations
 */

class AuthService {
  constructor() {
    this.baseURL = this.getAPIBaseURL();
    this.tokenKey = 'accessToken';
    this.userKey = 'currentUser';
    this.refreshPromise = null;
  }

  /**
   * Get API base URL using central configuration
   */
  getAPIBaseURL() {
    // Check for React environment variable first
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // Use central configuration if available
    if (typeof window !== 'undefined' && window.CentralAPIConfig) {
      return window.CentralAPIConfig.getAPIBaseURL();
    }
    
    // Fallback logic
    if (typeof window !== 'undefined') {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      return isDev ? 'http://localhost:3001/api' : '/api';
    }
    
    return 'http://localhost:3001/api';
  }

  /**
   * Initialize auth service
   */
  init() {
    // Check for existing token and validate it
    this.validateStoredToken();
    
    // Set up automatic token refresh
    this.setupTokenRefresh();
    
    // Listen for storage changes (multi-tab support)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (response.accessToken) {
        this.setToken(response.accessToken);
        this.setUser(response.user);
        this.scheduleTokenRefresh();
      }

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.accessToken) {
        this.setToken(response.accessToken);
        this.setUser(response.user);
        this.scheduleTokenRefresh();
      }

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.makeAuthenticatedRequest('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error.message);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll() {
    try {
      await this.makeAuthenticatedRequest('/auth/logout-all', {
        method: 'POST'
      });
    } catch (error) {
      console.warn('Logout all API call failed:', error.message);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    // Prevent multiple simultaneous refresh attempts
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
      const response = await this.makeRequest('/auth/refresh', {
        method: 'POST',
        credentials: 'include' // Include refresh token cookie
      });

      if (response.accessToken) {
        this.setToken(response.accessToken);
        this.scheduleTokenRefresh();
        return response.accessToken;
      }

      throw new Error('No access token in refresh response');
    } catch (error) {
      // Refresh failed, clear auth and redirect to login
      this.clearAuth();
      this.redirectToLogin();
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    try {
      const response = await this.makeRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await this.makeRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    try {
      const response = await this.makeRequest('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/me');
      
      if (response.user) {
        this.setUser(response.user);
      }

      return response.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get active sessions
   */
  async getSessions() {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/sessions');
      return response.sessions;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId) {
    try {
      const response = await this.makeAuthenticatedRequest(`/auth/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * OAuth login
   */
  async getOAuthUrl(provider) {
    try {
      const response = await this.makeRequest(`/auth/oauth/${provider}`);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Link OAuth account
   */
  async linkOAuthAccount(provider, code) {
    try {
      const response = await this.makeAuthenticatedRequest(`/auth/oauth/${provider}/link`, {
        method: 'POST',
        body: JSON.stringify({ code })
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(provider) {
    try {
      const response = await this.makeAuthenticatedRequest(`/auth/oauth/${provider}/unlink`, {
        method: 'DELETE'
      });

      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get linked OAuth accounts
   */
  async getLinkedAccounts() {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/oauth/linked');
      return response.linkedAccounts;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Token management

  /**
   * Get stored token
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set token in storage
   */
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Remove token from storage
   */
  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = this.decodeToken(token);
      return payload.exp > Date.now() / 1000;
    } catch (error) {
      return false;
    }
  }

  /**
   * Decode JWT token
   */
  decodeToken(token) {
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

  /**
   * Get token expiration time
   */
  getTokenExpiration() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = this.decodeToken(token);
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is about to expire
   */
  isTokenExpiringSoon(minutesThreshold = 5) {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;

    const now = new Date();
    const timeUntilExpiration = expiration.getTime() - now.getTime();
    const thresholdMs = minutesThreshold * 60 * 1000;

    return timeUntilExpiration <= thresholdMs;
  }

  // User management

  /**
   * Get stored user
   */
  getUser() {
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Set user in storage
   */
  setUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Remove user from storage
   */
  removeUser() {
    localStorage.removeItem(this.userKey);
  }

  /**
   * Get user role
   */
  getUserRole() {
    const user = this.getUser();
    return user?.role || null;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission) {
    const user = this.getUser();
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    const permissions = user.permissions || [];
    return permissions.includes(permission);
  }

  /**
   * Check if user has role
   */
  hasRole(role) {
    const userRole = this.getUserRole();
    return userRole === role || userRole === 'admin';
  }

  // Utility methods

  /**
   * Make HTTP request
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make authenticated HTTP request
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      return await this.makeRequest(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      // If token is expired, try to refresh and retry
      if (error.message.includes('Token expired') || error.message.includes('401')) {
        try {
          await this.refreshToken();
          const newToken = this.getToken();
          
          return await this.makeRequest(endpoint, {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${newToken}`
            }
          });
        } catch (refreshError) {
          // Refresh failed, clear auth and redirect
          this.clearAuth();
          this.redirectToLogin();
          throw refreshError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    // Log error for debugging
    console.error('Auth service error:', error);
    
    // Return user-friendly error message
    return new Error(error.message || 'An unexpected error occurred');
  }

  /**
   * Clear all authentication data
   */
  clearAuth() {
    this.removeToken();
    this.removeUser();
    this.clearTokenRefreshTimer();
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    const currentPath = window.location.pathname;
    const loginUrl = `/login${currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`;
    
    if (window.location.pathname !== '/login') {
      window.location.href = loginUrl;
    }
  }

  /**
   * Validate stored token
   */
  validateStoredToken() {
    const token = this.getToken();
    
    if (token && !this.isAuthenticated()) {
      // Token is expired or invalid
      this.clearAuth();
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    if (this.isAuthenticated()) {
      this.scheduleTokenRefresh();
    }
  }

  /**
   * Schedule token refresh
   */
  scheduleTokenRefresh() {
    this.clearTokenRefreshTimer();
    
    const expiration = this.getTokenExpiration();
    if (!expiration) return;

    const now = new Date();
    const timeUntilExpiration = expiration.getTime() - now.getTime();
    const refreshTime = Math.max(timeUntilExpiration - (5 * 60 * 1000), 60 * 1000); // 5 minutes before expiration, minimum 1 minute

    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch(error => {
        console.error('Automatic token refresh failed:', error);
      });
    }, refreshTime);
  }

  /**
   * Clear token refresh timer
   */
  clearTokenRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Handle storage changes (multi-tab support)
   */
  handleStorageChange(event) {
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
  }

  /**
   * Cleanup on service destruction
   */
  destroy() {
    this.clearTokenRefreshTimer();
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
  }
}

// Create singleton instance
const authService = new AuthService();

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => authService.init());
  } else {
    authService.init();
  }
}

export default authService;
