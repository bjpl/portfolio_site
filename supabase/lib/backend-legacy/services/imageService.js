const path = require('path');

const sharp = require('sharp');

const fs = require('fs').promises;
const crypto = require('crypto');

const config = require('../config');
const logger = require('../utils/logger');

class ImageService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'static', 'uploads');
    this.optimizedDir = path.join(this.uploadDir, 'optimized');
    this.thumbnailDir = path.join(this.uploadDir, 'thumbnails');

    // Image size presets
    this.sizePresets = {
      thumbnail: { width: 150, height: 150, fit: 'cover' },
      small: { width: 320, height: null, fit: 'inside' },
      medium: { width: 768, height: null, fit: 'inside' },
      large: { width: 1024, height: null, fit: 'inside' },
      xlarge: { width: 1920, height: null, fit: 'inside' },
      hero: { width: 1920, height: 1080, fit: 'cover' },
      square: { width: 800, height: 800, fit: 'cover' },
      og: { width: 1200, height: 630, fit: 'cover' }, // Open Graph
    };

    // Supported formats
    this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg'];

    // Quality settings
    this.qualitySettings = {
      jpeg: 85,
      webp: 85,
      avif: 80,
      png: { compressionLevel: 9 },
    };

    this.initDirectories();
  }

  async initDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.optimizedDir, { recursive: true });
      await fs.mkdir(this.thumbnailDir, { recursive: true });

      // Create size-specific directories
      for (const preset of Object.keys(this.sizePresets)) {
        await fs.mkdir(path.join(this.optimizedDir, preset), { recursive: true });
      }
    } catch (error) {
      logger.error('Failed to initialize image directories', error);
    }
  }

  /**
   * Process uploaded image with optimization
   */
  async processImage(inputPath, options = {}) {
    try {
      const {
        generateSizes = ['thumbnail', 'small', 'medium', 'large'],
        formats = ['webp'],
        keepOriginal = true,
        metadata = true,
      } = options;

      // Get image metadata
      const imageMetadata = await sharp(inputPath).metadata();

      // Generate unique filename
      const hash = crypto
        .createHash('md5')
        .update(await fs.readFile(inputPath))
        .digest('hex');
      const ext = path.extname(inputPath);
      const baseName = `${hash}${ext}`;

      const result = {
        original: null,
        optimized: {},
        thumbnail: null,
        metadata: metadata ? imageMetadata : null,
        hash,
      };

      // Process original (optimize without resizing)
      if (keepOriginal) {
        const originalPath = path.join(this.uploadDir, baseName);
        await this.optimizeImage(inputPath, originalPath, {
          width: imageMetadata.width,
          height: imageMetadata.height,
        });
        result.original = `/uploads/${baseName}`;
      }

      // Generate different sizes
      for (const sizeName of generateSizes) {
        const sizeConfig = this.sizePresets[sizeName];
        if (!sizeConfig) continue;

        result.optimized[sizeName] = {};

        // Generate in original format
        const sizedPath = path.join(this.optimizedDir, sizeName, baseName);
        await this.optimizeImage(inputPath, sizedPath, sizeConfig);
        result.optimized[sizeName].original = `/uploads/optimized/${sizeName}/${baseName}`;

        // Generate in additional formats
        for (const format of formats) {
          if (format === imageMetadata.format) continue;

          const formatPath = path.join(this.optimizedDir, sizeName, `${hash}.${format}`);

          await this.optimizeImage(inputPath, formatPath, {
            ...sizeConfig,
            format,
          });

          result.optimized[sizeName][format] = `/uploads/optimized/${sizeName}/${hash}.${format}`;
        }
      }

      // Generate thumbnail separately
      if (generateSizes.includes('thumbnail')) {
        const thumbnailPath = path.join(this.thumbnailDir, baseName);
        await this.optimizeImage(inputPath, thumbnailPath, this.sizePresets.thumbnail);
        result.thumbnail = `/uploads/thumbnails/${baseName}`;
      }

      logger.info('Image processed successfully', { hash, sizes: generateSizes });
      return result;
    } catch (error) {
      logger.error('Image processing failed', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Optimize single image
   */
  async optimizeImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width,
        height,
        fit = 'inside',
        format = null,
        quality = null,
        progressive = true,
        strip = true,
      } = options;

      let pipeline = sharp(inputPath);

      // Resize if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize(width, height, {
          fit,
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        });
      }

      // Strip metadata if requested
      if (strip) {
        pipeline = pipeline.rotate(); // Auto-rotate based on EXIF then strip metadata
      }

      // Convert format if specified
      if (format) {
        const formatQuality = quality || this.qualitySettings[format];

        switch (format) {
          case 'jpeg':
          case 'jpg':
            pipeline = pipeline.jpeg({
              quality: formatQuality,
              progressive,
              mozjpeg: true,
            });
            break;
          case 'webp':
            pipeline = pipeline.webp({
              quality: formatQuality,
              effort: 6,
            });
            break;
          case 'avif':
            pipeline = pipeline.avif({
              quality: formatQuality,
              effort: 6,
            });
            break;
          case 'png':
            pipeline = pipeline.png(formatQuality);
            break;
          default:
            break;
        }
      } else {
        // Optimize in original format
        const imageFormat = path.extname(inputPath).slice(1).toLowerCase();
        const formatQuality = quality || this.qualitySettings[imageFormat];

        if (imageFormat === 'jpeg' || imageFormat === 'jpg') {
          pipeline = pipeline.jpeg({
            quality: formatQuality,
            progressive,
            mozjpeg: true,
          });
        } else if (imageFormat === 'png') {
          pipeline = pipeline.png(formatQuality);
        }
      }

      // Save optimized image
      await pipeline.toFile(outputPath);

      // Get file size for logging
      const stats = await fs.stat(outputPath);
      logger.debug('Image optimized', {
        input: inputPath,
        output: outputPath,
        size: stats.size,
        format: format || 'original',
      });

      return outputPath;
    } catch (error) {
      logger.error('Image optimization failed', { input: inputPath, error });
      throw error;
    }
  }

  /**
   * Generate responsive image srcset
   */
  async generateSrcSet(imagePath, options = {}) {
    const { sizes = ['small', 'medium', 'large', 'xlarge'], format = 'webp' } = options;

    const srcset = [];
    const processedImage = await this.processImage(imagePath, {
      generateSizes: sizes,
      formats: [format],
    });

    for (const size of sizes) {
      const sizeConfig = this.sizePresets[size];
      if (processedImage.optimized[size] && processedImage.optimized[size][format]) {
        srcset.push({
          url: processedImage.optimized[size][format],
          width: sizeConfig.width,
          descriptor: `${sizeConfig.width}w`,
        });
      }
    }

    return {
      srcset: srcset.map(s => `${s.url} ${s.descriptor}`).join(', '),
      sizes: this.generateSizesAttribute(sizes),
      src: processedImage.optimized.large?.[format] || processedImage.original,
    };
  }

  /**
   * Generate sizes attribute for responsive images
   */
  generateSizesAttribute(sizeNames) {
    const breakpoints = {
      small: '(max-width: 640px) 100vw',
      medium: '(max-width: 768px) 100vw',
      large: '(max-width: 1024px) 100vw',
      xlarge: '100vw',
    };

    return sizeNames
      .filter(size => breakpoints[size])
      .map(size => breakpoints[size])
      .join(', ');
  }

  /**
   * Create blur placeholder for lazy loading
   */
  async generateBlurPlaceholder(imagePath) {
    try {
      const buffer = await sharp(imagePath).resize(20, null, { withoutEnlargement: true }).blur(5).toBuffer();

      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (error) {
      logger.error('Failed to generate blur placeholder', error);
      return null;
    }
  }

  /**
   * Extract dominant colors from image
   */
  async extractColors(imagePath, count = 5) {
    try {
      const { dominant } = await sharp(imagePath).stats();

      // Get more detailed color information
      const buffer = await sharp(imagePath)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simple color extraction (could be enhanced with proper clustering)
      const colors = new Map();
      const { data, info } = buffer;
      const pixelCount = info.width * info.height;

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${Math.round(r / 10) * 10},${Math.round(g / 10) * 10},${Math.round(b / 10) * 10}`;

        colors.set(key, (colors.get(key) || 0) + 1);
      }

      // Sort by frequency and get top colors
      const sortedColors = Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([color]) => {
          const [r, g, b] = color.split(',').map(Number);
          return {
            rgb: `rgb(${r}, ${g}, ${b})`,
            hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`,
          };
        });

      return {
        dominant: {
          rgb: `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`,
          hex: `#${((1 << 24) + (dominant.r << 16) + (dominant.g << 8) + dominant.b).toString(16).slice(1)}`,
        },
        palette: sortedColors,
      };
    } catch (error) {
      logger.error('Failed to extract colors', error);
      return null;
    }
  }

  /**
   * Validate image file
   */
  async validateImage(filePath, options = {}) {
    const {
      maxWidth = 4096,
      maxHeight = 4096,
      maxFileSize = 10 * 1024 * 1024, // 10MB
      allowedFormats = this.supportedFormats,
    } = options;

    try {
      const stats = await fs.stat(filePath);

      // Check file size
      if (stats.size > maxFileSize) {
        throw new Error(`File size exceeds maximum of ${maxFileSize / 1024 / 1024}MB`);
      }

      // Check image metadata
      const metadata = await sharp(filePath).metadata();

      // Check format
      if (!allowedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported image format: ${metadata.format}`);
      }

      // Check dimensions
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        throw new Error(`Image dimensions exceed maximum of ${maxWidth}x${maxHeight}`);
      }

      return {
        valid: true,
        metadata,
        fileSize: stats.size,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up old processed images
   */
  async cleanupOldImages(daysOld = 30) {
    try {
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      const directories = [this.optimizedDir, this.thumbnailDir];

      for (const dir of directories) {
        const files = await fs.readdir(dir, { withFileTypes: true });

        for (const file of files) {
          if (file.isDirectory()) {
            // Recursively clean subdirectories
            const subDir = path.join(dir, file.name);
            const subFiles = await fs.readdir(subDir);

            for (const subFile of subFiles) {
              const filePath = path.join(subDir, subFile);
              const stats = await fs.stat(filePath);

              if (stats.mtimeMs < cutoffTime) {
                await fs.unlink(filePath);
                deletedCount++;
              }
            }
          } else {
            const filePath = path.join(dir, file.name);
            const stats = await fs.stat(filePath);

            if (stats.mtimeMs < cutoffTime) {
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        }
      }

      logger.info(`Cleaned up ${deletedCount} old image files`);
      return deletedCount;
    } catch (error) {
      logger.error('Image cleanup failed', error);
      throw error;
    }
  }
}

module.exports = new ImageService();
