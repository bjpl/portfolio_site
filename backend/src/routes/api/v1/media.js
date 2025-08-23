/**
 * Media API Routes
 * File upload and media management endpoints
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { body, param, query, validationResult } = require('express-validator');

const { MediaAsset } = require('../../../models');
const { authenticateToken, requireRole, optionalAuth } = require('../../../middleware/auth');
const { logger } = require('../../../utils/logger');

const router = express.Router();

// Configuration
const UPLOAD_DIR = path.join(process.cwd(), '..', 'static', 'uploads');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(err => {
  logger.error('Failed to create upload directory', { error: err.message });
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(UPLOAD_DIR, new Date().getFullYear().toString());
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}_${random}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.mimetype);
  
  if (isImage || isDocument) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Maximum 10 files per request
  }
});

// Validation helpers
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Image processing utility
const processImage = async (filePath, options = {}) => {
  try {
    const {
      width = 1920,
      height = 1080,
      quality = 80,
      format = 'jpeg',
      createThumbnail = true
    } = options;

    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Process main image
    const processedPath = filePath.replace(/\.[^.]+$/, `_processed.${format}`);
    await image
      .resize(width, height, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality })
      .toFile(processedPath);

    const results = {
      original: {
        path: filePath,
        width: metadata.width,
        height: metadata.height,
        size: metadata.size
      },
      processed: {
        path: processedPath,
        width: width,
        height: height
      }
    };

    // Create thumbnail if requested
    if (createThumbnail) {
      const thumbnailPath = filePath.replace(/\.[^.]+$/, `_thumb.${format}`);
      await image
        .resize(300, 200, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);

      results.thumbnail = {
        path: thumbnailPath,
        width: 300,
        height: 200
      };
    }

    return results;
  } catch (error) {
    logger.error('Image processing failed', { error: error.message, filePath });
    throw error;
  }
};

/**
 * @route POST /api/v1/media/upload
 * @desc Upload single or multiple files
 * @access Private (Editor/Admin)
 */
