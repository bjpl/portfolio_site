#!/usr/bin/env node

/**
 * Build Optimization Script for Hugo + Netlify
 * Handles asset optimization, cache management, and build monitoring
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class BuildOptimizer {
  constructor() {
    this.startTime = Date.now();
    this.buildStats = {
      assets: { processed: 0, size: 0 },
      pages: { generated: 0 },
      cache: { hits: 0, misses: 0 },
      performance: { buildTime: 0 }
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    const timestamp = new Date().toISOString();
    console.log(`${colors[type](`[${type.toUpperCase()}]`)} ${timestamp}: ${message}`);
  }

  async prebuild() {
    this.log('Starting prebuild optimization...', 'info');
    
    // Clear Hugo build cache
    await this.clearBuildCache();
    
    // Optimize assets
    await this.optimizeAssets();
    
    // Generate critical CSS
    await this.generateCriticalCSS();
    
    // Preprocess JavaScript
    await this.preprocessJS();
    
    this.log('Prebuild optimization completed', 'success');
  }

  async clearBuildCache() {
    try {
      this.log('Clearing Hugo build cache...', 'info');
      
      const cachePaths = [
        'resources/_gen',
        '.hugo_build.lock',
        'public'
      ];
      
      for (const cachePath of cachePaths) {
        if (fs.existsSync(cachePath)) {
          execSync(`rm -rf ${cachePath}`, { stdio: 'inherit' });
        }
      }
      
      this.log('Build cache cleared', 'success');
    } catch (error) {
      this.log(`Cache clearing failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async optimizeAssets() {
    this.log('Optimizing assets...', 'info');
    
    try {
      // Optimize images
      if (this.commandExists('imagemin-cli')) {
        execSync(`
          imagemin 'static/images/**/*.{jpg,jpeg,png,svg}' 
          --out-dir=static/images/optimized 
          --plugin=imagemin-webp
          --plugin=imagemin-svgo
        `, { stdio: 'inherit' });
      }
      
      // Process CSS with PostCSS
      if (this.commandExists('postcss')) {
        execSync(`
          postcss static/css/*.css 
          --dir static/css/dist 
          --map 
          --config postcss.config.js
        `, { stdio: 'inherit' });
      }
      
      // Bundle and minify JavaScript
      if (this.commandExists('esbuild')) {
        execSync(`
          esbuild static/js/**/*.js 
          --bundle 
          --minify 
          --outdir=static/js/dist 
          --target=es2018
        `, { stdio: 'inherit' });
      }
      
      this.buildStats.assets.processed += 1;
      this.log('Asset optimization completed', 'success');
    } catch (error) {
      this.log(`Asset optimization failed: ${error.message}`, 'warning');
    }
  }

  async generateCriticalCSS() {
    this.log('Generating critical CSS...', 'info');
    
    try {
      const critical = require('critical');
      
      await critical.generate({
        inline: true,
        base: 'static/',
        src: 'css/main.css',
        dest: 'css/critical.css',
        width: 1300,
        height: 900,
        minify: true
      });
      
      this.log('Critical CSS generated', 'success');
    } catch (error) {
      this.log(`Critical CSS generation failed: ${error.message}`, 'warning');
    }
  }

  async preprocessJS() {
    this.log('Preprocessing JavaScript...', 'info');
    
    try {
      // Tree shaking and dead code elimination
      if (this.commandExists('webpack')) {
        execSync('webpack --mode=production --optimize-minimize', { stdio: 'inherit' });
      }
      
      this.log('JavaScript preprocessing completed', 'success');
    } catch (error) {
      this.log(`JavaScript preprocessing failed: ${error.message}`, 'warning');
    }
  }

  async runHugoBuild(environment = 'production') {
    this.log(`Running Hugo build for ${environment}...`, 'info');
    
    const buildCommand = [
      'hugo',
      '--minify',
      '--cleanDestinationDir',
      '--gc',
      `--environment ${environment}`,
      environment === 'production' ? '--verbose' : '',
      '--templateMetrics',
      '--printI18nWarnings'
    ].filter(Boolean).join(' ');

    try {
      execSync(buildCommand, { stdio: 'inherit' });
      this.log('Hugo build completed successfully', 'success');
    } catch (error) {
      this.log(`Hugo build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async postbuild() {
    this.log('Starting postbuild optimization...', 'info');
    
    // Generate service worker
    await this.generateServiceWorker();
    
    // Create asset manifest
    await this.createAssetManifest();
    
    // Analyze bundle size
    await this.analyzeBundleSize();
    
    // Generate build report
    await this.generateBuildReport();
    
    this.log('Postbuild optimization completed', 'success');
  }

  async generateServiceWorker() {
    try {
      const workbox = require('workbox-build');
      
      await workbox.generateSW({
        globDirectory: 'public/',
        globPatterns: [
          '**/*.{html,js,css,png,jpg,jpeg,svg,gif,webp,woff,woff2,ttf,eot}'
        ],
        swDest: 'public/sw.js',
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      });
      
      this.log('Service worker generated', 'success');
    } catch (error) {
      this.log(`Service worker generation failed: ${error.message}`, 'warning');
    }
  }

  async createAssetManifest() {
    try {
      const manifest = {
        buildTime: new Date().toISOString(),
        version: process.env.BUILD_ID || 'dev',
        assets: this.getAssetList(),
        performance: this.buildStats
      };
      
      fs.writeFileSync(
        'public/build-manifest.json',
        JSON.stringify(manifest, null, 2)
      );
      
      this.log('Asset manifest created', 'success');
    } catch (error) {
      this.log(`Asset manifest creation failed: ${error.message}`, 'warning');
    }
  }

  async analyzeBundleSize() {
    try {
      const bundleAnalyzer = require('webpack-bundle-analyzer');
      
      // Analyze JavaScript bundles
      if (fs.existsSync('public/js')) {
        const stats = this.getDirectorySize('public/js');
        this.buildStats.assets.size += stats;
        
        this.log(`JavaScript bundle size: ${this.formatBytes(stats)}`, 'info');
      }
      
      // Analyze CSS bundles
      if (fs.existsSync('public/css')) {
        const stats = this.getDirectorySize('public/css');
        this.buildStats.assets.size += stats;
        
        this.log(`CSS bundle size: ${this.formatBytes(stats)}`, 'info');
      }
      
    } catch (error) {
      this.log(`Bundle analysis failed: ${error.message}`, 'warning');
    }
  }

  async generateBuildReport() {
    this.buildStats.performance.buildTime = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      buildTime: this.formatTime(this.buildStats.performance.buildTime),
      environment: process.env.HUGO_ENV || 'development',
      stats: this.buildStats,
      optimizations: {
        minification: true,
        compression: true,
        caching: true,
        serviceWorker: fs.existsSync('public/sw.js')
      }
    };
    
    fs.writeFileSync(
      'build-report.json',
      JSON.stringify(report, null, 2)
    );
    
    this.log(`Build completed in ${report.buildTime}`, 'success');
    this.log(`Total asset size: ${this.formatBytes(this.buildStats.assets.size)}`, 'info');
  }

  getAssetList() {
    const assets = [];
    const publicDir = 'public';
    
    if (!fs.existsSync(publicDir)) return assets;
    
    const walk = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else {
          assets.push({
            path: filePath.replace(publicDir + '/', ''),
            size: stat.size,
            modified: stat.mtime
          });
        }
      });
    };
    
    walk(publicDir);
    return assets;
  }

  getDirectorySize(dirPath) {
    let size = 0;
    
    if (!fs.existsSync(dirPath)) return size;
    
    const walk = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else {
          size += stat.size;
        }
      });
    };
    
    walk(dirPath);
    return size;
  }

  commandExists(command) {
    try {
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(ms) {
    return `${(ms / 1000).toFixed(2)}s`;
  }

  async run(command) {
    try {
      switch (command) {
        case 'prebuild':
          await this.prebuild();
          break;
        case 'build':
          await this.runHugoBuild();
          break;
        case 'postbuild':
          await this.postbuild();
          break;
        case 'full':
        default:
          await this.prebuild();
          await this.runHugoBuild();
          await this.postbuild();
          break;
      }
    } catch (error) {
      this.log(`Build process failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2] || 'full';
  const optimizer = new BuildOptimizer();
  optimizer.run(command);
}

module.exports = BuildOptimizer;