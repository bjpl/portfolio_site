const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class MediaService {
  constructor() {
    this.uploadPath = path.join(process.cwd(), 'uploads');
    this.cdnEnabled = process.env.CDN_ENABLED === 'true';
    this.cdnBaseUrl = process.env.CDN_BASE_URL;
  }

  // Generate optimized versions of images
  async generateOptimizedVersions(originalPath, filename) {
    const sizes = {
      thumbnail: { width: 150, height: 150, fit: 'cover' },
      small: { width: 400, height: null, fit: 'inside' },
      medium: { width: 800, height: null, fit: 'inside' },
      large: { width: 1200, height: null, fit: 'inside' },
      webp_small: { width: 400, height: null, format: 'webp', fit: 'inside' },
      webp_medium: { width: 800, height: null, format: 'webp', fit: 'inside' }
    };

    const optimizedVersions = {};
    const basePath = path.dirname(originalPath);
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    try {
      for (const [sizeName, config] of Object.entries(sizes)) {
        const format = config.format || 'jpeg';
        const outputExt = format === 'webp' ? '.webp' : ext;
        const outputFilename = `${nameWithoutExt}-${sizeName}${outputExt}`;
        const outputPath = path.join(basePath, outputFilename);

        let operation = sharp(originalPath);

        // Resize based on configuration
        if (config.width || config.height) {
          operation = operation.resize(config.width, config.height, {
            fit: config.fit,
            withoutEnlargement: true
          });
        }

        // Apply format-specific optimizations
        if (format === 'webp') {
          operation = operation.webp({ quality: 85, effort: 4 });
        } else {
          operation = operation.jpeg({ quality: 85, progressive: true });
        }

        await operation.toFile(outputPath);

        optimizedVersions[sizeName] = {
          path: outputPath,
          url: `/uploads/${path.basename(basePath)}/${outputFilename}`,
          format
        };
      }

      return optimizedVersions;
    } catch (error) {
      console.error('Error generating optimized versions:', error);
      throw error;
    }
  }

  // Get image metadata
  async getImageMetadata(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }

  // Generate secure filename
  generateSecureFilename(originalName) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName).toLowerCase();
    const sanitizedName = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}-${randomBytes}-${sanitizedName}${ext}`;
  }

  // Validate file type
  validateFileType(mimeType) {
    const allowedTypes = {
      images: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
      ],
      videos: [
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'
      ],
      audio: [
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'
      ],
      documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv'
      ],
      archives: [
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
      ]
    };

    for (const [category, types] of Object.entries(allowedTypes)) {
      if (types.includes(mimeType)) {
        return category.slice(0, -1); // Remove 's' from category name
      }
    }

    return null;
  }

  // Check file size limits
  validateFileSize(fileSize, category) {
    const limits = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      audio: 50 * 1024 * 1024, // 50MB
      document: 25 * 1024 * 1024, // 25MB
      archive: 50 * 1024 * 1024 // 50MB
    };

    return fileSize <= (limits[category] || limits.document);
  }

  // Clean up orphaned files
  async cleanupOrphanedFiles() {
    try {
      const MediaAsset = require('../../models').MediaAsset;
      
      // Get all file paths from database
      const dbFiles = await MediaAsset.findAll({
        attributes: ['path', 'optimizedVersions']
      });

      const dbFilePaths = new Set();
      
      dbFiles.forEach(asset => {
        dbFilePaths.add(asset.path);
        
        if (asset.optimizedVersions) {
          Object.values(asset.optimizedVersions).forEach(version => {
            if (version.path) {
              dbFilePaths.add(version.path);
            }
          });
        }
      });

      // Get all files in upload directory
      const uploadDirs = ['images', 'videos', 'audio', 'documents', 'archives'];
      const orphanedFiles = [];

      for (const dir of uploadDirs) {
        const dirPath = path.join(this.uploadPath, dir);
        
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            
            if (!dbFilePaths.has(filePath)) {
              orphanedFiles.push(filePath);
            }
          }
        } catch (error) {
          // Directory might not exist
          continue;
        }
      }

      // Delete orphaned files
      for (const filePath of orphanedFiles) {
        try {
          await fs.unlink(filePath);
          console.log(`Deleted orphaned file: ${filePath}`);
        } catch (error) {
          console.error(`Failed to delete orphaned file ${filePath}:`, error.message);
        }
      }

      return orphanedFiles.length;
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  // Generate CDN URL
  generateCDNUrl(filePath) {
    if (!this.cdnEnabled || !this.cdnBaseUrl) {
      return null;
    }

    const relativePath = path.relative(this.uploadPath, filePath);
    return `${this.cdnBaseUrl}/${relativePath.replace(/\\/g, '/')}`;
  }

  // Compress image
  async compressImage(inputPath, outputPath, options = {}) {
    const {
      quality = 85,
      format = 'jpeg',
      progressive = true
    } = options;

    try {
      let operation = sharp(inputPath);

      if (format === 'webp') {
        operation = operation.webp({ quality, effort: 4 });
      } else if (format === 'png') {
        operation = operation.png({ quality, progressive });
      } else {
        operation = operation.jpeg({ quality, progressive });
      }

      await operation.toFile(outputPath);
      
      // Get file sizes for comparison
      const inputStats = await fs.stat(inputPath);
      const outputStats = await fs.stat(outputPath);
      
      return {
        originalSize: inputStats.size,
        compressedSize: outputStats.size,
        compressionRatio: ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  }

  // Generate image placeholder
  async generatePlaceholder(width, height, color = '#cccccc') {
    try {
      const svgPlaceholder = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle" dominant-baseline="middle">
            ${width} × ${height}
          </text>
        </svg>
      `;

      return Buffer.from(svgPlaceholder);
    } catch (error) {
      console.error('Error generating placeholder:', error);
      throw error;
    }
  }

  // Calculate storage usage
  async getStorageUsage() {
    try {
      const MediaAsset = require('../../models').MediaAsset;
      
      const stats = await MediaAsset.findAll({
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize']
        ],
        group: ['category']
      });

      const totalAssets = await MediaAsset.count();
      const totalSize = await MediaAsset.sum('fileSize') || 0;

      return {
        totalAssets,
        totalSize,
        totalSizeFormatted: this.formatFileSize(totalSize),
        byCategory: stats.reduce((acc, stat) => {
          acc[stat.category] = {
            count: parseInt(stat.dataValues.count),
            size: parseInt(stat.dataValues.totalSize || 0),
            sizeFormatted: this.formatFileSize(parseInt(stat.dataValues.totalSize || 0))
          };
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      throw error;
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Verify file integrity
  async verifyFileIntegrity(filePath, expectedHash) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      return actualHash === expectedHash;
    } catch (error) {
      console.error('Error verifying file integrity:', error);
      return false;
    }
  }
}

module.exports = new MediaService();