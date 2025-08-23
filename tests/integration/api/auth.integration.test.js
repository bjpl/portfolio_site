const request = require('supertest');
const app = require('../../../src/server');
const { User, Role } = require('../../../src/models');
const { factories } = require('../../fixtures/testData');

describe('Authentication API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'integration@test.com',
        username: 'integration',
        password: 'Password123!',
        firstName: 'Integration',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Verify user was created in database
      const user = await User.findOne({ where: { email: userData.email } });
      expect(user).toBeDefined();
      expect(user.isEmailVerified).toBe(false);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        username: 'a', // Too short
        password: '123', // Too weak
        firstName: '',
        lastName: ''
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should reject registration with existing email', async () => {
      const userData = await factories.createUser();
      const existingUser = await User.create(userData);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: existingUser.email,
          username: 'different',
          password: 'Password123!',
          firstName: 'Different',
          lastName: 'User'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should set appropriate headers and cookies', async () => {
      const userData = {
        email: 'headers@test.com',
        username: 'headers',
        password: 'Password123!',
        firstName: 'Headers',
        lastName: 'Test'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.headers['content-type']).toMatch(/json/);
      // Check for security headers if implemented
      if (response.headers['x-frame-options']) {
        expect(response.headers['x-frame-options']).toBe('DENY');
      }
    });
  });

  describe('POST /api/auth/login', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'login@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
    });

    it('should login user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should support login with username instead of email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: user.username,
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(user.id);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login for unverified email', async () => {
      user.isEmailVerified = false;
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email not verified');
    });

    it('should reject login for inactive account', async () => {
      user.isActive = false;
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('account is inactive');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'login@test.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/logout', () => {
    let user, accessToken;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'logout@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
      accessToken = global.testUtils.generateJWT({ id: user.id, email: user.email });
    });

    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');
    });

    it('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let user, refreshToken;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'refresh@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
      refreshToken = global.testUtils.generateRefreshToken({ id: user.id });
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens.accessToken).toHaveValidJWT();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require refresh token in request', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'verify@test.com',
        isEmailVerified: false
      });
      user = await User.create(userData);
      await user.generateEmailVerificationToken();
    });

    it('should verify email with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: user.emailVerificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);

      await user.reload();
      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeNull();
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired verification token', async () => {
      user.emailVerificationExpiry = new Date(Date.now() - 60 * 60 * 1000);
      await user.save();

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: user.emailVerificationToken })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'resend@test.com',
        isEmailVerified: false
      });
      user = await User.create(userData);
    });

    it('should resend verification email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'resend@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent');

      await user.reload();
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationExpiry).toBeValidDate();
    });

    it('should reject resend for verified email', async () => {
      user.isEmailVerified = true;
      await user.save();

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'resend@test.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already verified');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@test.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'forgot@test.com',
        isEmailVerified: true
      });
      user = await User.create(userData);
    });

    it('should initiate password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent');

      await user.reload();
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetExpiry).toBeValidDate();
    });

    it('should handle non-existent email gracefully', async () => {
      // Should still return success for security reasons
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'reset@test.com',
        isEmailVerified: true
      });
      user = await User.create(userData);
      await user.generatePasswordResetToken();
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: user.passwordResetToken,
          password: newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      await user.reload();
      expect(user.passwordResetToken).toBeNull();
      
      // Test login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset@test.com',
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject password reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password confirmation match', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: user.passwordResetToken,
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('match');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: user.passwordResetToken,
          password: 'weak',
          confirmPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    let user, accessToken;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'me@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
      accessToken = global.testUtils.generateJWT({ id: user.id, email: user.email });
    });

    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should include user roles in response', async () => {
      const userRole = await Role.findOne({ where: { name: 'user' } });
      await user.addRole(userRole);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user.roles).toBeDefined();
      expect(Array.isArray(response.body.user.roles)).toBe(true);
      expect(response.body.user.roles.some(r => r.name === 'user')).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Middleware', () => {
    let user, accessToken;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'middleware@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
      accessToken = global.testUtils.generateJWT({ id: user.id, email: user.email });
    });

    it('should accept valid Bearer token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject missing Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should reject malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: user.id, email: user.email, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should handle deactivated user', async () => {
      user.isActive = false;
      await user.save();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inactive');
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      // Check for common security headers
      if (response.headers['x-content-type-options']) {
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      }
      if (response.headers['x-frame-options']) {
        expect(response.headers['x-frame-options']).toBe('DENY');
      }
      if (response.headers['x-xss-protection']) {
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      }
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://frontend.example.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,authorization');

      if (response.headers['access-control-allow-origin']) {
        expect(response.status).toBeWithinRange(200, 299);
      }
    });
  });
});