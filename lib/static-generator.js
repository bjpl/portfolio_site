/**
 * Static Site Generator Utilities
 * Utilities for generating static files like sitemap and robots.txt
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate static sitemap.xml for static export
 */
export async function generateStaticSitemap() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com';
    const currentDate = new Date().toISOString();
    
    // Load projects for dynamic routes
    let projects = [];
    try {
      const projectsData = await import('../data/projects.json');
      projects = projectsData.default?.projects || projectsData.projects || [];
    } catch (error) {
      console.warn('Could not load projects for sitemap:', error);
    }
    
    // Define static routes
    const staticRoutes = [
      { url: '', priority: '1.0', changefreq: 'monthly' },
      { url: '/projects', priority: '0.9', changefreq: 'weekly' },
      { url: '/blog', priority: '0.9', changefreq: 'weekly' },
      { url: '/links', priority: '0.7', changefreq: 'monthly' },
    ];
    
    // Add project routes
    const projectRoutes = projects.map(project => ({
      url: `/projects/${project.slug}`,
      priority: '0.8',
      changefreq: 'monthly'
    }));
    
    // Combine all routes
    const allRoutes = [...staticRoutes, ...projectRoutes];
    
    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return sitemap;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return null;
  }
}

/**
 * Generate static robots.txt for static export
 */
export function generateStaticRobots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com';
  
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Disallow admin and api routes (even though they won't exist in static export)
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /out/

# Allow important assets
Allow: /images/
Allow: /icons/
Allow: /*.css$
Allow: /*.js$`;
}

/**
 * Generate static files for export
 */
export async function generateStaticFiles(outputDir = 'out') {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate sitemap
    const sitemap = await generateStaticSitemap();
    if (sitemap) {
      fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap);
      console.log('✅ Generated sitemap.xml');
    }
    
    // Generate robots.txt
    const robots = generateStaticRobots();
    fs.writeFileSync(path.join(outputDir, 'robots.txt'), robots);
    console.log('✅ Generated robots.txt');
    
    // Generate .nojekyll for GitHub Pages
    fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');
    console.log('✅ Generated .nojekyll');
    
  } catch (error) {
    console.error('Error generating static files:', error);
    throw error;
  }
}

/**
 * Optimize static assets
 */
export function optimizeStaticAssets(outputDir = 'out') {
  try {
    // Create CNAME file if needed for custom domain
    if (process.env.CUSTOM_DOMAIN) {
      fs.writeFileSync(path.join(outputDir, 'CNAME'), process.env.CUSTOM_DOMAIN);
      console.log(`✅ Generated CNAME for ${process.env.CUSTOM_DOMAIN}`);
    }
    
    // Create _headers file for Netlify
    const headers = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable`;
    
    fs.writeFileSync(path.join(outputDir, '_headers'), headers);
    console.log('✅ Generated _headers for Netlify');
    
    // Create _redirects file for Netlify
    const redirects = `# Legacy Hugo redirects
/make/* /writing/:splat 301
/learn/* /tools/:splat 301
/letratos/* /gallery/:splat 301
/servicios/* /services/:splat 301
/posts/* /blog/:splat 301

# SPA fallback
/* /index.html 200`;
    
    fs.writeFileSync(path.join(outputDir, '_redirects'), redirects);
    console.log('✅ Generated _redirects for Netlify');
    
  } catch (error) {
    console.error('Error optimizing static assets:', error);
  }
}

/**
 * Post-build optimization for static export
 */
export async function postBuildOptimization(outputDir = 'out') {
  console.log('🚀 Starting post-build optimization...');
  
  await generateStaticFiles(outputDir);
  optimizeStaticAssets(outputDir);
  
  console.log('✅ Post-build optimization complete!');
}