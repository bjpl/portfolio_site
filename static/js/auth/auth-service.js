/**
 * Static Authentication Service
 * Handles login, logout, and session management without server dependency
 */

class AuthService {
  constructor() {
    this.storage = new StorageUtils();
    this.jwt = new JWTUtils();
    this.crypto = new CryptoUtils();
    
    this.currentUser = null;
    this.currentToken = null;
    this.sessionId = null;
    
    this.eventListeners = new Map();
    this.refreshTimer = null;
    
    // Default roles and permissions
    this.roles = {
      super_admin: {
        name: 'Super Administrator',
        permissions: ['*'] // All permissions
      },
      admin: {
        name: 'Administrator', 
        permissions: [
          'read:posts', 'write:posts', 'delete:posts',
          'manage:users', 'access:admin', 'modify:settings',
          'upload:files', 'manage:media'
        ]
      },
      editor: {
        name: 'Editor',
        permissions: [
          'read:posts', 'write:posts', 'upload:files', 'manage:media'
        ]
      },
      user: {
        name: 'User',
        permissions: ['read:posts']
      }
    };

    this.init();
  }

  /**
   * Initialize authentication service
   */
  async init() {
    await this.storage.init();
    
    // Try to restore existing session
    await this.restoreSession();
    
    // Clean expired sessions periodically
    setInterval(() => {
      this.storage.cleanExpiredSessions();
    }, 60000); // Every minute

    // Create default admin user if none exists
    await this.createDefaultAdmin();
  }

  /**
   * Create default admin user if no users exist
   */
  async createDefaultAdmin() {
    try {
      // Check if any admin users exist
      const transaction = this.storage.db.transaction(this.storage.stores.users, 'readonly');
      const store = transaction.objectStore(this.storage.stores.users);
      const index = store.index('role');
      const adminCursor = await this.storage.promisifyRequest(
        index.openCursor(IDBKeyRange.only('admin'))
      );

      if (!adminCursor) {
        // No admin users found, create default
        console.log('Creating default admin user...');
        await this.register('admin', 'admin123!', 'admin@localhost', 'admin');
        console.log('Default admin user created - Username: admin, Password: admin123!');
      }
    } catch (error) {
      console.error('Failed to check/create default admin:', error);
    }
  }

