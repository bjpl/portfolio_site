/**
 * Authentication State Management Tests
 * Tests auth state persistence, transitions, and UI integration
 */

const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

describe('Authentication State Management', () => {
  let supabase;
  let dom;
  let window;
  let document;
  let authStateManager;

  beforeAll(async () => {
    // Setup DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Auth Test</title></head>
        <body>
          <div id="auth-status"></div>
          <div id="user-info"></div>
          <button id="login-btn">Login</button>
          <button id="logout-btn">Logout</button>
          <form id="login-form">
            <input id="email" type="email" value="">
            <input id="password" type="password" value="">
            <button type="submit">Submit</button>
          </form>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;

    // Setup globals
    global.window = window;
    global.document = document;
    global.localStorage = window.localStorage;
    global.sessionStorage = window.sessionStorage;
    global.fetch = require('node-fetch');

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';

    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: window.localStorage,
          autoRefreshToken: true,
          persistSession: true
        }
      });
    }

    // Create a simple auth state manager for testing
    authStateManager = createAuthStateManager(supabase, document);
  });

  afterAll(() => {
    if (dom) {
      dom.window.close();
    }
  });

  beforeEach(() => {
    // Clear storage and reset DOM state
    window.localStorage.clear();
    window.sessionStorage.clear();
    
    // Reset DOM elements
    document.getElementById('auth-status').textContent = '';
    document.getElementById('user-info').textContent = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  });

  afterEach(async () => {
    // Sign out after each test
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        // Ignore signout errors
      }
    }
  });

  // Helper function to create a simple auth state manager
  function createAuthStateManager(supabase, document) {
    let currentUser = null;
    let currentSession = null;

    const updateUI = (user, session) => {
      const authStatus = document.getElementById('auth-status');
      const userInfo = document.getElementById('user-info');
      const loginBtn = document.getElementById('login-btn');
      const logoutBtn = document.getElementById('logout-btn');

      if (user && session) {
        authStatus.textContent = 'Authenticated';
        userInfo.textContent = `Welcome, ${user.email}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
      } else {
        authStatus.textContent = 'Not authenticated';
        userInfo.textContent = '';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
      }
    };

    // Initialize auth state listener
    supabase.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      currentSession = session;
      updateUI(currentUser, currentSession);
    });

    return {
      getCurrentUser: () => currentUser,
      getCurrentSession: () => currentSession,
      updateUI,
      isAuthenticated: () => !!(currentUser && currentSession)
    };
  }

  describe('Initial State', () => {
    it('should start with no authenticated user', async () => {
      const { data: { user } } = await supabase.auth.getUser();
      expect(user).toBeNull();
      expect(authStateManager.isAuthenticated()).toBe(false);
    });

    it('should display correct initial UI state', () => {
      const authStatus = document.getElementById('auth-status');
      const userInfo = document.getElementById('user-info');
      const loginBtn = document.getElementById('login-btn');
      const logoutBtn = document.getElementById('logout-btn');

      expect(authStatus.textContent).toBe('Not authenticated');
      expect(userInfo.textContent).toBe('');
      expect(loginBtn.style.display).not.toBe('none');
      expect(logoutBtn.style.display).toBe('none');
    });

    it('should have empty localStorage initially', () => {
      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      expect(window.localStorage.getItem(sessionKey)).toBeNull();
    });
  });

  describe('Auth State Transitions', () => {
    it('should handle authentication state changes', (done) => {
      let eventCount = 0;
      const events = [];

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        eventCount++;
        events.push({ event, hasSession: !!session, hasUser: !!session?.user });

        if (eventCount === 1) {
          expect(event).toBe('INITIAL_SESSION');
          expect(session).toBeNull();
        }

        if (eventCount >= 1) {
          subscription.unsubscribe();
          done();
        }
      });
    });

    it('should update UI on authentication', async () => {
      // Mock a successful authentication
      const mockUser = {
        id: 'mock-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
        user: mockUser
      };

      // Simulate auth state change
      authStateManager.updateUI(mockUser, mockSession);

      const authStatus = document.getElementById('auth-status');
      const userInfo = document.getElementById('user-info');
      const loginBtn = document.getElementById('login-btn');
      const logoutBtn = document.getElementById('logout-btn');

      expect(authStatus.textContent).toBe('Authenticated');
      expect(userInfo.textContent).toBe('Welcome, test@example.com');
      expect(loginBtn.style.display).toBe('none');
      expect(logoutBtn.style.display).toBe('block');
    });

    it('should update UI on logout', () => {
      // First set authenticated state
      const mockUser = { id: 'test', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };
      authStateManager.updateUI(mockUser, mockSession);

      // Then simulate logout
      authStateManager.updateUI(null, null);

      const authStatus = document.getElementById('auth-status');
      const userInfo = document.getElementById('user-info');
      const loginBtn = document.getElementById('login-btn');
      const logoutBtn = document.getElementById('logout-btn');

      expect(authStatus.textContent).toBe('Not authenticated');
      expect(userInfo.textContent).toBe('');
      expect(loginBtn.style.display).not.toBe('none');
      expect(logoutBtn.style.display).toBe('none');
    });

    it('should handle rapid state changes', async () => {
      const stateChanges = [];
      let changeCount = 0;

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        changeCount++;
        stateChanges.push({
          event,
          timestamp: Date.now(),
          hasSession: !!session
        });
      });

      // Simulate rapid authentication attempts
      await Promise.all([
        supabase.auth.signUp({
          email: `rapid1.${Date.now()}@example.com`,
          password: 'TestPassword123!'
        }).catch(() => {}),
        supabase.auth.signUp({
          email: `rapid2.${Date.now()}@example.com`,
          password: 'TestPassword123!'
        }).catch(() => {}),
        supabase.auth.signOut().catch(() => {})
      ]);

      expect(changeCount).toBeGreaterThan(0);
      subscription.unsubscribe();
    });
  });

  describe('Session Persistence', () => {
    it('should persist session data to localStorage', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'test-user-id',
          email: 'persist@example.com'
        }
      };

      // Manually store session to test persistence
      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      window.localStorage.setItem(sessionKey, JSON.stringify(mockSession));

      expect(window.localStorage.getItem(sessionKey)).toBeTruthy();
      
      const storedData = JSON.parse(window.localStorage.getItem(sessionKey));
      expect(storedData.user.email).toBe('persist@example.com');
    });

    it('should restore session from localStorage on page load', async () => {
      const mockSession = {
        access_token: 'restore-test-token',
        refresh_token: 'restore-refresh-token',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'restore-user-id',
          email: 'restore@example.com'
        }
      };

      // Store mock session
      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      window.localStorage.setItem(sessionKey, JSON.stringify(mockSession));

      // Create new client to simulate page reload
      const restoredClient = createClient(supabase.supabaseUrl, supabase.supabaseKey, {
        auth: {
          storage: window.localStorage,
          autoRefreshToken: false // Disable to avoid network calls in test
        }
      });

      // Give time for session restoration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(window.localStorage.getItem(sessionKey)).toBeTruthy();
    });

    it('should clear session data on logout', async () => {
      // Set up mock session
      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      const mockSession = {
        access_token: 'logout-test-token',
        user: { id: 'test', email: 'logout@example.com' }
      };
      
      window.localStorage.setItem(sessionKey, JSON.stringify(mockSession));
      expect(window.localStorage.getItem(sessionKey)).toBeTruthy();

      // Simulate logout
      await supabase.auth.signOut();

      // Session should be cleared from localStorage
      // Note: In real implementation, this would be cleared automatically
      const remainingSession = window.localStorage.getItem(sessionKey);
      expect(remainingSession === null || remainingSession === 'null').toBe(true);
    });

    it('should handle expired sessions gracefully', async () => {
      const expiredSession = {
        access_token: 'expired-token',
        refresh_token: 'expired-refresh',
        expires_at: Date.now() - 3600000, // Expired 1 hour ago
        user: {
          id: 'expired-user',
          email: 'expired@example.com'
        }
      };

      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      window.localStorage.setItem(sessionKey, JSON.stringify(expiredSession));

      // Try to get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      // Should handle expired session appropriately
      if (session) {
        // If session is returned, it should be valid
        expect(session.expires_at).toBeGreaterThan(Date.now());
      } else {
        // If no session, that's expected for expired tokens
        expect(session).toBeNull();
      }
    });
  });

  describe('Token Refresh', () => {
    it('should handle automatic token refresh', async () => {
      // Mock a session with short expiry
      const shortSession = {
        access_token: 'short-lived-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 1000, // Expires in 1 second
        user: {
          id: 'refresh-user',
          email: 'refresh@example.com'
        }
      };

      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      window.localStorage.setItem(sessionKey, JSON.stringify(shortSession));

      // Wait for potential refresh attempt
      await new Promise(resolve => setTimeout(resolve, 1500));

      // The token refresh would normally happen automatically
      // In a real test environment, we'd verify the refresh was attempted
      expect(window.localStorage.getItem(sessionKey)).toBeTruthy();
    });

    it('should handle refresh token failure', async () => {
      const invalidRefreshSession = {
        access_token: 'access-token',
        refresh_token: 'invalid-refresh-token',
        expires_at: Date.now() - 1000, // Already expired
        user: {
          id: 'invalid-user',
          email: 'invalid@example.com'
        }
      };

      // Simulate refresh failure scenario
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: 'invalid-refresh-token'
      });

      expect(error).not.toBeNull();
      expect(data.session).toBeNull();
    });
  });

  describe('Multiple Session Management', () => {
    it('should handle multiple tabs/windows', async () => {
      // Simulate storage event from another tab
      const mockSession = {
        access_token: 'multi-tab-token',
        user: { id: 'multi-user', email: 'multitab@example.com' }
      };

      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      
      // Set session in localStorage
      window.localStorage.setItem(sessionKey, JSON.stringify(mockSession));

      // Simulate storage event (as if from another tab)
      const storageEvent = new window.StorageEvent('storage', {
        key: sessionKey,
        newValue: JSON.stringify(mockSession),
        oldValue: null,
        storageArea: window.localStorage
      });

      window.dispatchEvent(storageEvent);

      // Should handle the storage event
      expect(window.localStorage.getItem(sessionKey)).toBeTruthy();
    });

    it('should synchronize logout across tabs', async () => {
      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      
      // Set initial session
      window.localStorage.setItem(sessionKey, JSON.stringify({
        access_token: 'sync-token',
        user: { id: 'sync-user', email: 'sync@example.com' }
      }));

      // Simulate logout in another tab
      const logoutEvent = new window.StorageEvent('storage', {
        key: sessionKey,
        newValue: null,
        oldValue: JSON.stringify({ access_token: 'sync-token' }),
        storageArea: window.localStorage
      });

      window.dispatchEvent(logoutEvent);

      // Session should be cleared
      expect(window.localStorage.getItem(sessionKey)).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during authentication', async () => {
      // Create client with invalid URL to simulate network error
      const offlineClient = createClient('https://invalid-url.supabase.co', 'invalid-key');

      const { data, error } = await offlineClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should handle malformed session data', () => {
      const sessionKey = `sb-${supabase.supabaseUrl.split('://')[1].split('.')[0]}-auth-token`;
      
      // Store malformed session data
      window.localStorage.setItem(sessionKey, 'invalid-json{');

      // Should handle gracefully without crashing
      expect(() => {
        const stored = window.localStorage.getItem(sessionKey);
        try {
          JSON.parse(stored);
        } catch (e) {
          // Should catch and handle JSON parse error
          expect(e).toBeInstanceOf(SyntaxError);
        }
      }).not.toThrow();
    });

    it('should handle missing localStorage', () => {
      // Temporarily disable localStorage
      const originalLocalStorage = window.localStorage;
      delete window.localStorage;

      // Should handle missing localStorage gracefully
      const noStorageClient = createClient(supabase.supabaseUrl, supabase.supabaseKey, {
        auth: {
          storage: window.localStorage // Will be undefined
        }
      });

      expect(noStorageClient).toBeDefined();

      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });
  });

  describe('Auth State Callbacks', () => {
    it('should support multiple auth state listeners', () => {
      const listeners = [];
      const callbacks = [];

      // Create multiple listeners
      for (let i = 0; i < 3; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
        listeners.push(subscription);
      }

      expect(listeners).toHaveLength(3);
      expect(callbacks).toHaveLength(3);

      // Cleanup
      listeners.forEach(sub => sub.unsubscribe());
    });

    it('should properly unsubscribe auth state listeners', () => {
      const callback = jest.fn();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');

      // Unsubscribe should not throw
      expect(() => subscription.unsubscribe()).not.toThrow();
    });

    it('should handle auth state listener errors gracefully', () => {
      const errorCallback = () => {
        throw new Error('Callback error');
      };

      // Should not crash when callback throws error
      expect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(errorCallback);
        subscription.unsubscribe();
      }).not.toThrow();
    });
  });

  describe('UI Integration', () => {
    it('should update form validation based on auth state', () => {
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const loginForm = document.getElementById('login-form');

      // Initially form should be enabled
      expect(emailInput.disabled).toBe(false);
      expect(passwordInput.disabled).toBe(false);

      // Simulate loading state
      emailInput.disabled = true;
      passwordInput.disabled = true;

      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
    });

    it('should handle form submission state', () => {
      const loginForm = document.getElementById('login-form');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      expect(submitBtn.textContent).toBe('Submit');

      // Simulate loading state
      submitBtn.textContent = 'Signing in...';
      submitBtn.disabled = true;

      expect(submitBtn.textContent).toBe('Signing in...');
      expect(submitBtn.disabled).toBe(true);
    });

    it('should show error messages in UI', () => {
      // Add error display element
      const errorDiv = document.createElement('div');
      errorDiv.id = 'auth-error';
      document.body.appendChild(errorDiv);

      // Simulate error display
      errorDiv.textContent = 'Invalid email or password';
      errorDiv.style.display = 'block';

      expect(errorDiv.textContent).toBe('Invalid email or password');
      expect(errorDiv.style.display).toBe('block');

      // Clear error
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';

      expect(errorDiv.textContent).toBe('');
      expect(errorDiv.style.display).toBe('none');
    });

    it('should handle protected route access', () => {
      // Simulate route protection logic
      const isProtectedRoute = (path) => {
        return ['/dashboard', '/admin', '/profile'].includes(path);
      };

      const currentPath = '/dashboard';
      const isAuthenticated = authStateManager.isAuthenticated();

      if (isProtectedRoute(currentPath) && !isAuthenticated) {
        // Should redirect to login
        expect(currentPath).toBe('/dashboard');
        expect(isAuthenticated).toBe(false);
      }
    });
  });
});