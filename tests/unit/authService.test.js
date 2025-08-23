const authService = require('../../../src/services/authService');
const { User, Session } = require('../../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../../../src/services/emailService');

jest.mock('../../../src/services/emailService');

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123!',
      };

      const result = await authService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe(userData.username);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.password).toBeUndefined(); // Password should not be returned
      expect(result.verificationToken).toBeDefined();

      // Verify password was hashed
      const user = await User.findByPk(result.user.id);
      const isPasswordValid = await bcrypt.compare(userData.password, user.password);
      expect(isPasswordValid).toBe(true);

      // Verify email was sent
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: userData.email }),
        result.verificationToken
      );
    });

    it('should reject duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'unique@example.com',
        password: 'SecurePass123!',
      };

      // Create first user
      await authService.register(userData);

      // Try to create duplicate
      await expect(
        authService.register({
          ...userData,
          email: 'different@example.com',
        })
      ).rejects.toThrow('Username already exists');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        username: 'uniqueuser',
        email: 'existing@example.com',
        password: 'SecurePass123!',
      };

      // Create first user
      await authService.register(userData);

      // Try to create duplicate
      await expect(
        authService.register({
          ...userData,
          username: 'differentuser',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should validate password strength', async () => {
      const weakPasswords = ['short', 'nouppercase123', 'NOLOWERCASE123', 'NoNumbers!', 'NoSpecialChars123'];

      for (const password of weakPasswords) {
        await expect(
          authService.register({
            username: 'testuser',
            email: 'test@example.com',
            password,
          })
        ).rejects.toThrow(/password/i);
      }
    });
  });

  describe('login', () => {
    let testUser;
    const testPassword = 'TestPass123!';

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        password: await bcrypt.hash(testPassword, 10),
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login(testUser.email, testPassword, 'TestAgent/1.0', '127.0.0.1');

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(testUser.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify JWT token
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(testUser.id);
      expect(decoded.role).toBe(testUser.role);

      // Verify session was created
      const session = await Session.findOne({
        where: { userId: testUser.id },
      });
      expect(session).toBeDefined();
      expect(session.userAgent).toBe('TestAgent/1.0');
      expect(session.ipAddress).toBe('127.0.0.1');
    });

    it('should login with username instead of email', async () => {
      const result = await authService.login(testUser.username, testPassword, 'TestAgent/1.0', '127.0.0.1');

      expect(result.user.id).toBe(testUser.id);
    });

    it('should reject invalid password', async () => {
      await expect(authService.login(testUser.email, 'WrongPassword', 'TestAgent', '127.0.0.1')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should reject non-existent user', async () => {
      await expect(
        authService.login('nonexistent@example.com', testPassword, 'TestAgent', '127.0.0.1')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      testUser.isActive = false;
      await testUser.save();

      await expect(authService.login(testUser.email, testPassword, 'TestAgent', '127.0.0.1')).rejects.toThrow(
        'Account is disabled'
      );
    });

    it('should reject unverified email', async () => {
      testUser.emailVerified = false;
      await testUser.save();

      await expect(authService.login(testUser.email, testPassword, 'TestAgent', '127.0.0.1')).rejects.toThrow(
        'Please verify your email'
      );
    });
  });

  describe('logout', () => {
    it('should invalidate session token', async () => {
      const user = await global.testUtils.createTestUser();
      const loginResult = await authService.login(user.email, 'Test123!@#', 'TestAgent', '127.0.0.1');

      await authService.logout(loginResult.accessToken);

      // Verify session was deleted
      const session = await Session.findOne({
        where: { token: loginResult.accessToken },
      });
      expect(session).toBeNull();
    });

    it('should handle non-existent token gracefully', async () => {
      await expect(authService.logout('non-existent-token')).resolves.not.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const user = await global.testUtils.createTestUser();
      const loginResult = await authService.login(user.email, 'Test123!@#', 'TestAgent', '127.0.0.1');

      // Wait a bit to ensure new token is different
      await global.testUtils.waitFor(1000);

      const result = await authService.refreshAccessToken(loginResult.refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).not.toBe(loginResult.accessToken);

      // Verify new token is valid
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user.id);
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshAccessToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      const user = await global.testUtils.createTestUser();
      const loginResult = await authService.login(user.email, 'Test123!@#', 'TestAgent', '127.0.0.1');

      // Manually expire the refresh token
      const session = await Session.findOne({
        where: { refreshToken: loginResult.refreshToken },
      });
      session.refreshExpiresAt = new Date(Date.now() - 1000);
      await session.save();

      await expect(authService.refreshAccessToken(loginResult.refreshToken)).rejects.toThrow('Refresh token expired');
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token and send email', async () => {
      const user = await global.testUtils.createTestUser();

      await authService.forgotPassword(user.email);

      // Verify reset token was saved
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser.resetToken).toBeDefined();
      expect(updatedUser.resetTokenExpires).toBeDefined();
      expect(updatedUser.resetTokenExpires.getTime()).toBeGreaterThan(Date.now());

      // Verify email was sent
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: user.email }),
        expect.any(String)
      );
    });

    it('should not reveal if email exists', async () => {
      // Should not throw for non-existent email
      await expect(authService.forgotPassword('nonexistent@example.com')).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const user = await global.testUtils.createTestUser();
      await authService.forgotPassword(user.email);

      const updatedUser = await User.findByPk(user.id);
      const resetToken = updatedUser.resetToken;
      const newPassword = 'NewSecurePass123!';

      await authService.resetPassword(resetToken, newPassword);

      // Verify password was changed
      const finalUser = await User.findByPk(user.id);
      const isPasswordValid = await bcrypt.compare(newPassword, finalUser.password);
      expect(isPasswordValid).toBe(true);

      // Verify reset token was cleared
      expect(finalUser.resetToken).toBeNull();
      expect(finalUser.resetTokenExpires).toBeNull();
    });

    it('should reject invalid reset token', async () => {
      await expect(authService.resetPassword('invalid-token', 'NewPass123!')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should reject expired reset token', async () => {
      const user = await global.testUtils.createTestUser();

      // Set expired reset token
      user.resetToken = 'expired-token';
      user.resetTokenExpires = new Date(Date.now() - 1000);
      await user.save();

      await expect(authService.resetPassword('expired-token', 'NewPass123!')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const userData = {
        username: 'unverified',
        email: 'unverified@example.com',
        password: 'Test123!@#',
      };

      const { user, verificationToken } = await authService.register(userData);

      await authService.verifyEmail(verificationToken);

      // Verify email was marked as verified
      const verifiedUser = await User.findByPk(user.id);
      expect(verifiedUser.emailVerified).toBe(true);
      expect(verifiedUser.verificationToken).toBeNull();
    });

    it('should reject invalid verification token', async () => {
      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow('Invalid verification token');
    });
  });

  describe('changePassword', () => {
    it('should change password with correct old password', async () => {
      const user = await global.testUtils.createTestUser();
      const oldPassword = 'Test123!@#';
      const newPassword = 'NewSecurePass456!';

      await authService.changePassword(user.id, oldPassword, newPassword);

      // Verify password was changed
      const updatedUser = await User.findByPk(user.id);
      const isPasswordValid = await bcrypt.compare(newPassword, updatedUser.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should reject incorrect old password', async () => {
      const user = await global.testUtils.createTestUser();

      await expect(authService.changePassword(user.id, 'WrongOldPass', 'NewPass123!')).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    it('should invalidate all sessions after password change', async () => {
      const user = await global.testUtils.createTestUser();

      // Create multiple sessions
      await authService.login(user.email, 'Test123!@#', 'Agent1', '1.1.1.1');
      await authService.login(user.email, 'Test123!@#', 'Agent2', '2.2.2.2');

      await authService.changePassword(user.id, 'Test123!@#', 'NewPass456!');

      // Verify all sessions were deleted
      const sessions = await Session.findAll({ where: { userId: user.id } });
      expect(sessions).toHaveLength(0);
    });
  });
});
