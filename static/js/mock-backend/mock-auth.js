/**
 * Mock Authentication System
 * Provides JWT authentication, session management, and user authentication
 * Works entirely offline with persistent storage
 */

class MockAuth {
  static instance = null;
  static JWT_SECRET = 'mock-portfolio-cms-secret-key-2024';
  static ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  static REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.db = null;
    this.currentUser = null;
    this.initialized = false;
  }

  static getInstance() {
    if (!MockAuth.instance) {
      MockAuth.instance = new MockAuth();
    }
    return MockAuth.instance;
  }

  static async initialize() {
    const instance = MockAuth.getInstance();
    if (!instance.initialized) {
      await instance.init();
    }
    return instance;
  }

  async init() {
    if (this.initialized) return;
    
    this.db = await MockDatabase.initialize();
    this.initialized = true;
    
    console.log('[MockAuth] Authentication system initialized');
  }

  // JWT Token Management
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      type: 'access',
      iat: Date.now(),
      exp: Date.now() + MockAuth.ACCESS_TOKEN_EXPIRY
    };

    return this.createJWT(payload);
  }

  generateRefreshToken(user, deviceInfo = {}) {
    const payload = {
      id: user.id,
      email: user.email,
      type: 'refresh',
      deviceInfo,
      iat: Date.now(),
      exp: Date.now() + MockAuth.REFRESH_TOKEN_EXPIRY
    };

    return this.createJWT(payload);
  }

  createJWT(payload) {
    // Simple JWT implementation for mock purposes
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const signature = this.createSignature(encodedHeader + '.' + encodedPayload);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  createSignature(data) {
    // Simple signature for mock purposes - in real app use proper HMAC
    let hash = 0;
    const secret = MockAuth.JWT_SECRET + data;
    
    for (let i = 0; i < secret.length; i++) {
      const char = secret.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return btoa(hash.toString()).replace(/=/g, '');
  }

  verifyJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const [header, payload, signature] = parts;
      const expectedSignature = this.createSignature(header + '.' + payload);
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid token signature');
      }

      const decodedPayload = JSON.parse(atob(payload));
      
      if (decodedPayload.exp < Date.now()) {
        throw new Error('Token expired');
      }

      return decodedPayload;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Authentication Methods
  async register(userData) {
    if (!this.initialized) await this.init();

    const { email, username, password, firstName, lastName } = userData;

    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Check if user already exists
    const existingUser = await this.db.findOne('users', 'email', email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    if (username) {
      const existingUsername = await this.db.findOne('users', 'username', username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }
    }

    // Hash password (mock implementation)
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const newUser = await this.db.create('users', {
      email,
      username: username || email.split('@')[0],
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'user',
      isActive: true,
      emailVerified: false,
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    });

    // Remove password from response
    const safeUser = this.createSafeUserObject(newUser);

    // Generate tokens
    const accessToken = this.generateAccessToken(newUser);
    const refreshToken = this.generateRefreshToken(newUser);

    // Store refresh token
    await this.storeRefreshToken(newUser.id, refreshToken);

    return {
      user: safeUser,
      accessToken,
      refreshToken
    };
  }

  async login(email, password, deviceInfo = {}) {
    if (!this.initialized) await this.init();

    // Find user
    const user = await this.db.findOne('users', 'email', email) || 
                 await this.db.findOne('users', 'username', email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      // Increment login attempts
      await this.incrementLoginAttempts(user.id);
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Reset login attempts and update last login
    await this.db.update('users', user.id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date().toISOString()
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user, deviceInfo);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken, deviceInfo);

    // Set current user
    this.currentUser = user;

    return {
      user: this.createSafeUserObject(user),
      accessToken,
      refreshToken
    };
  }

  async refreshAccessToken(refreshToken) {
    if (!this.initialized) await this.init();

    try {
      const payload = this.verifyJWT(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in database
      const storedToken = await this.db.findOne('sessions', 'token', refreshToken);
      if (!storedToken || !storedToken.isActive) {
        throw new Error('Refresh token not found or inactive');
      }

      // Get user
      const user = await this.db.read('users', payload.id);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(user);

      return {
        accessToken: newAccessToken
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async logout(refreshToken) {
    if (!this.initialized) await this.init();

    if (refreshToken) {
      // Deactivate refresh token
      const storedToken = await this.db.findOne('sessions', 'token', refreshToken);
      if (storedToken) {
        await this.db.update('sessions', storedToken.id, {
          isActive: false,
          deactivatedAt: new Date().toISOString()
        });
      }
    }

    this.currentUser = null;
    console.log('[MockAuth] User logged out');
  }

  async logoutAll(userId) {
    if (!this.initialized) await this.init();

    // Deactivate all refresh tokens for user
    const sessions = await this.db.findBy('sessions', 'userId', userId);
    for (const session of sessions) {
      await this.db.update('sessions', session.id, {
        isActive: false,
        deactivatedAt: new Date().toISOString()
      });
    }

    this.currentUser = null;
    console.log('[MockAuth] All sessions logged out for user:', userId);
  }

  async verifyAccessToken(token) {
    try {
      const payload = this.verifyJWT(token);
      
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      const user = await this.db.read('users', payload.id);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return this.createSafeUserObject(user);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  async getCurrentUser(userId) {
    if (!this.initialized) await this.init();
    
    const user = await this.db.read('users', userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return this.createSafeUserObject(user);
  }

  // Password Management
  async hashPassword(password) {
    // Mock password hashing - in real app use bcrypt
    const salt = 'mock-salt-' + Date.now();
    let hash = 0;
    const input = salt + password;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `mock$${salt}$${btoa(hash.toString())}`;
  }

  async verifyPassword(password, hashedPassword) {
    if (!hashedPassword.startsWith('mock$')) {
      return false;
    }
    
    const parts = hashedPassword.split('$');
    if (parts.length !== 3) {
      return false;
    }
    
    const salt = parts[1];
    const expectedHash = await this.hashPassword(password);
    
    return hashedPassword === expectedHash.replace(salt, parts[1]);
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!this.initialized) await this.init();

    const user = await this.db.read('users', userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Update password
    await this.db.update('users', userId, {
      password: hashedNewPassword,
      passwordChangedAt: new Date().toISOString()
    });

    console.log('[MockAuth] Password changed for user:', userId);
  }

  // Session Management
  async storeRefreshToken(userId, refreshToken, deviceInfo = {}) {
    await this.db.create('sessions', {
      userId,
      token: refreshToken,
      deviceInfo: JSON.stringify(deviceInfo),
      isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + MockAuth.REFRESH_TOKEN_EXPIRY).toISOString()
    });
  }

  async getActiveSessions(userId) {
    const sessions = await this.db.findBy('sessions', 'userId', userId);
    return sessions
      .filter(session => session.isActive)
      .map(session => ({
        id: session.id,
        deviceInfo: JSON.parse(session.deviceInfo || '{}'),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }));
  }

  async revokeSession(userId, sessionId) {
    const session = await this.db.read('sessions', sessionId);
    
    if (!session || session.userId !== userId) {
      throw new Error('Session not found');
    }

    await this.db.update('sessions', sessionId, {
      isActive: false,
      deactivatedAt: new Date().toISOString()
    });
  }

  // Security Features
  async incrementLoginAttempts(userId) {
    const user = await this.db.read('users', userId);
    const attempts = (user.loginAttempts || 0) + 1;
    const maxAttempts = 5;
    
    const updateData = { loginAttempts: attempts };
    
    if (attempts >= maxAttempts) {
      // Lock account for 30 minutes
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }
    
    await this.db.update('users', userId, updateData);
  }

  // User Management
  createSafeUserObject(user) {
    const { password, loginAttempts, lockedUntil, ...safeUser } = user;
    return safeUser;
  }

  async updateUser(userId, updates) {
    if (!this.initialized) await this.init();

    // Don't allow updating sensitive fields directly
    const { id, password, loginAttempts, lockedUntil, ...safeUpdates } = updates;
    
    const updated = await this.db.update('users', userId, safeUpdates);
    return this.createSafeUserObject(updated);
  }

  async deleteUser(userId) {
    if (!this.initialized) await this.init();

    // Deactivate all sessions
    await this.logoutAll(userId);
    
    // Soft delete user
    await this.db.update('users', userId, {
      isActive: false,
      deletedAt: new Date().toISOString()
    });

    console.log('[MockAuth] User deleted:', userId);
  }

  // Utility Methods
  async validateSession(token) {
    try {
      const user = await this.verifyAccessToken(token);
      this.currentUser = user;
      return user;
    } catch (error) {
      this.currentUser = null;
      throw error;
    }
  }

  async isAuthenticated() {
    return !!this.currentUser;
  }

  async hasRole(requiredRole) {
    if (!this.currentUser) return false;
    
    const roles = {
      'user': 1,
      'editor': 2,
      'admin': 3,
      'super_admin': 4
    };
    
    const userRole = roles[this.currentUser.role] || 0;
    const required = roles[requiredRole] || 0;
    
    return userRole >= required;
  }

  // Email Verification (Mock)
  async sendVerificationEmail(userId) {
    console.log('[MockAuth] Mock email sent for user:', userId);
    return {
      message: 'Verification email sent (mock)',
      verificationToken: 'mock-token-' + userId + '-' + Date.now()
    };
  }

  async verifyEmail(token) {
    // Mock email verification
    if (!token.startsWith('mock-token-')) {
      throw new Error('Invalid verification token');
    }
    
    const parts = token.split('-');
    const userId = parts[2];
    
    await this.db.update('users', userId, {
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString()
    });
    
    return { message: 'Email verified successfully' };
  }

  // Password Reset (Mock)
  async requestPasswordReset(email) {
    const user = await this.db.findOne('users', 'email', email);
    
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If an account with this email exists, a reset link has been sent' };
    }
    
    const resetToken = 'mock-reset-' + user.id + '-' + Date.now();
    
    // Store reset token (in real app, store in database with expiry)
    console.log('[MockAuth] Password reset token:', resetToken);
    
    return { 
      message: 'If an account with this email exists, a reset link has been sent',
      resetToken // Only for mock purposes
    };
  }

  async resetPassword(token, newPassword) {
    if (!token.startsWith('mock-reset-')) {
      throw new Error('Invalid reset token');
    }
    
    const parts = token.split('-');
    const userId = parts[2];
    
    const hashedPassword = await this.hashPassword(newPassword);
    
    await this.db.update('users', userId, {
      password: hashedPassword,
      passwordChangedAt: new Date().toISOString(),
      loginAttempts: 0,
      lockedUntil: null
    });
    
    // Invalidate all sessions
    await this.logoutAll(userId);
    
    return { message: 'Password reset successfully' };
  }
}

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.MockAuth = MockAuth;
}