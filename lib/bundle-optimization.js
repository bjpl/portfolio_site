/**
 * Bundle Optimization Utilities
 * Comprehensive bundle size reduction and performance optimization
 */

// Dynamic imports with loading states for better code splitting
export const DynamicComponentLoader = {
  async loadComponent(importFunction, options = {}) {
    const { 
      fallback = null, 
      timeout = 5000,
      retries = 3 
    } = options;
    
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const module = await Promise.race([
          importFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Component load timeout')), timeout)
          )
        ]);
        
        return module.default || module;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          console.error('Failed to load component after', retries, 'attempts:', error);
          return fallback;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  },

  // Preload critical components
  preloadComponents(componentPaths) {
    if (typeof window === 'undefined') return;
    
    componentPaths.forEach(path => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = path;
      document.head.appendChild(link);
    });
  }
};

// Tree shaking helper for large libraries
export const OptimizedImports = {
  // Optimized Lucide React icons
  createIconComponent(iconName) {
    return async () => {
      try {
        const icon = await import(`lucide-react/dist/esm/icons/${iconName.toLowerCase().replace(/([A-Z])/g, '-$1').slice(1)}`);
        return icon.default;
      } catch (error) {
        console.warn(`Failed to load icon ${iconName}, using fallback`);
        const { Square } = await import('lucide-react');
        return Square;
      }
    };
  },

  // Optimized date-fns functions
  loadDateFunction(functionName) {
    return import(`date-fns/${functionName}`);
  },

  // Optimized Framer Motion components
  loadMotionComponent(componentName) {
    return import(`framer-motion/dist/es/render/components/${componentName}`);
  }
};

// CSS optimization utilities
export const CSSOptimization = {
  // Critical CSS extraction
  extractCriticalCSS(html, css) {
    // Extract above-the-fold CSS
    const criticalSelectors = [
      'body', 'html', '.layout', '.header', '.hero', '.nav',
      '.btn', '.text-', '.bg-', '.flex', '.grid', '.container'
    ];
    
    const criticalCSS = css
      .split('}')
      .filter(rule => {
        return criticalSelectors.some(selector => 
          rule.includes(selector) && !rule.includes('@media')
        );
      })
      .join('}');
    
    return criticalCSS;
  },

  // Remove unused CSS classes
  removeUnusedCSS(css, html) {
    const usedClasses = new Set();
    
    // Extract classes from HTML
    const classRegex = /class=["|']([^"']*)["|']/g;
    let match;
    
    while ((match = classRegex.exec(html)) !== null) {
      match[1].split(' ').forEach(cls => {
        if (cls.trim()) usedClasses.add(cls.trim());
      });
    }
    
    // Filter CSS to only include used classes
    return css
      .split('}')
      .filter(rule => {
        if (rule.includes('@media') || rule.includes('@keyframes')) return true;
        
        const selectors = rule.split('{')[0]?.split(',') || [];
        return selectors.some(selector => {
          const cleanSelector = selector.trim().replace(/^\./, '');
          return usedClasses.has(cleanSelector) || 
                 selector.includes(':') || 
                 selector.includes('html') || 
                 selector.includes('body');
        });
      })
      .join('}');
  },

  // Inline critical CSS
  inlineCriticalCSS(criticalCSS) {
    if (typeof document === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    style.setAttribute('data-critical', 'true');
    document.head.insertBefore(style, document.head.firstChild);
  }
};

// Image optimization utilities
export const ImageOptimization = {
  // Generate responsive image sets
  generateResponsiveImages(imagePath, sizes = [320, 640, 1024, 1280, 1920]) {
    const extension = imagePath.split('.').pop();
    const basePath = imagePath.replace(`.${extension}`, '');
    
    return {
      srcSet: sizes.map(size => `${basePath}-${size}w.webp ${size}w`).join(', '),
      sizes: '(max-width: 640px) 320px, (max-width: 1024px) 640px, (max-width: 1280px) 1024px, 1280px',
      src: `${basePath}-640w.webp`,
      fallback: imagePath
    };
  },

  // Lazy loading with intersection observer
  setupLazyLoading() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // Load optimized image
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
          }
          if (img.dataset.src) {
            img.src = img.dataset.src;
          }
          
          img.classList.remove('loading');
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });
    
    // Observe all images with data-src
    document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
      observer.observe(img);
    });
    
    return observer;
  },

  // Convert images to modern formats
  async convertToModernFormat(imageBlob, format = 'webp', quality = 0.8) {
    if (typeof window === 'undefined' || !window.createImageBitmap) return null;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imageBitmap = await createImageBitmap(imageBlob);
      
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      ctx.drawImage(imageBitmap, 0, 0);
      
      return new Promise(resolve => {
        canvas.toBlob(resolve, `image/${format}`, quality);
      });
    } catch (error) {
      console.error('Image conversion failed:', error);
      return null;
    }
  }
};

