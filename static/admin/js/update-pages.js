// Script to update all admin pages with unified navigation
// This will be run once to update all pages

const pagesToUpdate = [
    'analytics.html',
    'backup.html',
    'blog-posts.html',
    'build-deploy.html',
    'content-editor.html',
    'content-manager.html',
    'dashboard.html',
    'file-manager.html',
    'image-optimizer.html',
    'logs.html',
    'pages.html',
    'portfolio-items.html',
    'review.html',
    'seo-manager.html',
    'site-settings.html',
    'user-management.html'
];

// Common head includes
const commonHeadIncludes = `
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <!-- Core Scripts -->
    <script src="js/navigation.js"></script>
    <script src="js/toast.js"></script>
    <script src="js/auth-manager.js"></script>
    <script src="js/api-config.js"></script>
    <script src="js/utils.js"></script>
`;

console.log('Pages to update with unified navigation:', pagesToUpdate);