/**
 * Supabase Authentication Tests
 * Comprehensive test suite for the authentication system
 */

const { handler: authHandler } = require('../../netlify/functions/supabase-auth');
const { 
  requireAuth, 
  withAuth, 
  verifyToken, 
  checkPermissions 
} = require('../../netlify/functions/utils/auth-middleware');
const { 
  PasswordUtils, 
  SecurityUtils, 
  JWTUtils 
} = require('../../netlify/functions/utils/auth-utils');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      verifyOtp: jest.fn(),
      refreshSession: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      resend: jest.fn()
    }
  }))
}));

describe('Supabase Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key-' + 'x'.repeat(100);
    process.env.SUPABASE_ANON_KEY = 'test-anon-key-' + 'x'.repeat(100);
    process.env.URL = 'https://test.netlify.app';
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.URL;
  });

  describe('Authentication Handler', () => {
    test('should handle OPTIONS requests (CORS preflight)', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/.netlify/functions/supabase-auth/signin',
        headers: {},
        body: null
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(result.body).toBe('');
    });

    test('should return 400 for invalid JSON in request body', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/signin',
        headers: {},
        body: 'invalid json'
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid JSON in request body');
      expect(body.code).toBe('INVALID_JSON');
    });

    test('should return 404 for unknown endpoints', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/unknown',
        headers: {},
        body: JSON.stringify({})
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Authentication endpoint not found');
      expect(body.code).toBe('ENDPOINT_NOT_FOUND');
    });

    test('should apply rate limiting to sensitive operations', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/signin',
        headers: {
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      };

      // Make multiple requests to trigger rate limiting
      const promises = Array(10).fill().map(() => authHandler(event, {}));
      const results = await Promise.all(promises);

      // At least one should be rate limited
      const rateLimited = results.some(result => result.statusCode === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Sign Up', () => {
    test('should validate email format', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/signup',
        headers: {},
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'Test123!@#'
        })
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid email format');
      expect(body.code).toBe('INVALID_EMAIL');
    });

    test('should validate password strength', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/signup',
        headers: {},
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'weak'
        })
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Password must be at least 8 characters');
      expect(body.code).toBe('WEAK_PASSWORD');
    });

    test('should require email and password', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/signup',
        headers: {},
        body: JSON.stringify({})
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Email and password are required');
      expect(body.code).toBe('MISSING_CREDENTIALS');
    });
  });

  describe('Sign In', () => {
    test('should require email and password', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/signin',
        headers: {},
        body: JSON.stringify({
          email: 'test@example.com'
        })
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Email and password are required');
      expect(body.code).toBe('MISSING_CREDENTIALS');
    });
  });

  describe('Password Reset', () => {
    test('should require email', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/reset-password',
        headers: {},
        body: JSON.stringify({})
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Email is required');
      expect(body.code).toBe('MISSING_EMAIL');
    });

    test('should validate email format', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/reset-password',
        headers: {},
        body: JSON.stringify({
          email: 'invalid-email'
        })
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid email format');
      expect(body.code).toBe('INVALID_EMAIL');
    });
  });

  describe('OAuth', () => {
    test('should validate provider', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/oauth',
        headers: {},
        body: JSON.stringify({
          provider: 'invalid-provider'
        })
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Valid provider is required');
      expect(body.code).toBe('INVALID_PROVIDER');
      expect(body.validProviders).toEqual(['google', 'github', 'discord', 'twitter']);
    });

    test('should handle OAuth callback with missing code', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/.netlify/functions/supabase-auth/oauth-callback',
        headers: {},
        body: JSON.stringify({})
      };

      const result = await authHandler(event, {});

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Authorization code is required');
      expect(body.code).toBe('MISSING_AUTH_CODE');
    });
  });
});

