#!/usr/bin/env node

/**
 * Bundle Analyzer - Comprehensive bundle size analysis and optimization reporting
 * Generates detailed reports on bundle composition and optimization opportunities
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
  constructor(options = {}) {
    this.options = {
      buildDir: '.next',
      outputDir: 'bundle-analysis',
      thresholds: {
        jsSize: 500000, // 500KB
        cssSize: 100000, // 100KB
        totalSize: 1000000, // 1MB
        chunkCount: 20
      },
      ...options
    };
    
    this.buildPath = path.resolve(this.options.buildDir);
    this.outputPath = path.resolve(this.options.outputDir);
  }

  async analyze() {
    console.log('🔍 Starting bundle analysis...');
    
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // Run bundle analysis
      const analysis = await this.performAnalysis();
      
      // Generate reports
      await this.generateReports(analysis);
      
      // Output summary
      this.outputSummary(analysis);
      
      return analysis;
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  async performAnalysis() {
    const analysis = {
      timestamp: new Date().toISOString(),
      buildInfo: await this.getBuildInfo(),
      chunks: await this.analyzeChunks(),
      assets: await this.analyzeAssets(),
      dependencies: await this.analyzeDependencies(),
      performance: await this.analyzePerformance(),
      recommendations: []
    };

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  async getBuildInfo() {
    const buildInfoPath = path.join(this.buildPath, 'build-manifest.json');
    const packagePath = path.resolve('package.json');
    
    try {
      const [buildManifest, packageJson] = await Promise.all([
        fs.readFile(buildInfoPath, 'utf8').then(JSON.parse).catch(() => null),
        fs.readFile(packagePath, 'utf8').then(JSON.parse)
      ]);

      return {
        nextVersion: packageJson.dependencies?.next || 'unknown',
        buildTime: await this.getBuildTime(),
        buildManifest
      };
    } catch (error) {
      console.warn('⚠️ Could not read build info:', error.message);
      return { error: error.message };
    }
  }

  async getBuildTime() {
    const buildDir = path.join(this.buildPath);
    try {
      const stats = await fs.stat(buildDir);
      return stats.mtime.toISOString();
    } catch {
      return null;
    }
  }

  async analyzeChunks() {
    const chunksPath = path.join(this.buildPath, 'static', 'chunks');
    const chunks = [];
    
    try {
      const files = await this.getFilesRecursively(chunksPath);
      
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.css')) {
          const stats = await fs.stat(file);
          const relativePath = path.relative(this.buildPath, file);
          
          chunks.push({
            name: path.basename(file),
            path: relativePath,
            size: stats.size,
            type: path.extname(file).slice(1),
            gzipSize: await this.estimateGzipSize(file)
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not analyze chunks:', error.message);
    }

    return chunks.sort((a, b) => b.size - a.size);
  }

  async analyzeAssets() {
    const assetsPath = path.join(this.buildPath, 'static');
    const assets = {
      images: [],
      fonts: [],
      other: []
    };
    
    try {
      const files = await this.getFilesRecursively(assetsPath);
      
      for (const file of files) {
        const stats = await fs.stat(file);
        const relativePath = path.relative(this.buildPath, file);
        const extension = path.extname(file).toLowerCase();
        
        const asset = {
          name: path.basename(file),
          path: relativePath,
          size: stats.size,
          extension
        };

        if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'].includes(extension)) {
          assets.images.push(asset);
        } else if (['.woff', '.woff2', '.ttf', '.otf'].includes(extension)) {
          assets.fonts.push(asset);
        } else {
          assets.other.push(asset);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not analyze assets:', error.message);
    }

    // Sort by size
    Object.keys(assets).forEach(key => {
      assets[key].sort((a, b) => b.size - a.size);
    });

    return assets;
  }

  async analyzeDependencies() {
    const packagePath = path.resolve('package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});
      
      // Analyze package sizes (approximate)
      const dependencySizes = await this.estimatePackageSizes(dependencies);
      
      return {
        production: dependencies.length,
        development: devDependencies.length,
        total: dependencies.length + devDependencies.length,
        heaviest: dependencySizes.slice(0, 10),
        dependencies: dependencySizes
      };
    } catch (error) {
      console.warn('⚠️ Could not analyze dependencies:', error.message);
      return { error: error.message };
    }
  }

  async estimatePackageSizes(dependencies) {
    const sizes = [];
    
    for (const dep of dependencies) {
      try {
        const packagePath = path.resolve('node_modules', dep, 'package.json');
        const stats = await fs.stat(path.resolve('node_modules', dep));
        
        // Get approximate size by checking dist/lib folders
        const distPath = path.resolve('node_modules', dep, 'dist');
        const libPath = path.resolve('node_modules', dep, 'lib');
        
        let size = 0;
        
        for (const checkPath of [distPath, libPath]) {
          try {
            const files = await this.getFilesRecursively(checkPath);
            for (const file of files) {
              const fileStats = await fs.stat(file);
              size += fileStats.size;
            }
          } catch {
            // Path doesn't exist, continue
          }
        }
        
        sizes.push({
          name: dep,
          estimatedSize: size,
          installSize: await this.getDirectorySize(path.resolve('node_modules', dep))
        });
      } catch {
        // Package might not be installed or accessible
        sizes.push({
          name: dep,
          estimatedSize: 0,
          installSize: 0,
          error: 'Could not analyze'
        });
      }
    }
    
    return sizes.sort((a, b) => b.estimatedSize - a.estimatedSize);
  }

  async analyzePerformance() {
    const chunks = await this.analyzeChunks();
    
    const jsChunks = chunks.filter(c => c.type === 'js');
    const cssChunks = chunks.filter(c => c.type === 'css');
    
    const totalJSSize = jsChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const totalCSSSize = cssChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const totalGzipSize = chunks.reduce((sum, chunk) => sum + (chunk.gzipSize || 0), 0);
    
    return {
      javascript: {
        chunkCount: jsChunks.length,
        totalSize: totalJSSize,
        averageSize: totalJSSize / jsChunks.length || 0,
        largestChunk: jsChunks[0]?.size || 0
      },
      css: {
        chunkCount: cssChunks.length,
        totalSize: totalCSSSize,
        averageSize: totalCSSSize / cssChunks.length || 0,
        largestChunk: cssChunks[0]?.size || 0
      },
      overall: {
        totalSize: totalJSSize + totalCSSSize,
        totalGzipSize,
        compressionRatio: totalGzipSize / (totalJSSize + totalCSSSize) || 0
      }
    };
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    const { performance } = analysis;
    const { thresholds } = this.options;

    // JavaScript size recommendations
    if (performance.javascript.totalSize > thresholds.jsSize) {
      recommendations.push({
        type: 'javascript',
        severity: 'high',
        message: `JavaScript bundle size (${this.formatBytes(performance.javascript.totalSize)}) exceeds recommended threshold (${this.formatBytes(thresholds.jsSize)})`,
        suggestions: [
          'Implement code splitting with dynamic imports',
          'Use tree shaking to remove unused code',
          'Consider lazy loading non-critical components',
          'Analyze and optimize large dependencies'
        ]
      });
    }

    // CSS size recommendations
    if (performance.css.totalSize > thresholds.cssSize) {
      recommendations.push({
        type: 'css',
        severity: 'medium',
        message: `CSS bundle size (${this.formatBytes(performance.css.totalSize)}) exceeds recommended threshold (${this.formatBytes(thresholds.cssSize)})`,
        suggestions: [
          'Remove unused CSS classes',
          'Implement critical CSS extraction',
          'Use CSS purging tools',
          'Consider CSS-in-JS for component-scoped styles'
        ]
      });
    }

    // Chunk count recommendations
    const totalChunks = performance.javascript.chunkCount + performance.css.chunkCount;
    if (totalChunks > thresholds.chunkCount) {
      recommendations.push({
        type: 'chunks',
        severity: 'low',
        message: `High number of chunks (${totalChunks}) may impact loading performance`,
        suggestions: [
          'Optimize chunk splitting strategy',
          'Combine small chunks',
          'Use HTTP/2 push for critical chunks'
        ]
      });
    }

    // Compression recommendations
    if (performance.overall.compressionRatio > 0.7) {
      recommendations.push({
        type: 'compression',
        severity: 'medium',
        message: 'Bundle has poor compression ratio, indicating potential optimization opportunities',
        suggestions: [
          'Minify JavaScript and CSS more aggressively',
          'Remove duplicate code',
          'Use shorter variable names in production',
          'Enable Brotli compression on server'
        ]
      });
    }

    return recommendations;
  }

  async generateReports(analysis) {
    const reports = [
      { name: 'full-analysis.json', content: JSON.stringify(analysis, null, 2) },
      { name: 'summary.md', content: this.generateMarkdownReport(analysis) },
      { name: 'recommendations.json', content: JSON.stringify(analysis.recommendations, null, 2) }
    ];

    await Promise.all(
      reports.map(report => 
        fs.writeFile(path.join(this.outputPath, report.name), report.content)
      )
    );

    console.log(`📊 Reports generated in ${this.outputPath}/`);
  }

  generateMarkdownReport(analysis) {
    const { performance, recommendations } = analysis;
    
    return `# Bundle Analysis Report

Generated: ${analysis.timestamp}

## Performance Summary

### JavaScript
- **Total Size**: ${this.formatBytes(performance.javascript.totalSize)}
- **Chunk Count**: ${performance.javascript.chunkCount}
- **Average Chunk Size**: ${this.formatBytes(performance.javascript.averageSize)}
- **Largest Chunk**: ${this.formatBytes(performance.javascript.largestChunk)}

### CSS
- **Total Size**: ${this.formatBytes(performance.css.totalSize)}
- **Chunk Count**: ${performance.css.chunkCount}
- **Average Chunk Size**: ${this.formatBytes(performance.css.averageSize)}
- **Largest Chunk**: ${this.formatBytes(performance.css.largestChunk)}

### Overall
- **Total Bundle Size**: ${this.formatBytes(performance.overall.totalSize)}
- **Compressed Size**: ${this.formatBytes(performance.overall.totalGzipSize)}
- **Compression Ratio**: ${(performance.overall.compressionRatio * 100).toFixed(1)}%

## Top 10 Largest Chunks

${analysis.chunks.slice(0, 10).map((chunk, i) => 
  `${i + 1}. **${chunk.name}** (${chunk.type.toUpperCase()}) - ${this.formatBytes(chunk.size)}`
).join('\n')}

## Recommendations

${recommendations.map(rec => `
### ${rec.type.toUpperCase()} - ${rec.severity.toUpperCase()} Priority

${rec.message}

**Suggestions:**
${rec.suggestions.map(s => `- ${s}`).join('\n')}
`).join('\n')}

## Heaviest Dependencies

${analysis.dependencies?.heaviest?.slice(0, 10).map((dep, i) => 
  `${i + 1}. **${dep.name}** - ${this.formatBytes(dep.estimatedSize)} (estimated)`
).join('\n') || 'No dependency analysis available'}

---
*Generated by Bundle Analyzer*`;
  }

  outputSummary(analysis) {
    const { performance, recommendations } = analysis;
    
    console.log('\n📈 Bundle Analysis Summary');
    console.log('================================');
    console.log(`📦 Total Bundle Size: ${this.formatBytes(performance.overall.totalSize)}`);
    console.log(`🗜️  Compressed Size: ${this.formatBytes(performance.overall.totalGzipSize)}`);
    console.log(`🔧 JavaScript: ${this.formatBytes(performance.javascript.totalSize)} (${performance.javascript.chunkCount} chunks)`);
    console.log(`🎨 CSS: ${this.formatBytes(performance.css.totalSize)} (${performance.css.chunkCount} chunks)`);
    
    if (recommendations.length > 0) {
      console.log(`\n⚠️  ${recommendations.length} Optimization Opportunities Found:`);
      recommendations.forEach(rec => {
        const icon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        console.log(`${icon} ${rec.type.toUpperCase()}: ${rec.message}`);
      });
    } else {
      console.log('\n✅ Bundle size looks good! No major optimizations needed.');
    }
    
    console.log(`\n📋 Detailed reports available in: ${this.outputPath}/`);
  }

  // Utility methods
  async getFilesRecursively(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          files.push(...await this.getFilesRecursively(itemPath));
        } else {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  async getDirectorySize(dir) {
    let size = 0;
    
    try {
      const files = await this.getFilesRecursively(dir);
      
      for (const file of files) {
        const stats = await fs.stat(file);
        size += stats.size;
      }
    } catch {
      // Error reading directory
    }
    
    return size;
  }

  async estimateGzipSize(filePath) {
    try {
      // Simple estimation: gzip typically achieves 60-70% compression for JS/CSS
      const stats = await fs.stat(filePath);
      const extension = path.extname(filePath);
      
      if (extension === '.js') {
        return Math.round(stats.size * 0.35); // ~65% compression
      } else if (extension === '.css') {
        return Math.round(stats.size * 0.25); // ~75% compression
      }
      
      return Math.round(stats.size * 0.5); // Default 50% compression
    } catch {
      return 0;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI Interface
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = BundleAnalyzer;