/**
 * Build Optimization Utilities
 * Additional utilities for optimizing static builds
 */

import fs from 'fs';
import path from 'path';

/**
 * Optimize HTML files for static export
 */
export function optimizeHtmlFiles(outputDir = 'out') {
  const htmlFiles = findFiles(outputDir, '.html');
  
  htmlFiles.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add critical performance attributes
      content = content.replace(
        /<html([^>]*)>/,
        '<html$1 lang="en">'
      );
      
      // Optimize meta tags for static sites
      content = content.replace(
        /<head>/,
        `<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#000000">
    <meta name="format-detection" content="telephone=no">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="https://fonts.googleapis.com">
    <link rel="dns-prefetch" href="https://fonts.gstatic.com">`
      );
      
      // Add resource hints for better performance
      content = content.replace(
        /<\/head>/,
        `    <link rel="prefetch" href="/data/projects.json">
    <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
</head>`
      );
      
      fs.writeFileSync(filePath, content);
    } catch (error) {
      console.warn(`Could not optimize ${filePath}:`, error);
    }
  });
  
  console.log(`✅ Optimized ${htmlFiles.length} HTML files`);
}

/**
 * Generate service worker for static caching
 */
export function generateServiceWorker(outputDir = 'out') {
  const swContent = `
const CACHE_NAME = 'portfolio-v1';
const urlsToCache = [
  '/',
  '/projects/',
  '/blog/',
  '/links/',
  '/data/projects.json',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});`;

  fs.writeFileSync(path.join(outputDir, 'sw.js'), swContent.trim());
  console.log('✅ Generated service worker');
}

/**
 * Generate web app manifest
 */
export function generateManifest(outputDir = 'out') {
  const manifest = {
    name: "Portfolio Website",
    short_name: "Portfolio",
    description: "Modern portfolio website showcasing projects and skills",
    start_url: "/",
    display: "standalone",
    theme_color: "#000000",
    background_color: "#ffffff",
    orientation: "portrait-primary",
    categories: ["portfolio", "personal", "professional"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    shortcuts: [
      {
        name: "View Projects",
        short_name: "Projects",
        description: "Browse my latest projects",
        url: "/projects",
        icons: [{ src: "/icons/projects-icon.png", sizes: "192x192" }]
      },
      {
        name: "Read Blog",
        short_name: "Blog",
        description: "Read my latest blog posts",
        url: "/blog",
        icons: [{ src: "/icons/blog-icon.png", sizes: "192x192" }]
      }
    ]
  };

  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'), 
    JSON.stringify(manifest, null, 2)
  );
  console.log('✅ Generated web app manifest');
}

/**
 * Optimize CSS for static sites
 */
export function optimizeCssFiles(outputDir = 'out') {
  const cssFiles = findFiles(outputDir, '.css');
  
  cssFiles.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove comments (basic optimization)
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Remove unnecessary whitespace
      content = content.replace(/\s+/g, ' ').trim();
      
      // Add critical CSS optimizations
      content = `/*! Optimized for static export */${content}`;
      
      fs.writeFileSync(filePath, content);
    } catch (error) {
      console.warn(`Could not optimize ${filePath}:`, error);
    }
  });
  
  console.log(`✅ Optimized ${cssFiles.length} CSS files`);
}

/**
 * Create security.txt for responsible disclosure
 */
export function generateSecurityTxt(outputDir = 'out') {
  const securityTxt = `Contact: mailto:security@yoursite.com
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}
Preferred-Languages: en
Policy: https://yoursite.com/security-policy
Acknowledgments: https://yoursite.com/security-acknowledgments`;

  const wellKnownDir = path.join(outputDir, '.well-known');
  if (!fs.existsSync(wellKnownDir)) {
    fs.mkdirSync(wellKnownDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(wellKnownDir, 'security.txt'), securityTxt);
  console.log('✅ Generated security.txt');
}

/**
 * Helper function to find files by extension
 */
function findFiles(dir, extension, files = []) {
  const dirFiles = fs.readdirSync(dir);
  
  dirFiles.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findFiles(fullPath, extension, files);
    } else if (path.extname(file) === extension) {
      files.push(fullPath);
    }
  });
  
  return files;
}

/**
 * Complete build optimization pipeline
 */
export async function optimizeStaticBuild(outputDir = 'out') {
  console.log('🔧 Starting static build optimization...');
  
  try {
    // Core optimizations
    optimizeHtmlFiles(outputDir);
    optimizeCssFiles(outputDir);
    
    // PWA features
    generateServiceWorker(outputDir);
    generateManifest(outputDir);
    
    // Security
    generateSecurityTxt(outputDir);
    
    console.log('✅ Static build optimization complete!');
  } catch (error) {
    console.error('❌ Build optimization failed:', error);
    throw error;
  }
}