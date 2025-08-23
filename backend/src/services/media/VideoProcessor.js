const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

/**
 * Advanced Video Processing Service
 * Handles video transcoding, compression, and thumbnail generation
 */
class VideoProcessor {
  constructor(options = {}) {
    this.config = {
      maxDuration: options.maxDuration || 3600, // 1 hour
      maxFileSize: options.maxFileSize || 1000 * 1024 * 1024, // 1GB
      outputDir: options.outputDir || path.join(process.cwd(), 'static', 'uploads', 'processed', 'videos'),
      tempDir: options.tempDir || path.join(process.cwd(), 'static', 'uploads', 'temp'),
      ...options
    };

    this.presets = {
      // Mobile-first presets
      preview: {
        width: 320,
        height: 180,
        videoBitrate: '300k',
        audioBitrate: '64k',
        fps: 15,
        format: 'mp4'
      },
      mobile: {
        width: 480,
        height: 270,
        videoBitrate: '500k',
        audioBitrate: '96k',
        fps: 24,
        format: 'mp4'
      },
      sd: {
        width: 640,
        height: 360,
        videoBitrate: '800k',
        audioBitrate: '128k',
        fps: 30,
        format: 'mp4'
      },
      hd: {
        width: 1280,
        height: 720,
        videoBitrate: '2000k',
        audioBitrate: '192k',
        fps: 30,
        format: 'mp4'
      },
      fullhd: {
        width: 1920,
        height: 1080,
        videoBitrate: '4000k',
        audioBitrate: '256k',
        fps: 30,
        format: 'mp4'
      },
      // Modern formats
      webm_hd: {
        width: 1280,
        height: 720,
        videoBitrate: '1500k',
        audioBitrate: '128k',
        fps: 30,
        format: 'webm',
        codec: 'libvpx-vp9'
      },
      av1_hd: {
        width: 1280,
        height: 720,
        videoBitrate: '1000k',
        audioBitrate: '128k',
        fps: 30,
        format: 'mp4',
        codec: 'libsvtav1'
      }
    };

    this.supportedInputFormats = [
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'ogv', '3gp'
    ];
  }

  /**
   * Process video with multiple quality variants
   */
  async processVideo(inputPath, outputBaseName, options = {}) {
    try {
      const metadata = await this.getVideoMetadata(inputPath);
      
      // Validate input
      await this.validateVideo(inputPath, metadata);
      
      const results = {
        metadata,
        variants: [],
        thumbnails: [],
        originalSize: (await fs.stat(inputPath)).size
      };

      // Determine which presets to generate based on input resolution
      const targetPresets = this.selectOptimalPresets(metadata);
      
      // Generate thumbnails first
      results.thumbnails = await this.generateThumbnails(inputPath, outputBaseName);
      
      // Process each preset
      for (const presetName of targetPresets) {
        const preset = this.presets[presetName];
        const outputPath = path.join(
          this.config.outputDir,
          `${outputBaseName}_${presetName}.${preset.format}`
        );

        try {
          await this.transcodeVideo(inputPath, outputPath, preset, {
            onProgress: options.onProgress
          });

          const outputStats = await fs.stat(outputPath);
          
          results.variants.push({
            preset: presetName,
            path: outputPath,
            url: this.getPublicUrl(outputPath),
            width: preset.width,
            height: preset.height,
            bitrate: preset.videoBitrate,
            format: preset.format,
            size: outputStats.size,
            compressionRatio: (1 - outputStats.size / results.originalSize) * 100
          });

          logger.info('Video variant generated', {
            preset: presetName,
            size: outputStats.size,
            compression: `${((1 - outputStats.size / results.originalSize) * 100).toFixed(1)}%`
          });

        } catch (error) {
          logger.error(`Failed to generate ${presetName} variant`, error);
          // Continue with other presets
        }
      }

      // Generate adaptive streaming manifest (HLS)
      if (options.generateHLS) {
        results.hls = await this.generateHLSPlaylist(inputPath, outputBaseName);
      }

      // Generate WebVTT captions if requested
      if (options.extractCaptions) {
        results.captions = await this.extractCaptions(inputPath, outputBaseName);
      }

      return results;

    } catch (error) {
      logger.error('Video processing failed', { inputPath, error });
      throw error;
    }
  }

