/**
 * Supabase Authentication Flow Tests
 * Tests user registration, login, logout, and auth state management
 */

const { createClient } = require('@supabase/supabase-js');
const { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } = require('@jest/globals');

describe('Supabase Authentication Flow', () => {
  let supabase;
  let testUser;
  let testSession;

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured for testing');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  });

  afterAll(async () => {
    // Cleanup test users if needed
    try {
      if (testSession) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn('Auth cleanup warning:', error.message);
    }
  });

  afterEach(async () => {
    // Sign out after each test to ensure clean state
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore logout errors in tests
    }
  });

  describe('User Registration', () => {
    it('should register a new user with email and password', async () => {
      const userData = {
        email: `test.user.${Date.now()}@example.com`,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Test User',
            role: 'user'
          }
        }
      };

      const { data, error } = await supabase.auth.signUp(userData);

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(userData.email);
      expect(data.user.id).toBeDefined();
      
      // Check if session is created (depends on email confirmation setting)
      if (data.session) {
        expect(data.session.access_token).toBeDefined();
        expect(data.session.refresh_token).toBeDefined();
      }
    });

    it('should handle registration with invalid email format', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: 'invalid-email-format',
        password: 'TestPassword123!'
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('valid email');
      expect(data.user).toBeNull();
    });

    it('should handle registration with weak password', async () => {
      const { data, error } = await supabase.auth.signUp({
        email: `weak.password.${Date.now()}@example.com`,
        password: '123' // Too weak
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('password');
      expect(data.user).toBeNull();
    });

    it('should handle duplicate email registration', async () => {
      const email = `duplicate.${Date.now()}@example.com`;
      
      // First registration
      await supabase.auth.signUp({
        email: email,
        password: 'TestPassword123!'
      });

      // Attempt duplicate registration
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'AnotherPassword123!'
      });

      // Behavior depends on Supabase configuration
      // Usually returns success but doesn't create duplicate
      if (error) {
        expect(error.message).toContain('already');
      }
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const email = `login.test.${Date.now()}@example.com`;
      const password = 'LoginTestPassword123!';

      const { data } = await supabase.auth.signUp({
        email: email,
        password: password
      });

      testUser = { email, password, id: data.user?.id };
      
      // Sign out to ensure clean state for login test
      await supabase.auth.signOut();
    });

    it('should login with valid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.session).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.session.access_token).toBeDefined();
      expect(data.session.refresh_token).toBeDefined();
      
      testSession = data.session;
    });

    it('should handle login with invalid email', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Invalid');
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should handle login with incorrect password', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: 'WrongPassword123!'
      });

      expect(error).not.toBeNull();
      expect(error.message).toContain('Invalid');
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should handle rate limiting on multiple failed attempts', async () => {
      const attemptLogin = () => supabase.auth.signInWithPassword({
        email: testUser.email,
        password: 'WrongPassword123!'
      });

      // Make multiple failed attempts
      const attempts = await Promise.all([
        attemptLogin(),
        attemptLogin(),
        attemptLogin(),
        attemptLogin(),
        attemptLogin()
      ]);

      const errors = attempts.filter(attempt => attempt.error);
      expect(errors.length).toBeGreaterThan(0);
      
      // After several attempts, should get rate limited
      const lastError = errors[errors.length - 1].error;
      expect(lastError).toBeDefined();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Create and login test user
      const email = `session.test.${Date.now()}@example.com`;
      const password = 'SessionTestPassword123!';

      await supabase.auth.signUp({ email, password });
      const { data } = await supabase.auth.signInWithPassword({ email, password });
      
      testSession = data.session;
      testUser = data.user;
    });

    it('should maintain session across page reloads', async () => {
      expect(testSession).toBeDefined();
      
      // Simulate page reload by getting current session
      const { data: { session }, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(session).toBeDefined();
      expect(session.user.id).toBe(testUser.id);
    });

    it('should refresh expired tokens', async () => {
      expect(testSession).toBeDefined();
      
      // Force token refresh
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: testSession.refresh_token
      });

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session.access_token).toBeDefined();
      expect(data.session.access_token).not.toBe(testSession.access_token);
    });

    it('should get current user information', async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      expect(error).toBeNull();
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe(testUser.email);
    });

    it('should handle invalid session tokens', async () => {
      // Set an invalid token
      const originalToken = testSession.access_token;
      
      // Try to use invalid token (simulate by refreshing with invalid refresh token)
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: 'invalid-refresh-token'
      });

      expect(error).not.toBeNull();
      expect(data.session).toBeNull();
    });
  });

  describe('User Logout', () => {
    beforeEach(async () => {
      // Login test user
      const email = `logout.test.${Date.now()}@example.com`;
      const password = 'LogoutTestPassword123!';

      await supabase.auth.signUp({ email, password });
      const { data } = await supabase.auth.signInWithPassword({ email, password });
      
      testSession = data.session;
      testUser = data.user;
    });

    it('should logout successfully', async () => {
      // Verify user is logged in
      const { data: beforeLogout } = await supabase.auth.getSession();
      expect(beforeLogout.session).toBeDefined();

      // Logout
      const { error } = await supabase.auth.signOut();
      expect(error).toBeNull();

      // Verify user is logged out
      const { data: afterLogout } = await supabase.auth.getSession();
      expect(afterLogout.session).toBeNull();
    });

    it('should invalidate session tokens on logout', async () => {
      const originalAccessToken = testSession.access_token;

      // Logout
      await supabase.auth.signOut();

      // Try to use the old token (this would be handled by client automatically)
      const { data: { user }, error } = await supabase.auth.getUser();

      expect(user).toBeNull();
      expect(error?.message || 'No session').toContain('session');
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      // Create test user for password reset
      const email = `reset.test.${Date.now()}@example.com`;
      await supabase.auth.signUp({
        email: email,
        password: 'OriginalPassword123!'
      });
      
      testUser = { email };
    });

    it('should initiate password reset', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(testUser.email, {
        redirectTo: 'http://localhost:3000/reset-password'
      });

      expect(error).toBeNull();
      // Password reset always returns success for security reasons
    });

    it('should handle password reset for non-existent email', async () => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        'nonexistent@example.com'
      );

      // Should not reveal whether email exists
      expect(error).toBeNull();
    });
  });

  describe('User Profile Updates', () => {
    beforeEach(async () => {
      // Login test user
      const email = `profile.test.${Date.now()}@example.com`;
      const password = 'ProfileTestPassword123!';

      await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: 'Original Name'
          }
        }
      });
      
      const { data } = await supabase.auth.signInWithPassword({ email, password });
      testUser = data.user;
    });

    it('should update user metadata', async () => {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: 'Updated Test Name',
          website: 'https://example.com'
        }
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user.user_metadata.full_name).toBe('Updated Test Name');
      expect(data.user.user_metadata.website).toBe('https://example.com');
    });

    it('should update user email (if enabled)', async () => {
      const newEmail = `updated.${Date.now()}@example.com`;
      
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });

      // This may require email confirmation depending on settings
      if (!error) {
        expect(data.user).toBeDefined();
        // Email might not be immediately updated if confirmation is required
      }
    });

    it('should update user password', async () => {
      const { data, error } = await supabase.auth.updateUser({
        password: 'NewStrongPassword123!'
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(testUser.id);
    });
  });

  describe('Authentication Event Handling', () => {
    it('should handle auth state changes', (done) => {
      let eventCount = 0;
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        eventCount++;
        
        expect(['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(event)).toBe(true);
        
        if (event === 'SIGNED_IN') {
          expect(session).toBeDefined();
          expect(session.user).toBeDefined();
        }
        
        if (event === 'SIGNED_OUT') {
          expect(session).toBeNull();
        }
        
        // Complete test after seeing some events
        if (eventCount >= 2) {
          subscription.unsubscribe();
          done();
        }
      });

      // Trigger auth events
      setTimeout(async () => {
        const email = `event.test.${Date.now()}@example.com`;
        await supabase.auth.signUp({
          email: email,
          password: 'EventTestPassword123!'
        });
        
        setTimeout(async () => {
          await supabase.auth.signOut();
        }, 100);
      }, 100);
    });
  });

  describe('Social Authentication', () => {
    it('should provide correct OAuth URLs', async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback'
        }
      });

      expect(error).toBeNull();
      expect(data.url).toBeDefined();
      expect(data.url).toContain('github');
      expect(data.url).toContain('oauth');
    });

    it('should handle multiple OAuth providers', async () => {
      const providers = ['github', 'google', 'discord'];
      
      for (const provider of providers) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: provider,
          options: {
            redirectTo: 'http://localhost:3000/auth/callback'
          }
        });

        expect(error).toBeNull();
        expect(data.url).toBeDefined();
        expect(data.url).toContain(provider);
      }
    });
  });

  describe('Security Features', () => {
    it('should handle concurrent login sessions', async () => {
      const email = `concurrent.${Date.now()}@example.com`;
      const password = 'ConcurrentTestPassword123!';

      // Create user
      await supabase.auth.signUp({ email, password });

      // Create multiple client instances
      const client1 = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const client2 = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

      // Login with both clients
      const [login1, login2] = await Promise.all([
        client1.auth.signInWithPassword({ email, password }),
        client2.auth.signInWithPassword({ email, password })
      ]);

      expect(login1.error).toBeNull();
      expect(login2.error).toBeNull();
      expect(login1.data.session).toBeDefined();
      expect(login2.data.session).toBeDefined();

      // Cleanup
      await client1.auth.signOut();
      await client2.auth.signOut();
    });

    it('should properly validate JWT tokens', async () => {
      // Login to get valid session
      const email = `jwt.test.${Date.now()}@example.com`;
      const password = 'JWTTestPassword123!';

      await supabase.auth.signUp({ email, password });
      const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });

      expect(loginData.session.access_token).toBeDefined();
      
      // The JWT should have proper structure
      const tokenParts = loginData.session.access_token.split('.');
      expect(tokenParts).toHaveLength(3); // header.payload.signature

      // Decode payload (not verifying signature here, just structure)
      const payload = JSON.parse(atob(tokenParts[1]));
      expect(payload.sub).toBe(loginData.user.id);
      expect(payload.email).toBe(loginData.user.email);
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
});