const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { User } = require('../models/User');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const {
  authenticateToken,
  requireAdmin,
  requireRole
} = require('../middleware/auth');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);

/**
 * @route GET /api/admin/users
 * @desc Get all users with filtering and pagination
 * @access Admin
 */
router.get('/users', requireAdmin(), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    const offset = (page - 1) * limit;

    // Search filter
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Role filter
    if (role) {
      where.role = role;
    }

    // Status filter
    if (status === 'active') {
      where.isActive = true;
      where.lockoutUntil = { [Op.or]: [null, { [Op.lt]: new Date() }] };
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'locked') {
      where.lockoutUntil = { [Op.gt]: new Date() };
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      attributes: { exclude: ['password'] }
    });

    await auditService.logEvent(
      'admin_action',
      req.user.id,
      {
        action: 'list_users',
        filters: { search, role, status },
        resultCount: users.length
      },
      req
    );

    res.json({
      users: users.map(user => user.toSafeObject()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to get users', {
      error: error.message,
      adminId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to retrieve users'
    });
  }
});

/**
 * @route GET /api/admin/users/stats
 * @desc Get user statistics
 * @access Admin
 */
router.get('/users/stats', requireAdmin(), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, active, admins, newToday] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { role: 'admin' } }),
      User.count({ where: { createdAt: { [Op.gte]: today } } })
    ]);

    res.json({
      total,
      active,
      admins,
      newToday
    });
  } catch (error) {
    logger.error('Failed to get user stats', {
      error: error.message,
      adminId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to retrieve user statistics'
    });
  }
});

/**
 * @route GET /api/admin/users/:id
 * @desc Get specific user
 * @access Admin
 */
router.get('/users/:id',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid user ID required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const user = await User.findByPk(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'view_user',
          targetUserId: user.id,
          targetUserEmail: user.email
        },
        req
      );

      res.json(user.toSafeObject());
    } catch (error) {
      logger.error('Failed to get user', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to retrieve user'
      });
    }
  }
);

/**
 * @route POST /api/admin/users
 * @desc Create new user
 * @access Admin
 */
router.post('/users',
  requireAdmin(),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('role').isIn(['viewer', 'author', 'editor', 'admin']).withMessage('Valid role required'),
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('username').optional().trim().isLength({ min: 3, max: 30 }).isAlphanumeric(),
    body('password').optional().isLength({ min: 8 }),
    body('permissions').optional().isArray(),
    body('isActive').optional().isBoolean(),
    body('isEmailVerified').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        email,
        firstName,
        lastName,
        username,
        password,
        role = 'viewer',
        permissions = [],
        isActive = true,
        isEmailVerified = false
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email already exists'
        });
      }

      // Create user
      const userData = {
        email,
        firstName,
        lastName,
        username: username || email.split('@')[0],
        role,
        permissions,
        isActive,
        isEmailVerified,
        registrationMethod: 'admin_created'
      };

      if (password) {
        userData.password = password;
      }

      const user = await User.create(userData);

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'create_user',
          targetUserId: user.id,
          targetUserEmail: user.email,
          targetUserRole: user.role
        },
        req
      );

      res.status(201).json({
        message: 'User created successfully',
        user: user.toSafeObject()
      });
    } catch (error) {
      logger.error('Failed to create user', {
        error: error.message,
        adminId: req.user.id,
        email: req.body.email
      });
      
      res.status(500).json({
        error: 'Failed to create user'
      });
    }
  }
);

/**
 * @route PUT /api/admin/users/:id
 * @desc Update user
 * @access Admin
 */
