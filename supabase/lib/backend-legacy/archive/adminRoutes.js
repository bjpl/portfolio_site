const express = require('express');
const AdminController = require('../controllers/AdminController');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// Dashboard
router.get('/dashboard', AdminController.getDashboardStats);
router.get('/analytics', AdminController.getAnalytics);
router.get('/health', AdminController.getSystemHealth);

// Content moderation
router.get('/pending', AdminController.getPendingContent);
router.put('/comments/:id/moderate', AdminController.moderateComment);
router.put('/comments/bulk-moderate', AdminController.bulkModerateComments);

// User management
router.get('/users', AdminController.getAllUsers);
router.put('/users/:id/status', AdminController.updateUserStatus);

// Activity logs
router.get('/logs', AdminController.getActivityLogs);

module.exports = router;