  /**
   * Register new user
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} email - Email address
   * @param {string} role - User role
   * @returns {Promise<boolean>} Success status
   */
  async register(username, password, email, role = 'user') {
    try {
      // Validate input
      if (!username || !password || !email) {
        throw new Error('Username, password, and email are required');
      }

      if (!this.roles[role]) {
        throw new Error('Invalid role specified');
      }

      // Check if username or email already exists
      const existingUser = await this.storage.getUser(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Store credentials
      const success = await this.storage.storeCredentials(username, password, email, role);
      
      if (success) {
        this.emit('userRegistered', { username, email, role });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Login result
   */
  async login(username, password) {
    try {
      // Verify credentials
      const user = await this.storage.verifyCredentials(username, password);
      
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Initialize JWT with user-specific secret
      await this.jwt.init(username + user.email + user.role);

      // Generate session ID and token
      this.sessionId = this.crypto.generateToken(32);
      
      // Add role permissions to user object
      const userWithPermissions = {
        ...user,
        permissions: this.getRolePermissions(user.role)
      };

      this.currentToken = await this.jwt.generateAdminToken(userWithPermissions);
      this.currentUser = userWithPermissions;

      // Store session in IndexedDB
      await this.storage.storeSession(
        this.sessionId,
        username,
        24 * 60 * 60 * 1000, // 24 hours
        {
          token: this.currentToken,
          loginTime: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ip: 'local'
        }
      );

      // Store session in localStorage for persistence
      localStorage.setItem('cms_session_id', this.sessionId);
      localStorage.setItem('cms_token', this.currentToken);

      // Start token refresh timer
      this.startTokenRefresh();

      // Update user last active
      await this.storage.updateUser(username, { lastActive: new Date().toISOString() });

      this.emit('login', this.currentUser);
      
      return {
        success: true,
        user: this.currentUser,
        token: this.currentToken,
        sessionId: this.sessionId
      };
    } catch (error) {
      console.error('Login failed:', error);
      this.emit('loginError', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Clear session from IndexedDB
      if (this.sessionId) {
        await this.storage.deleteSession(this.sessionId);
      }

      // Clear localStorage
      localStorage.removeItem('cms_session_id');
      localStorage.removeItem('cms_token');

      // Stop token refresh
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Clear current state
      const user = this.currentUser;
      this.currentUser = null;
      this.currentToken = null;
      this.sessionId = null;

      this.emit('logout', user);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * Restore session from localStorage
   */
  async restoreSession() {
    try {
      const sessionId = localStorage.getItem('cms_session_id');
      const token = localStorage.getItem('cms_token');

      if (!sessionId || !token) {
        return false;
      }

      // Verify session in IndexedDB
      const session = await this.storage.getSession(sessionId);
      if (!session) {
        // Clean up invalid localStorage data
        localStorage.removeItem('cms_session_id');
        localStorage.removeItem('cms_token');
        return false;
      }

      // Get user data
      const user = await this.storage.getUser(session.username);
      if (!user) {
        return false;
      }

      // Initialize JWT with user secret
      await this.jwt.init(user.username + user.email + user.role);

      // Verify token
      const payload = await this.jwt.verifyToken(token);
      if (!payload) {
        // Token invalid, clean up
        await this.logout();
        return false;
      }

      // Restore session state
      this.sessionId = sessionId;
      this.currentToken = token;
      this.currentUser = {
        ...user,
        permissions: this.getRolePermissions(user.role)
      };

      // Update session activity
      await this.storage.updateSessionActivity(sessionId);

      // Start token refresh timer
      this.startTokenRefresh();

      this.emit('sessionRestored', this.currentUser);
      return true;
    } catch (error) {
      console.error('Session restore failed:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return this.currentUser !== null && this.currentToken !== null;
  }

  /**
   * Get current user
   * @returns {Object|null} Current user or null
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current token
   * @returns {string|null} Current token or null
   */
  getCurrentToken() {
    return this.currentToken;
  }

  /**
   * Check if current user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} Permission status
   */
  hasPermission(permission) {
    if (!this.currentUser) {
      return false;
    }

    const userPermissions = this.currentUser.permissions || [];
    
    // Super admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    return userPermissions.includes(permission);
  }

  /**
   * Check if current user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} Role status
   */
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  /**
   * Check if current user is admin
   * @returns {boolean} Admin status
   */
  isAdmin() {
    return this.hasRole('admin') || this.hasRole('super_admin');
  }

  /**
   * Get role permissions
   * @param {string} role - Role name
   * @returns {Array} Array of permissions
   */
  getRolePermissions(role) {
    return this.roles[role] ? this.roles[role].permissions : [];
  }

  /**
   * Start token refresh timer
   */
  startTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.currentToken) {
      return;
    }

    const timeUntilExpiry = this.jwt.getTimeUntilExpiry(this.currentToken);
    const refreshTime = Math.max(timeUntilExpiry - 300000, 60000); // Refresh 5 minutes before expiry, minimum 1 minute

    this.refreshTimer = setTimeout(async () => {
      await this.refreshToken();
    }, refreshTime);
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      if (!this.currentToken || !this.currentUser) {
        return false;
      }

      const newToken = await this.jwt.refreshToken(this.currentToken);
      if (!newToken) {
        // Token refresh failed, logout user
        await this.logout();
        this.emit('tokenExpired', this.currentUser);
        return false;
      }

      this.currentToken = newToken;
      localStorage.setItem('cms_token', newToken);

      // Update session in IndexedDB
      if (this.sessionId) {
        const session = await this.storage.getSession(this.sessionId);
        if (session) {
          session.data.token = newToken;
          await this.storage.storeSession(
            this.sessionId,
            session.username,
            24 * 60 * 60 * 1000,
            session.data
          );
        }
      }

      // Restart refresh timer
      this.startTokenRefresh();
      
      this.emit('tokenRefreshed', newToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(currentPassword, newPassword) {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    try {
      // Verify current password
      const user = await this.storage.verifyCredentials(this.currentUser.username, currentPassword);
      if (!user) {
        throw new Error('Current password is incorrect');
      }

      // Store new credentials
      const success = await this.storage.storeCredentials(
        this.currentUser.username,
        newPassword,
        this.currentUser.email,
        this.currentUser.role
      );

      if (success) {
        this.emit('passwordChanged', this.currentUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Event system for authentication state changes
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const callbacks = this.eventListeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Export for use in other modules
window.AuthService = AuthService;

export default AuthService;