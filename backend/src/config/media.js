const path = require('path');

module.exports = {
  // Storage configuration
  storage: {
    uploadDir: path.join(process.cwd(), 'static', 'uploads'),
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
      'application/pdf'
    ]
  },

  // Image processing presets
  imagePresets: {
    thumbnail: { width: 150, height: 150, fit: 'cover', quality: 85 },
    small: { width: 320, quality: 85 },
    medium: { width: 768, quality: 85 },
    large: { width: 1024, quality: 85 },
    xlarge: { width: 1920, quality: 85 },
    hero: { width: 1920, height: 1080, fit: 'cover', quality: 90 },
    og: { width: 1200, height: 630, fit: 'cover', quality: 90 }
  },

  // Video processing presets
  videoPresets: {
    preview: { width: 320, height: 180, bitrate: '500k', fps: 15 },
    mobile: { width: 480, height: 270, bitrate: '800k', fps: 24 },
    sd: { width: 640, height: 360, bitrate: '1200k', fps: 30 },
    hd: { width: 1280, height: 720, bitrate: '2500k', fps: 30 },
    fullhd: { width: 1920, height: 1080, bitrate: '5000k', fps: 30 }
  },

  // CDN configuration
  cdn: {
    provider: process.env.CDN_PROVIDER || 'local',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET,
      cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
      cloudFrontDistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    },
    cloudflare: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      accountHash: process.env.CLOUDFLARE_ACCOUNT_HASH,
      apiToken: process.env.CLOUDFLARE_API_TOKEN
    },
    localCDN: {
      baseUrl: process.env.LOCAL_CDN_BASE_URL || '',
      enabled: process.env.LOCAL_CDN_ENABLED === 'true'
    }
  },

  // Analytics configuration
  analytics: {
    enabled: process.env.MEDIA_ANALYTICS_ENABLED !== 'false',
    retentionDays: parseInt(process.env.MEDIA_ANALYTICS_RETENTION_DAYS) || 365,
    enableRealTime: process.env.MEDIA_ANALYTICS_REALTIME !== 'false',
    aggregationInterval: parseInt(process.env.MEDIA_ANALYTICS_AGGREGATION_INTERVAL) || 3600000 // 1 hour
  },

  // Optimization settings
  optimization: {
    enableWebP: true,
    enableAVIF: true,
    enableBrotli: true,
    enableGzip: true,
    cacheMaxAge: 31536000, // 1 year
    autoOptimize: process.env.AUTO_OPTIMIZE_MEDIA !== 'false',
    cleanupOldFiles: process.env.CLEANUP_OLD_FILES !== 'false',
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 86400000 // 24 hours
  },

  // Video transcoding
  video: {
    enabled: process.env.VIDEO_TRANSCODING_ENABLED !== 'false',
    maxDuration: parseInt(process.env.MAX_VIDEO_DURATION) || 3600, // 1 hour
    generateHLS: process.env.GENERATE_HLS === 'true',
    extractCaptions: process.env.EXTRACT_CAPTIONS === 'true'
  },

  // Security settings
  security: {
    sanitizeFilenames: true,
    checkMimeTypes: true,
    scanForMalware: process.env.SCAN_FOR_MALWARE === 'true',
    allowExecutables: false,
    maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 10
  },

  // Database configuration
  database: {
    path: path.join(process.cwd(), 'backend', 'data', 'media.db'),
    analyticsPath: path.join(process.cwd(), 'backend', 'data', 'analytics.db'),
    enableWAL: true,
    enableForeignKeys: true
  }
};