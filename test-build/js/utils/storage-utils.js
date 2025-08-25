/**
 * IndexedDB Storage Utilities for Secure Client-Side Data Persistence
 * Provides encrypted storage for credentials and session data
 */

class StorageUtils {
  constructor() {
    this.dbName = 'CMSAuth';
    this.version = 1;
    this.stores = {
      credentials: 'credentials',
      sessions: 'sessions',
      users: 'users',
      settings: 'settings'
    };
    this.crypto = new CryptoUtils();
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   * @returns {Promise<IDBDatabase>} Database instance
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Credentials store
        if (!db.objectStoreNames.contains(this.stores.credentials)) {
          const credStore = db.createObjectStore(this.stores.credentials, { keyPath: 'username' });
          credStore.createIndex('email', 'email', { unique: true });
        }

        // Sessions store
        if (!db.objectStoreNames.contains(this.stores.sessions)) {
          const sessionStore = db.createObjectStore(this.stores.sessions, { keyPath: 'sessionId' });
          sessionStore.createIndex('username', 'username', { unique: false });
          sessionStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Users store (for user profiles and roles)
        if (!db.objectStoreNames.contains(this.stores.users)) {
          const userStore = db.createObjectStore(this.stores.users, { keyPath: 'username' });
          userStore.createIndex('role', 'role', { unique: false });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // Settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Store encrypted credentials
   * @param {string} username - Username
   * @param {string} password - Password (will be hashed)
   * @param {string} email - Email address
   * @param {string} role - User role
   * @returns {Promise<boolean>} Success status
   */
  async storeCredentials(username, password, email, role = 'user') {
    await this.init();

    const salt = this.crypto.generateSalt();
    const hashedPassword = await this.crypto.hashPassword(password, salt);
    
    const credentialData = {
      username,
      hashedPassword,
      salt: this.crypto.arrayToHex(salt),
      email,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      locked: false
    };

    const userData = {
      username,
      email,
      role,
      profile: {
        displayName: username,
        avatar: null,
        preferences: {}
      },
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    const transaction = this.db.transaction([this.stores.credentials, this.stores.users], 'readwrite');
    
    try {
      await this.promisifyRequest(transaction.objectStore(this.stores.credentials).put(credentialData));
      await this.promisifyRequest(transaction.objectStore(this.stores.users).put(userData));
      return true;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      return false;
    }
  }

  /**
   * Verify credentials
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object|null>} User data if valid, null if invalid
   */
  async verifyCredentials(username, password) {
    await this.init();

    const transaction = this.db.transaction([this.stores.credentials, this.stores.users], 'readonly');
    
    try {
      const credStore = transaction.objectStore(this.stores.credentials);
      const userStore = transaction.objectStore(this.stores.users);
      
      const credentials = await this.promisifyRequest(credStore.get(username));
      const user = await this.promisifyRequest(userStore.get(username));

      if (!credentials || !user) {
        return null;
      }

      if (credentials.locked) {
        throw new Error('Account is locked due to too many failed attempts');
      }

      const salt = this.crypto.hexToArray(credentials.salt);
      const hashedPassword = await this.crypto.hashPassword(password, salt);

      if (!this.crypto.secureCompare(hashedPassword, credentials.hashedPassword)) {
        // Increment login attempts
        await this.incrementLoginAttempts(username);
        return null;
      }

      // Reset login attempts on successful login
      await this.resetLoginAttempts(username);
      
      return {
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile
      };
    } catch (error) {
      console.error('Credential verification failed:', error);
      throw error;
    }
  }

  /**
   * Increment login attempts and lock account if necessary
   * @param {string} username - Username
   */
  async incrementLoginAttempts(username) {
    const transaction = this.db.transaction(this.stores.credentials, 'readwrite');
    const store = transaction.objectStore(this.stores.credentials);
    
    const credentials = await this.promisifyRequest(store.get(username));
    if (credentials) {
      credentials.loginAttempts = (credentials.loginAttempts || 0) + 1;
      credentials.locked = credentials.loginAttempts >= 5; // Lock after 5 attempts
      await this.promisifyRequest(store.put(credentials));
    }
  }

  /**
   * Reset login attempts
   * @param {string} username - Username
   */
  async resetLoginAttempts(username) {
    const transaction = this.db.transaction(this.stores.credentials, 'readwrite');
    const store = transaction.objectStore(this.stores.credentials);
    
    const credentials = await this.promisifyRequest(store.get(username));
    if (credentials) {
      credentials.loginAttempts = 0;
      credentials.locked = false;
      credentials.lastLogin = new Date().toISOString();
      await this.promisifyRequest(store.put(credentials));
    }
  }

  /**
   * Store session data
   * @param {string} sessionId - Session ID
   * @param {string} username - Username
   * @param {number} expiresIn - Expiration time in milliseconds
   * @param {Object} data - Additional session data
   * @returns {Promise<boolean>} Success status
   */
  async storeSession(sessionId, username, expiresIn, data = {}) {
    await this.init();

    const sessionData = {
      sessionId,
      username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresIn).toISOString(),
      lastActivity: new Date().toISOString(),
      data
    };

    const transaction = this.db.transaction(this.stores.sessions, 'readwrite');
    
    try {
      await this.promisifyRequest(transaction.objectStore(this.stores.sessions).put(sessionData));
      return true;
    } catch (error) {
      console.error('Failed to store session:', error);
      return false;
    }
  }

  /**
   * Get session data
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session data or null
   */
  async getSession(sessionId) {
    await this.init();

    const transaction = this.db.transaction(this.stores.sessions, 'readonly');
    
    try {
      const session = await this.promisifyRequest(
        transaction.objectStore(this.stores.sessions).get(sessionId)
      );

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session activity
   * @param {string} sessionId - Session ID
   */
  async updateSessionActivity(sessionId) {
    await this.init();

    const transaction = this.db.transaction(this.stores.sessions, 'readwrite');
    const store = transaction.objectStore(this.stores.sessions);
    
    try {
      const session = await this.promisifyRequest(store.get(sessionId));
      if (session) {
        session.lastActivity = new Date().toISOString();
        await this.promisifyRequest(store.put(session));
      }
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   */
  async deleteSession(sessionId) {
    await this.init();

    const transaction = this.db.transaction(this.stores.sessions, 'readwrite');
    
    try {
      await this.promisifyRequest(
        transaction.objectStore(this.stores.sessions).delete(sessionId)
      );
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions() {
    await this.init();

    const transaction = this.db.transaction(this.stores.sessions, 'readwrite');
    const store = transaction.objectStore(this.stores.sessions);
    const index = store.index('expiresAt');
    
    try {
      const now = new Date().toISOString();
      const range = IDBKeyRange.upperBound(now);
      const cursor = await this.promisifyRequest(index.openCursor(range));
      
      const deletePromises = [];
      if (cursor) {
        cursor.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            deletePromises.push(this.promisifyRequest(cursor.delete()));
            cursor.continue();
          }
        };
      }
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Failed to clean expired sessions:', error);
    }
  }

  /**
   * Get user data
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User data or null
   */
  async getUser(username) {
    await this.init();

    const transaction = this.db.transaction(this.stores.users, 'readonly');
    
    try {
      return await this.promisifyRequest(
        transaction.objectStore(this.stores.users).get(username)
      );
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Update user data
   * @param {string} username - Username
   * @param {Object} updates - Updates to apply
   */
  async updateUser(username, updates) {
    await this.init();

    const transaction = this.db.transaction(this.stores.users, 'readwrite');
    const store = transaction.objectStore(this.stores.users);
    
    try {
      const user = await this.promisifyRequest(store.get(username));
      if (user) {
        Object.assign(user, updates);
        user.lastActive = new Date().toISOString();
        await this.promisifyRequest(store.put(user));
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  }

  /**
   * Convert IDBRequest to Promise
   * @param {IDBRequest} request - IndexedDB request
   * @returns {Promise} Promise that resolves with request result
   */
  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAllData() {
    await this.init();

    const storeNames = Object.values(this.stores);
    const transaction = this.db.transaction(storeNames, 'readwrite');
    
    const promises = storeNames.map(storeName =>
      this.promisifyRequest(transaction.objectStore(storeName).clear())
    );
    
    await Promise.all(promises);
  }
}

// Export for use in other modules
window.StorageUtils = StorageUtils;

export default StorageUtils;