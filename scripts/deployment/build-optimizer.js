#!/usr/bin/env node

/**
 * Production Build Optimizer
 * 
 * This script optimizes the build process for production deployment
 * including asset optimization, bundle analysis, and performance optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class BuildOptimizer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..', '..');
    this.publicDir = path.join(this.projectRoot, 'public');
    this.staticDir = path.join(this.projectRoot, 'static');
    this.optimizationReport = {
      timestamp: new Date().toISOString(),
      optimizations: [],
      metrics: {
        before: {},
        after: {},
        savings: {}
      }
    };
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async executeCommand(command, options = {}) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8',
        cwd: this.projectRoot,
        ...options 
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        output: error.stdout || error.stderr 
      };
    }
  }

  calculateDirectorySize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += this.calculateDirectorySize(filePath);
      } else {
        totalSize += fs.statSync(filePath).size;
      }
    }
    
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  async optimizeImages() {
    this.log('Optimizing images...');
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const imageFiles = [];
    
    // Find all image files
    const findImages = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          findImages(filePath);
        } else if (imageExtensions.includes(path.extname(file.name).toLowerCase())) {
          imageFiles.push(filePath);
        }
      }
    };
    
    findImages(this.staticDir);
    findImages(this.publicDir);
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const imagePath of imageFiles) {
      const originalSize = fs.statSync(imagePath).size;
      totalOriginalSize += originalSize;
      
      // Skip if already optimized (check for .min in filename)
      if (imagePath.includes('.min.')) {
        totalOptimizedSize += originalSize;
        continue;
      }
      
      const ext = path.extname(imagePath).toLowerCase();
      let optimized = false;
      
      try {
        // Use different optimization strategies based on file type
        switch (ext) {
          case '.jpg':
          case '.jpeg':
            // Use imagemin or similar for JPEG optimization
            const jpegResult = await this.executeCommand(`npx imagemin "${imagePath}" --out-dir="${path.dirname(imagePath)}" --plugin=imagemin-mozjpeg`);
            optimized = jpegResult.success;
            break;
            
          case '.png':
            // PNG optimization
            const pngResult = await this.executeCommand(`npx imagemin "${imagePath}" --out-dir="${path.dirname(imagePath)}" --plugin=imagemin-pngquant`);
            optimized = pngResult.success;
            break;
            
          case '.svg':
            // SVG optimization
            const svgResult = await this.executeCommand(`npx svgo "${imagePath}" -o "${imagePath}"`);
            optimized = svgResult.success;
            break;
        }
      } catch (error) {
        this.log(`Failed to optimize ${imagePath}: ${error.message}`, 'WARN');
      }
      
      const newSize = fs.statSync(imagePath).size;
      totalOptimizedSize += newSize;
      
      if (optimized && newSize < originalSize) {
        const savings = originalSize - newSize;
        this.log(`Optimized ${path.basename(imagePath)}: ${this.formatBytes(savings)} saved`);
      }
    }
    
    const totalSavings = totalOriginalSize - totalOptimizedSize;
    this.optimizationReport.optimizations.push({
      type: 'image-optimization',
      filesProcessed: imageFiles.length,
      originalSize: totalOriginalSize,
      optimizedSize: totalOptimizedSize,
      savings: totalSavings,
      savingsFormatted: this.formatBytes(totalSavings)
    });
    
    this.log(`Image optimization complete: ${this.formatBytes(totalSavings)} saved across ${imageFiles.length} files`);
  }

  async generateWebPImages() {
    this.log('Generating WebP images...');
    const imageFiles = [];
    const webpExtensions = ['.jpg', '.jpeg', '.png'];
    
    const findImages = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          findImages(filePath);
        } else if (webpExtensions.includes(path.extname(file.name).toLowerCase())) {
          imageFiles.push(filePath);
        }
      }
    };
    
    findImages(this.staticDir);
    findImages(this.publicDir);
    
    let webpGenerated = 0;
    
    for (const imagePath of imageFiles) {
      const webpPath = imagePath.replace(/\.(jpe?g|png)$/i, '.webp');
      
      // Skip if WebP already exists and is newer
      if (fs.existsSync(webpPath)) {
        const originalStat = fs.statSync(imagePath);
        const webpStat = fs.statSync(webpPath);
        if (webpStat.mtime > originalStat.mtime) {
          continue;
        }
      }
      
      try {
        // Generate WebP using Sharp or similar
        const result = await this.executeCommand(`npx sharp -i "${imagePath}" -o "${webpPath}" -f webp -q 80`);
        if (result.success) {
          webpGenerated++;
          this.log(`Generated WebP: ${path.basename(webpPath)}`);
        }
      } catch (error) {
        // Fallback to imagemin
        try {
          const result = await this.executeCommand(`npx imagemin "${imagePath}" --out-dir="${path.dirname(imagePath)}" --plugin=imagemin-webp`);
          if (result.success) {
            webpGenerated++;
          }
        } catch (fallbackError) {
          this.log(`Failed to generate WebP for ${imagePath}`, 'WARN');
        }
      }
    }
    
    this.optimizationReport.optimizations.push({
      type: 'webp-generation',
      sourceFiles: imageFiles.length,
      webpGenerated
    });
    
    this.log(`WebP generation complete: ${webpGenerated} files generated`);
  }

  async optimizeCSS() {
    this.log('Optimizing CSS...');
    const cssFiles = [];
    
    const findCSS = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          findCSS(filePath);
        } else if (path.extname(file.name).toLowerCase() === '.css' && !file.name.includes('.min.')) {
          cssFiles.push(filePath);
        }
      }
    };
    
    findCSS(this.publicDir);
    findCSS(this.staticDir);
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const cssPath of cssFiles) {
      const originalSize = fs.statSync(cssPath).size;
      totalOriginalSize += originalSize;
      
      try {
        // Minify CSS
        const result = await this.executeCommand(`npx cssnano "${cssPath}" "${cssPath}"`);
        if (result.success) {
          const newSize = fs.statSync(cssPath).size;
          totalOptimizedSize += newSize;
          
          if (newSize < originalSize) {
            const savings = originalSize - newSize;
            this.log(`Optimized ${path.basename(cssPath)}: ${this.formatBytes(savings)} saved`);
          }
        } else {
          totalOptimizedSize += originalSize;
        }
      } catch (error) {
        totalOptimizedSize += originalSize;
        this.log(`Failed to optimize ${cssPath}: ${error.message}`, 'WARN');
      }
    }
    
    const totalSavings = totalOriginalSize - totalOptimizedSize;
    this.optimizationReport.optimizations.push({
      type: 'css-optimization',
      filesProcessed: cssFiles.length,
      originalSize: totalOriginalSize,
      optimizedSize: totalOptimizedSize,
      savings: totalSavings,
      savingsFormatted: this.formatBytes(totalSavings)
    });
    
    this.log(`CSS optimization complete: ${this.formatBytes(totalSavings)} saved across ${cssFiles.length} files`);
  }

  async optimizeJavaScript() {
    this.log('Optimizing JavaScript...');
    const jsFiles = [];
    
    const findJS = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          findJS(filePath);
        } else if (path.extname(file.name).toLowerCase() === '.js' && !file.name.includes('.min.')) {
          jsFiles.push(filePath);
        }
      }
    };
    
    findJS(this.publicDir);
    findJS(this.staticDir);
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const jsPath of jsFiles) {
      const originalSize = fs.statSync(jsPath).size;
      totalOriginalSize += originalSize;
      
      try {
        // Minify JavaScript using Terser
        const result = await this.executeCommand(`npx terser "${jsPath}" -o "${jsPath}" --compress --mangle`);
        if (result.success) {
          const newSize = fs.statSync(jsPath).size;
          totalOptimizedSize += newSize;
          
          if (newSize < originalSize) {
            const savings = originalSize - newSize;
            this.log(`Optimized ${path.basename(jsPath)}: ${this.formatBytes(savings)} saved`);
          }
        } else {
          totalOptimizedSize += originalSize;
        }
      } catch (error) {
        totalOptimizedSize += originalSize;
        this.log(`Failed to optimize ${jsPath}: ${error.message}`, 'WARN');
      }
    }
    
    const totalSavings = totalOriginalSize - totalOptimizedSize;
    this.optimizationReport.optimizations.push({
      type: 'javascript-optimization',
      filesProcessed: jsFiles.length,
      originalSize: totalOriginalSize,
      optimizedSize: totalOptimizedSize,
      savings: totalSavings,
      savingsFormatted: this.formatBytes(totalSavings)
    });
    
    this.log(`JavaScript optimization complete: ${this.formatBytes(totalSavings)} saved across ${jsFiles.length} files`);
  }

  async generateServiceWorker() {
    this.log('Generating Service Worker...');
    
    const swPath = path.join(this.publicDir, 'sw.js');
    const manifestPath = path.join(this.publicDir, 'manifest.json');
    
    // Generate basic service worker for caching
    const serviceWorker = `
const CACHE_NAME = 'portfolio-cache-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/css/main.css',
  '/js/main.js',
  '/images/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
    `.trim();
    
    fs.writeFileSync(swPath, serviceWorker);
    
    // Update manifest.json if it exists
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.start_url = '/';
      manifest.display = 'standalone';
      manifest.theme_color = '#000000';
      manifest.background_color = '#ffffff';
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }
    
    this.optimizationReport.optimizations.push({
      type: 'service-worker',
      generated: true,
      path: swPath
    });
    
    this.log('Service Worker generated');
  }

  async generateSitemap() {
    this.log('Validating sitemap...');
    
    const sitemapPath = path.join(this.publicDir, 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
      const sitemap = fs.readFileSync(sitemapPath, 'utf8');
      const urlCount = (sitemap.match(/<url>/g) || []).length;
      
      this.optimizationReport.optimizations.push({
        type: 'sitemap-validation',
        exists: true,
        urlCount,
        path: sitemapPath
      });
      
      this.log(`Sitemap validated: ${urlCount} URLs found`);
    } else {
      this.log('Sitemap not found', 'WARN');
    }
  }

  async generateRobotsTxt() {
    this.log('Generating robots.txt...');
    
    const robotsPath = path.join(this.publicDir, 'robots.txt');
    const siteUrl = process.env.SITE_URL || 'https://localhost:3000';
    
    const robotsContent = `
User-agent: *
Allow: /

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /.netlify/
Disallow: /.vercel/

# Allow specific bots
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /
    `.trim();
    
    fs.writeFileSync(robotsPath, robotsContent);
    
    this.optimizationReport.optimizations.push({
      type: 'robots-txt',
      generated: true,
      path: robotsPath
    });
    
    this.log('robots.txt generated');
  }

  async addCacheBusting() {
    this.log('Adding cache busting to static assets...');
    
    const assetExtensions = ['.css', '.js', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.webp'];
    const assetsWithHashes = [];
    
    const processAssets = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          processAssets(filePath);
        } else if (assetExtensions.includes(path.extname(file.name).toLowerCase())) {
          const hash = this.generateFileHash(filePath);
          const ext = path.extname(file.name);
          const baseName = path.basename(file.name, ext);
          const hashedName = `${baseName}.${hash}${ext}`;
          const hashedPath = path.join(dir, hashedName);
          
          // Only create hashed version if it doesn't exist
          if (!fs.existsSync(hashedPath)) {
            fs.copyFileSync(filePath, hashedPath);
            assetsWithHashes.push({
              original: file.name,
              hashed: hashedName,
              hash
            });
          }
        }
      }
    };
    
    processAssets(this.publicDir);
    
    this.optimizationReport.optimizations.push({
      type: 'cache-busting',
      assetsProcessed: assetsWithHashes.length,
      assets: assetsWithHashes
    });
    
    this.log(`Cache busting added to ${assetsWithHashes.length} assets`);
  }

  async analyzeBundleSize() {
    this.log('Analyzing bundle size...');
    
    const beforeSize = this.calculateDirectorySize(this.publicDir);
    this.optimizationReport.metrics.before.totalSize = beforeSize;
    
    // Count files by type
    const fileTypes = {};
    const countFiles = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          countFiles(filePath);
        } else {
          const ext = path.extname(file.name).toLowerCase() || 'no-extension';
          if (!fileTypes[ext]) {
            fileTypes[ext] = { count: 0, size: 0 };
          }
          fileTypes[ext].count++;
          fileTypes[ext].size += fs.statSync(filePath).size;
        }
      }
    };
    
    countFiles(this.publicDir);
    
    this.optimizationReport.metrics.fileTypes = fileTypes;
    
    // Generate bundle analysis report
    const bundleReport = {
      totalSize: beforeSize,
      totalSizeFormatted: this.formatBytes(beforeSize),
      fileTypes: Object.entries(fileTypes).map(([ext, data]) => ({
        extension: ext,
        count: data.count,
        size: data.size,
        sizeFormatted: this.formatBytes(data.size),
        percentage: ((data.size / beforeSize) * 100).toFixed(2)
      })).sort((a, b) => b.size - a.size)
    };
    
    const reportPath = path.join(this.projectRoot, 'bundle-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(bundleReport, null, 2));
    
    this.log(`Bundle analysis complete: ${this.formatBytes(beforeSize)} total size`);
    return bundleReport;
  }

  async runFullOptimization() {
    this.log('='.repeat(50));
    this.log('STARTING PRODUCTION BUILD OPTIMIZATION', 'INFO');
    this.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      // Record initial metrics
      this.optimizationReport.metrics.before.totalSize = this.calculateDirectorySize(this.publicDir);
      this.optimizationReport.metrics.before.timestamp = new Date().toISOString();
      
      // Run all optimizations
      await this.optimizeImages();
      await this.generateWebPImages();
      await this.optimizeCSS();
      await this.optimizeJavaScript();
      await this.generateServiceWorker();
      await this.generateSitemap();
      await this.generateRobotsTxt();
      await this.addCacheBusting();
      
      // Record final metrics
      this.optimizationReport.metrics.after.totalSize = this.calculateDirectorySize(this.publicDir);
      this.optimizationReport.metrics.after.timestamp = new Date().toISOString();
      
      // Calculate savings
      const totalSavings = this.optimizationReport.metrics.before.totalSize - this.optimizationReport.metrics.after.totalSize;
      this.optimizationReport.metrics.savings = {
        bytes: totalSavings,
        formatted: this.formatBytes(totalSavings),
        percentage: ((totalSavings / this.optimizationReport.metrics.before.totalSize) * 100).toFixed(2)
      };
      
      // Generate final analysis
      const bundleAnalysis = await this.analyzeBundleSize();
      
      const duration = Date.now() - startTime;
      this.optimizationReport.duration = duration;
      
      // Save optimization report
      const reportPath = path.join(this.projectRoot, 'optimization-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(this.optimizationReport, null, 2));
      
      this.log('='.repeat(50));
      this.log('OPTIMIZATION COMPLETED SUCCESSFULLY', 'SUCCESS');
      this.log(`Duration: ${duration}ms`);
      this.log(`Total savings: ${this.optimizationReport.metrics.savings.formatted} (${this.optimizationReport.metrics.savings.percentage}%)`);
      this.log(`Report saved: ${reportPath}`);
      this.log('='.repeat(50));
      
      return this.optimizationReport;
      
    } catch (error) {
      this.log(`OPTIMIZATION FAILED: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const optimizer = new BuildOptimizer();
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'images':
        await optimizer.optimizeImages();
        break;
        
      case 'css':
        await optimizer.optimizeCSS();
        break;
        
      case 'js':
        await optimizer.optimizeJavaScript();
        break;
        
      case 'analyze':
        await optimizer.analyzeBundleSize();
        break;
        
      case 'full':
      default:
        await optimizer.runFullOptimization();
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BuildOptimizer;