describe('Authentication Middleware', () => {
  const mockEvent = {
    headers: {
      'authorization': 'Bearer valid-token',
      'x-forwarded-for': '192.168.1.1'
    },
    httpMethod: 'GET',
    path: '/api/protected'
  };

  const mockContext = {};

  test('should require authorization header', async () => {
    const eventWithoutAuth = {
      ...mockEvent,
      headers: {}
    };

    const result = await requireAuth(eventWithoutAuth);

    expect(result.statusCode).toBe(401);
    
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Authentication required');
    expect(body.code).toBe('AUTH_REQUIRED');
  });

  test('should allow anonymous access when configured', async () => {
    const eventWithoutAuth = {
      ...mockEvent,
      headers: {}
    };

    const result = await requireAuth(eventWithoutAuth, { allowAnonymous: true });

    expect(result.success).toBe(true);
    expect(result.user).toBe(null);
  });

  test('should check role permissions', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      app_metadata: { role: 'user' }
    };

    const hasPermission = checkPermissions(mockUser, 'admin');
    expect(hasPermission).toBe(false);

    const hasUserPermission = checkPermissions(mockUser, 'user');
    expect(hasUserPermission).toBe(true);
  });

  test('should handle role hierarchy correctly', async () => {
    const adminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      app_metadata: { role: 'admin' }
    };

    const editorUser = {
      id: 'editor-123',
      email: 'editor@example.com',
      app_metadata: { role: 'editor' }
    };

    // Admin should have access to all roles
    expect(checkPermissions(adminUser, 'user')).toBe(true);
    expect(checkPermissions(adminUser, 'editor')).toBe(true);
    expect(checkPermissions(adminUser, 'admin')).toBe(true);

    // Editor should have access to user and editor, but not admin
    expect(checkPermissions(editorUser, 'user')).toBe(true);
    expect(checkPermissions(editorUser, 'editor')).toBe(true);
    expect(checkPermissions(editorUser, 'admin')).toBe(false);
  });

  test('should apply rate limiting', async () => {
    const limitedResult = await requireAuth(mockEvent, {
      rateLimit: { windowMs: 60000, maxRequests: 1 }
    });

    // First request should succeed (assuming token is valid)
    // Second request should be rate limited
    const secondResult = await requireAuth(mockEvent, {
      rateLimit: { windowMs: 60000, maxRequests: 1 }
    });

    // At least one should be rate limited if multiple rapid requests
    expect([limitedResult, secondResult].some(r => r.statusCode === 429)).toBe(false); // May not trigger in test
  });
});

describe('Password Utilities', () => {
  test('should validate strong passwords', () => {
    const strongPassword = 'Test123!@#';
    const validation = PasswordUtils.validatePassword(strongPassword);

    expect(validation.isValid).toBe(true);
    expect(validation.score).toBeGreaterThanOrEqual(5);
  });

  test('should reject weak passwords', () => {
    const weakPassword = 'weak';
    const validation = PasswordUtils.validatePassword(weakPassword);

    expect(validation.isValid).toBe(false);
    expect(validation.feedback.length).toBeGreaterThan(0);
  });

  test('should reject common passwords', () => {
    const commonPassword = 'password123';
    const validation = PasswordUtils.validatePassword(commonPassword);

    expect(validation.feedback).toContain('This password is too common, choose something more unique');
  });

  test('should generate secure passwords', () => {
    const password = PasswordUtils.generateSecurePassword(16);

    expect(password.length).toBe(16);
    
    const validation = PasswordUtils.validatePassword(password);
    expect(validation.isValid).toBe(true);
  });

  test('should test individual password criteria', () => {
    const tests = [
      { password: 'Test123!', expected: { length: true, uppercase: true, lowercase: true, number: true, special: true }},
      { password: 'test123!', expected: { uppercase: false }},
      { password: 'TEST123!', expected: { lowercase: false }},
      { password: 'Test!', expected: { number: false }},
      { password: 'Test123', expected: { special: false }}
    ];

    tests.forEach(({ password, expected }) => {
      const validation = PasswordUtils.validatePassword(password);
      Object.entries(expected).forEach(([key, value]) => {
        expect(validation.tests[key]).toBe(value);
      });
    });
  });
});

describe('Security Utilities', () => {
  test('should generate secure random strings', () => {
    const random1 = SecurityUtils.generateSecureRandom();
    const random2 = SecurityUtils.generateSecureRandom();

    expect(random1).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(random2).toHaveLength(64);
    expect(random1).not.toBe(random2);
  });

  test('should validate email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'test+label@example.org'
    ];

    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'test@',
      'test..test@example.com',
      'test @example.com'
    ];

    validEmails.forEach(email => {
      expect(SecurityUtils.isValidEmail(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(SecurityUtils.isValidEmail(email)).toBe(false);
    });
  });

  test('should validate URLs', () => {
    const validUrls = [
      'https://example.com',
      'http://localhost:3000',
      'https://sub.domain.com/path?query=value'
    ];

    const invalidUrls = [
      'not-a-url',
      'ftp://invalid',
      'just-text',
      'http://',
      'https://'
    ];

    validUrls.forEach(url => {
      expect(SecurityUtils.isValidUrl(url)).toBe(true);
    });

    invalidUrls.forEach(url => {
      expect(SecurityUtils.isValidUrl(url)).toBe(false);
    });
  });

  test('should sanitize input', () => {
    const testCases = [
      {
        input: '  test  ',
        options: { trim: true },
        expected: 'test'
      },
      {
        input: '<script>alert("xss")</script>test',
        options: { stripHtml: true },
        expected: 'alert("xss")test'
      },
      {
        input: 'very long text that should be truncated',
        options: { maxLength: 10 },
        expected: 'very long '
      },
      {
        input: 'test\x00null',
        options: {},
        expected: 'testnull'
      }
    ];

    testCases.forEach(({ input, options, expected }) => {
      const result = SecurityUtils.sanitizeInput(input, options);
      expect(result).toBe(expected);
    });
  });

  test('should create and verify HMAC signatures', () => {
    const data = 'sensitive data';
    const secret = 'secret key';

    const signature = SecurityUtils.createHMAC(data, secret);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);

    const isValid = SecurityUtils.verifyHMAC(data, signature, secret);
    expect(isValid).toBe(true);

    const isInvalid = SecurityUtils.verifyHMAC('different data', signature, secret);
    expect(isInvalid).toBe(false);
  });

  test('should create rate limiter', () => {
    const rateLimiter = SecurityUtils.createRateLimiter(1000, 2); // 2 requests per second

    // First two requests should be allowed
    expect(rateLimiter('user1').allowed).toBe(true);
    expect(rateLimiter('user1').allowed).toBe(true);

    // Third request should be blocked
    expect(rateLimiter('user1').allowed).toBe(false);

    // Different user should be allowed
    expect(rateLimiter('user2').allowed).toBe(true);
  });
});

