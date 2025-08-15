const express = require('express');
const { body, validationResult } = require('express-validator');

const config = require('../config');
const { authenticate, optionalAuth } = require('../middleware/auth');
const authService = require('../services/authService');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           example: Password123
 *     RegisterRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/AuthRequest'
 *         - type: object
 *           required:
 *             - username
 *           properties:
 *             username:
 *               type: string
 *               minLength: 3
 *               maxLength: 30
 *               example: johndoe
 *             firstName:
 *               type: string
 *               maxLength: 50
 *               example: John
 *             lastName:
 *               type: string
 *               maxLength: 50
 *               example: Doe
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         accessToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         description: Registration disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').isAlphanumeric().isLength({ min: 3, max: 30 }),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  ],
  validate,
  async (req, res) => {
    try {
      // Check if registration is enabled
      if (!config.features.enableRegistration) {
        return res.status(403).json({ error: 'Registration is currently disabled' });
      }

      const result = await authService.register(req.body);

      // Set cookie if configured
      if (config.security.useCookies) {
        res.cookie('token', result.accessToken, {
          httpOnly: true,
          secure: config.server.isProduction,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Login
 * POST /api/auth/login
 */
router.post(
  '/login',
  [body('emailOrUsername').notEmpty().trim(), body('password').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { emailOrUsername, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      const result = await authService.login(emailOrUsername, password, userAgent, ipAddress);

      // Set cookie if configured
      if (config.security.useCookies) {
        res.cookie('token', result.accessToken, {
          httpOnly: true,
          secure: config.server.isProduction,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      res.json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
);

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    await authService.logout(req.token);

    // Clear cookie
    if (config.security.useCookies) {
      res.clearCookie('token');
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Logout all sessions
 * POST /api/auth/logout-all
 */
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    await authService.logoutAll(req.user.id);

    // Clear cookie
    if (config.security.useCookies) {
      res.clearCookie('token');
    }

    res.json({ message: 'All sessions terminated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', [body('refreshToken').notEmpty()], validate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);

    // Update cookie if configured
    if (config.security.useCookies) {
      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: config.server.isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

/**
 * Update profile
 * PUT /api/auth/profile
 */
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('preferences').optional().isObject(),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      res.json({ message: 'Profile updated', user });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Change password
 * POST /api/auth/change-password
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, async (req, res) => {
  try {
    const result = await authService.requestPasswordReset(req.body.email);
    res.json(result);
  } catch (error) {
    // Don't reveal errors for security
    res.json({ message: 'If the email exists, a reset link has been sent' });
  }
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  validate,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Verify email
 * GET /api/auth/verify-email/:token
 */
router.get('/verify-email/:token', async (req, res) => {
  try {
    await authService.verifyEmail(req.params.token);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get active sessions
 * GET /api/auth/sessions
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await authService.getActiveSessions(req.user.id);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Revoke session
 * DELETE /api/auth/sessions/:sessionId
 */
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    await authService.revokeSession(req.user.id, req.params.sessionId);
    res.json({ message: 'Session revoked' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Admin: Update user role
 * PUT /api/auth/admin/users/:userId/role
 */
router.put(
  '/admin/users/:userId/role',
  authenticate,
  [body('role').isIn(['admin', 'editor', 'author', 'viewer'])],
  validate,
  async (req, res) => {
    try {
      const result = await authService.updateUserRole(req.user.id, req.params.userId, req.body.role);
      res.json(result);
    } catch (error) {
      res.status(403).json({ error: error.message });
    }
  }
);

/**
 * Admin: Deactivate user
 * POST /api/auth/admin/users/:userId/deactivate
 */
router.post('/admin/users/:userId/deactivate', authenticate, async (req, res) => {
  try {
    await authService.deactivateUser(req.user.id, req.params.userId);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

/**
 * Admin: Reactivate user
 * POST /api/auth/admin/users/:userId/reactivate
 */
router.post('/admin/users/:userId/reactivate', authenticate, async (req, res) => {
  try {
    await authService.reactivateUser(req.user.id, req.params.userId);
    res.json({ message: 'User reactivated' });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

module.exports = router;
