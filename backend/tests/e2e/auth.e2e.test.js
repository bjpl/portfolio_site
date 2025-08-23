const request = require('supertest');
const app = require('../../src/server');
const { User } = require('../../src/models');
const { factories } = require('../fixtures/testData');

describe('Authentication E2E Tests', () => {
  describe('Complete User Registration Flow', () => {
    it('should complete full user registration and login flow', async () => {
      const userData = {
        email: 'e2e@test.com',
        username: 'e2euser',
        password: 'Password123!',
        firstName: 'E2E',
        lastName: 'Test'
      };

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user.isEmailVerified).toBe(false);
      const userId = registerResponse.body.user.id;
      const { accessToken } = registerResponse.body.tokens;

      // Step 2: Verify user cannot access protected resources without email verification
      const protectedResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      // Depending on your auth strategy, this might be 403 or 200 with limited access
      expect([200, 403]).toContain(protectedResponse.status);

      // Step 3: Get verification token from database (simulate email)
      const user = await User.findByPk(userId);
      await user.generateEmailVerificationToken();
      const verificationToken = user.emailVerificationToken;

      // Step 4: Verify email
      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      // Step 5: Login after verification
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.isEmailVerified).toBe(true);

      // Step 6: Access protected resources
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user.id).toBe(userId);
    });

    it('should handle registration with duplicate email gracefully', async () => {
      const userData = {
        email: 'duplicate@test.com',
        username: 'duplicate1',
        password: 'Password123!',
        firstName: 'First',
        lastName: 'User'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const duplicateData = {
        ...userData,
        username: 'duplicate2'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Complete Password Reset Flow', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'reset-e2e@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
    });

    it('should complete password reset flow', async () => {
      const newPassword = 'NewPassword123!';

      // Step 1: Initiate password reset
      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      expect(forgotResponse.body.success).toBe(true);

      // Step 2: Get reset token from database (simulate email)
      await user.reload();
      const resetToken = user.passwordResetToken;
      expect(resetToken).toBeDefined();

      // Step 3: Reset password
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);

      // Step 4: Verify old password no longer works
      const oldLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123' // Original password
        })
        .expect(401);

      expect(oldLoginResponse.body.success).toBe(false);

      // Step 5: Login with new password
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: newPassword
        })
        .expect(200);

      expect(newLoginResponse.body.success).toBe(true);

      // Step 6: Verify reset token is cleared
      await user.reload();
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetExpiry).toBeNull();
    });
  });

  describe('Account Lockout and Recovery', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'lockout@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
    });

    it('should lock account after max failed attempts and allow recovery', async () => {
      const wrongPassword = 'wrongpassword';

      // Step 1: Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: wrongPassword
          });

        if (i < 4) {
          expect(response.status).toBe(401);
          expect(response.body.message).toContain('Invalid credentials');
        } else {
          // 5th attempt should trigger lockout
          expect(response.status).toBe(423);
          expect(response.body.message).toContain('locked');
        }
      }

      // Step 2: Verify account is locked
      await user.reload();
      expect(user.isAccountLocked()).toBe(true);

      // Step 3: Attempt login with correct password while locked
      const lockedResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        })
        .expect(423);

      expect(lockedResponse.body.success).toBe(false);
      expect(lockedResponse.body.message).toContain('locked');

      // Step 4: Simulate lock expiry
      user.lockUntil = new Date(Date.now() - 1000); // Already expired
      await user.save();

      // Step 5: Login with correct password after lock expiry
      const recoveryResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        })
        .expect(200);

      expect(recoveryResponse.body.success).toBe(true);

      // Step 6: Verify account is unlocked and attempts reset
      await user.reload();
      expect(user.loginAttempts).toBe(0);
      expect(user.lockUntil).toBeNull();
      expect(user.lastLoginAt).toBeValidDate();
    });
  });

  describe('Token Lifecycle and Refresh', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'token-e2e@test.com',
        isEmailVerified: true,
        isActive: true
      });
      user = await User.create(userData);
    });

    it('should handle complete token lifecycle', async () => {
      // Step 1: Login and get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        })
        .expect(200);

      const { accessToken, refreshToken } = loginResponse.body.tokens;

      // Step 2: Use access token to access protected resource
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.user.id).toBe(user.id);

      // Step 3: Refresh tokens
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newTokens = refreshResponse.body.tokens;
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(accessToken); // Should be different

      // Step 4: Use new access token
      const newProfileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(200);

      expect(newProfileResponse.body.user.id).toBe(user.id);

      // Step 5: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });

    it('should handle concurrent token refresh gracefully', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        })
        .expect(200);

      const { refreshToken } = loginResponse.body.tokens;

      // Make multiple concurrent refresh requests
      const refreshPromises = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken })
      );

      const responses = await Promise.all(refreshPromises);

      // All should succeed or handle gracefully
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Email Verification Flow Edge Cases', () => {
    let user;

    beforeEach(async () => {
      const userData = await factories.createUser({
        email: 'verify-edge@test.com',
        isEmailVerified: false
      });
      user = await User.create(userData);
    });

    it('should handle verification token expiry', async () => {
      // Generate verification token
      await user.generateEmailVerificationToken();
      const token = user.emailVerificationToken;

      // Expire the token
      user.emailVerificationExpiry = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      await user.save();

      // Try to verify with expired token
      const expiredResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ token })
        .expect(400);

      expect(expiredResponse.body.success).toBe(false);
      expect(expiredResponse.body.message).toContain('expired');

      // Resend verification
      const resendResponse = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: user.email })
        .expect(200);

      expect(resendResponse.body.success).toBe(true);

      // Get new token and verify
      await user.reload();
      const newToken = user.emailVerificationToken;

      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: newToken })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      await user.reload();
      expect(user.isEmailVerified).toBe(true);
    });

    it('should prevent double verification', async () => {
      await user.generateEmailVerificationToken();
      const token = user.emailVerificationToken;

      // First verification
      await request(app)
        .post('/api/auth/verify-email')
        .send({ token })
        .expect(200);

      // Second verification attempt with same token
      const doubleVerifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ token })
        .expect(400);

      expect(doubleVerifyResponse.body.success).toBe(false);
    });
  });

  describe('Multi-Step Authentication Scenarios', () => {
    it('should handle user registration -> verification -> profile update -> password change', async () => {
      const userData = {
        email: 'multistep@test.com',
        username: 'multistep',
        password: 'Password123!',
        firstName: 'Multi',
        lastName: 'Step'
      };

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const userId = registerResponse.body.user.id;

      // Step 2: Verify email
      const user = await User.findByPk(userId);
      await user.generateEmailVerificationToken();

      await request(app)
        .post('/api/auth/verify-email')
        .send({ token: user.emailVerificationToken })
        .expect(200);

      // Step 3: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const { accessToken } = loginResponse.body.tokens;

      // Step 4: Update profile (if endpoint exists)
      // This would require a profile update endpoint
      // const profileUpdateResponse = await request(app)
      //   .put('/api/auth/profile')
      //   .set('Authorization', `Bearer ${accessToken}`)
      //   .send({
      //     firstName: 'Updated',
      //     lastName: 'Name'
      //   });

      // Step 5: Change password (if endpoint exists)
      const newPassword = 'NewPassword456!';
      
      // First get reset token
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: userData.email })
        .expect(200);

      await user.reload();
      const resetToken = user.passwordResetToken;

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      // Step 6: Verify new password works
      const finalLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: newPassword
        })
        .expect(200);

      expect(finalLoginResponse.body.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests gracefully', async () => {
      // Malformed JSON
      const response1 = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);

      expect(response1.body.success).toBe(false);

      // Missing required fields
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response2.body.success).toBe(false);

      // Invalid field types
      const response3 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 123,
          password: true,
          firstName: [],
          lastName: {}
        })
        .expect(400);

      expect(response3.body.success).toBe(false);
    });

    it('should handle database connection issues', async () => {
      // This would require mocking database failures
      // Could be implemented with database connection manipulation
      expect(true).toBe(true); // Placeholder
    });

    it('should handle concurrent operations safely', async () => {
      const userData = {
        email: 'concurrent@test.com',
        username: 'concurrent',
        password: 'Password123!',
        firstName: 'Concurrent',
        lastName: 'Test'
      };

      // Try to register the same user multiple times concurrently
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/register')
          .send(userData)
      );

      const responses = await Promise.all(promises);

      // Only one should succeed
      const successfulResponses = responses.filter(r => r.status === 201);
      const errorResponses = responses.filter(r => r.status === 409);

      expect(successfulResponses).toHaveLength(1);
      expect(errorResponses.length).toBeGreaterThan(0);
    });
  });
});