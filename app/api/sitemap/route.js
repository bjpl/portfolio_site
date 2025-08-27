import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Dynamic Sitemap.xml Generator
 * Generates sitemap based on content structure and routes
 */

// Define your site's base URL
const SITE_URL = process.env.SITE_URL || 'https://vocal-pony-24e3de.netlify.app';

// Static routes that should be included in sitemap
const STATIC_ROUTES = [
  '/',
  '/about',
  '/tools',
  '/writing',
  '/teaching',
  '/gallery',
  '/blog',
  '/resume',
  '/services',
  '/projects',
  '/contact',
  '/work',
  '/links',
  '/poetry',
  
  // Spanish routes
  '/es',
  '/es/about', 
  '/es/tools',
  '/es/writing',
  '/es/teaching',
  '/es/gallery',
  '/es/resume',
  '/es/services',
  '/es/contact',
  '/es/writing/poetry',
  
  // Tool categories
  '/tools/vocabulary',
  '/tools/language',
  '/tools/grammar',
  '/tools/conjugation',
  '/tools/resources',
  '/tools/strategy',
  
  // Teaching sections
  '/teaching/theory',
  '/teaching/resources',
  
  // Work sections
  '/work/portfolio-study',
  
  // Project categories
  '/projects/react-dashboard'
];

// Dynamic routes patterns to scan
const DYNAMIC_ROUTES_CONFIG = [
  {
    pattern: '/content/blog/*.md',
    urlPattern: '/posts/{slug}',
    changefreq: 'weekly',
    priority: 0.7
  },
  {
    pattern: '/content/writing/poetry/*.md',
    urlPattern: '/poetry/{slug}',
    changefreq: 'monthly',
    priority: 0.5
  },
  {
    pattern: '/content/tools/built/*.md',
    urlPattern: '/projects/{slug}',
    changefreq: 'monthly',
    priority: 0.8
  },
  {
    pattern: '/content/teaching-learning/sla-theory/*.md',
    urlPattern: '/teaching/theory/{slug}',
    changefreq: 'monthly', 
    priority: 0.6
  }
];

export async function GET() {
  try {
    const sitemap = await generateSitemap();
    
    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, must-revalidate', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

async function generateSitemap() {
  const urls = [];
  
  // Add static routes
  for (const route of STATIC_ROUTES) {
    urls.push({
      loc: `${SITE_URL}${route}`,
      lastmod: new Date().toISOString(),
      changefreq: getChangeFreq(route),
      priority: getPriority(route)
    });
  }
  
  // Add dynamic routes from content
  try {
    const dynamicUrls = await getDynamicRoutes();
    urls.push(...dynamicUrls);
  } catch (error) {
    console.warn('Could not load dynamic routes:', error.message);
  }
  
  // Generate XML
  const xml = generateSitemapXML(urls);
  return xml;
}

async function getDynamicRoutes() {
  const dynamicUrls = [];
  const contentDir = path.join(process.cwd(), 'content');
  
  for (const config of DYNAMIC_ROUTES_CONFIG) {
    try {
      const files = await getMarkdownFiles(contentDir, config.pattern);
      
      for (const file of files) {
        const slug = getSlugFromFile(file);
        const url = config.urlPattern.replace('{slug}', slug);
        const stats = fs.statSync(file);
        
        dynamicUrls.push({
          loc: `${SITE_URL}${url}`,
          lastmod: stats.mtime.toISOString(),
          changefreq: config.changefreq,
          priority: config.priority
        });
      }
    } catch (error) {
      console.warn(`Could not process pattern ${config.pattern}:`, error.message);
    }
  }
  
  return dynamicUrls;
}

async function getMarkdownFiles(contentDir, pattern) {
  // Simple glob-like pattern matching for .md files
  const files = [];
  
  try {
    // Convert pattern to actual directory path
    const patternPath = pattern.replace('/content/', '').replace('*.md', '');
    const fullPath = path.join(contentDir, patternPath);
    
    if (fs.existsSync(fullPath)) {
      const dirFiles = fs.readdirSync(fullPath);
      
      for (const file of dirFiles) {
        if (file.endsWith('.md') && !file.startsWith('_index')) {
          files.push(path.join(fullPath, file));
        }
      }
    }
  } catch (error) {
    console.warn(`Error reading directory for pattern ${pattern}:`, error.message);
  }
  
  return files;
}

function getSlugFromFile(filePath) {
  const basename = path.basename(filePath, '.md');
  return basename.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
}

function getChangeFreq(route) {
  if (route === '/' || route === '/about') return 'weekly';
  if (route.startsWith('/blog') || route.startsWith('/posts')) return 'weekly';
  if (route.startsWith('/projects') || route.startsWith('/tools')) return 'monthly';
  return 'monthly';
}

function getPriority(route) {
  if (route === '/') return 1.0;
  if (route === '/about' || route === '/projects') return 0.9;
  if (route.startsWith('/blog') || route.startsWith('/posts')) return 0.8;
  if (route.startsWith('/tools') || route.startsWith('/writing')) return 0.7;
  return 0.5;
}

function generateSitemapXML(urls) {
  const urlElements = urls.map(url => `
  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlElements}
</urlset>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