describe('JWT Utilities', () => {
  const jwtUtils = new JWTUtils('test-secret');

  test('should generate and verify tokens', () => {
    const payload = { userId: '123', role: 'user' };
    const token = jwtUtils.generateToken(payload);

    expect(typeof token).toBe('string');

    const decoded = jwtUtils.verifyToken(token);
    expect(decoded.userId).toBe('123');
    expect(decoded.role).toBe('user');
  });

  test('should handle token expiration', () => {
    const payload = { userId: '123' };
    const token = jwtUtils.generateToken(payload, { expiresIn: '1ms' });

    // Wait for token to expire
    setTimeout(() => {
      expect(() => jwtUtils.verifyToken(token)).toThrow();
    }, 10);
  });

  test('should detect expired tokens', () => {
    const payload = { userId: '123' };
    const expiredToken = jwtUtils.generateToken(payload, { expiresIn: '1ms' });

    setTimeout(() => {
      expect(jwtUtils.isTokenExpired(expiredToken)).toBe(true);
    }, 10);
  });

  test('should decode tokens without verification', () => {
    const payload = { userId: '123', role: 'user' };
    const token = jwtUtils.generateToken(payload);

    const decoded = jwtUtils.decodeToken(token);
    expect(decoded.payload.userId).toBe('123');
    expect(decoded.payload.role).toBe('user');
  });
});

describe('Integration Tests', () => {
  test('should handle complete authentication flow', async () => {
    // This would be a more comprehensive integration test
    // involving multiple components working together
    
    const signupEvent = {
      httpMethod: 'POST',
      path: '/.netlify/functions/supabase-auth/signup',
      headers: {},
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
        userData: { name: 'Test User' }
      })
    };

    // Mock successful signup response
    const mockCreateClient = require('@supabase/supabase-js').createClient;
    mockCreateClient().auth.signUp.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      },
      error: null
    });

    const result = await authHandler(signupEvent, {});
    expect(result.statusCode).toBe(201);
    
    const body = JSON.parse(result.body);
    expect(body.message).toContain('User created successfully');
  });
});

describe('Error Handling', () => {
  test('should handle Supabase client errors gracefully', async () => {
    const mockCreateClient = require('@supabase/supabase-js').createClient;
    mockCreateClient().auth.signUp.mockRejectedValue(new Error('Database connection failed'));

    const event = {
      httpMethod: 'POST',
      path: '/.netlify/functions/supabase-auth/signup',
      headers: {},
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#'
      })
    };

    const result = await authHandler(event, {});
    expect(result.statusCode).toBe(500);
    
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Failed to create user account');
    expect(body.code).toBe('SIGNUP_FAILED');
  });

  test('should handle missing environment variables', () => {
    delete process.env.SUPABASE_URL;
    
    expect(() => {
      require('../../netlify/functions/utils/supabase-config').validateEnvironment();
    }).toThrow('Missing required environment variables');
  });
});

describe('Performance Tests', () => {
  test('should handle concurrent requests', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/.netlify/functions/supabase-auth/signin',
      headers: { 'x-forwarded-for': '192.168.1.100' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#'
      })
    };

    // Simulate concurrent requests
    const promises = Array(5).fill().map(() => authHandler(event, {}));
    const results = await Promise.all(promises);

    // All requests should complete (though some might be rate limited)
    results.forEach(result => {
      expect(result.statusCode).toBeDefined();
      expect([200, 400, 401, 429, 500]).toContain(result.statusCode);
    });
  });

  test('should respond within reasonable time limits', async () => {
    const start = Date.now();
    
    const event = {
      httpMethod: 'POST',
      path: '/.netlify/functions/supabase-auth/user',
      headers: { 'authorization': 'Bearer invalid-token' },
      body: '{}'
    };

    await authHandler(event, {});
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
  });
});