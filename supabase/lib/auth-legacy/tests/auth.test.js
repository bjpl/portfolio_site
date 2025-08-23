const request = require('supertest');
const bcrypt = require('bcryptjs');
const { User } = require('../../models/User');
const TokenService = require('../services/TokenService');
const EmailService = require('../services/EmailService');
const PasswordService = require('../services/PasswordService');

// Mock the email service
jest.mock('../services/EmailService');

describe('Authentication System', () => {
  let app;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Set up test app
    app = require('../../server');
    
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: await bcrypt.hash('TestPassword123!', 12),
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      role: 'viewer'
    });

    // Generate auth token for authenticated tests
    authToken = TokenService.generateAccessToken({
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      username: testUser.username
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.destroy({ where: {} });
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(userData.email.toLowerCase());
      expect(response.body.user.username).toBe(userData.username.toLowerCase());
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.emailVerificationSent).toBe(true);

      // Verify email was sent
      expect(EmailService.sendEmailVerification).toHaveBeenCalled();
      expect(EmailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    test('should reject registration with weak password', async () => {
      const userData = {
        username: 'weakuser',
        email: 'weak@example.com',
        password: 'weak',
        firstName: 'Weak',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Password validation failed');
      expect(response.body).toHaveProperty('requirements');
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        username: 'duplicate',
        email: testUser.email,
        password: 'DuplicatePassword123!',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('User already exists');
      expect(response.body.message).toBe('Email already registered');
    });

    test('should reject registration with missing fields', async () => {
      const userData = {
        email: 'incomplete@example.com'
        // Missing username and password
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should login with username instead of email', async () => {
      const loginData = {
        email: testUser.username, // Using username in email field
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.id).toBe(testUser.id);
    });

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should lockout account after failed attempts', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send(loginData)
          .expect(401);
      }

      // The 6th attempt should be locked out
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(423);

      expect(response.body.error).toBe('Account locked');
      expect(EmailService.sendAccountLockout).toHaveBeenCalled();

      // Reset lockout for other tests
      await testUser.update({
        loginAttempts: 0,
        lockoutUntil: null
      });
    });
  });

  describe('Token Management', () => {
    test('should refresh access token', async () => {
      // First, login to get a refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });

      // Extract refresh token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(cookie => 
        cookie.startsWith('refreshToken=')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.id).toBe(testUser.id);
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Token refresh failed');
    });
  });

  describe('Email Verification', () => {
    test('should verify email with valid token', async () => {
      const verificationToken = TokenService.generateEmailVerificationToken(
        testUser.id, 
        testUser.email
      );

      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.message).toBe('Email verified successfully');
    });

    test('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.error).toBe('Email verification failed');
    });

    test('should resend verification email', async () => {
      const response = await request(app)
        .post('/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.message).toBe('Verification email sent');
      expect(EmailService.sendEmailVerification).toHaveBeenCalled();
    });
  });

  describe('Password Reset', () => {
    test('should request password reset', async () => {
      const response = await request(app)
        .post('/auth/request-reset')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.message).toBe('Password reset link sent');
      expect(EmailService.sendPasswordReset).toHaveBeenCalled();
    });

    test('should reset password with valid token', async () => {
      const resetToken = TokenService.generatePasswordResetToken(
        testUser.id, 
        testUser.email
      );

      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/auth/reset-password')
        .send({ 
          token: resetToken, 
          password: newPassword 
        })
        .expect(200);

      expect(response.body.message).toBe('Password reset successful');
      expect(EmailService.sendSecurityAlert).toHaveBeenCalled();

      // Verify password was changed
      const updatedUser = await User.findByPk(testUser.id);
      const isValidPassword = await PasswordService.verifyPassword(
        newPassword, 
        updatedUser.password
      );
      expect(isValidPassword).toBe(true);
    });

    test('should reject password reset with invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({ 
          token: 'invalid-token', 
          password: 'NewPassword123!' 
        })
        .expect(400);

      expect(response.body.error).toBe('Password reset failed');
    });
  });

  describe('Password Change (Authenticated)', () => {
    test('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'NewPassword123!', // From previous test
          newPassword: 'AnotherPassword123!'
        })
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully');
      expect(EmailService.sendSecurityAlert).toHaveBeenCalled();
    });

    test('should reject password change with invalid current password', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'AnotherPassword123!'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid current password');
    });

    test('should require authentication for password change', async () => {
      const response = await request(app)
        .post('/auth/change-password')
        .send({
          currentPassword: 'AnotherPassword123!',
          newPassword: 'FinalPassword123!'
        })
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Profile Management', () => {
    test('should get user profile', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should require authentication for profile', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should get user sessions', async () => {
      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });
  });

  describe('Logout', () => {
    test('should logout successfully', async () => {
      // Login first to get refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'AnotherPassword123!'
        });

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });

    test('should logout all sessions', async () => {
      const response = await request(app)
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('All sessions terminated successfully');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to auth endpoints', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      // Make multiple requests to trigger rate limit
      const requests = Array(10).fill().map(() =>
        request(app)
          .post('/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // Some responses should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/auth/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.service).toBe('authentication');
    });
  });
});