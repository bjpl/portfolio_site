/**
 * Route Configuration
 * Defines which routes are public, protected, or admin-only
 */

module.exports = {
  // Completely public routes (no auth needed)
  public: {
    // Portfolio content - publicly accessible
    portfolio: [
      'GET /api/portfolio/projects',
      'GET /api/portfolio/projects/featured',
      'GET /api/portfolio/projects/:slug',
      'GET /api/portfolio/skills',
      'GET /api/portfolio/experience',
      'GET /api/portfolio/testimonials',
      'POST /api/portfolio/contact', // Contact form is public
    ],

    // Public content endpoints
    content: [
      'GET /api/content/learn',
      'GET /api/content/learn/:path',
      'GET /api/content/make',
      'GET /api/content/make/:path',
      'GET /api/content/meet',
      'GET /api/content/meet/:path',
      'GET /api/content/think',
      'GET /api/content/think/:path',
      'GET /api/content/search',
      'GET /api/content/tags',
      'GET /api/content/categories',
      'GET /api/content/related/:id',
      'GET /api/content/recent',
      'GET /api/content/popular',
    ],

    // Public blog/posts
    blog: [
      'GET /api/posts',
      'GET /api/posts/:slug',
      'GET /api/posts/category/:category',
      'GET /api/posts/tag/:tag',
      'GET /api/posts/archive/:year/:month',
    ],

    // Public assets and media
    assets: ['GET /api/media/:id', 'GET /api/assets/*', 'GET /uploads/*', 'GET /images/*'],

    // Health and status endpoints
    system: ['GET /api/health', 'GET /api/status', 'GET /api/version'],

    // Authentication endpoints (must be public for login)
    auth: [
      'POST /api/auth/login',
      'POST /api/auth/register', // If you allow public registration
      'POST /api/auth/forgot',
      'POST /api/auth/reset',
      'GET /api/auth/verify/:token',
      'POST /api/auth/refresh',
    ],

    // RSS/Feed endpoints
    feeds: ['GET /api/feed', 'GET /api/feed.xml', 'GET /api/sitemap.xml', 'GET /api/robots.txt'],

    // Translation endpoints (public for site functionality)
    translate: [
      'GET /api/translate/status',
      'GET /api/translate/languages',
      'POST /api/translate',
      'POST /api/translate/batch',
      'POST /api/translate/content',
    ],
  },

  // Routes that work with optional auth (enhanced features when logged in)
  optionalAuth: {
    portfolio: [
      'GET /api/portfolio/analytics/:id', // Basic analytics public, detailed when auth
    ],

    content: [
      'POST /api/content/:id/like', // Can like anonymously or as user
      'GET /api/content/:id/comments', // View comments publicly
      'POST /api/content/:id/comment', // Comment as guest or user
    ],
  },

  // Protected routes (require authentication)
  protected: {
    // User profile and settings
    user: [
      'GET /api/user/profile',
      'PUT /api/user/profile',
      'GET /api/user/settings',
      'PUT /api/user/settings',
      'POST /api/user/change-password',
      'DELETE /api/user/account',
      'GET /api/user/sessions',
      'DELETE /api/user/sessions/:id',
    ],

    // Author tools (for content creators)
    author: [
      'GET /api/author/drafts',
      'POST /api/author/drafts',
      'PUT /api/author/drafts/:id',
      'DELETE /api/author/drafts/:id',
      'GET /api/author/stats',
      'GET /api/author/comments',
    ],

    // Basic analytics for authors
    analytics: ['GET /api/analytics/views', 'GET /api/analytics/visitors', 'GET /api/analytics/referrers'],
  },

  // Admin and editor routes (require specific roles)
  admin: {
    // Content management
    content: [
      'POST /api/admin/content',
      'PUT /api/admin/content/:id',
      'DELETE /api/admin/content/:id',
      'POST /api/admin/content/:id/publish',
      'POST /api/admin/content/:id/unpublish',
      'POST /api/admin/content/bulk-action',
    ],

    // User management
    users: [
      'GET /api/admin/users',
      'GET /api/admin/users/:id',
      'POST /api/admin/users',
      'PUT /api/admin/users/:id',
      'DELETE /api/admin/users/:id',
      'POST /api/admin/users/:id/suspend',
      'POST /api/admin/users/:id/activate',
      'PUT /api/admin/users/:id/role',
    ],

    // System administration
    system: [
      'GET /api/admin/logs',
      'GET /api/admin/errors',
      'GET /api/admin/audit',
      'POST /api/admin/cache/clear',
      'GET /api/admin/backups',
      'POST /api/admin/backups',
      'POST /api/admin/maintenance',
    ],

    // Analytics and reporting
    analytics: [
      'GET /api/admin/analytics',
      'GET /api/admin/analytics/export',
      'GET /api/admin/reports',
      'POST /api/admin/reports/generate',
    ],

    // Media management
    media: [
      'POST /api/admin/media/upload',
      'DELETE /api/admin/media/:id',
      'PUT /api/admin/media/:id',
      'POST /api/admin/media/bulk-upload',
      'POST /api/admin/media/optimize',
    ],

    // Settings and configuration
    settings: [
      'GET /api/admin/settings',
      'PUT /api/admin/settings',
      'GET /api/admin/settings/email',
      'PUT /api/admin/settings/email',
      'POST /api/admin/settings/test-email',
    ],
  },

  // Development tools (only in development mode or admin in production)
  devTools: {
    // All routes under /api/dev/* require admin auth
    routes: ['/api/dev/*', '/api/debug/*', '/api/test/*'],

    // Specific dev tools
    tools: [
      'GET /api/dev/routes',
      'GET /api/dev/config',
      'GET /api/dev/cache/inspect',
      'POST /api/dev/cache/clear',
      'GET /api/dev/db/schema',
      'POST /api/dev/db/seed',
      'POST /api/dev/db/reset',
      'GET /api/dev/logs/tail',
      'GET /api/dev/metrics',
      'POST /api/dev/test-error',
      'GET /api/dev/session-info',
    ],

    // Admin panel routes
    adminPanel: ['/admin', '/admin/*', '/dashboard', '/dashboard/*'],
  },

  // Review and editing tools
  editorial: {
    // Review system
    review: [
      'GET /api/review/drafts',
      'GET /api/review/content/:path',
      'POST /api/review/publish/:path',
      'GET /api/review/stats/:path',
      'POST /api/review/accessibility',
      'GET /api/review/seo/:path',
      'POST /api/review/bulk-publish',
    ],

    // Bulk operations
    bulk: [
      'GET /api/bulk/content',
      'POST /api/bulk/upload',
      'PUT /api/bulk/update',
      'DELETE /api/bulk/delete',
      'POST /api/bulk/export',
      'POST /api/bulk/import',
    ],

    // Versioning system
    versioning: [
      'GET /api/versions/:contentId/history',
      'POST /api/versions',
      'GET /api/versions/:versionId1/compare/:versionId2',
      'POST /api/versions/:versionId/restore',
      'POST /api/versions/:versionId/publish',
      'POST /api/versions/:versionId/branch',
      'POST /api/versions/merge',
      'POST /api/versions/:versionId/schedule',
      'POST /api/versions/process-scheduled',
      'DELETE /api/versions/cleanup',
    ],
  },

  // WebSocket endpoints (require auth for certain features)
  websocket: {
    public: [
      '/ws/updates', // Public updates feed
      '/ws/notifications', // Public notifications
    ],

    protected: [
      '/ws/admin', // Admin real-time dashboard
      '/ws/editor', // Collaborative editing
      '/ws/chat', // Internal chat
    ],
  },
};

/**
 * Helper function to check if a route is public
 */
function isPublicRoute(method, path) {
  const publicRoutes = [];

  // Flatten all public routes
  Object.values(module.exports.public).forEach(routes => {
    publicRoutes.push(...routes);
  });

  const routeString = `${method.toUpperCase()} ${path}`;

  return publicRoutes.some(route => {
    // Handle wildcards
    if (route.includes('*')) {
      const pattern = route.replace(/\*/g, '.*').replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(routeString);
    }

    // Handle path parameters
    const pattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(routeString);
  });
}

/**
 * Helper function to check if a route requires admin
 */
function isAdminRoute(path) {
  const adminPaths = [
    ...module.exports.devTools.routes,
    ...module.exports.devTools.adminPanel,
    '/api/admin',
    '/api/dev',
    '/api/debug',
  ];

  return adminPaths.some(adminPath => {
    if (adminPath.includes('*')) {
      const pattern = adminPath.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}`);
      return regex.test(path);
    }
    return path.startsWith(adminPath);
  });
}

module.exports.isPublicRoute = isPublicRoute;
module.exports.isAdminRoute = isAdminRoute;