router.post('/upload',
  authenticateToken,
  requireRole(['editor', 'admin']),
  upload.array('files', 10),
  [
    body('category').optional().isIn(['project', 'blog', 'profile', 'general']),
    body('title').optional().trim().isLength({ max: 255 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('altText').optional().trim().isLength({ max: 255 }),
    body('tags').optional().isArray()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          code: 'NO_FILES'
        });
      }

      const {
        category = 'general',
        title,
        description,
        altText,
        tags = []
      } = req.body;

      const uploadedFiles = [];

      for (const file of req.files) {
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
        let processedFiles = null;

        // Process images
        if (isImage) {
          try {
            processedFiles = await processImage(file.path, {
              width: 1920,
              height: 1080,
              quality: 85,
              createThumbnail: true
            });
          } catch (processError) {
            logger.warn('Image processing failed, using original', {
              filename: file.filename,
              error: processError.message
            });
          }
        }

        // Create media asset record
        const mediaAsset = await MediaAsset.create({
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          category,
          title: title || file.originalname,
          description,
          altText: altText || title || file.originalname,
          tags,
          uploadedBy: req.user.id,
          filePath: file.path,
          publicUrl: `/uploads/${new Date().getFullYear()}/${file.filename}`,
          
          // Image-specific fields
          ...(isImage && {
            width: processedFiles?.original.width || null,
            height: processedFiles?.original.height || null,
            thumbnailUrl: processedFiles?.thumbnail ? 
              `/uploads/${new Date().getFullYear()}/${path.basename(processedFiles.thumbnail.path)}` : 
              null,
            processedUrl: processedFiles?.processed ? 
              `/uploads/${new Date().getFullYear()}/${path.basename(processedFiles.processed.path)}` : 
              null
          }),
          
          metadata: {
            ...(processedFiles && { processedFiles }),
            uploader: {
              id: req.user.id,
              email: req.user.email
            },
            uploadTimestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ip: req.ip
          }
        });

        uploadedFiles.push({
          id: mediaAsset.id,
          filename: mediaAsset.filename,
          originalName: mediaAsset.originalName,
          mimeType: mediaAsset.mimeType,
          size: mediaAsset.size,
          category: mediaAsset.category,
          title: mediaAsset.title,
          publicUrl: mediaAsset.publicUrl,
          thumbnailUrl: mediaAsset.thumbnailUrl,
          processedUrl: mediaAsset.processedUrl,
          width: mediaAsset.width,
          height: mediaAsset.height,
          createdAt: mediaAsset.createdAt
        });
      }

      logger.info('Files uploaded successfully', {
        userId: req.user.id,
        fileCount: uploadedFiles.length,
        category,
        filenames: uploadedFiles.map(f => f.filename)
      });

      res.status(201).json({
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        files: uploadedFiles,
        count: uploadedFiles.length
      });

    } catch (error) {
      // Clean up uploaded files on error
      if (req.files) {
        for (const file of req.files) {
          fs.unlink(file.path).catch(unlinkError => {
            logger.warn('Failed to clean up file after error', {
              filename: file.filename,
              error: unlinkError.message
            });
          });
        }
      }

      logger.error('File upload failed', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'File upload failed',
        code: 'UPLOAD_ERROR',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/v1/media
 * @desc Get media assets with filtering and pagination
 * @access Private (Editor/Admin)
 */
router.get('/',
  authenticateToken,
  requireRole(['editor', 'admin']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn(['project', 'blog', 'profile', 'general']),
    query('mimeType').optional().isString(),
    query('search').optional().isString().isLength({ max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'filename', 'size', 'title']),
    query('sortOrder').optional().isIn(['ASC', 'DESC'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        mimeType,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const where = {};
      const offset = (page - 1) * limit;

      // Apply filters
      if (category) where.category = category;
      if (mimeType) where.mimeType = mimeType;
      
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { originalName: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: mediaAssets } = await MediaAsset.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]]
      });

      const transformedAssets = mediaAssets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        size: asset.size,
        category: asset.category,
        title: asset.title,
        description: asset.description,
        altText: asset.altText,
        tags: asset.tags,
        publicUrl: asset.publicUrl,
        thumbnailUrl: asset.thumbnailUrl,
        processedUrl: asset.processedUrl,
        width: asset.width,
        height: asset.height,
        uploader: asset.uploader ? {
          id: asset.uploader.id,
          name: `${asset.uploader.firstName || ''} ${asset.uploader.lastName || ''}`.trim(),
          email: asset.uploader.email
        } : null,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      }));

      res.json({
        mediaAssets: transformedAssets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        },
        stats: {
          total: count,
          byCategory: await MediaAsset.findAll({
            attributes: [
              'category',
              [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['category'],
            raw: true
          }),
          totalSize: await MediaAsset.sum('size') || 0
        }
      });

    } catch (error) {
      logger.error('Failed to get media assets', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to retrieve media assets',
        code: 'MEDIA_FETCH_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/media/:id
 * @desc Get single media asset
 * @access Private (Editor/Admin)
 */
router.get('/:id',
  authenticateToken,
  requireRole(['editor', 'admin']),
  [
    param('id').isUUID().withMessage('Valid media asset ID required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const mediaAsset = await MediaAsset.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!mediaAsset) {
        return res.status(404).json({
          error: 'Media asset not found',
          code: 'MEDIA_NOT_FOUND'
        });
      }

      res.json({
        mediaAsset: {
          id: mediaAsset.id,
          filename: mediaAsset.filename,
          originalName: mediaAsset.originalName,
          mimeType: mediaAsset.mimeType,
          size: mediaAsset.size,
          category: mediaAsset.category,
          title: mediaAsset.title,
          description: mediaAsset.description,
          altText: mediaAsset.altText,
          tags: mediaAsset.tags,
          publicUrl: mediaAsset.publicUrl,
          thumbnailUrl: mediaAsset.thumbnailUrl,
          processedUrl: mediaAsset.processedUrl,
          width: mediaAsset.width,
          height: mediaAsset.height,
          metadata: mediaAsset.metadata,
          uploader: mediaAsset.uploader ? {
            id: mediaAsset.uploader.id,
            name: `${mediaAsset.uploader.firstName || ''} ${mediaAsset.uploader.lastName || ''}`.trim(),
            email: mediaAsset.uploader.email
          } : null,
          createdAt: mediaAsset.createdAt,
          updatedAt: mediaAsset.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to get media asset', {
        error: error.message,
        mediaAssetId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to retrieve media asset',
        code: 'MEDIA_FETCH_ERROR'
      });
    }
  }
);

/**
 * @route PUT /api/v1/media/:id
 * @desc Update media asset metadata
 * @access Private (Editor/Admin)
 */
router.put('/:id',
  authenticateToken,
  requireRole(['editor', 'admin']),
  [
    param('id').isUUID().withMessage('Valid media asset ID required'),
    body('title').optional().trim().isLength({ max: 255 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('altText').optional().trim().isLength({ max: 255 }),
    body('category').optional().isIn(['project', 'blog', 'profile', 'general']),
    body('tags').optional().isArray()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const mediaAsset = await MediaAsset.findByPk(req.params.id);

      if (!mediaAsset) {
        return res.status(404).json({
          error: 'Media asset not found',
          code: 'MEDIA_NOT_FOUND'
        });
      }

      const {
        title,
        description,
        altText,
        category,
        tags
      } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (altText !== undefined) updateData.altText = altText;
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags;

      await mediaAsset.update(updateData);

      logger.info('Media asset updated', {
        mediaAssetId: mediaAsset.id,
        changes: Object.keys(updateData),
        userId: req.user.id
      });

      res.json({
        message: 'Media asset updated successfully',
        mediaAsset: {
          id: mediaAsset.id,
          filename: mediaAsset.filename,
          title: mediaAsset.title,
          description: mediaAsset.description,
          altText: mediaAsset.altText,
          category: mediaAsset.category,
          tags: mediaAsset.tags,
          updatedAt: mediaAsset.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to update media asset', {
        error: error.message,
        mediaAssetId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to update media asset',
        code: 'MEDIA_UPDATE_ERROR'
      });
    }
  }
);

/**
 * @route DELETE /api/v1/media/:id
 * @desc Delete media asset and files
 * @access Private (Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  [
    param('id').isUUID().withMessage('Valid media asset ID required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const mediaAsset = await MediaAsset.findByPk(req.params.id);

      if (!mediaAsset) {
        return res.status(404).json({
          error: 'Media asset not found',
          code: 'MEDIA_NOT_FOUND'
        });
      }

      // Delete physical files
      const filesToDelete = [
        mediaAsset.filePath,
        mediaAsset.thumbnailUrl ? path.join(UPLOAD_DIR, path.basename(mediaAsset.thumbnailUrl)) : null,
        mediaAsset.processedUrl ? path.join(UPLOAD_DIR, path.basename(mediaAsset.processedUrl)) : null
      ].filter(Boolean);

      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          logger.warn('Failed to delete file', {
            filePath,
            error: unlinkError.message
          });
        }
      }

      // Delete database record
      await mediaAsset.destroy();

      logger.info('Media asset deleted', {
        mediaAssetId: mediaAsset.id,
        filename: mediaAsset.filename,
        userId: req.user.id
      });

      res.json({
        message: 'Media asset deleted successfully'
      });

    } catch (error) {
      logger.error('Failed to delete media asset', {
        error: error.message,
        mediaAssetId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to delete media asset',
        code: 'MEDIA_DELETE_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/v1/media/:id/optimize
 * @desc Re-optimize image with new settings
 * @access Private (Editor/Admin)
 */
router.post('/:id/optimize',
  authenticateToken,
  requireRole(['editor', 'admin']),
  [
    param('id').isUUID().withMessage('Valid media asset ID required'),
    body('width').optional().isInt({ min: 100, max: 4000 }),
    body('height').optional().isInt({ min: 100, max: 4000 }),
    body('quality').optional().isInt({ min: 10, max: 100 }),
    body('format').optional().isIn(['jpeg', 'png', 'webp'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const mediaAsset = await MediaAsset.findByPk(req.params.id);

      if (!mediaAsset) {
        return res.status(404).json({
          error: 'Media asset not found',
          code: 'MEDIA_NOT_FOUND'
        });
      }

      if (!ALLOWED_IMAGE_TYPES.includes(mediaAsset.mimeType)) {
        return res.status(400).json({
          error: 'Asset is not an image',
          code: 'NOT_IMAGE'
        });
      }

      const {
        width = 1920,
        height = 1080,
        quality = 80,
        format = 'jpeg'
      } = req.body;

      // Re-process image with new settings
      const processedFiles = await processImage(mediaAsset.filePath, {
        width,
        height,
        quality,
        format,
        createThumbnail: true
      });

      // Update media asset with new processed file URLs
      await mediaAsset.update({
        processedUrl: `/uploads/${new Date().getFullYear()}/${path.basename(processedFiles.processed.path)}`,
        thumbnailUrl: processedFiles.thumbnail ? 
          `/uploads/${new Date().getFullYear()}/${path.basename(processedFiles.thumbnail.path)}` : 
          null,
        metadata: {
          ...mediaAsset.metadata,
          processedFiles,
          lastOptimized: new Date().toISOString(),
          optimizedBy: req.user.id
        }
      });

      logger.info('Media asset re-optimized', {
        mediaAssetId: mediaAsset.id,
        settings: { width, height, quality, format },
        userId: req.user.id
      });

      res.json({
        message: 'Media asset optimized successfully',
        processedUrl: mediaAsset.processedUrl,
        thumbnailUrl: mediaAsset.thumbnailUrl
      });

    } catch (error) {
      logger.error('Failed to optimize media asset', {
        error: error.message,
        mediaAssetId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to optimize media asset',
        code: 'MEDIA_OPTIMIZE_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/v1/media/stats
 * @desc Get media usage statistics
 * @access Private (Editor/Admin)
 */
router.get('/stats', 
  authenticateToken,
  requireRole(['editor', 'admin']),
  async (req, res) => {
    try {
      const [
        totalAssets,
        totalSize,
        imageCount,
        documentCount,
        categoryStats,
        recentUploads
      ] = await Promise.all([
        MediaAsset.count(),
        MediaAsset.sum('size') || 0,
        MediaAsset.count({ where: { mimeType: { [Op.in]: ALLOWED_IMAGE_TYPES } } }),
        MediaAsset.count({ where: { mimeType: { [Op.in]: ALLOWED_DOCUMENT_TYPES } } }),
        MediaAsset.findAll({
          attributes: [
            'category',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('size')), 'totalSize']
          ],
          group: ['category'],
          raw: true
        }),
        MediaAsset.count({
          where: {
            createdAt: {
              [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })
      ]);

      res.json({
        stats: {
          totalAssets,
          totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
          typeBreakdown: {
            images: imageCount,
            documents: documentCount
          },
          categoryBreakdown: categoryStats.map(stat => ({
            category: stat.category,
            count: parseInt(stat.count),
            totalSize: Math.round(parseInt(stat.totalSize || 0) / 1024 / 1024 * 100) / 100
          })),
          recentUploads: recentUploads,
          storageQuota: {
            used: Math.round(totalSize / 1024 / 1024),
            limit: 1000, // 1GB limit (configurable)
            percentage: Math.round((totalSize / (1000 * 1024 * 1024)) * 100)
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get media stats', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        error: 'Failed to get media statistics',
        code: 'MEDIA_STATS_ERROR'
      });
    }
  }
);

module.exports = router;