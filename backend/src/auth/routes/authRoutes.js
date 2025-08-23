const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const ApiKeyController = require('../controllers/ApiKeyController');
const AuthMiddleware = require('../middleware/AuthMiddleware');
const RateLimitMiddleware = require('../middleware/RateLimitMiddleware');
const SessionMiddleware = require('../middleware/SessionMiddleware');

// Rate limiting middleware
router.use(RateLimitMiddleware.general());

// Block check for suspicious IPs
router.use(RateLimitMiddleware.blockCheck());

// Authentication routes
router.post('/register', 
  RateLimitMiddleware.register(),
  AuthController.register
);

router.post('/login', 
  RateLimitMiddleware.auth(),
  AuthController.login
);

router.post('/refresh', 
  RateLimitMiddleware.auth(),
  AuthController.refreshToken
);

router.post('/logout', 
  AuthMiddleware.authenticate({ required: false }),
  AuthController.logout
);

router.post('/logout-all', 
  AuthMiddleware.authenticate(),
  AuthController.logoutAll
);

// Email verification
router.post('/verify-email', 
  RateLimitMiddleware.auth(),
  AuthController.verifyEmail
);

router.post('/resend-verification', 
  RateLimitMiddleware.passwordReset(),
  AuthController.resendVerification
);

// Password reset
router.post('/request-reset', 
  RateLimitMiddleware.passwordReset(),
  AuthController.requestPasswordReset
);

router.post('/reset-password', 
  RateLimitMiddleware.auth(),
  AuthController.resetPassword
);

router.post('/change-password', 
  AuthMiddleware.authenticate(),
  AuthController.changePassword
);

// Profile routes
router.get('/profile', 
  AuthMiddleware.authenticate(),
  AuthController.getProfile
);

router.get('/sessions', 
  AuthMiddleware.authenticate(),
  AuthController.getSessions
);

// OAuth routes
router.get('/oauth/:provider/url', 
  RateLimitMiddleware.auth(),
  AuthController.getOAuthUrl
);

router.post('/oauth/:provider/callback', 
  RateLimitMiddleware.auth(),
  AuthController.handleOAuthCallback
);

// API Key routes
router.post('/api-keys', 
  AuthMiddleware.authenticate(),
  ApiKeyController.validatePermissions,
  ApiKeyController.validateIPs,
  ApiKeyController.validateExpiration,
  ApiKeyController.createApiKey
);

router.get('/api-keys', 
  AuthMiddleware.authenticate(),
  ApiKeyController.listApiKeys
);

router.get('/api-keys/:keyId', 
  AuthMiddleware.authenticate(),
  ApiKeyController.getApiKey
);

router.patch('/api-keys/:keyId', 
  AuthMiddleware.authenticate(),
  ApiKeyController.validatePermissions,
  ApiKeyController.validateIPs,
  ApiKeyController.validateExpiration,
  ApiKeyController.updateApiKey
);

router.delete('/api-keys/:keyId', 
  AuthMiddleware.authenticate(),
  ApiKeyController.revokeApiKey
);

router.delete('/api-keys', 
  AuthMiddleware.authenticate(),
  ApiKeyController.revokeAllApiKeys
);

router.post('/api-keys/:keyId/rotate', 
  AuthMiddleware.authenticate(),
  ApiKeyController.rotateApiKey
);

router.get('/api-keys/:keyId/usage', 
  AuthMiddleware.authenticate(),
  ApiKeyController.getUsageStats
);

router.get('/api-keys-report', 
  AuthMiddleware.authenticate(),
  ApiKeyController.generateUsageReport
);

// Admin routes
router.get('/admin/api-keys/stats', 
  AuthMiddleware.adminOnly(),
  ApiKeyController.getSystemStats
);

router.post('/admin/api-keys/clean-expired', 
  AuthMiddleware.adminOnly(),
  ApiKeyController.cleanExpiredKeys
);

router.post('/admin/api-keys/reset-counters', 
  AuthMiddleware.adminOnly(),
  ApiKeyController.resetUsageCounters
);

// CSRF token endpoint
router.get('/csrf-token', (req, res) => {
  const csrfToken = SessionMiddleware.generateCSRFToken(req);
  res.json({ csrfToken });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'authentication',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Rate limit status (development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/rate-limit-status', 
    RateLimitMiddleware.getStatus(),
    (req, res) => {
      res.json({
        rateLimitStatus: req.rateLimitStatus || 'no data'
      });
    }
  );
}

module.exports = router;