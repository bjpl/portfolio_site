const bcrypt = require('bcryptjs');
const { User } = require('../../models/User');
const TokenService = require('../services/TokenService');
const EmailService = require('../services/EmailService');
const PasswordService = require('../services/PasswordService');
const OAuthService = require('../services/OAuthService');
const AuthAttempt = require('../models/AuthAttempt');

class AuthController {
  /**
   * User registration
   */
  async register(req, res) {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Username, email, and password are required'
        });
      }

      // Validate password strength
      const passwordValidation = PasswordService.validatePassword(password, {
        username,
        email,
        firstName,
        lastName
      });

      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'Password validation failed',
          message: 'Password does not meet security requirements',
          requirements: passwordValidation.requirements,
          feedback: passwordValidation.feedback
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [User.sequelize.Sequelize.Op.or]: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        await AuthAttempt.recordAttempt({
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          type: 'register',
          success: false,
          failureReason: existingUser.email === email.toLowerCase() ? 
            'email_already_exists' : 'username_already_exists'
        });

        return res.status(409).json({
          error: 'User already exists',
          message: existingUser.email === email.toLowerCase() ? 
            'Email already registered' : 'Username already taken'
        });
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(password);

      // Create user
      const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: 'viewer'
      });

      // Generate email verification token
      const verificationToken = TokenService.generateEmailVerificationToken(user.id, user.email);

      // Send verification email
      await EmailService.sendEmailVerification(user, verificationToken);

      // Generate auth tokens
      const accessToken = TokenService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      });

      const refreshToken = await TokenService.generateRefreshToken(user.id, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        registrationFlow: true
      });

      // Record successful registration
      await AuthAttempt.recordAttempt({
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'register',
        success: true
      });

      // Send welcome email
      await EmailService.sendWelcomeEmail(user);

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        tokens: {
          accessToken,
          refreshToken: refreshToken.token,
          expiresAt: refreshToken.expiresAt
        },
        emailVerificationSent: true
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      await AuthAttempt.recordAttempt({
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'register',
        success: false,
        failureReason: 'server_error',
        metadata: { error: error.message }
      });

      res.status(500).json({
        error: 'Registration failed',
        message: 'Internal server error'
      });
    }
  }

  /**
   * User login
   */
  async login(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
      }

      // Find user by email or username
      const user = await User.findOne({
        where: {
          [User.sequelize.Sequelize.Op.or]: [
            { email: email.toLowerCase() },
            { username: email.toLowerCase() }
          ]
        }
      });

      if (!user) {
        await AuthAttempt.recordAttempt({
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          type: 'login',
          success: false,
          failureReason: 'user_not_found'
        });

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        await AuthAttempt.recordAttempt({
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          type: 'login',
          success: false,
          failureReason: 'account_deactivated'
        });

        return res.status(401).json({
          error: 'Account deactivated',
          message: 'Your account has been deactivated'
        });
      }

      // Check lockout
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        await AuthAttempt.recordAttempt({
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          type: 'login',
          success: false,
          failureReason: 'account_locked'
        });

        return res.status(423).json({
          error: 'Account locked',
          message: 'Account is temporarily locked due to too many failed attempts',
          lockoutUntil: user.lockoutUntil
        });
      }

      // Verify password
      const isValidPassword = await PasswordService.timeSafeVerify(password, user.password);

      if (!isValidPassword) {
        // Increment login attempts
        await user.increment('loginAttempts');

        // Lock account after 5 failed attempts
        if (user.loginAttempts >= 4) {
          const lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await user.update({ lockoutUntil });
          
          // Send lockout notification
          await EmailService.sendAccountLockout(user, 30);
        }

        await AuthAttempt.recordAttempt({
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          type: 'login',
          success: false,
          failureReason: 'invalid_password'
        });

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if password needs rehashing
      if (PasswordService.needsRehash(user.password)) {
        const newHash = await PasswordService.hashPassword(password);
        await user.update({ password: newHash });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.update({
          loginAttempts: 0,
          lockoutUntil: null,
          lastLogin: new Date()
        });
      }

      // Generate tokens
      const accessToken = TokenService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      });

      const refreshTokenData = await TokenService.generateRefreshToken(user.id, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        rememberMe
      });

      // Record successful login
      await AuthAttempt.recordAttempt({
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'login',
        success: true
      });

      // Send login notification if requested
      if (process.env.SEND_LOGIN_NOTIFICATIONS === 'true') {
        await EmailService.sendLoginNotification(user, {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      // Set refresh token as httpOnly cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
      };

      res.cookie('refreshToken', refreshTokenData.token, cookieOptions);

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        accessToken,
        expiresAt: refreshTokenData.expiresAt
      });

    } catch (error) {
      console.error('Login error:', error);

      await AuthAttempt.recordAttempt({
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        type: 'login',
        success: false,
        failureReason: 'server_error',
        metadata: { error: error.message }
      });

      res.status(500).json({
        error: 'Login failed',
        message: 'Internal server error'
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required',
          message: 'No refresh token provided'
        });
      }

      const result = await TokenService.refreshAccessToken(refreshToken, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      // Set new refresh token as cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      };

      res.cookie('refreshToken', result.refreshToken, cookieOptions);

      res.json({
        message: 'Token refreshed successfully',
        accessToken: result.accessToken,
        user: result.user,
        expiresAt: result.expiresAt
      });

    } catch (error) {
      console.error('Token refresh error:', error);

      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');

      res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }
  }

  /**
   * User logout
   */
  async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        await TokenService.revokeRefreshToken(refreshToken, 'user_logout');
      }

      // Destroy session if using sessions
      if (req.session) {
        req.session.destroy();
      }

      // Clear cookies
      res.clearCookie('refreshToken');
      res.clearCookie('portfolio.sid');

      res.json({
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      
      // Still clear cookies even on error
      res.clearCookie('refreshToken');
      res.clearCookie('portfolio.sid');

      res.status(500).json({
        error: 'Logout failed',
        message: error.message
      });
    }
  }

  /**
   * Logout all sessions
   */
  async logoutAll(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      await TokenService.revokeAllUserTokens(req.user.id, 'user_logout_all');

      // Clear cookies
      res.clearCookie('refreshToken');
      res.clearCookie('portfolio.sid');

      res.json({
        message: 'All sessions terminated successfully'
      });

    } catch (error) {
      console.error('Logout all error:', error);
      
      res.status(500).json({
        error: 'Failed to logout all sessions',
        message: error.message
      });
    }
  }

  /**
   * Email verification
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Token required',
          message: 'Verification token is required'
        });
      }

      const payload = TokenService.verifyEmailVerificationToken(token);
      
      const user = await User.findByPk(payload.userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          error: 'Email already verified'
        });
      }

      await user.update({
        isEmailVerified: true,
        emailVerificationToken: null
      });

      res.json({
        message: 'Email verified successfully',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Email verification error:', error);
      
      res.status(400).json({
        error: 'Email verification failed',
        message: error.message
      });
    }
  }

  /**
   * Resend email verification
   */
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email required'
        });
      }

      const user = await User.findByEmail(email);
      
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          message: 'If the email exists, a verification link has been sent'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          error: 'Email already verified'
        });
      }

      const verificationToken = TokenService.generateEmailVerificationToken(user.id, user.email);
      await EmailService.sendEmailVerification(user, verificationToken);

      res.json({
        message: 'Verification email sent'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      
      res.status(500).json({
        error: 'Failed to resend verification',
        message: error.message
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email required'
        });
      }

      const user = await User.findByEmail(email);

      if (!user) {
        // Don't reveal if email exists
        return res.json({
          message: 'If the email exists, a reset link has been sent'
        });
      }

      const resetToken = TokenService.generatePasswordResetToken(user.id, user.email);
      await EmailService.sendPasswordReset(user, resetToken);

      res.json({
        message: 'Password reset link sent'
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      
      res.status(500).json({
        error: 'Failed to send password reset',
        message: error.message
      });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          error: 'Token and password required'
        });
      }

      const payload = TokenService.verifyPasswordResetToken(token);
      
      const user = await User.findByPk(payload.userId);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Validate new password
      const passwordValidation = PasswordService.validatePassword(password, {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });

      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'Password validation failed',
          message: 'Password does not meet security requirements',
          requirements: passwordValidation.requirements,
          feedback: passwordValidation.feedback
        });
      }

      // Hash new password
      const hashedPassword = await PasswordService.hashPassword(password);
      
      await user.update({
        password: hashedPassword,
        loginAttempts: 0,
        lockoutUntil: null
      });

      // Revoke all tokens for security
      await TokenService.revokeAllUserTokens(user.id, 'password_reset');

      // Send security alert
      await EmailService.sendSecurityAlert(user, 'password_changed', {
        timestamp: new Date(),
        ipAddress: req.ip
      });

      res.json({
        message: 'Password reset successful'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      
      res.status(400).json({
        error: 'Password reset failed',
        message: error.message
      });
    }
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Current and new password required'
        });
      }

      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await PasswordService.verifyPassword(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid current password'
        });
      }

      // Validate new password
      const passwordValidation = PasswordService.validatePassword(newPassword, {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });

      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'Password validation failed',
          message: 'Password does not meet security requirements',
          requirements: passwordValidation.requirements,
          feedback: passwordValidation.feedback
        });
      }

      // Hash new password
      const hashedPassword = await PasswordService.hashPassword(newPassword);
      
      await user.update({ password: hashedPassword });

      // Send security alert
      await EmailService.sendSecurityAlert(user, 'password_changed', {
        timestamp: new Date(),
        ipAddress: req.ip
      });

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      
      res.status(500).json({
        error: 'Failed to change password',
        message: error.message
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.json({
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(500).json({
        error: 'Failed to get profile',
        message: error.message
      });
    }
  }

  /**
   * Get user sessions
   */
  async getSessions(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const sessions = await TokenService.getUserTokens(req.user.id);

      res.json({
        sessions
      });

    } catch (error) {
      console.error('Get sessions error:', error);
      
      res.status(500).json({
        error: 'Failed to get sessions',
        message: error.message
      });
    }
  }

  /**
   * OAuth authorization URL
   */
  async getOAuthUrl(req, res) {
    try {
      const { provider } = req.params;
      const { redirectUri } = req.query;

      if (!redirectUri) {
        return res.status(400).json({
          error: 'Redirect URI required'
        });
      }

      const { url, state } = OAuthService.getAuthorizationUrl(provider, redirectUri);

      // Store state in session for verification
      if (req.session) {
        req.session.oauthState = state;
      }

      res.json({
        authUrl: url,
        state
      });

    } catch (error) {
      console.error('OAuth URL error:', error);
      
      res.status(400).json({
        error: 'Failed to generate OAuth URL',
        message: error.message
      });
    }
  }

  /**
   * OAuth callback
   */
  async handleOAuthCallback(req, res) {
    try {
      const { provider } = req.params;
      const { code, state, redirectUri } = req.body;

      if (!code) {
        return res.status(400).json({
          error: 'Authorization code required'
        });
      }

      // Verify state if using sessions
      if (req.session && req.session.oauthState && req.session.oauthState !== state) {
        return res.status(400).json({
          error: 'Invalid state parameter'
        });
      }

      const result = await OAuthService.handleOAuthCallback(provider, code, redirectUri, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      res.json({
        message: result.isNewUser ? 'Account created successfully' : 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        isNewUser: result.isNewUser,
        linkedProvider: result.linkedProvider || false
      });

    } catch (error) {
      console.error('OAuth callback error:', error);
      
      res.status(400).json({
        error: 'OAuth authentication failed',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();