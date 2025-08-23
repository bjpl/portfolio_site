const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

const MediaManager = require('../services/media/MediaManager');
const VideoProcessor = require('../services/media/VideoProcessor');
const CDNManager = require('../services/media/CDNManager');
const MediaAnalytics = require('../services/media/MediaAnalytics');
const logger = require('../utils/logger');

// Initialize services
const mediaManager = new MediaManager({
  maxFileSize: 100 * 1024 * 1024, // 100MB
  videoTranscoding: true,
  cdn: {
    provider: process.env.CDN_PROVIDER || 'local',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET
    }
  }
});

const analytics = new MediaAnalytics({
  enableRealTime: true,
  retentionDays: 365
});

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.cwd(), 'static', 'uploads', 'temp'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // Max 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload media file(s)
 *     tags: [Media]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: files
 *         type: file
 *         required: true
 *         description: Media file(s) to upload
 *       - in: formData
 *         name: tags
 *         type: string
 *         description: Comma-separated tags
 *       - in: formData
 *         name: altText
 *         type: string
 *         description: Alt text for accessibility
 *       - in: formData
 *         name: caption
 *         type: string
 *         description: Media caption
 *     responses:
 *       200:
 *         description: Upload successful
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {\n      return res.status(400).json({ error: 'No files uploaded' });\n    }\n\n    const options = {\n      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],\n      altText: req.body.altText || '',\n      caption: req.body.caption || ''\n    };\n\n    const results = [];\n    const uploadPromises = req.files.map(async (file) => {\n      try {\n        const result = await mediaManager.uploadMedia(file, options);\n        \n        // Clean up temp file\n        await fs.unlink(file.path).catch(() => {});\n        \n        return { success: true, ...result };\n      } catch (error) {\n        logger.error('Upload failed for file', { fileName: file.originalname, error });\n        \n        // Clean up temp file\n        await fs.unlink(file.path).catch(() => {});\n        \n        return { \n          success: false, \n          fileName: file.originalname, \n          error: error.message \n        };\n      }\n    });\n\n    const uploadResults = await Promise.all(uploadPromises);\n    const successful = uploadResults.filter(r => r.success);\n    const failed = uploadResults.filter(r => !r.success);\n\n    res.json({\n      success: true,\n      uploaded: successful.length,\n      failed: failed.length,\n      results: uploadResults\n    });\n\n  } catch (error) {\n    logger.error('Upload endpoint error', error);\n    res.status(500).json({ error: 'Upload failed', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/bulk-upload:\n *   post:\n *     summary: Bulk upload with progress tracking\n *     tags: [Media]\n */\nrouter.post('/bulk-upload', upload.array('files', 50), async (req, res) => {\n  try {\n    if (!req.files || req.files.length === 0) {\n      return res.status(400).json({ error: 'No files uploaded' });\n    }\n\n    const options = {\n      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],\n      altText: req.body.altText || '',\n      caption: req.body.caption || ''\n    };\n\n    // Start bulk upload with progress tracking\n    const result = await mediaManager.bulkUpload(req.files, {\n      ...options,\n      onProgress: (progress) => {\n        // In a real implementation, this would use WebSockets or SSE\n        logger.info('Bulk upload progress', progress);\n      }\n    });\n\n    // Clean up temp files\n    await Promise.all(req.files.map(file => \n      fs.unlink(file.path).catch(() => {})\n    ));\n\n    res.json(result);\n\n  } catch (error) {\n    logger.error('Bulk upload error', error);\n    res.status(500).json({ error: 'Bulk upload failed', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/search:\n *   get:\n *     summary: Search media with filters\n *     tags: [Media]\n */\nrouter.get('/search', async (req, res) => {\n  try {\n    const query = {\n      search: req.query.q,\n      tags: req.query.tags ? req.query.tags.split(',') : undefined,\n      mimeType: req.query.type,\n      dateFrom: req.query.dateFrom,\n      dateTo: req.query.dateTo,\n      limit: parseInt(req.query.limit) || 20,\n      offset: parseInt(req.query.offset) || 0,\n      sortBy: req.query.sortBy || 'uploaded_at',\n      sortOrder: req.query.sortOrder || 'DESC'\n    };\n\n    const results = await mediaManager.searchMedia(query);\n    res.json({ success: true, results, query });\n\n  } catch (error) {\n    logger.error('Media search error', error);\n    res.status(500).json({ error: 'Search failed', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/{id}:\n *   get:\n *     summary: Get media details\n *     tags: [Media]\n */\nrouter.get('/:id', async (req, res) => {\n  try {\n    const media = await mediaManager.db.get('SELECT * FROM media WHERE id = ?', req.params.id);\n    \n    if (!media) {\n      return res.status(404).json({ error: 'Media not found' });\n    }\n\n    // Parse JSON fields\n    media.variants = media.variants ? JSON.parse(media.variants) : null;\n    media.metadata = media.metadata ? JSON.parse(media.metadata) : null;\n    media.tags = media.tags ? JSON.parse(media.tags) : [];\n\n    // Track view\n    await analytics.trackView(media.id, {\n      userId: req.user?.id,\n      sessionId: req.sessionID,\n      ipAddress: req.ip,\n      userAgent: req.get('User-Agent'),\n      referrer: req.get('Referer')\n    });\n\n    res.json({ success: true, media });\n\n  } catch (error) {\n    logger.error('Get media error', error);\n    res.status(500).json({ error: 'Failed to get media', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/{id}/tags:\n *   post:\n *     summary: Add tags to media\n *     tags: [Media]\n */\nrouter.post('/:id/tags', async (req, res) => {\n  try {\n    const { tags } = req.body;\n    \n    if (!Array.isArray(tags) || tags.length === 0) {\n      return res.status(400).json({ error: 'Tags array is required' });\n    }\n\n    const updatedTags = await mediaManager.addTags(req.params.id, tags);\n    res.json({ success: true, tags: updatedTags });\n\n  } catch (error) {\n    logger.error('Add tags error', error);\n    res.status(500).json({ error: 'Failed to add tags', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/{id}/download:\n *   get:\n *     summary: Download media file\n *     tags: [Media]\n */\nrouter.get('/:id/download', async (req, res) => {\n  try {\n    const media = await mediaManager.db.get('SELECT * FROM media WHERE id = ?', req.params.id);\n    \n    if (!media) {\n      return res.status(404).json({ error: 'Media not found' });\n    }\n\n    const { variant = 'original' } = req.query;\n    let filePath;\n\n    if (variant === 'original') {\n      filePath = path.join(process.cwd(), 'static', 'uploads', media.file_name);\n    } else {\n      const variants = media.variants ? JSON.parse(media.variants) : [];\n      const requestedVariant = variants.find(v => v.preset === variant);\n      \n      if (!requestedVariant) {\n        return res.status(404).json({ error: 'Variant not found' });\n      }\n      \n      filePath = path.join(process.cwd(), 'static', requestedVariant.url);\n    }\n\n    // Check if file exists\n    try {\n      await fs.access(filePath);\n    } catch {\n      return res.status(404).json({ error: 'File not found on disk' });\n    }\n\n    // Track download\n    await analytics.trackDownload(media.id, {\n      userId: req.user?.id,\n      downloadType: variant,\n      variantPreset: variant !== 'original' ? variant : null\n    });\n\n    // Set appropriate headers\n    res.setHeader('Content-Disposition', `attachment; filename=\"${media.original_name}\"`);\n    res.setHeader('Content-Type', media.mime_type);\n    \n    // Stream file\n    const fileStream = require('fs').createReadStream(filePath);\n    fileStream.pipe(res);\n\n  } catch (error) {\n    logger.error('Download error', error);\n    res.status(500).json({ error: 'Download failed', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/{id}:\n *   delete:\n *     summary: Delete media\n *     tags: [Media]\n */\nrouter.delete('/:id', async (req, res) => {\n  try {\n    const media = await mediaManager.db.get('SELECT * FROM media WHERE id = ?', req.params.id);\n    \n    if (!media) {\n      return res.status(404).json({ error: 'Media not found' });\n    }\n\n    // Delete from database\n    await mediaManager.db.run('DELETE FROM media WHERE id = ?', req.params.id);\n    \n    // Delete files (original and variants)\n    const filesToDelete = [media.file_name];\n    \n    if (media.variants) {\n      const variants = JSON.parse(media.variants);\n      variants.forEach(variant => {\n        Object.values(variant).forEach(url => {\n          if (typeof url === 'string' && url.startsWith('/uploads/')) {\n            filesToDelete.push(url.replace('/uploads/', ''));\n          }\n        });\n      });\n    }\n\n    // Clean up files\n    await Promise.all(filesToDelete.map(async (fileName) => {\n      try {\n        const fullPath = path.join(process.cwd(), 'static', 'uploads', fileName);\n        await fs.unlink(fullPath);\n      } catch (error) {\n        logger.warn('Failed to delete file', { fileName, error });\n      }\n    }));\n\n    res.json({ success: true, message: 'Media deleted successfully' });\n\n  } catch (error) {\n    logger.error('Delete media error', error);\n    res.status(500).json({ error: 'Failed to delete media', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/analytics/dashboard:\n *   get:\n *     summary: Get analytics dashboard data\n *     tags: [Media Analytics]\n */\nrouter.get('/analytics/dashboard', async (req, res) => {\n  try {\n    const { timeframe = '7d', mediaId } = req.query;\n    \n    const dashboardData = await analytics.getDashboardData(timeframe, mediaId);\n    res.json({ success: true, data: dashboardData });\n\n  } catch (error) {\n    logger.error('Analytics dashboard error', error);\n    res.status(500).json({ error: 'Failed to get analytics', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/analytics/timeseries:\n *   get:\n *     summary: Get time-series analytics data\n *     tags: [Media Analytics]\n */\nrouter.get('/analytics/timeseries', async (req, res) => {\n  try {\n    const { timeframe = '7d', interval = 'hour', mediaId } = req.query;\n    \n    const timeSeriesData = await analytics.getTimeSeriesData(timeframe, interval, mediaId);\n    res.json({ success: true, data: timeSeriesData });\n\n  } catch (error) {\n    logger.error('Time-series analytics error', error);\n    res.status(500).json({ error: 'Failed to get time-series data', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/analytics/recommendations:\n *   get:\n *     summary: Get optimization recommendations\n *     tags: [Media Analytics]\n */\nrouter.get('/analytics/recommendations', async (req, res) => {\n  try {\n    const { mediaId } = req.query;\n    \n    const recommendations = await analytics.getOptimizationRecommendations(mediaId);\n    res.json({ success: true, recommendations });\n\n  } catch (error) {\n    logger.error('Recommendations error', error);\n    res.status(500).json({ error: 'Failed to get recommendations', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/optimize:\n *   post:\n *     summary: Optimize media storage\n *     tags: [Media]\n */\nrouter.post('/optimize', async (req, res) => {\n  try {\n    const options = {\n      removeUnused: req.body.removeUnused || false,\n      unusedDays: req.body.unusedDays || 30,\n      compressOldImages: req.body.compressOldImages || true,\n      removeOldVariants: req.body.removeOldVariants || true\n    };\n\n    const result = await mediaManager.optimizeStorage(options);\n    res.json({ success: true, ...result });\n\n  } catch (error) {\n    logger.error('Storage optimization error', error);\n    res.status(500).json({ error: 'Optimization failed', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/stats:\n *   get:\n *     summary: Get media library statistics\n *     tags: [Media]\n */\nrouter.get('/stats', async (req, res) => {\n  try {\n    const [storageStats, recentUploads, topTags] = await Promise.all([\n      mediaManager.getStorageStatistics(),\n      mediaManager.searchMedia({ limit: 10, sortBy: 'uploaded_at', sortOrder: 'DESC' }),\n      mediaManager.db.all('SELECT name, usage_count FROM tags ORDER BY usage_count DESC LIMIT 20')\n    ]);\n\n    res.json({\n      success: true,\n      stats: {\n        storage: storageStats,\n        recentUploads,\n        topTags\n      }\n    });\n\n  } catch (error) {\n    logger.error('Stats error', error);\n    res.status(500).json({ error: 'Failed to get stats', details: error.message });\n  }\n});\n\n/**\n * @swagger\n * /api/media/upload-progress/{uploadId}:\n *   get:\n *     summary: Get upload progress\n *     tags: [Media]\n */\nrouter.get('/upload-progress/:uploadId', (req, res) => {\n  try {\n    const progress = mediaManager.getUploadProgress(req.params.uploadId);\n    res.json({ success: true, progress });\n  } catch (error) {\n    res.status(500).json({ error: 'Failed to get progress', details: error.message });\n  }\n});\n\n// Error handling middleware\nrouter.use((error, req, res, next) => {\n  if (error instanceof multer.MulterError) {\n    if (error.code === 'LIMIT_FILE_SIZE') {\n      return res.status(400).json({ error: 'File too large' });\n    }\n    if (error.code === 'LIMIT_FILE_COUNT') {\n      return res.status(400).json({ error: 'Too many files' });\n    }\n  }\n  \n  logger.error('Media route error', error);\n  res.status(500).json({ error: 'Internal server error', details: error.message });\n});\n\n// Handle media processing events\nmediaManager.on('upload:start', (data) => {\n  logger.info('Upload started', data);\n});\n\nmediaManager.on('upload:complete', (data) => {\n  logger.info('Upload completed', data);\n});\n\nmediaManager.on('upload:error', (data) => {\n  logger.error('Upload error', data);\n});\n\nmodule.exports = router;