  /**
   * Get comprehensive video metadata
   */
  async getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const result = {
          duration: parseFloat(metadata.format.duration) || 0,
          bitrate: parseInt(metadata.format.bit_rate) || 0,
          size: parseInt(metadata.format.size) || 0,
          format: metadata.format.format_name,
          video: {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate) || 0,
            bitrate: parseInt(videoStream.bit_rate) || 0,
            pixelFormat: videoStream.pix_fmt,
            profile: videoStream.profile,
            level: videoStream.level
          },
          audio: audioStream ? {
            codec: audioStream.codec_name,
            bitrate: parseInt(audioStream.bit_rate) || 0,
            sampleRate: parseInt(audioStream.sample_rate) || 0,
            channels: audioStream.channels,
            language: audioStream.tags?.language
          } : null,
          chapters: metadata.chapters || [],
          metadata: metadata.format.tags || {}
        };

        resolve(result);
      });
    });
  }

  /**
   * Validate video before processing
   */
  async validateVideo(inputPath, metadata) {
    // Check duration
    if (metadata.duration > this.config.maxDuration) {
      throw new Error(`Video duration (${metadata.duration}s) exceeds maximum (${this.config.maxDuration}s)`);
    }

    // Check file size
    const stats = await fs.stat(inputPath);
    if (stats.size > this.config.maxFileSize) {
      throw new Error(`File size (${stats.size}) exceeds maximum (${this.config.maxFileSize})`);
    }

    // Check format
    const inputFormat = path.extname(inputPath).slice(1).toLowerCase();
    if (!this.supportedInputFormats.includes(inputFormat)) {
      throw new Error(`Unsupported video format: ${inputFormat}`);
    }

    // Check if video has required streams
    if (!metadata.video) {
      throw new Error('No video stream found in file');
    }
  }

  /**
   * Select optimal presets based on input resolution
   */
  selectOptimalPresets(metadata) {
    const { width, height } = metadata.video;
    const resolution = width * height;
    
    const presets = ['preview']; // Always generate preview
    
    // Add presets based on input resolution
    if (resolution >= 480 * 270) presets.push('mobile');
    if (resolution >= 640 * 360) presets.push('sd');
    if (resolution >= 1280 * 720) {
      presets.push('hd');
      presets.push('webm_hd'); // Modern format
    }
    if (resolution >= 1920 * 1080) {
      presets.push('fullhd');
      // Add AV1 for high-resolution content if encoder available
      if (this.hasAV1Encoder()) {
        presets.push('av1_hd');
      }
    }
    
    return presets;
  }

  /**
   * Transcode video to specific preset
   */
  async transcodeVideo(inputPath, outputPath, preset, options = {}) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .videoBitrate(preset.videoBitrate)
        .size(`${preset.width}x${preset.height}`)
        .fps(preset.fps)
        .autopad(true, 'black')
        .aspect('16:9');

      // Video codec configuration
      if (preset.codec === 'libvpx-vp9') {
        command = command
          .videoCodec('libvpx-vp9')
          .outputOptions([
            '-crf 30',
            '-b:v 0',
            '-tile-columns 4',
            '-frame-parallel 1',
            '-auto-alt-ref 1',
            '-lag-in-frames 25'
          ]);
      } else if (preset.codec === 'libsvtav1') {
        command = command
          .videoCodec('libsvtav1')
          .outputOptions([
            '-crf 35',
            '-preset 8'
          ]);
      } else {
        // Default H.264
        command = command
          .videoCodec('libx264')
          .outputOptions([
            '-preset medium',
            '-crf 23',
            '-profile:v main',
            '-level 4.0',
            '-movflags +faststart' // Web optimization
          ]);
      }

      // Audio configuration
      if (preset.audioBitrate) {
        command = command
          .audioCodec('aac')
          .audioBitrate(preset.audioBitrate)
          .audioChannels(2);
      }

      // Progress tracking
      if (options.onProgress) {
        command.on('progress', (progress) => {
          options.onProgress({
            preset: preset.name,
            percent: progress.percent,
            frames: progress.frames,
            fps: progress.currentFps,
            size: progress.targetSize
          });
        });
      }

      command
        .on('end', () => {
          logger.debug('Video transcoding completed', { outputPath, preset: preset.name });
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Video transcoding failed', { inputPath, outputPath, error: err.message });
          reject(new Error(`Transcoding failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Generate multiple thumbnails at different timestamps
   */
  async generateThumbnails(inputPath, outputBaseName, count = 5) {
    const metadata = await this.getVideoMetadata(inputPath);
    const duration = metadata.duration;
    const thumbnails = [];

    for (let i = 0; i < count; i++) {
      const timestamp = (duration / (count + 1)) * (i + 1);
      const outputPath = path.join(
        this.config.outputDir,
        'thumbnails',
        `${outputBaseName}_thumb_${i + 1}.jpg`
      );

      try {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .screenshots({
              timestamps: [timestamp],
              filename: path.basename(outputPath),
              folder: path.dirname(outputPath),
              size: '320x180'
            })
            .on('end', resolve)
            .on('error', reject);
        });

        thumbnails.push({
          index: i + 1,
          timestamp,
          path: outputPath,
          url: this.getPublicUrl(outputPath)
        });

      } catch (error) {
        logger.error('Failed to generate thumbnail', { timestamp, error });
      }
    }

    return thumbnails;
  }

  /**
   * Generate HLS playlist for adaptive streaming
   */
  async generateHLSPlaylist(inputPath, outputBaseName) {
    const hlsDir = path.join(this.config.outputDir, 'hls', outputBaseName);
    await fs.mkdir(hlsDir, { recursive: true });

    const playlistPath = path.join(hlsDir, 'playlist.m3u8');
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-hls_time 10',
          '-hls_list_size 0',
          '-hls_segment_filename ' + path.join(hlsDir, 'segment_%03d.ts'),
          '-f hls'
        ])
        .output(playlistPath)
        .on('end', () => {
          resolve({
            playlist: this.getPublicUrl(playlistPath),
            directory: this.getPublicUrl(hlsDir)
          });
        })
        .on('error', reject)
        .run();
    });
  }

  /**
   * Extract captions/subtitles from video
   */
  async extractCaptions(inputPath, outputBaseName) {
    const outputPath = path.join(
      this.config.outputDir,
      'captions',
      `${outputBaseName}.vtt`
    );

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    try {
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions(['-c:s webvtt'])
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      return {
        vtt: this.getPublicUrl(outputPath),
        language: 'en' // Could be detected or specified
      };
    } catch (error) {
      logger.warn('Failed to extract captions', { inputPath, error });
      return null;
    }
  }

  /**
   * Generate video poster image
   */
  async generatePoster(inputPath, outputPath, timestamp = '10%') {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1280x720'
        })
        .on('end', () => resolve(this.getPublicUrl(outputPath)))
        .on('error', reject);
    });
  }

  /**
   * Compress video for storage optimization
   */
  async compressVideo(inputPath, outputPath, options = {}) {
    const { targetSize, quality = 'medium' } = options;
    
    const metadata = await this.getVideoMetadata(inputPath);
    const originalSize = (await fs.stat(inputPath)).size;
    
    // Calculate target bitrate if size is specified
    let videoBitrate;
    if (targetSize) {
      const audioBitrate = 128; // kbps
      const duration = metadata.duration;
      const targetBitrate = Math.floor((targetSize * 8) / duration / 1000) - audioBitrate;
      videoBitrate = Math.max(targetBitrate, 100) + 'k'; // Minimum 100k
    }

    const presets = {
      low: { crf: 28, preset: 'slow' },
      medium: { crf: 23, preset: 'medium' },
      high: { crf: 18, preset: 'slow' }
    };

    const config = presets[quality] || presets.medium;

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .outputOptions([
          `-crf ${config.crf}`,
          `-preset ${config.preset}`,
          '-movflags +faststart'
        ])
        .audioCodec('aac')
        .audioBitrate('128k');

      if (videoBitrate) {
        command = command.videoBitrate(videoBitrate);
      }

      command
        .on('end', async () => {
          const compressedSize = (await fs.stat(outputPath)).size;
          const compressionRatio = (1 - compressedSize / originalSize) * 100;
          
          resolve({
            originalSize,
            compressedSize,
            compressionRatio,
            savedBytes: originalSize - compressedSize
          });
        })
        .on('error', reject)
        .run();
    });
  }

  /**
   * Create video sprite for scrubbing preview
   */
  async generateVideoSprite(inputPath, outputBaseName, options = {}) {
    const { interval = 10, width = 160, height = 90, columns = 10 } = options;
    
    const metadata = await this.getVideoMetadata(inputPath);
    const duration = metadata.duration;
    const frameCount = Math.floor(duration / interval);
    
    const spritePath = path.join(
      this.config.outputDir,
      'sprites',
      `${outputBaseName}_sprite.jpg`
    );
    
    await fs.mkdir(path.dirname(spritePath), { recursive: true });

    // Generate individual frames
    const tempDir = path.join(this.config.tempDir, 'sprite_frames');
    await fs.mkdir(tempDir, { recursive: true });

    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * interval;
      const framePath = path.join(tempDir, `frame_${i.toString().padStart(4, '0')}.jpg`);
      
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [timestamp],
            filename: path.basename(framePath),
            folder: path.dirname(framePath),
            size: `${width}x${height}`
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      frames.push({ timestamp, path: framePath });
    }

    // Combine frames into sprite using ImageMagick or similar
    // For now, return frame information
    return {
      sprite: this.getPublicUrl(spritePath),
      frames: frames.map(f => ({ timestamp: f.timestamp })),
      frameWidth: width,
      frameHeight: height,
      columns
    };
  }

  /**
   * Check if AV1 encoder is available
   */
  hasAV1Encoder() {
    // This would check if libsvtav1 or libaom-av1 is available
    // For now, return false as it requires special setup
    return false;
  }

  /**
   * Get public URL for file path
   */
  getPublicUrl(filePath) {
    return filePath.replace(path.join(process.cwd(), 'static'), '').replace(/\\/g, '/');
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(tempDir) {
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      logger.warn('Failed to cleanup temp directory', { tempDir, error });
    }
  }
}

module.exports = VideoProcessor;