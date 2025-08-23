const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const ffmpeg = require('fluent-ffmpeg');
const archiver = require('archiver');
const logger = require('../../utils/logger');

/**
 * Comprehensive Media Management System
 * Handles images, videos, and other media assets with:
 * - Advanced image optimization (Sharp)
 * - Video processing and transcoding
 * - CDN integration
 * - Media library with tagging and search
 * - Bulk upload with progress tracking
 * - Responsive image generation
 * - Usage analytics
 */
class MediaManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      uploadDir: path.join(process.cwd(), 'static', 'uploads'),
      dbPath: path.join(process.cwd(), 'backend', 'data', 'media.db'),
      cdnConfig: options.cdn || null,
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
      videoTranscoding: options.videoTranscoding || true,
      ...options
    };

    this.db = null;
    this.processingQueue = new Map();
    this.uploadProgress = new Map();
    
    // Media processing presets
    this.imagePresets = {
      thumbnail: { width: 150, height: 150, fit: 'cover', quality: 85 },
      small: { width: 320, quality: 85 },
      medium: { width: 768, quality: 85 },
      large: { width: 1024, quality: 85 },
      xlarge: { width: 1920, quality: 85 },
      hero: { width: 1920, height: 1080, fit: 'cover', quality: 90 },
      og: { width: 1200, height: 630, fit: 'cover', quality: 90 }
    };

    this.videoPresets = {
      preview: { width: 320, height: 180, bitrate: '500k' },
      sd: { width: 640, height: 360, bitrate: '1000k' },
      hd: { width: 1280, height: 720, bitrate: '2500k' },
      fullhd: { width: 1920, height: 1080, bitrate: '5000k' }
    };

    this.supportedFormats = {
      images: ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg'],
      videos: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
      audio: ['mp3', 'wav', 'aac', 'ogg'],
      documents: ['pdf', 'doc', 'docx', 'txt']
    };

    this.init();
  }

  async init() {
    try {
      await this.initializeDatabase();
      await this.initializeDirectories();
      await this.initializeFFmpeg();
      
      logger.info('MediaManager initialized successfully');
      this.emit('ready');
    } catch (error) {
      logger.error('Failed to initialize MediaManager', error);
      this.emit('error', error);
    }
  }

  async initializeDatabase() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(path.dirname(this.config.dbPath), { recursive: true });
      
      this.db = await open({
        filename: this.config.dbPath,
        driver: sqlite3.Database
      });

      // Create media table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS media (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT UNIQUE NOT NULL,
          original_name TEXT NOT NULL,
          file_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          width INTEGER,
          height INTEGER,
          duration REAL,
          format TEXT NOT NULL,
          variants TEXT, -- JSON array of generated variants
          metadata TEXT, -- JSON metadata
          tags TEXT, -- JSON array of tags
          alt_text TEXT,
          caption TEXT,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          usage_count INTEGER DEFAULT 0,
          last_accessed DATETIME,
          cdn_url TEXT,
          is_processed BOOLEAN DEFAULT FALSE,
          processing_status TEXT DEFAULT 'pending'
        )
      `);

      // Create tags table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          category TEXT,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create usage analytics table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS media_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          media_id INTEGER,
          event_type TEXT NOT NULL, -- view, download, delete
          user_agent TEXT,
          ip_address TEXT,
          referrer TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (media_id) REFERENCES media (id)
        )
      `);

      // Create indexes for performance
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_media_hash ON media(hash);
        CREATE INDEX IF NOT EXISTS idx_media_mime_type ON media(mime_type);
        CREATE INDEX IF NOT EXISTS idx_media_tags ON media(tags);
        CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at);
        CREATE INDEX IF NOT EXISTS idx_analytics_media_id ON media_analytics(media_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON media_analytics(timestamp);
      `);

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  async initializeDirectories() {
    const dirs = [
      this.config.uploadDir,
      path.join(this.config.uploadDir, 'images'),
      path.join(this.config.uploadDir, 'videos'),
      path.join(this.config.uploadDir, 'audio'),
      path.join(this.config.uploadDir, 'documents'),
      path.join(this.config.uploadDir, 'processed'),
      path.join(this.config.uploadDir, 'processed', 'images'),
      path.join(this.config.uploadDir, 'processed', 'videos'),
      path.join(this.config.uploadDir, 'thumbnails'),
      path.join(this.config.uploadDir, 'temp')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async initializeFFmpeg() {
    try {
      // Check if FFmpeg is available
      const ffmpegPath = await new Promise((resolve, reject) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      logger.info('FFmpeg initialized successfully');
    } catch (error) {
      logger.warn('FFmpeg not available, video processing disabled', error);
      this.config.videoTranscoding = false;
    }
  }

  /**
   * Upload and process media file
   */
  async uploadMedia(file, options = {}) {
    const uploadId = crypto.randomUUID();
    
    try {
      this.uploadProgress.set(uploadId, { status: 'starting', progress: 0 });
      this.emit('upload:start', { uploadId, fileName: file.originalname });

      // Generate file hash
      const hash = await this.generateFileHash(file.buffer || file.path);
      
      // Check if file already exists
      const existing = await this.db.get('SELECT * FROM media WHERE hash = ?', hash);
      if (existing) {
        this.uploadProgress.set(uploadId, { status: 'duplicate', progress: 100 });
        this.emit('upload:duplicate', { uploadId, existingId: existing.id });
        return { id: existing.id, duplicate: true };
      }

      this.uploadProgress.set(uploadId, { status: 'processing', progress: 25 });

      // Determine file type and process accordingly
      const fileType = this.getFileType(file.mimetype);
      const fileName = this.generateFileName(file.originalname, hash);
      
      let processResult;
      
      switch (fileType) {
        case 'image':
          processResult = await this.processImage(file, fileName, options);
          break;
        case 'video':
          processResult = await this.processVideo(file, fileName, options);
          break;
        case 'audio':
          processResult = await this.processAudio(file, fileName, options);
          break;
        default:
          processResult = await this.processDocument(file, fileName, options);
      }

      this.uploadProgress.set(uploadId, { status: 'saving', progress: 75 });

      // Save to database
      const mediaId = await this.saveToDatabase({
        hash,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        fileType,
        ...processResult,
        tags: options.tags || [],
        altText: options.altText || '',
        caption: options.caption || ''
      });

      this.uploadProgress.set(uploadId, { status: 'complete', progress: 100 });
      this.emit('upload:complete', { uploadId, mediaId });

      // CDN upload if configured
      if (this.config.cdnConfig) {
        this.uploadToCDN(mediaId).catch(error => {
          logger.error('CDN upload failed', { mediaId, error });
        });
      }

      return { id: mediaId, uploadId };
      
    } catch (error) {
      this.uploadProgress.set(uploadId, { status: 'error', progress: 0, error: error.message });
      this.emit('upload:error', { uploadId, error });
      throw error;
    }
  }

  /**
   * Enhanced image processing with Sharp
   */
  async processImage(file, fileName, options = {}) {
    try {
      const inputPath = file.path || await this.saveTemporaryFile(file.buffer, fileName);
      const metadata = await sharp(inputPath).metadata();
      
      const variants = [];
      const processedDir = path.join(this.config.uploadDir, 'processed', 'images');
      
      // Generate optimized variants
      for (const [presetName, preset] of Object.entries(this.imagePresets)) {
        const variantDir = path.join(processedDir, presetName);
        await fs.mkdir(variantDir, { recursive: true });
        
        // Generate WebP version
        const webpPath = path.join(variantDir, `${path.parse(fileName).name}.webp`);
        await this.generateImageVariant(inputPath, webpPath, { ...preset, format: 'webp' });
        
        // Generate AVIF version (next-gen format)
        const avifPath = path.join(variantDir, `${path.parse(fileName).name}.avif`);
        await this.generateImageVariant(inputPath, avifPath, { ...preset, format: 'avif' });
        
        // Generate JPEG fallback
        const jpegPath = path.join(variantDir, `${path.parse(fileName).name}.jpg`);
        await this.generateImageVariant(inputPath, jpegPath, { ...preset, format: 'jpeg' });
        
        variants.push({
          preset: presetName,
          webp: this.getPublicUrl(webpPath),
          avif: this.getPublicUrl(avifPath),
          jpeg: this.getPublicUrl(jpegPath),
          width: preset.width,
          height: preset.height
        });
      }
      
      // Generate blur placeholder
      const blurPlaceholder = await this.generateBlurPlaceholder(inputPath);
      
      // Extract dominant colors
      const colors = await this.extractDominantColors(inputPath);
      
      // Generate thumbnail
      const thumbnailPath = path.join(this.config.uploadDir, 'thumbnails', fileName);
      await this.generateImageVariant(inputPath, thumbnailPath, {
        width: 200,
        height: 200,
        fit: 'cover',
        format: 'jpeg',
        quality: 85
      });
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        fileSize: metadata.size || (await fs.stat(inputPath)).size,
        variants: JSON.stringify(variants),
        metadata: JSON.stringify({
          ...metadata,
          blurPlaceholder,
          dominantColors: colors,
          hasAlpha: metadata.hasAlpha,
          density: metadata.density,
          isAnimated: metadata.pages > 1
        }),
        thumbnailUrl: this.getPublicUrl(thumbnailPath),
        isProcessed: true,
        processingStatus: 'complete'
      };
      
    } catch (error) {
      logger.error('Image processing failed', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Video processing and transcoding
   */
  async processVideo(file, fileName, options = {}) {
    if (!this.config.videoTranscoding) {
      throw new Error('Video transcoding is not available');
    }
    
    try {
      const inputPath = file.path || await this.saveTemporaryFile(file.buffer, fileName);
      const processedDir = path.join(this.config.uploadDir, 'processed', 'videos');
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);
      
      const variants = [];
      
      // Generate different quality variants
      for (const [presetName, preset] of Object.entries(this.videoPresets)) {
        const outputPath = path.join(processedDir, `${path.parse(fileName).name}_${presetName}.mp4`);
        
        await this.transcodeVideo(inputPath, outputPath, preset);
        
        variants.push({
          preset: presetName,
          url: this.getPublicUrl(outputPath),
          width: preset.width,
          height: preset.height,
          bitrate: preset.bitrate
        });
      }
      
      // Generate video thumbnail
      const thumbnailPath = path.join(this.config.uploadDir, 'thumbnails', `${path.parse(fileName).name}.jpg`);
      await this.generateVideoThumbnail(inputPath, thumbnailPath);
      
      // Generate WebM version for better compression
      const webmPath = path.join(processedDir, `${path.parse(fileName).name}.webm`);
      await this.transcodeVideo(inputPath, webmPath, { format: 'webm', bitrate: '2000k' });
      
      return {
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        format: metadata.format,
        fileSize: (await fs.stat(inputPath)).size,
        variants: JSON.stringify(variants),
        metadata: JSON.stringify(metadata),
        thumbnailUrl: this.getPublicUrl(thumbnailPath),
        isProcessed: true,
        processingStatus: 'complete'
      };
      
    } catch (error) {
      logger.error('Video processing failed', error);
      throw new Error(`Video processing failed: ${error.message}`);
    }
  }

  /**
   * Generate responsive image variant
   */
  async generateImageVariant(inputPath, outputPath, options) {
    const { width, height, fit = 'inside', format, quality = 85 } = options;
    
    let pipeline = sharp(inputPath);
    
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit,
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    }
    
    // Apply format-specific optimizations
    switch (format) {
      case 'webp':
        pipeline = pipeline.webp({ quality, effort: 6 });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality, effort: 6 });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9, palette: true });
        break;
    }
    
    await pipeline.toFile(outputPath);
  }

  /**
   * Generate blur placeholder for lazy loading
   */
  async generateBlurPlaceholder(inputPath) {
    try {
      const buffer = await sharp(inputPath)
        .resize(20, null, { withoutEnlargement: true })
        .blur(5)
        .jpeg({ quality: 50 })
        .toBuffer();
        
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (error) {
      logger.error('Failed to generate blur placeholder', error);
      return null;
    }
  }

  /**
   * Extract dominant colors from image
   */
  async extractDominantColors(inputPath) {
    try {
      const { dominant } = await sharp(inputPath).stats();
      
      // Get color palette
      const buffer = await sharp(inputPath)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      const colors = this.analyzeColors(buffer.data, buffer.info.channels);
      
      return {
        dominant: `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`,
        palette: colors.slice(0, 5)
      };
    } catch (error) {
      logger.error('Failed to extract colors', error);
      return null;
    }
  }

  /**
   * Analyze color palette from image data
   */
  analyzeColors(data, channels) {
    const colorMap = new Map();
    
    for (let i = 0; i < data.length; i += channels) {
      const r = Math.round(data[i] / 10) * 10;
      const g = Math.round(data[i + 1] / 10) * 10;
      const b = Math.round(data[i + 2] / 10) * 10;
      const key = `${r},${g},${b}`;
      
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return `rgb(${r}, ${g}, ${b})`;
      });
  }

  /**
   * Get video metadata using FFmpeg
   */
  async getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        
        resolve({
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          duration: metadata.format?.duration || 0,
          bitrate: metadata.format?.bit_rate || 0,
          format: metadata.format?.format_name || 'unknown',
          codec: videoStream?.codec_name || 'unknown',
          fps: eval(videoStream?.r_frame_rate) || 0
        });
      });
    });
  }

  /**
   * Transcode video to different format/quality
   */
  async transcodeVideo(inputPath, outputPath, options) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .videoBitrate(options.bitrate || '2000k')
        .audioCodec('aac')
        .audioBitrate('128k');
        
      if (options.width && options.height) {
        command = command.size(`${options.width}x${options.height}`);
      }
      
      if (options.format === 'webm') {
        command = command.videoCodec('libvpx-vp9').format('webm');
      } else {
        command = command.videoCodec('libx264').format('mp4');
      }
      
      command
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * Generate video thumbnail
   */
  async generateVideoThumbnail(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x180'
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  /**
   * Process audio files
   */
  async processAudio(file, fileName, options = {}) {
    const inputPath = file.path || await this.saveTemporaryFile(file.buffer, fileName);
    const stats = await fs.stat(inputPath);
    
    return {
      fileSize: stats.size,
      format: path.extname(fileName).slice(1),
      metadata: JSON.stringify({}),
      isProcessed: true,
      processingStatus: 'complete'
    };
  }

  /**
   * Process document files
   */
  async processDocument(file, fileName, options = {}) {
    const inputPath = file.path || await this.saveTemporaryFile(file.buffer, fileName);
    const stats = await fs.stat(inputPath);
    
    return {
      fileSize: stats.size,
      format: path.extname(fileName).slice(1),
      metadata: JSON.stringify({}),
      isProcessed: true,
      processingStatus: 'complete'
    };
  }

  /**
   * Save file to database
   */
  async saveToDatabase(data) {
    const result = await this.db.run(`
      INSERT INTO media (
        hash, original_name, file_name, mime_type, file_size,
        width, height, duration, format, variants, metadata,
        tags, alt_text, caption, is_processed, processing_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.hash,
      data.originalName,
      data.fileName,
      data.mimeType,
      data.fileSize,
      data.width || null,
      data.height || null,
      data.duration || null,
      data.format,
      data.variants || null,
      data.metadata || null,
      JSON.stringify(data.tags || []),
      data.altText || '',
      data.caption || '',
      data.isProcessed || false,
      data.processingStatus || 'pending'
    ]);
    
    return result.lastID;
  }

  /**
   * Bulk upload with progress tracking
   */
  async bulkUpload(files, options = {}) {
    const batchId = crypto.randomUUID();
    const results = [];
    
    this.emit('bulk:start', { batchId, fileCount: files.length });
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadMedia(files[i], options);
        results.push({ success: true, ...result });
        
        this.emit('bulk:progress', {
          batchId,
          completed: i + 1,
          total: files.length,
          progress: Math.round(((i + 1) / files.length) * 100)
        });
      } catch (error) {
        results.push({ success: false, error: error.message, file: files[i].originalname });
      }
    }
    
    this.emit('bulk:complete', { batchId, results });
    return { batchId, results };
  }

  /**
   * Search media with advanced filtering
   */
  async searchMedia(query = {}) {
    const {
      search,
      tags,
      mimeType,
      dateFrom,
      dateTo,
      limit = 50,
      offset = 0,
      sortBy = 'uploaded_at',
      sortOrder = 'DESC'
    } = query;
    
    let sql = 'SELECT * FROM media WHERE 1=1';
    const params = [];
    
    if (search) {
      sql += ' AND (original_name LIKE ? OR alt_text LIKE ? OR caption LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ');
      sql += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }
    
    if (mimeType) {
      sql += ' AND mime_type LIKE ?';
      params.push(`${mimeType}%`);
    }
    
    if (dateFrom) {
      sql += ' AND uploaded_at >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      sql += ' AND uploaded_at <= ?';
      params.push(dateTo);
    }
    
    sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const results = await this.db.all(sql, params);
    
    // Parse JSON fields
    return results.map(row => ({
      ...row,
      variants: row.variants ? JSON.parse(row.variants) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));
  }

  /**
   * Add tags to media
   */
  async addTags(mediaId, tags) {
    const media = await this.db.get('SELECT tags FROM media WHERE id = ?', mediaId);
    if (!media) throw new Error('Media not found');
    
    const currentTags = media.tags ? JSON.parse(media.tags) : [];
    const newTags = [...new Set([...currentTags, ...tags])];
    
    await this.db.run('UPDATE media SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      JSON.stringify(newTags), mediaId);
    
    // Update tag usage statistics
    for (const tag of tags) {
      await this.db.run(`
        INSERT INTO tags (name, usage_count) VALUES (?, 1)
        ON CONFLICT(name) DO UPDATE SET usage_count = usage_count + 1
      `, tag);
    }
    
    return newTags;
  }

  /**
   * Track media usage analytics
   */
  async trackUsage(mediaId, eventType, metadata = {}) {
    await this.db.run(`
      INSERT INTO media_analytics (media_id, event_type, user_agent, ip_address, referrer)
      VALUES (?, ?, ?, ?, ?)
    `, [
      mediaId,
      eventType,
      metadata.userAgent || null,
      metadata.ipAddress || null,
      metadata.referrer || null
    ]);
    
    // Update usage count on media
    await this.db.run(`
      UPDATE media SET 
        usage_count = usage_count + 1,
        last_accessed = CURRENT_TIMESTAMP
      WHERE id = ?
    `, mediaId);
  }

  /**
   * Get usage analytics
   */
  async getAnalytics(timeframe = '30d') {
    const timeCondition = {
      '24h': 'timestamp >= datetime("now", "-1 day")',
      '7d': 'timestamp >= datetime("now", "-7 days")',
      '30d': 'timestamp >= datetime("now", "-30 days")',
      '90d': 'timestamp >= datetime("now", "-90 days")',
      '1y': 'timestamp >= datetime("now", "-1 year")'
    }[timeframe] || 'timestamp >= datetime("now", "-30 days")';
    
    const [totalViews, topMedia, eventBreakdown, storageStats] = await Promise.all([
      this.db.get(`
        SELECT COUNT(*) as total FROM media_analytics 
        WHERE ${timeCondition}
      `),
      this.db.all(`
        SELECT m.id, m.original_name, m.mime_type, COUNT(a.id) as views
        FROM media m
        LEFT JOIN media_analytics a ON m.id = a.media_id
        WHERE ${timeCondition}
        GROUP BY m.id
        ORDER BY views DESC
        LIMIT 10
      `),
      this.db.all(`
        SELECT event_type, COUNT(*) as count
        FROM media_analytics
        WHERE ${timeCondition}
        GROUP BY event_type
      `),
      this.getStorageStatistics()
    ]);
    
    return {
      totalViews: totalViews.total,
      topMedia,
      eventBreakdown,
      storageStats,
      timeframe
    };
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics() {
    const stats = await this.db.all(`
      SELECT 
        CASE 
          WHEN mime_type LIKE 'image/%' THEN 'images'
          WHEN mime_type LIKE 'video/%' THEN 'videos'
          WHEN mime_type LIKE 'audio/%' THEN 'audio'
          ELSE 'documents'
        END as type,
        COUNT(*) as count,
        SUM(file_size) as total_size,
        AVG(file_size) as avg_size
      FROM media
      GROUP BY type
    `);
    
    const total = await this.db.get('SELECT COUNT(*) as count, SUM(file_size) as size FROM media');
    
    return {
      total: { count: total.count, size: total.size },
      byType: stats
    };
  }

  /**
   * CDN Integration
   */
  async uploadToCDN(mediaId) {
    if (!this.config.cdnConfig) return;
    
    const media = await this.db.get('SELECT * FROM media WHERE id = ?', mediaId);
    if (!media) throw new Error('Media not found');
    
    try {
      // Implementation depends on CDN provider (AWS S3, Cloudinary, etc.)
      const cdnUrl = await this.uploadToProvider(media);
      
      await this.db.run('UPDATE media SET cdn_url = ? WHERE id = ?', cdnUrl, mediaId);
      
      this.emit('cdn:upload:success', { mediaId, cdnUrl });
      return cdnUrl;
    } catch (error) {
      this.emit('cdn:upload:error', { mediaId, error });
      throw error;
    }
  }

  /**
   * Storage optimization and cleanup
   */
  async optimizeStorage(options = {}) {
    const {
      removeUnused = false,
      unusedDays = 30,
      compressOldImages = true,
      removeOldVariants = true
    } = options;
    
    let optimized = 0;
    
    if (removeUnused) {
      const unused = await this.db.all(`
        SELECT id FROM media 
        WHERE usage_count = 0 
        AND uploaded_at < datetime('now', '-${unusedDays} days')
      `);
      
      for (const media of unused) {
        await this.deleteMedia(media.id);
        optimized++;
      }
    }
    
    if (compressOldImages) {
      // Implement additional compression for old images
      optimized += await this.compressOldImages();
    }
    
    return { optimized, message: `Optimized ${optimized} items` };
  }

  /**
   * Helper methods
   */
  async generateFileHash(input) {
    const hash = crypto.createHash('sha256');
    
    if (Buffer.isBuffer(input)) {
      hash.update(input);
    } else {
      const data = await fs.readFile(input);
      hash.update(data);
    }
    
    return hash.digest('hex');
  }

  generateFileName(originalName, hash) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext).toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20);
    
    return `${name}-${hash.slice(0, 8)}${ext}`;
  }

  getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  getPublicUrl(filePath) {
    return filePath.replace(this.config.uploadDir, '/uploads');
  }

  async saveTemporaryFile(buffer, fileName) {
    const tempPath = path.join(this.config.uploadDir, 'temp', fileName);
    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  getUploadProgress(uploadId) {
    return this.uploadProgress.get(uploadId) || { status: 'not_found' };
  }

  /**
   * Cleanup resources
   */
  async close() {
    if (this.db) {
      await this.db.close();
    }
    this.removeAllListeners();
  }
}

module.exports = MediaManager;