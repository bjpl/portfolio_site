const { MediaAsset, User } = require('../../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { Op } = require('sequelize');

class MediaController {
  constructor() {
    this.uploadPath = path.join(process.cwd(), 'uploads');
    this.setupMulter();
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'images'), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'documents'), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'videos'), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'audio'), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'archives'), { recursive: true });
    }
  }

  setupMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        let subfolder = 'documents';
        if (file.mimetype.startsWith('image/')) subfolder = 'images';
        else if (file.mimetype.startsWith('video/')) subfolder = 'videos';
        else if (file.mimetype.startsWith('audio/')) subfolder = 'audio';
        else if (['application/zip', 'application/x-rar-compressed'].includes(file.mimetype)) subfolder = 'archives';
        
        cb(null, path.join(this.uploadPath, subfolder));
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${cleanName}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Allowed file types
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg',
        'audio/mp3', 'audio/wav', 'audio/ogg',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip', 'application/x-rar-compressed'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    };

    this.upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
      }
    });
  }

  // Upload single file
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { altText, caption, tags = [] } = req.body;
      const file = req.file;

      // Determine category
      let category = 'document';
      if (file.mimetype.startsWith('image/')) category = 'image';
      else if (file.mimetype.startsWith('video/')) category = 'video';
      else if (file.mimetype.startsWith('audio/')) category = 'audio';
      else if (['application/zip', 'application/x-rar-compressed'].includes(file.mimetype)) category = 'archive';

      // Get image dimensions if it's an image
      let width = null;
      let height = null;
      if (category === 'image') {
        try {
          const metadata = await sharp(file.path).metadata();
          width = metadata.width;
          height = metadata.height;
        } catch (error) {
          console.warn('Could not get image metadata:', error.message);
        }
      }

      const mediaAsset = await MediaAsset.create({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`,
        mimeType: file.mimetype,
        fileSize: file.size,
        width,
        height,
        altText,
        caption,
        category,
        tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
        uploaderId: req.user.id
      });

      // Generate optimized versions for images
      if (category === 'image') {
        await this.generateOptimizedVersions(mediaAsset);
      }

      res.status(201).json(mediaAsset);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadedAssets = [];

      for (const file of req.files) {
        let category = 'document';
        if (file.mimetype.startsWith('image/')) category = 'image';
        else if (file.mimetype.startsWith('video/')) category = 'video';
        else if (file.mimetype.startsWith('audio/')) category = 'audio';
        else if (['application/zip', 'application/x-rar-compressed'].includes(file.mimetype)) category = 'archive';

        // Get image dimensions if it's an image
        let width = null;
        let height = null;
        if (category === 'image') {
          try {
            const metadata = await sharp(file.path).metadata();
            width = metadata.width;
            height = metadata.height;
          } catch (error) {
            console.warn('Could not get image metadata:', error.message);
          }
        }

        const mediaAsset = await MediaAsset.create({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`,
          mimeType: file.mimetype,
          fileSize: file.size,
          width,
          height,
          category,
          uploaderId: req.user.id
        });

        // Generate optimized versions for images
        if (category === 'image') {
          await this.generateOptimizedVersions(mediaAsset);
        }

        uploadedAssets.push(mediaAsset);
      }

      res.status(201).json(uploadedAssets);
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  }

  // Get all media with filtering and pagination
  async getAllMedia(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        mimeType,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (category) {
        where.category = category;
      }

      if (mimeType) {
        where.mimeType = { [Op.iLike]: `${mimeType}%` };
      }

      if (search) {
        where[Op.or] = [
          { filename: { [Op.iLike]: `%${search}%` } },
          { originalName: { [Op.iLike]: `%${search}%` } },
          { altText: { [Op.iLike]: `%${search}%` } },
          { caption: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows: media } = await MediaAsset.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'username']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder]]
      });

      res.json({
        media,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching media:', error);
      res.status(500).json({ error: 'Failed to fetch media' });
    }
  }

  // Get single media asset
  async getMediaById(req, res) {
    try {
      const { id } = req.params;

      const mediaAsset = await MediaAsset.findByPk(id, {
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'username']
          }
        ]
      });

      if (!mediaAsset) {
        return res.status(404).json({ error: 'Media asset not found' });
      }

      res.json(mediaAsset);
    } catch (error) {
      console.error('Error fetching media asset:', error);
      res.status(500).json({ error: 'Failed to fetch media asset' });
    }
  }

  // Update media asset
  async updateMedia(req, res) {
    try {
      const { id } = req.params;
      const { altText, caption, tags } = req.body;

      const mediaAsset = await MediaAsset.findByPk(id);
      if (!mediaAsset) {
        return res.status(404).json({ error: 'Media asset not found' });
      }

      // Check permissions
      if (mediaAsset.uploaderId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to update this asset' });
      }

      await mediaAsset.update({
        altText,
        caption,
        tags: tags ? (Array.isArray(tags) ? tags : [tags].filter(Boolean)) : mediaAsset.tags
      });

      res.json(mediaAsset);
    } catch (error) {
      console.error('Error updating media asset:', error);
      res.status(500).json({ error: 'Failed to update media asset' });
    }
  }

  // Delete media asset
  async deleteMedia(req, res) {
    try {
      const { id } = req.params;

      const mediaAsset = await MediaAsset.findByPk(id);
      if (!mediaAsset) {
        return res.status(404).json({ error: 'Media asset not found' });
      }

      // Check permissions
      if (mediaAsset.uploaderId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')) {
        return res.status(403).json({ error: 'Not authorized to delete this asset' });
      }

      // Delete file from filesystem
      try {
        await fs.unlink(mediaAsset.path);
        
        // Delete optimized versions if they exist
        if (mediaAsset.optimizedVersions) {
          for (const [size, filePath] of Object.entries(mediaAsset.optimizedVersions)) {
            try {
              await fs.unlink(filePath);
            } catch (error) {
              console.warn(`Could not delete optimized version ${size}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.warn('Could not delete file:', error.message);
      }

      await mediaAsset.destroy();
      res.json({ message: 'Media asset deleted successfully' });
    } catch (error) {
      console.error('Error deleting media asset:', error);
      res.status(500).json({ error: 'Failed to delete media asset' });
    }
  }

  // Generate optimized image versions
  async generateOptimizedVersions(mediaAsset) {
    if (mediaAsset.category !== 'image') return;

    const sizes = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 400, height: null },
      medium: { width: 800, height: null },
      large: { width: 1200, height: null }
    };

    const optimizedVersions = {};
    const basePath = path.dirname(mediaAsset.path);
    const ext = path.extname(mediaAsset.filename);
    const nameWithoutExt = path.basename(mediaAsset.filename, ext);

    try {
      for (const [sizeName, dimensions] of Object.entries(sizes)) {
        const outputFilename = `${nameWithoutExt}-${sizeName}${ext}`;
        const outputPath = path.join(basePath, outputFilename);

        let operation = sharp(mediaAsset.path);
        
        if (sizeName === 'thumbnail') {
          operation = operation.resize(dimensions.width, dimensions.height, { fit: 'cover' });
        } else {
          operation = operation.resize(dimensions.width, dimensions.height, { fit: 'inside', withoutEnlargement: true });
        }

        await operation
          .jpeg({ quality: 85 })
          .toFile(outputPath);

        optimizedVersions[sizeName] = outputPath;
      }

      await mediaAsset.update({
        optimizedVersions,
        isOptimized: true
      });
    } catch (error) {
      console.error('Error generating optimized versions:', error);
    }
  }

  // Get media statistics
  async getMediaStats(req, res) {
    try {
      const categoryStats = await MediaAsset.findAll({
        attributes: [
          'category',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('fileSize')), 'totalSize']
        ],
        group: ['category']
      });

      const totalAssets = await MediaAsset.count();
      const totalSize = await MediaAsset.sum('fileSize');

      const formattedStats = categoryStats.reduce((acc, stat) => {
        acc[stat.category] = {
          count: parseInt(stat.dataValues.count),
          totalSize: parseInt(stat.dataValues.totalSize || 0)
        };
        return acc;
      }, {});

      res.json({
        categoryCounts: formattedStats,
        totalAssets,
        totalSize: totalSize || 0
      });
    } catch (error) {
      console.error('Error fetching media stats:', error);
      res.status(500).json({ error: 'Failed to fetch media statistics' });
    }
  }

  // Bulk delete media assets
  async bulkDeleteMedia(req, res) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No asset IDs provided' });
      }

      const mediaAssets = await MediaAsset.findAll({
        where: { id: { [Op.in]: ids } }
      });

      // Check permissions for each asset
      const unauthorizedAssets = mediaAssets.filter(asset => 
        asset.uploaderId !== req.user.id && !req.user.roles.some(role => role.name === 'admin')
      );

      if (unauthorizedAssets.length > 0) {
        return res.status(403).json({ error: 'Not authorized to delete some assets' });
      }

      // Delete files from filesystem
      for (const asset of mediaAssets) {
        try {
          await fs.unlink(asset.path);
          
          // Delete optimized versions
          if (asset.optimizedVersions) {
            for (const filePath of Object.values(asset.optimizedVersions)) {
              try {
                await fs.unlink(filePath);
              } catch (error) {
                console.warn('Could not delete optimized version:', error.message);
              }
            }
          }
        } catch (error) {
          console.warn(`Could not delete file ${asset.filename}:`, error.message);
        }
      }

      await MediaAsset.destroy({
        where: { id: { [Op.in]: ids } }
      });

      res.json({ message: `${mediaAssets.length} media assets deleted successfully` });
    } catch (error) {
      console.error('Error bulk deleting media:', error);
      res.status(500).json({ error: 'Failed to delete media assets' });
    }
  }
}

module.exports = new MediaController();