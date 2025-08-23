const express = require('express');
const MediaController = require('../controllers/MediaController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for uploads
const uploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per 15 minutes
  message: { error: 'Too many uploads. Please try again later.' }
});

// All media routes require authentication
router.use(authenticateToken);

// Single file upload
router.post('/upload', 
  uploadLimit,
  MediaController.upload.single('file'), 
  MediaController.uploadFile
);

// Multiple file upload
router.post('/upload/multiple', 
  uploadLimit,
  MediaController.upload.array('files', 10), 
  MediaController.uploadMultipleFiles
);

// Media management
router.get('/', MediaController.getAllMedia);
router.get('/stats', MediaController.getMediaStats);
router.get('/:id', MediaController.getMediaById);
router.put('/:id', MediaController.updateMedia);
router.delete('/:id', MediaController.deleteMedia);

// Bulk operations (admin only)
router.delete('/bulk', 
  requireRole('admin'), 
  MediaController.bulkDeleteMedia
);

module.exports = router;