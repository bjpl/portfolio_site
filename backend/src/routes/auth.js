const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const oauthService = require('../services/oauthService');
const auditService = require('../services/auditService');
const {
  authenticateToken,
  authRateLimit,
  bruteForceProtection,
  deviceFingerprinting
} = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .isAlphanumeric()
    .withMessage('Username must be 3-30 alphanumeric characters')
];

const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const passwordValidation = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', 
  authRateLimit,
  deviceFingerprinting,
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await authService.register(req.body);
      
      await auditService.logEvent(
        'user_register',
        result.user.id,
        {
          email: result.user.email,
          registrationMethod: 'email',
          deviceFingerprint: req.deviceFingerprint
        },
        req
      );
      
      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      logger.error('Registration failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip
      });
      
      res.status(400).json({
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login',
  authRateLimit,
  bruteForceProtection,
  deviceFingerprinting,
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;
      
      const result = await authService.login(email, password, userAgent, ipAddress);
      
      await auditService.logEvent(
        'user_login',
        result.user.id,
        {
          email: result.user.email,
          deviceFingerprint: req.deviceFingerprint,
          loginMethod: 'password'
        },
        req
      );
      
      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken
      });
    } catch (error) {
      await auditService.logEvent(
        'login_failed',
        null,
        {
          email: req.body.email,
          error: error.message,
          deviceFingerprint: req.deviceFingerprint
        },
        req
      );
      
      logger.error('Login failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip
      });
      
      res.status(401).json({
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required'
      });
    }
    
    const result = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      accessToken: result.accessToken
    });
  } catch (error) {
    logger.error('Token refresh failed', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(401).json({
      error: error.message
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    
    await auditService.logEvent(
      'user_logout',
      req.user.id,
      {},
      req
    );
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout failed', {
      error: error.message,
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

/**
 * @route POST /api/auth/logout-all
 * @desc Logout from all devices
 * @access Private
 */
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    await authService.logoutAll(req.user.id);
    
    await auditService.logEvent(
      'user_logout_all',
      req.user.id,
      {},
      req
    );
    
    res.clearCookie('refreshToken');
    
    res.json({
      message: 'Logged out from all devices'
    });
  } catch (error) {
    logger.error('Logout all failed', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    ...passwordValidation
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      
      await auditService.logEvent(
        'password_changed',
        req.user.id,
        {},
        req
      );
      
      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Password change failed', {
        error: error.message,
        userId: req.user.id,
        ip: req.ip
      });
      
      res.status(400).json({
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password',
  authRateLimit,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.body;
      
      const result = await authService.requestPasswordReset(email);
      
      await auditService.logEvent(
        'password_reset_requested',
        null,
        { email },
        req
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Password reset request failed'
      });
    }
  }
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password',
  authRateLimit,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    ...passwordValidation
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      const result = await authService.resetPassword(token, newPassword);
      
      await auditService.logEvent(
        'password_reset_completed',
        null,
        { token: token.substring(0, 8) + '...' },
        req
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        ip: req.ip
      });
      
      res.status(400).json({
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/auth/verify-email
 * @desc Verify email address
 * @access Public
 */
router.post('/verify-email',
  [
    body('token').notEmpty().withMessage('Verification token is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token } = req.body;
      
      const result = await authService.verifyEmail(token);
      
      await auditService.logEvent(
        'email_verified',
        null,
        { token: token.substring(0, 8) + '...' },
        req
      );
      
      res.json(result);
    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        ip: req.ip
      });
      
      res.status(400).json({
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    
    res.json({
      user: user.toSafeObject()
    });
  } catch (error) {
    logger.error('Get current user failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to get user information'
    });
  }
});

/**
 * @route GET /api/auth/sessions
 * @desc Get active sessions
 * @access Private
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await authService.getActiveSessions(req.user.id);
    
    res.json({
      sessions
    });
  } catch (error) {
    logger.error('Get sessions failed', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to get sessions'
    });
  }
});

/**
 * @route DELETE /api/auth/sessions/:sessionId
 * @desc Revoke a specific session
 * @access Private
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await authService.revokeSession(req.user.id, sessionId);
    
    await auditService.logEvent(
      'session_revoked',
      req.user.id,
      { sessionId },
      req
    );
    
    res.json({
      message: 'Session revoked successfully'
    });
  } catch (error) {
    logger.error('Session revocation failed', {
      error: error.message,
      userId: req.user.id,
      sessionId: req.params.sessionId
    });
    
    res.status(400).json({
      error: error.message
    });
  }
});

// OAuth Routes

/**
 * @route GET /api/auth/oauth/:provider
 * @desc Get OAuth authorization URL
 * @access Public
 */
router.get('/oauth/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;
    
    const { authUrl, state } = oauthService.generateAuthUrl(provider, redirectUri);
    
    // Store state in session for CSRF protection
    req.session.oauthState = state;
    
    res.json({
      authUrl,
      state
    });
  } catch (error) {
    logger.error('OAuth URL generation failed', {
      error: error.message,
      provider: req.params.provider
    });
    
    res.status(400).json({
      error: error.message
    });
  }
});

/**
 * @route GET /api/auth/oauth/:provider/callback
 * @desc Handle OAuth callback
 * @access Public
 */
router.get('/oauth/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;
    
    // Verify state for CSRF protection
    if (state !== req.session.oauthState) {
      throw new Error('Invalid state parameter');
    }
    
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;
    
    const result = await oauthService.handleOAuthCallback(provider, code, redirectUri, state);
    
    await auditService.logEvent(
      result.isNewUser ? 'oauth_register' : 'oauth_login',
      result.user.id,
      {
        provider,
        email: result.user.email,
        isNewUser: result.isNewUser
      },
      req
    );
    
    // Set refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    // Redirect to frontend with access token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}&provider=${provider}`);
  } catch (error) {
    logger.error('OAuth callback failed', {
      error: error.message,
      provider: req.params.provider,
      ip: req.ip
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;