router.put('/users/:id',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid user ID required'),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['viewer', 'author', 'editor', 'admin']),
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('username').optional().trim().isLength({ min: 3, max: 30 }).isAlphanumeric(),
    body('permissions').optional().isArray(),
    body('isActive').optional().isBoolean(),
    body('isEmailVerified').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const user = await User.findByPk(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Prevent self-modification of critical fields
      if (user.id === req.user.id) {
        if (req.body.role && req.body.role !== user.role) {
          return res.status(400).json({
            error: 'Cannot change your own role'
          });
        }
        if (req.body.isActive === false) {
          return res.status(400).json({
            error: 'Cannot deactivate your own account'
          });
        }
      }

      const allowedUpdates = [
        'email', 'firstName', 'lastName', 'username',
        'role', 'permissions', 'isActive', 'isEmailVerified'
      ];
      
      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      const oldData = {
        email: user.email,
        role: user.role,
        isActive: user.isActive
      };

      await user.update(updates);

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'update_user',
          targetUserId: user.id,
          targetUserEmail: user.email,
          changes: updates,
          oldData
        },
        req
      );

      res.json({
        message: 'User updated successfully',
        user: user.toSafeObject()
      });
    } catch (error) {
      logger.error('Failed to update user', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to update user'
      });
    }
  }
);

/**
 * @route POST /api/admin/users/:id/deactivate
 * @desc Deactivate user
 * @access Admin
 */
router.post('/users/:id/deactivate',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid user ID required')
  ],
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({
          error: 'Cannot deactivate your own account'
        });
      }

      await user.update({ isActive: false });
      await authService.logoutAll(user.id);

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'deactivate_user',
          targetUserId: user.id,
          targetUserEmail: user.email
        },
        req
      );

      res.json({
        message: 'User deactivated successfully'
      });
    } catch (error) {
      logger.error('Failed to deactivate user', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to deactivate user'
      });
    }
  }
);

/**
 * @route POST /api/admin/users/:id/activate
 * @desc Activate user
 * @access Admin
 */
router.post('/users/:id/activate',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid user ID required')
  ],
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      await user.update({
        isActive: true,
        loginAttempts: 0,
        lockoutUntil: null
      });

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'activate_user',
          targetUserId: user.id,
          targetUserEmail: user.email
        },
        req
      );

      res.json({
        message: 'User activated successfully'
      });
    } catch (error) {
      logger.error('Failed to activate user', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to activate user'
      });
    }
  }
);

/**
 * @route POST /api/admin/users/:id/unlock
 * @desc Unlock user account
 * @access Admin
 */
router.post('/users/:id/unlock',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid user ID required')
  ],
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      await user.update({
        loginAttempts: 0,
        lockoutUntil: null
      });

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'unlock_user',
          targetUserId: user.id,
          targetUserEmail: user.email
        },
        req
      );

      res.json({
        message: 'User unlocked successfully'
      });
    } catch (error) {
      logger.error('Failed to unlock user', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to unlock user'
      });
    }
  }
);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Delete user (soft delete)
 * @access Admin
 */
router.delete('/users/:id',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid user ID required')
  ],
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({
          error: 'Cannot delete your own account'
        });
      }

      await user.destroy(); // Soft delete
      await authService.logoutAll(user.id);

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'delete_user',
          targetUserId: user.id,
          targetUserEmail: user.email
        },
        req
      );

      res.json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete user', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to delete user'
      });
    }
  }
);

/**
 * @route GET /api/admin/users/:id/sessions
 * @desc Get user's active sessions
 * @access Admin
 */
router.get('/users/:id/sessions',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid user ID required')
  ],
  async (req, res) => {
    try {
      const sessions = await authService.getActiveSessions(req.params.id);

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'view_user_sessions',
          targetUserId: req.params.id,
          sessionCount: sessions.length
        },
        req
      );

      res.json(sessions);
    } catch (error) {
      logger.error('Failed to get user sessions', {
        error: error.message,
        userId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to retrieve user sessions'
      });
    }
  }
);

/**
 * @route DELETE /api/admin/users/:userId/sessions/:sessionId
 * @desc Revoke user session
 * @access Admin
 */
