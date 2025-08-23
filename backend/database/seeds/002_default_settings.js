/**
 * Seed: Default Settings
 * Creates system-wide configuration settings
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const defaultSettings = [
  // Site Configuration
  {
    key: 'site.name',
    value: 'Portfolio Site',
    type: 'string',
    category: 'site',
    description: 'Site name displayed in header and meta tags',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'site.description',
    value: 'A modern portfolio and blog site for showcasing projects and sharing insights',
    type: 'string',
    category: 'site',
    description: 'Site description for SEO and meta tags',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'site.url',
    value: 'https://localhost:3000',
    type: 'string',
    category: 'site',
    description: 'Primary site URL',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'site.logo_url',
    value: '/images/logo.png',
    type: 'string',
    category: 'site',
    description: 'Site logo URL',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'site.favicon_url',
    value: '/favicon.ico',
    type: 'string',
    category: 'site',
    description: 'Site favicon URL',
    isPublic: true,
    isEditable: true
  },

  // SEO Configuration
  {
    key: 'seo.default_title',
    value: 'Portfolio Site - Projects & Blog',
    type: 'string',
    category: 'seo',
    description: 'Default page title template',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'seo.title_separator',
    value: ' | ',
    type: 'string',
    category: 'seo',
    description: 'Separator for page titles',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'seo.og_image_default',
    value: '/images/og-default.jpg',
    type: 'string',
    category: 'seo',
    description: 'Default Open Graph image',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'seo.twitter_handle',
    value: '@portfoliosite',
    type: 'string',
    category: 'seo',
    description: 'Twitter handle for Twitter Cards',
    isPublic: true,
    isEditable: true
  },

  // Content Configuration
  {
    key: 'content.projects_per_page',
    value: 12,
    type: 'number',
    category: 'content',
    description: 'Number of projects to display per page',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'content.blog_posts_per_page',
    value: 10,
    type: 'number',
    category: 'content',
    description: 'Number of blog posts to display per page',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'content.featured_projects_count',
    value: 6,
    type: 'number',
    category: 'content',
    description: 'Number of featured projects to show on homepage',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'content.recent_posts_count',
    value: 5,
    type: 'number',
    category: 'content',
    description: 'Number of recent blog posts to show on homepage',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'content.auto_excerpt_length',
    value: 200,
    type: 'number',
    category: 'content',
    description: 'Auto-generated excerpt length in characters',
    isPublic: false,
    isEditable: true
  },

  // Comment System
  {
    key: 'comments.enabled',
    value: true,
    type: 'boolean',
    category: 'comments',
    description: 'Enable comment system site-wide',
    isPublic: true,
    isEditable: true
  },
  {
    key: 'comments.require_approval',
    value: true,
    type: 'boolean',
    category: 'comments',
    description: 'Require approval for new comments',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'comments.allow_guests',
    value: false,
    type: 'boolean',
    category: 'comments',
    description: 'Allow comments from non-registered users',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'comments.max_depth',
    value: 5,
    type: 'number',
    category: 'comments',
    description: 'Maximum nesting depth for comment replies',
    isPublic: false,
    isEditable: true
  },

  // Media Configuration
  {
    key: 'media.max_upload_size',
    value: 10485760, // 10MB
    type: 'number',
    category: 'media',
    description: 'Maximum file upload size in bytes',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'media.allowed_image_types',
    value: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    type: 'array',
    category: 'media',
    description: 'Allowed image MIME types',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'media.allowed_video_types',
    value: ['video/mp4', 'video/webm', 'video/ogg'],
    type: 'array',
    category: 'media',
    description: 'Allowed video MIME types',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'media.thumbnail_sizes',
    value: {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 800, height: 600 }
    },
    type: 'object',
    category: 'media',
    description: 'Thumbnail generation sizes',
    isPublic: false,
    isEditable: true
  },

  // Analytics Configuration
  {
    key: 'analytics.enabled',
    value: true,
    type: 'boolean',
    category: 'analytics',
    description: 'Enable analytics tracking',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'analytics.google_analytics_id',
    value: '',
    type: 'string',
    category: 'analytics',
    description: 'Google Analytics tracking ID',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'analytics.track_pageviews',
    value: true,
    type: 'boolean',
    category: 'analytics',
    description: 'Track page views',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'analytics.track_events',
    value: true,
    type: 'boolean',
    category: 'analytics',
    description: 'Track custom events',
    isPublic: false,
    isEditable: true
  },

  // Security Configuration
  {
    key: 'security.password_min_length',
    value: 8,
    type: 'number',
    category: 'security',
    description: 'Minimum password length',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'security.password_require_uppercase',
    value: true,
    type: 'boolean',
    category: 'security',
    description: 'Require uppercase letter in passwords',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'security.password_require_lowercase',
    value: true,
    type: 'boolean',
    category: 'security',
    description: 'Require lowercase letter in passwords',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'security.password_require_numbers',
    value: true,
    type: 'boolean',
    category: 'security',
    description: 'Require numbers in passwords',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'security.password_require_symbols',
    value: false,
    type: 'boolean',
    category: 'security',
    description: 'Require symbols in passwords',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'security.max_login_attempts',
    value: 5,
    type: 'number',
    category: 'security',
    description: 'Maximum login attempts before lockout',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'security.lockout_duration',
    value: 300, // 5 minutes
    type: 'number',
    category: 'security',
    description: 'Account lockout duration in seconds',
    isPublic: false,
    isEditable: true
  },

  // Email Configuration
  {
    key: 'email.enabled',
    value: false,
    type: 'boolean',
    category: 'email',
    description: 'Enable email notifications',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'email.from_name',
    value: 'Portfolio Site',
    type: 'string',
    category: 'email',
    description: 'Default sender name for emails',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'email.from_email',
    value: 'noreply@portfoliosite.com',
    type: 'string',
    category: 'email',
    description: 'Default sender email address',
    isPublic: false,
    isEditable: true
  },

  // API Configuration
  {
    key: 'api.rate_limit_requests',
    value: 100,
    type: 'number',
    category: 'api',
    description: 'API rate limit - requests per window',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'api.rate_limit_window',
    value: 900, // 15 minutes
    type: 'number',
    category: 'api',
    description: 'API rate limit window in seconds',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'api.cors_origins',
    value: ['http://localhost:3000', 'https://localhost:3000'],
    type: 'array',
    category: 'api',
    description: 'Allowed CORS origins',
    isPublic: false,
    isEditable: true
  },

  // Cache Configuration
  {
    key: 'cache.enabled',
    value: true,
    type: 'boolean',
    category: 'cache',
    description: 'Enable caching',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'cache.default_ttl',
    value: 3600, // 1 hour
    type: 'number',
    category: 'cache',
    description: 'Default cache TTL in seconds',
    isPublic: false,
    isEditable: true
  },
  {
    key: 'cache.page_cache_ttl',
    value: 300, // 5 minutes
    type: 'number',
    category: 'cache',
    description: 'Page cache TTL in seconds',
    isPublic: false,
    isEditable: true
  }
];

async function seedSettings() {
  try {
    logger.info('Starting settings seeding...');

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const settingData of defaultSettings) {
      // Check if setting already exists
      const existingSetting = await prisma.setting.findUnique({
        where: { key: settingData.key }
      });

      if (existingSetting) {
        // Update if different (but preserve custom values)
        if (!existingSetting.isEditable || 
            JSON.stringify(existingSetting.value) !== JSON.stringify(settingData.value)) {
          
          await prisma.setting.update({
            where: { key: settingData.key },
            data: {
              description: settingData.description,
              category: settingData.category,
              type: settingData.type,
              isPublic: settingData.isPublic,
              isEditable: settingData.isEditable,
              // Only update value if it was never edited
              ...(existingSetting.updatedAt.getTime() === existingSetting.createdAt.getTime() && {
                value: settingData.value
              })
            }
          });

          logger.info(`Updated setting: ${settingData.key}`);
          updatedCount++;
        } else {
          logger.info(`Setting '${settingData.key}' already exists, skipping`);
          skippedCount++;
        }
        continue;
      }

      // Create new setting
      await prisma.setting.create({
        data: settingData
      });

      logger.info(`Created setting: ${settingData.key}`);
      createdCount++;
    }

    logger.info(`Settings seeding completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`);

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: defaultSettings.length
    };

  } catch (error) {
    logger.error('Error seeding settings:', error);
    throw error;
  }
}

async function rollbackSettings() {
  try {
    logger.info('Rolling back settings seeding...');

    const settingKeys = defaultSettings.map(setting => setting.key);
    
    const deletedSettings = await prisma.setting.deleteMany({
      where: {
        key: { in: settingKeys }
      }
    });

    logger.info(`Rollback completed: ${deletedSettings.count} settings deleted`);
    return deletedSettings.count;

  } catch (error) {
    logger.error('Error rolling back settings:', error);
    throw error;
  }
}

// Export for use in main seed file
module.exports = {
  seedSettings,
  rollbackSettings,
  defaultSettings
};

// Run directly if called from command line
if (require.main === module) {
  seedSettings()
    .then((result) => {
      console.log('✅ Settings seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Settings seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}