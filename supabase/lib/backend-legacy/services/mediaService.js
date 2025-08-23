/**
 * Media Management Service
 * Handles file uploads, optimization, and storage
 */

const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const multer = require('multer');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { MediaAsset } = require('../models');
const { ValidationError } = require('../utils/errors');

class MediaService {
  constructor() {
    this.uploadsPath = config.storage.local.uploadsPath;
    this.publicPath = config.storage.local.publicPath;
    this.allowedTypes = config.storage.local.allowedTypes;
    this.maxFileSize = config.storage.local.maxFileSize;
    
    this.imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    this.documentTypes = ['pdf', 'doc', 'docx', 'txt'];
    this.videoTypes = ['mp4', 'webm', 'ogg'];
    
    this.thumbnailSizes = [
      { name: 'thumb', width: 150, height: 150 },
      { name: 'small', width: 300, height: 200 },
      { name: 'medium', width: 600, height: 400 },
      { name: 'large', width: 1200, height: 800 }
    ];
  }

  /**
   * Initialize media service
   */
  async initialize() {
    try {
      // Ensure upload directories exist
      await this.ensureDirectoryExists(this.uploadsPath);
      await this.ensureDirectoryExists(path.join(this.uploadsPath, 'images'));
      await this.ensureDirectoryExists(path.join(this.uploadsPath, 'documents'));
      await this.ensureDirectoryExists(path.join(this.uploadsPath, 'videos'));
      await this.ensureDirectoryExists(path.join(this.uploadsPath, 'thumbnails'));
      
      logger.info('Media service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize media service:', error);
      throw error;
    }
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
        logger.debug(`Created directory: ${dirPath}`);
      }
    }
  }

  /**
   * Configure multer storage
   */
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const fileType = this.getFileType(file.mimetype);
          const destPath = path.join(this.uploadsPath, fileType + 's');
          await this.ensureDirectoryExists(destPath);
          cb(null, destPath);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext)
          .replace(/[^a-zA-Z0-9]/g, '-')
          .toLowerCase();
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Maximum 10 files per request
      },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        if (this.allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new ValidationError(`File type '${ext}' not allowed`));
        }
      }
    });
  }

  /**
   * Get file type from MIME type
   */
  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  }

  /**
   * Process uploaded file
   */
  async processUpload(file, userId, options = {}) {
    try {
      const {
        altText = '',
        caption = '',
        generateThumbnails = true,
        optimize = true
      } = options;

      // Get file information
      const ext = path.extname(file.filename).toLowerCase().substring(1);
      const fileType = this.getFileType(file.mimetype);
      const isImage = this.imageTypes.includes(ext);
      
      let processedPath = file.path;
      let width = null;
      let height = null;
      let thumbnailUrl = null;

      // Process images
      if (isImage && optimize) {
        const optimized = await this.optimizeImage(file.path);
        if (optimized.path !== file.path) {
          processedPath = optimized.path;
        }
        width = optimized.width;
        height = optimized.height;

        // Generate thumbnails
        if (generateThumbnails) {
          thumbnailUrl = await this.generateThumbnails(processedPath, file.filename);
        }
      }

      // Create media asset record
      const mediaAsset = await MediaAsset.create({
        userId,
        filename: file.filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        width,
        height,
        altText,
        caption,
        storagePath: processedPath,
        storageProvider: 'local',
        publicUrl: this.getPublicUrl(file.filename, fileType),
        thumbnailUrl,
        metadata: {
          fileType,
          extension: ext,
          uploadedAt: new Date().toISOString(),
          processed: optimize && isImage
        }
      });

      logger.info(`File uploaded and processed: ${file.filename} by user ${userId}`);

      return mediaAsset;
    } catch (error) {
      logger.error('Error processing upload:', error);
      
      // Clean up file on error
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        logger.error('Error cleaning up file:', unlinkError);
      }
      
      throw error;
    }
  }

  /**
   * Optimize image
   */
  async optimizeImage(filePath) {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Optimize settings based on format
      let optimized = image;

      if (metadata.format === 'jpeg') {
        optimized = optimized.jpeg({ quality: 85, progressive: true });
      } else if (metadata.format === 'png') {
        optimized = optimized.png({ quality: 90, progressive: true });
      } else if (metadata.format === 'webp') {
        optimized = optimized.webp({ quality: 85 });
      }

      // Resize if too large (max 2048px on longest side)
      if (metadata.width > 2048 || metadata.height > 2048) {
        optimized = optimized.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Generate optimized filename
      const ext = path.extname(filePath);
      const basePath = filePath.replace(ext, '');
      const optimizedPath = `${basePath}-optimized${ext}`;

      await optimized.toFile(optimizedPath);

      // Get final metadata
      const finalMetadata = await sharp(optimizedPath).metadata();

      // Remove original if optimization created a new file
      if (optimizedPath !== filePath) {
        const originalStats = await fs.stat(filePath);
        const optimizedStats = await fs.stat(optimizedPath);

        // Keep optimized version if it's smaller
        if (optimizedStats.size < originalStats.size) {
          await fs.unlink(filePath);
          await fs.rename(optimizedPath, filePath);
        } else {
          await fs.unlink(optimizedPath);
        }
      }

      return {
        path: filePath,
        width: finalMetadata.width,
        height: finalMetadata.height
      };
    } catch (error) {
      logger.error('Error optimizing image:', error);
      // Return original metadata on optimization failure
      const metadata = await sharp(filePath).metadata();
      return {
        path: filePath,
        width: metadata.width,
        height: metadata.height
      };
    }
  }

  /**
   * Generate image thumbnails
   */
  async generateThumbnails(imagePath, filename) {
    try {
      const baseName = path.basename(filename, path.extname(filename));
      const thumbnailsDir = path.join(this.uploadsPath, 'thumbnails');
      await this.ensureDirectoryExists(thumbnailsDir);

      const image = sharp(imagePath);
      const thumbnails = [];

      for (const size of this.thumbnailSizes) {
        const thumbnailPath = path.join(thumbnailsDir, `${baseName}-${size.name}.webp`);
        
        await image
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);

        thumbnails.push({
          name: size.name,
          width: size.width,
          height: size.height,
          url: this.getPublicUrl(path.basename(thumbnailPath), 'thumbnails')
        });
      }

      return thumbnails;
    } catch (error) {
      logger.error('Error generating thumbnails:', error);
      return null;
    }
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(filename, fileType = 'images') {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    if (fileType === 'thumbnails') {
      return `${baseUrl}${this.publicPath}/thumbnails/${filename}`;
    }
    return `${baseUrl}${this.publicPath}/${fileType}s/${filename}`;
  }

  /**
   * Delete media asset
   */
  async deleteAsset(assetId, userId) {
    try {
      const asset = await MediaAsset.findByPk(assetId);
      
      if (!asset) {
        throw new ValidationError('Media asset not found');
      }

      // Check permissions (users can only delete their own assets, admins can delete any)
      if (asset.userId !== userId) {
        // Check if user is admin (this would be passed from controller)
        throw new ValidationError('You can only delete your own media assets');
      }

      // Delete physical file
      try {
        await fs.unlink(asset.storagePath);
      } catch (error) {
        logger.warn('Could not delete physical file:', error.message);
      }

      // Delete thumbnails if they exist
      if (asset.thumbnailUrl && Array.isArray(asset.thumbnailUrl)) {
        for (const thumbnail of asset.thumbnailUrl) {
          try {
            const thumbnailPath = path.join(
              this.uploadsPath,
              'thumbnails',
              path.basename(thumbnail.url)
            );
            await fs.unlink(thumbnailPath);
          } catch (error) {
            logger.warn('Could not delete thumbnail:', error.message);
          }
        }
      }

      // Delete database record
      await asset.destroy();

      logger.info(`Media asset deleted: ${assetId} by user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Error deleting media asset:', error);
      throw error;
    }
  }

  /**
   * Get media assets with filtering
   */
  async getAssets(filters = {}, pagination = {}) {
    try {
      const {
        userId,
        fileType,
        mimeType,
        search,
        dateFrom,
        dateTo
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = pagination;

      const where = {};
      
      if (userId) where.userId = userId;
      if (fileType) where['metadata.fileType'] = fileType;
      if (mimeType) where.mimeType = { [Op.like]: `${mimeType}%` };
      
      if (search) {
        where[Op.or] = [
          { originalFilename: { [Op.iLike]: `%${search}%` } },
          { altText: { [Op.iLike]: `%${search}%` } },
          { caption: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
      }

      const assets = await MediaAsset.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        include: [
          {
            model: require('../models').User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      return {
        data: assets.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: assets.count,
          pages: Math.ceil(assets.count / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Error getting media assets:', error);
      throw error;
    }
  }

  /**
   * Update media asset metadata
   */
  async updateAsset(assetId, updates, userId) {
    try {
      const asset = await MediaAsset.findByPk(assetId);
      
      if (!asset) {
        throw new ValidationError('Media asset not found');
      }

      // Check permissions
      if (asset.userId !== userId) {
        throw new ValidationError('You can only update your own media assets');
      }

      const allowedUpdates = ['altText', 'caption'];
      const filteredUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      await asset.update(filteredUpdates);

      logger.info(`Media asset updated: ${assetId} by user ${userId}`);

      return asset;
    } catch (error) {
      logger.error('Error updating media asset:', error);
      throw error;
    }
  }

  /**
   * Increment usage count
   */
  async incrementUsage(assetId) {
    try {
      const asset = await MediaAsset.findByPk(assetId);
      if (asset) {
        await asset.increment('usageCount');
      }
    } catch (error) {
      logger.error('Error incrementing usage count:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Check if upload directory is writable
      const testFile = path.join(this.uploadsPath, 'health-check.txt');
      await fs.writeFile(testFile, 'health check');
      await fs.unlink(testFile);

      // Get storage statistics
      const stats = await fs.stat(this.uploadsPath);
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        storage: {
          path: this.uploadsPath,
          accessible: true,
          writable: true
        }
      };
    } catch (error) {
      logger.error('Media service health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up unused files
   */
  async cleanupUnusedFiles() {
    try {
      // This is a maintenance task that would typically run periodically
      // It finds files on disk that don't have corresponding database records
      
      const dbFiles = await MediaAsset.findAll({
        attributes: ['storagePath', 'filename']
      });

      const dbFileSet = new Set(dbFiles.map(f => f.storagePath));
      let cleanedCount = 0;

      // Check each subdirectory
      const subdirs = ['images', 'documents', 'videos', 'thumbnails'];
      
      for (const subdir of subdirs) {
        const dirPath = path.join(this.uploadsPath, subdir);
        
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            
            if (!dbFileSet.has(filePath)) {
              await fs.unlink(filePath);
              cleanedCount++;
              logger.debug(`Cleaned up orphaned file: ${filePath}`);
            }
          }
        } catch (error) {
          logger.warn(`Error cleaning directory ${subdir}:`, error.message);
        }
      }

      logger.info(`Cleaned up ${cleanedCount} orphaned files`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error during file cleanup:', error);
      throw error;
    }
  }
}

// Create singleton instance
const mediaService = new MediaService();

module.exports = mediaService;