router.delete('/users/:userId/sessions/:sessionId',
  requireAdmin(),
  [
    param('userId').isUUID().withMessage('Valid user ID required'),
    param('sessionId').isUUID().withMessage('Valid session ID required')
  ],
  async (req, res) => {
    try {
      await authService.revokeSession(req.params.userId, req.params.sessionId);

      await auditService.logEvent(
        'admin_action',
        req.user.id,
        {
          action: 'revoke_user_session',
          targetUserId: req.params.userId,
          sessionId: req.params.sessionId
        },
        req
      );

      res.json({
        message: 'Session revoked successfully'
      });
    } catch (error) {
      logger.error('Failed to revoke session', {
        error: error.message,
        userId: req.params.userId,
        sessionId: req.params.sessionId,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to revoke session'
      });
    }
  }
);

// Audit Log Routes

/**
 * @route GET /api/admin/audit-logs
 * @desc Get audit logs with filtering
 * @access Admin
 */
router.get('/audit-logs', requireAdmin(), async (req, res) => {
  try {
    const filters = {
      eventType: req.query.eventType,
      userId: req.query.userId,
      ipAddress: req.query.ipAddress,
      riskLevel: req.query.riskLevel,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sortBy || 'timestamp',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await auditService.getAuditLogs(filters, pagination);

    res.json(result);
  } catch (error) {
    logger.error('Failed to get audit logs', {
      error: error.message,
      adminId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to retrieve audit logs'
    });
  }
});

/**
 * @route GET /api/admin/audit-logs/stats
 * @desc Get audit log statistics
 * @access Admin
 */
router.get('/audit-logs/stats', requireAdmin(), async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h';
    const stats = await auditService.getAuditStats(timeframe);

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get audit stats', {
      error: error.message,
      adminId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to retrieve audit statistics'
    });
  }
});

/**
 * @route GET /api/admin/audit-logs/:id
 * @desc Get specific audit log
 * @access Admin
 */
router.get('/audit-logs/:id',
  requireAdmin(),
  [
    param('id').isUUID().withMessage('Valid audit log ID required')
  ],
  async (req, res) => {
    try {
      const { AuditLog } = require('../models/AuditLog');
      
      const auditLog = await AuditLog.findByPk(req.params.id, {
        include: ['user']
      });
      
      if (!auditLog) {
        return res.status(404).json({
          error: 'Audit log not found'
        });
      }

      res.json(auditLog);
    } catch (error) {
      logger.error('Failed to get audit log', {
        error: error.message,
        auditLogId: req.params.id,
        adminId: req.user.id
      });
      
      res.status(500).json({
        error: 'Failed to retrieve audit log'
      });
    }
  }
);

/**
 * @route GET /api/admin/audit-logs/export
 * @desc Export audit logs
 * @access Admin
 */
router.get('/audit-logs/export', requireAdmin(), async (req, res) => {
  try {
    const filters = {
      eventType: req.query.eventType,
      userId: req.query.userId,
      ipAddress: req.query.ipAddress,
      riskLevel: req.query.riskLevel,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search
    };

    const format = req.query.format || 'json';
    const result = await auditService.exportAuditLogs(filters, format);

    await auditService.logEvent(
      'admin_action',
      req.user.id,
      {
        action: 'export_audit_logs',
        format,
        filters
      },
      req
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    logger.error('Failed to export audit logs', {
      error: error.message,
      adminId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to export audit logs'
    });
  }
});

/**
 * @route GET /api/admin/security-alerts
 * @desc Get security alerts
 * @access Admin
 */
router.get('/security-alerts', requireAdmin(), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await auditService.getSecurityAlerts(limit);

    res.json({
      alerts,
      count: alerts.length
    });
  } catch (error) {
    logger.error('Failed to get security alerts', {
      error: error.message,
      adminId: req.user.id
    });
    
    res.status(500).json({
      error: 'Failed to retrieve security alerts'
    });
  }
});

module.exports = router;
