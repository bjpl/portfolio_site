#!/usr/bin/env node

/**
 * Build Cache Manager for Hugo + Netlify
 * Optimizes caching strategies for faster builds and better performance
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const chalk = require('chalk');

class BuildCacheManager {
  constructor() {
    this.cacheConfig = {
      hugo: {
        cacheDir: 'resources/_gen',
        maxAge: '10000h',
        types: ['assets', 'images', 'getresource', 'getjson', 'getcsv']
      },
      netlify: {
        cacheDir: '.netlify/cache',
        buildCache: 'node_modules',
        assetCache: 'public'
      },
      custom: {
        manifestFile: '.build-cache-manifest.json',
        hashFile: '.content-hash.json'
      }
    };
    
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      filesProcessed: 0,
      timesSaved: 0
    };
  }

  async initialize() {
    this.log('Initializing build cache manager...', 'info');
    
    // Ensure cache directories exist
    this.ensureCacheDirectories();
    
    // Load existing cache manifest
    this.loadCacheManifest();
    
    // Generate content hash for change detection
    await this.generateContentHash();
    
    this.log('Cache manager initialized successfully', 'success');
  }

  ensureCacheDirectories() {
    const dirs = [
      this.cacheConfig.hugo.cacheDir,
      this.cacheConfig.netlify.cacheDir,
      'temp/build-cache'
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created cache directory: ${dir}`, 'info');
      }
    });
  }

  loadCacheManifest() {
    const manifestPath = this.cacheConfig.custom.manifestFile;
    
    if (fs.existsSync(manifestPath)) {
      try {
        this.cacheManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        this.log('Loaded existing cache manifest', 'info');
      } catch (error) {
        this.log(`Failed to load cache manifest: ${error.message}`, 'warning');
        this.cacheManifest = this.createEmptyManifest();
      }
    } else {
      this.cacheManifest = this.createEmptyManifest();
    }
  }

  createEmptyManifest() {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      files: {},
      hugo: {
        version: this.getHugoVersion(),
        config: this.getHugoConfigHash()
      },
      dependencies: this.getDependencyHash()
    };
  }

  async generateContentHash() {
    this.log('Generating content hash for change detection...', 'info');
    
    const contentDirs = ['content', 'layouts', 'static', 'data', 'config'];
    const hashes = {};
    
    for (const dir of contentDirs) {
      if (fs.existsSync(dir)) {
        hashes[dir] = await this.hashDirectory(dir);
      }
    }
    
    this.contentHash = {
      timestamp: new Date().toISOString(),
      hashes,
      combined: this.combineHashes(Object.values(hashes))
    };
    
    // Save hash for future comparison
    fs.writeFileSync(
      this.cacheConfig.custom.hashFile,
      JSON.stringify(this.contentHash, null, 2)
    );
    
    this.log('Content hash generated successfully', 'success');
  }

  async hashDirectory(dir) {
    const hash = crypto.createHash('sha256');
    
    const walkDir = (currentDir) => {
      const files = fs.readdirSync(currentDir).sort(); // Sort for consistent hashing
      
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          hash.update(file);
          walkDir(filePath);
        } else {
          hash.update(file);
          hash.update(stat.mtime.toString());
          hash.update(stat.size.toString());
          
          // For small files, include content in hash
          if (stat.size < 1024 * 10) { // 10KB threshold
            const content = fs.readFileSync(filePath);
            hash.update(content);
          }
        }
      });
    };
    
    walkDir(dir);
    return hash.digest('hex');
  }

  combineHashes(hashes) {
    const combined = crypto.createHash('sha256');
    hashes.forEach(hash => combined.update(hash));
    return combined.digest('hex');
  }

  async detectChanges() {
    this.log('Detecting changes since last build...', 'info');
    
    const previousHashPath = this.cacheConfig.custom.hashFile;
    let hasChanges = true;
    
    if (fs.existsSync(previousHashPath)) {
      try {
        const previousHash = JSON.parse(fs.readFileSync(previousHashPath, 'utf8'));
        hasChanges = previousHash.combined !== this.contentHash.combined;
        
        if (!hasChanges) {
          this.log('No content changes detected, using cached build', 'success');
          this.stats.cacheHits++;
        } else {
          this.log('Content changes detected, full build required', 'info');
          this.stats.cacheMisses++;
        }
      } catch (error) {
        this.log(`Failed to load previous hash: ${error.message}`, 'warning');
      }
    }
    
    return hasChanges;
  }

  async optimizeHugoCache() {
    this.log('Optimizing Hugo cache configuration...', 'info');
    
    const hugoConfig = this.getHugoConfig();
    const optimizations = [];
    
    // Check if caching is properly configured
    if (!hugoConfig.caches) {
      optimizations.push({
        type: 'missing_cache_config',
        recommendation: 'Add caches configuration to Hugo config',
        config: this.getRecommendedCacheConfig()
      });
    }
    
    // Check cache directory sizes
    const cacheStats = this.analyzeCacheUsage();
    if (cacheStats.totalSize > 1024 * 1024 * 100) { // 100MB
      optimizations.push({
        type: 'large_cache',
        recommendation: 'Consider reducing cache maxAge or cleaning old cache',
        currentSize: this.formatBytes(cacheStats.totalSize)
      });
    }
    
    // Check for cache efficiency
    const efficiency = this.calculateCacheEfficiency();
    if (efficiency < 0.7) { // Less than 70% efficiency
      optimizations.push({
        type: 'low_efficiency',
        recommendation: 'Review cache configuration and file patterns',
        currentEfficiency: `${(efficiency * 100).toFixed(2)}%`
      });
    }
    
    this.log(`Found ${optimizations.length} cache optimizations`, 'info');
    return optimizations;
  }

  getRecommendedCacheConfig() {
    return {
      caches: {
        assets: {
          dir: ':cacheDir/:project',
          maxAge: '10000h'
        },
        getjson: {
          maxAge: '10s'
        },
        getcsv: {
          maxAge: '10s'
        },
        getresource: {
          maxAge: '10s'
        },
        images: {
          dir: ':cacheDir/:project',
          maxAge: '10000h'
        },
        modules: {
          dir: ':cacheDir/modules',
          maxAge: '10000h'
        }
      }
    };
  }

  analyzeCacheUsage() {
    const cacheDir = this.cacheConfig.hugo.cacheDir;
    let totalSize = 0;
    let fileCount = 0;
    
    if (!fs.existsSync(cacheDir)) {
      return { totalSize: 0, fileCount: 0 };
    }
    
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else {
          totalSize += stat.size;
          fileCount++;
        }
      });
    };
    
    walkDir(cacheDir);
    
    return { totalSize, fileCount };
  }

  calculateCacheEfficiency() {
    // Simple efficiency calculation based on cache hits vs total operations
    const totalOps = this.stats.cacheHits + this.stats.cacheMisses;
    return totalOps > 0 ? this.stats.cacheHits / totalOps : 0;
  }

  async setupNetlifyCaching() {
    this.log('Setting up Netlify build caching...', 'info');
    
    const netlifyConfig = this.getNetlifyConfig();
    const cacheOptimizations = [];
    
    // Check for cache-friendly build commands
    if (!netlifyConfig.build?.command?.includes('cache')) {
      cacheOptimizations.push({
        type: 'build_command',
        recommendation: 'Use cache-aware build commands',
        suggested: 'npm run build:cached'
      });
    }
    
    // Check for dependency caching
    if (!this.hasNetlifyBuildCache()) {
      cacheOptimizations.push({
        type: 'dependency_cache',
        recommendation: 'Enable Netlify dependency caching',
        instructions: 'Add cache directories to netlify.toml'
      });
    }
    
    // Generate optimized netlify.toml section
    const cacheConfig = this.generateNetlifyCacheConfig();
    
    this.log(`Generated ${cacheOptimizations.length} Netlify cache optimizations`, 'info');
    return { optimizations: cacheOptimizations, config: cacheConfig };
  }

  generateNetlifyCacheConfig() {
    return `
# Build optimization
[build.processing]
  skip_processing = false

[build.processing.css]
  bundle = true
  minify = true

[build.processing.js]
  bundle = true
  minify = true

[build.processing.html]
  pretty_urls = true

# Cache headers for static assets
[[headers]]
  for = "/css/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/js/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/images/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
`;
  }

  async cleanupCache() {
    this.log('Cleaning up old cache files...', 'info');
    
    const cleanupStats = {
      filesRemoved: 0,
      spaceFreed: 0
    };
    
    // Clean Hugo cache
    if (fs.existsSync(this.cacheConfig.hugo.cacheDir)) {
      const hugoCleanup = await this.cleanupHugoCache();
      cleanupStats.filesRemoved += hugoCleanup.filesRemoved;
      cleanupStats.spaceFreed += hugoCleanup.spaceFreed;
    }
    
    // Clean temporary build files
    const tempCleanup = await this.cleanupTempFiles();
    cleanupStats.filesRemoved += tempCleanup.filesRemoved;
    cleanupStats.spaceFreed += tempCleanup.spaceFreed;
    
    this.log(`Cleanup completed: ${cleanupStats.filesRemoved} files, ${this.formatBytes(cleanupStats.spaceFreed)} freed`, 'success');
    return cleanupStats;
  }

  async cleanupHugoCache() {
    const cacheDir = this.cacheConfig.hugo.cacheDir;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const now = Date.now();
    
    let filesRemoved = 0;
    let spaceFreed = 0;
    
    const cleanupDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          cleanupDir(filePath);
        } else if (now - stat.mtime.getTime() > maxAge) {
          spaceFreed += stat.size;
          filesRemoved++;
          fs.unlinkSync(filePath);
        }
      });
    };
    
    cleanupDir(cacheDir);
    return { filesRemoved, spaceFreed };
  }

  async cleanupTempFiles() {
    const tempPatterns = [
      '*.tmp',
      '*.temp',
      '.hugo_build.lock',
      'hugo_stats.json'
    ];
    
    let filesRemoved = 0;
    let spaceFreed = 0;
    
    tempPatterns.forEach(pattern => {
      try {
        const files = this.glob(pattern);
        files.forEach(file => {
          const stat = fs.statSync(file);
          spaceFreed += stat.size;
          filesRemoved++;
          fs.unlinkSync(file);
        });
      } catch (error) {
        // Ignore glob errors
      }
    });
    
    return { filesRemoved, spaceFreed };
  }

  generateCacheReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      cacheConfig: this.cacheConfig,
      efficiency: this.calculateCacheEfficiency(),
      usage: this.analyzeCacheUsage(),
      recommendations: this.generateCacheRecommendations()
    };
    
    fs.writeFileSync('build-cache-report.json', JSON.stringify(report, null, 2));
    this.log('Cache report generated: build-cache-report.json', 'success');
    
    return report;
  }

  generateCacheRecommendations() {
    const recommendations = [];
    const efficiency = this.calculateCacheEfficiency();
    const usage = this.analyzeCacheUsage();
    
    if (efficiency < 0.7) {
      recommendations.push({
        type: 'efficiency',
        priority: 'high',
        message: 'Cache efficiency is below optimal (70%)',
        action: 'Review cache configuration and invalidation strategies'
      });
    }
    
    if (usage.totalSize > 1024 * 1024 * 100) { // 100MB
      recommendations.push({
        type: 'size',
        priority: 'medium',
        message: 'Cache size is large, consider cleanup',
        action: 'Run regular cache cleanup or reduce maxAge values'
      });
    }
    
    if (!this.hasNetlifyBuildCache()) {
      recommendations.push({
        type: 'netlify',
        priority: 'medium',
        message: 'Netlify build cache not optimally configured',
        action: 'Add build caching configuration to netlify.toml'
      });
    }
    
    return recommendations;
  }

  // Helper methods
  getHugoVersion() {
    try {
      return execSync('hugo version', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  getHugoConfig() {
    try {
      const configPath = fs.existsSync('config.yaml') ? 'config.yaml' : 
                        fs.existsSync('config.toml') ? 'config.toml' : 
                        'config.json';
      
      if (fs.existsSync(configPath)) {
        if (configPath.endsWith('.yaml')) {
          const yaml = require('yaml');
          return yaml.parse(fs.readFileSync(configPath, 'utf8'));
        } else if (configPath.endsWith('.toml')) {
          const toml = require('@iarna/toml');
          return toml.parse(fs.readFileSync(configPath, 'utf8'));
        } else {
          return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      }
    } catch (error) {
      this.log(`Failed to load Hugo config: ${error.message}`, 'warning');
    }
    
    return {};
  }

  getHugoConfigHash() {
    try {
      const config = JSON.stringify(this.getHugoConfig());
      return crypto.createHash('sha256').update(config).digest('hex');
    } catch (error) {
      return 'unknown';
    }
  }

  getDependencyHash() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = JSON.stringify(packageJson.dependencies || {}) + 
                   JSON.stringify(packageJson.devDependencies || {});
      return crypto.createHash('sha256').update(deps).digest('hex');
    } catch (error) {
      return 'unknown';
    }
  }

  getNetlifyConfig() {
    try {
      if (fs.existsSync('netlify.toml')) {
        const toml = require('@iarna/toml');
        return toml.parse(fs.readFileSync('netlify.toml', 'utf8'));
      }
    } catch (error) {
      this.log(`Failed to load Netlify config: ${error.message}`, 'warning');
    }
    
    return {};
  }

  hasNetlifyBuildCache() {
    return fs.existsSync('.netlify/cache') || 
           process.env.NETLIFY_BUILD_BASE !== undefined;
  }

  glob(pattern) {
    // Simple glob implementation for temp file patterns
    const files = [];
    try {
      const glob = require('glob');
      return glob.sync(pattern);
    } catch (error) {
      return [];
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    console.log(`${colors[type](`[CACHE]`)} ${message}`);
  }
}

// CLI execution
if (require.main === module) {
  const manager = new BuildCacheManager();
  
  (async () => {
    try {
      await manager.initialize();
      const hasChanges = await manager.detectChanges();
      
      if (process.argv.includes('--cleanup')) {
        await manager.cleanupCache();
      }
      
      if (process.argv.includes('--optimize')) {
        await manager.optimizeHugoCache();
        await manager.setupNetlifyCaching();
      }
      
      if (process.argv.includes('--report')) {
        manager.generateCacheReport();
      }
      
      if (!hasChanges && !process.argv.includes('--force')) {
        console.log('No changes detected, skipping build');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('Cache manager failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = BuildCacheManager;