// Bundle analysis and monitoring
export const BundleAnalyzer = {
  // Monitor bundle sizes
  analyzeBundle() {
    if (typeof window === 'undefined' || !window.performance) return null;
    
    const navigation = window.performance.getEntriesByType('navigation')[0];
    const resources = window.performance.getEntriesByType('resource');
    
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    const cssResources = resources.filter(r => r.name.endsWith('.css'));
    const imageResources = resources.filter(r => 
      /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(r.name)
    );
    
    return {
      totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      jsSize: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      cssSize: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      imageSize: imageResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      jsCount: jsResources.length,
      cssCount: cssResources.length,
      imageCount: imageResources.length,
      largestResources: resources
        .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
        .slice(0, 10)
        .map(r => ({
          name: r.name,
          size: r.transferSize,
          duration: r.duration
        }))
    };
  },

  // Generate optimization report
  generateOptimizationReport() {
    const analysis = this.analyzeBundle();
    if (!analysis) return null;
    
    const recommendations = [];
    
    if (analysis.jsSize > 500000) { // > 500KB
      recommendations.push('Consider code splitting and lazy loading for JavaScript bundles');
    }
    
    if (analysis.cssSize > 100000) { // > 100KB
      recommendations.push('Optimize CSS by removing unused styles and critical CSS extraction');
    }
    
    if (analysis.imageSize > 1000000) { // > 1MB
      recommendations.push('Optimize images using modern formats (WebP/AVIF) and responsive images');
    }
    
    if (analysis.jsCount > 10) {
      recommendations.push('Reduce number of JavaScript files through bundling');
    }
    
    return {
      ...analysis,
      recommendations,
      score: this.calculatePerformanceScore(analysis)
    };
  },

  calculatePerformanceScore(analysis) {
    let score = 100;
    
    // Penalize large bundle sizes
    if (analysis.jsSize > 1000000) score -= 30;
    else if (analysis.jsSize > 500000) score -= 20;
    else if (analysis.jsSize > 250000) score -= 10;
    
    if (analysis.cssSize > 200000) score -= 20;
    else if (analysis.cssSize > 100000) score -= 10;
    
    if (analysis.imageSize > 2000000) score -= 25;
    else if (analysis.imageSize > 1000000) score -= 15;
    
    // Penalize too many requests
    const totalRequests = analysis.jsCount + analysis.cssCount + analysis.imageCount;
    if (totalRequests > 50) score -= 20;
    else if (totalRequests > 30) score -= 10;
    
    return Math.max(score, 0);
  }
};

// Preloading strategies
export const PreloadStrategy = {
  // Preload critical resources
  preloadCriticalResources() {
    if (typeof document === 'undefined') return;
    
    const criticalResources = [
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
      { href: '/_next/static/css/app.css', as: 'style' },
      { href: '/_next/static/chunks/main.js', as: 'script' }
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      Object.assign(link, resource);
      document.head.appendChild(link);
    });
  },

  // Prefetch next-page resources
  prefetchNextPageResources(pages = []) {
    if (typeof document === 'undefined') return;
    
    pages.forEach(page => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = page;
      document.head.appendChild(link);
    });
  }
};

// Main optimization orchestrator
export default class BundleOptimizer {
  constructor(options = {}) {
    this.options = {
      enableCriticalCSS: true,
      enableLazyLoading: true,
      enablePreloading: true,
      enableBundleAnalysis: true,
      ...options
    };
    
    this.init();
  }
  
  async init() {
    if (typeof window === 'undefined') return;
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.optimize());
    } else {
      this.optimize();
    }
  }
  
  async optimize() {
    const tasks = [];
    
    if (this.options.enableLazyLoading) {
      tasks.push(ImageOptimization.setupLazyLoading());
    }
    
    if (this.options.enablePreloading) {
      tasks.push(PreloadStrategy.preloadCriticalResources());
    }
    
    if (this.options.enableBundleAnalysis) {
      // Delay analysis to avoid impacting initial load
      setTimeout(() => {
        const report = BundleAnalyzer.generateOptimizationReport();
        if (report && report.score < 80) {
          console.warn('Bundle optimization recommendations:', report.recommendations);
        }
      }, 3000);
    }
    
    await Promise.all(tasks);
  }
  
  // Get optimization metrics
  getMetrics() {
    return BundleAnalyzer.analyzeBundle();
  }
}