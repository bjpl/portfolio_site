// src/scripts/core/resource-optimizer.ts

interface ConnectionType {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface ResourceConfig {
  images: {
    quality: number;
    format: 'webp' | 'avif' | 'jpg';
    lazy: boolean;
    placeholder: boolean;
  };
  video: {
    autoplay: boolean;
    quality: 'auto' | '1080p' | '720p' | '480p' | '360p';
    preload: 'none' | 'metadata' | 'auto';
  };
  fonts: {
    display: 'auto' | 'swap' | 'block' | 'fallback' | 'optional';
    subset: boolean;
  };
  scripts: {
    defer: boolean;
    async: boolean;
    modulepreload: boolean;
  };
}

export class ResourceOptimizer {
  private connection: ConnectionType | null = null;
  private config: ResourceConfig;
  private observer: PerformanceObserver | null = null;
  private resourceTimings: Map<string, number> = new Map();
  private priorityQueue: Map<string, number> = new Map();
  private prefetchCache: Set<string> = new Set();

  constructor() {
    this.config = this.getDefaultConfig();
    this.detectConnection();
    this.setupPerformanceObserver();
    this.initializeAdaptiveLoading();
    this.setupPrefetchStrategy();
  }

  private getDefaultConfig(): ResourceConfig {
    return {
      images: {
        quality: 85,
        format: 'webp',
        lazy: true,
        placeholder: true
      },
      video: {
        autoplay: false,
        quality: 'auto',
        preload: 'metadata'
      },
      fonts: {
        display: 'swap',
        subset: true
      },
      scripts: {
        defer: true,
        async: false,
        modulepreload: true
      }
    };
  }

  private detectConnection(): void {
    const nav = navigator as any;
    if ('connection' in nav) {
      this.connection = nav.connection;
      this.adaptToConnection();
      
      nav.connection.addEventListener('change', () => {
        this.connection = nav.connection;
        this.adaptToConnection();
      });
    }
  }

  private adaptToConnection(): void {
    if (!this.connection) return;

    const { effectiveType, saveData } = this.connection;

    switch (effectiveType) {
      case '4g':
        this.config.images.quality = 85;
        this.config.images.format = 'avif';
        this.config.video.quality = '1080p';
        this.config.video.preload = 'auto';
        break;
      case '3g':
        this.config.images.quality = 70;
        this.config.images.format = 'webp';
        this.config.video.quality = '480p';
        this.config.video.preload = 'metadata';
        break;
      case '2g':
      case 'slow-2g':
        this.config.images.quality = 50;
        this.config.images.format = 'jpg';
        this.config.video.quality = '360p';
        this.config.video.preload = 'none';
        this.config.video.autoplay = false;
        break;
    }

    if (saveData) {
      this.config.images.quality = Math.min(this.config.images.quality, 60);
      this.config.video.autoplay = false;
      this.config.video.preload = 'none';
    }

    this.applyOptimizations();
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.analyzeResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });

      try {
        this.observer.observe({ entryTypes: ['resource', 'navigation', 'paint'] });
      } catch (e) {
        this.observer.observe({ entryTypes: ['resource'] });
      }
    }
  }

  private analyzeResourceTiming(entry: PerformanceResourceTiming): void {
    const { name, duration, transferSize } = entry;
    
    if (duration > 1000) {
      this.resourceTimings.set(name, duration);
      this.optimizeSlowResource(name, duration, transferSize);
    }

    this.updatePrefetchStrategy(name, duration);
  }

  private optimizeSlowResource(url: string, duration: number, size: number): void {
    if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)) {
      this.optimizeImage(url, size);
    }
    
    if (/\.js$/i.test(url)) {
      this.optimizeScript(url, duration);
    }
    
    if (/\.css$/i.test(url)) {
      this.optimizeStylesheet(url);
    }
  }

  private optimizeImage(url: string, size: number): void {
    const img = document.querySelector(`img[src="${url}"]`) as HTMLImageElement;
    if (!img) return;

    if (size > 100000) {
      if (!this.isInViewport(img)) {
        img.loading = 'lazy';
      }

      this.addResponsiveSrcset(img);
      this.addBlurPlaceholder(img);
    }
  }

  private addResponsiveSrcset(img: HTMLImageElement): void {
    if (img.srcset) return;
    
    const sizes = [320, 640, 768, 1024, 1920];
    const srcset = sizes.map(size => {
      const url = this.getResponsiveImageUrl(img.src, size);
      return `${url} ${size}w`;
    }).join(', ');

    img.srcset = srcset;
    img.sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  }

  private addBlurPlaceholder(img: HTMLImageElement): void {
    const placeholder = this.generatePlaceholder(img.src);
    
    img.style.backgroundImage = `url(${placeholder})`;
    img.style.backgroundSize = 'cover';
    img.style.filter = 'blur(5px)';
    
    img.addEventListener('load', () => {
      img.style.filter = 'none';
      img.style.backgroundImage = 'none';
    }, { once: true });
  }

  private optimizeScript(url: string, duration: number): void {
    if (duration > 2000) {
      this.implementCodeSplitting(url);
    }

    if (this.isCriticalScript(url)) {
      this.addResourceHint('preload', url, 'script');
    } else {
      const script = document.querySelector(`script[src="${url}"]`);
      if (script) {
        script.setAttribute('defer', '');
      }
    }
  }

  private implementCodeSplitting(scriptUrl: string): void {
    const moduleMap: Record<string, () => Promise<any>> = {
      'charts': () => import('../components/charts'),
      'editor': () => import('../components/editor'),
      'animations': () => import('../animations/heavy')
    };

    Object.entries(moduleMap).forEach(([name, loader]) => {
      if (scriptUrl.includes(name)) {
        this.loadOnInteraction(name, loader);
      }
    });
  }

  private loadOnInteraction(name: string, loader: () => Promise<any>): void {
    const triggers = document.querySelectorAll(`[data-requires="${name}"]`);
    
    triggers.forEach(trigger => {
      trigger.addEventListener('click', async () => {
        const module = await loader();
        module.initialize();
      }, { once: true });
    });
  }

  private optimizeStylesheet(url: string): void {
    const link = document.querySelector(`link[href="${url}"]`) as HTMLLinkElement;
    if (!link) return;

    this.extractCriticalCSS(url);

    if (!this.isCriticalStylesheet(url)) {
      link.media = 'print';
      link.onload = function() { 
        (this as HTMLLinkElement).media = 'all'; 
      };
    }
  }

  private extractCriticalCSS(url: string): void {
    const critical = this.identifyCriticalSelectors();
    
    const style = document.createElement('style');
    style.textContent = critical;
    document.head.insertBefore(style, document.head.firstChild);
  }

  private initializeAdaptiveLoading(): void {
    this.setupProgressiveJPEG();
    this.setupAdaptiveVideo();
    this.setupSmartPrefetch();
  }

  private setupProgressiveJPEG(): void {
    const images = document.querySelectorAll('img[data-progressive]');
    
    images.forEach(img => {
      const image = img as HTMLImageElement;
      const lowQuality = image.dataset.lowQuality;
      const highQuality = image.dataset.highQuality;
      
      if (lowQuality && highQuality) {
        image.src = lowQuality;
        
        const highQualityImg = new Image();
        highQualityImg.onload = () => {
          image.src = highQuality;
          image.classList.add('loaded');
        };
        
        const delay = this.getLoadDelay();
        setTimeout(() => {
          highQualityImg.src = highQuality;
        }, delay);
      }
    });
  }

  private setupAdaptiveVideo(): void {
    const videos = document.querySelectorAll('video[data-adaptive]');
    
    videos.forEach(video => {
      const videoEl = video as HTMLVideoElement;
      const sources = videoEl.querySelectorAll('source');
      
      const quality = this.config.video.quality;
      
      sources.forEach(source => {
        const sourceEl = source as HTMLSourceElement;
        if (sourceEl.dataset.quality === quality) {
          sourceEl.setAttribute('selected', '');
        }
      });
    });
  }

  private setupSmartPrefetch(): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.prefetchPredictedResources();
      });
    }

    const linkObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement;
          this.prefetchLink(link.href);
        }
      });
    }, { rootMargin: '50px' });

    document.querySelectorAll('nav a').forEach(link => {
      linkObserver.observe(link);
    });
  }

  private prefetchPredictedResources(): void {
    const predictions = this.getPredictedPages();
    
    predictions.forEach(url => {
      if (!this.prefetchCache.has(url)) {
        this.addResourceHint('prefetch', url, 'document');
        this.prefetchCache.add(url);
      }
    });
  }

  private getPredictedPages(): string[] {
    const currentPath = window.location.pathname;
    const predictions: string[] = [];

    if (currentPath === '/') {
      predictions.push('/make/', '/learn/', '/think/');
    }
    
    if (currentPath.includes('/make/')) {
      predictions.push('/make/words/', '/make/visuals/');
    }

    return predictions;
  }

  private setupPrefetchStrategy(): void {
    document.addEventListener('mouseover', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && link.href && !this.prefetchCache.has(link.href)) {
        this.prefetchLink(link.href);
      }
    });

    document.addEventListener('touchstart', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && link.href && !this.prefetchCache.has(link.href)) {
        this.prefetchLink(link.href);
      }
    }, { passive: true });
  }

  private prefetchLink(url: string): void {
    if (this.shouldPrefetch(url)) {
      this.addResourceHint('prefetch', url, 'document');
      this.prefetchCache.add(url);
      this.prefetchPageResources(url);
    }
  }

  private shouldPrefetch(url: string): boolean {
    if (!url.startsWith(window.location.origin)) return false;
    if (this.connection?.saveData) return false;
    if (this.prefetchCache.has(url)) return false;
    
    if (this.prefetchCache.size > 20) {
      const firstEntry = this.prefetchCache.values().next().value;
      if (firstEntry) {
        this.prefetchCache.delete(firstEntry);
      }
    }
    
    return true;
  }

  private prefetchPageResources(pageUrl: string): void {
    const resources = this.predictPageResources(pageUrl);
    
    resources.forEach(resource => {
      this.addResourceHint('prefetch', resource.url, resource.type);
    });
  }

  private predictPageResources(url: string): Array<{url: string, type: string}> {
    const resources = [];
    
    resources.push(
      { url: '/css/main.css', type: 'style' },
      { url: '/js/main.js', type: 'script' }
    );
    
    if (url.includes('/make/')) {
      resources.push(
        { url: '/js/gallery.js', type: 'script' },
        { url: '/css/gallery.css', type: 'style' }
      );
    }
    
    if (url.includes('/learn/')) {
      resources.push(
        { url: '/js/prism.js', type: 'script' },
        { url: '/css/prism.css', type: 'style' }
      );
    }
    
    return resources;
  }

  private addResourceHint(rel: string, href: string, as?: string): void {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    
    if (as) {
      link.as = as;
    }
    
    if (as === 'script' || as === 'style') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }

  private applyOptimizations(): void {
    this.optimizeAllImages();
    this.optimizeAllVideos();
    this.optimizeFonts();
    this.optimizeScripts();
  }

  private optimizeAllImages(): void {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      if (img.dataset.optimized) return;
      
      if (this.config.images.lazy && !this.isInViewport(img)) {
        img.loading = 'lazy';
      }
      
      if (!img.srcset) {
        this.addResponsiveSrcset(img);
      }
      
      img.dataset.optimized = 'true';
    });
  }

  private optimizeAllVideos(): void {
    const videos = document.querySelectorAll('video');
    
    videos.forEach(video => {
      video.preload = this.config.video.preload;
      
      if (!this.config.video.autoplay) {
        video.autoplay = false;
        video.removeAttribute('autoplay');
      }
    });
  }

  private optimizeFonts(): void {
    const fontFaces = document.querySelectorAll('style');
    fontFaces.forEach(style => {
      if (style.textContent?.includes('@font-face')) {
        style.textContent = style.textContent.replace(
          /font-display:\s*\w+;?/g,
          `font-display: ${this.config.fonts.display};`
        );
      }
    });
    
    if (this.config.fonts.subset) {
      this.subsetFonts();
    }
  }

  private subsetFonts(): void {
    const text = document.body.innerText;
    const uniqueChars = [...new Set(text)].join('');
    
    const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    fontLinks.forEach(link => {
      const url = new URL((link as HTMLLinkElement).href);
      url.searchParams.set('text', uniqueChars);
      (link as HTMLLinkElement).href = url.toString();
    });
  }

  private optimizeScripts(): void {
    const scripts = document.querySelectorAll('script[src]');
    
    scripts.forEach(script => {
      const scriptEl = script as HTMLScriptElement;
      
      if (scriptEl.dataset.optimized) return;
      
      if (this.config.scripts.defer && !this.isCriticalScript(scriptEl.src)) {
        scriptEl.defer = true;
      }
      
      if (this.config.scripts.modulepreload && scriptEl.type === 'module') {
        this.addResourceHint('modulepreload', scriptEl.src, 'script');
      }
      
      scriptEl.dataset.optimized = 'true';
    });
  }

  private isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  private isCriticalScript(url: string): boolean {
    const criticalScripts = ['main.js', 'app.js', 'critical.js'];
    return criticalScripts.some(script => url.includes(script));
  }

  private isCriticalStylesheet(url: string): boolean {
    const criticalStyles = ['main.css', 'critical.css', 'above-fold.css'];
    return criticalStyles.some(style => url.includes(style));
  }

  private getResponsiveImageUrl(originalUrl: string, width: number): string {
    const ext = originalUrl.split('.').pop();
    return originalUrl.replace(`.${ext}`, `-${width}w.${ext}`);
  }

  private generatePlaceholder(imageUrl: string): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0iYSI+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMTIiLz48L2ZpbHRlcj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIgZmlsdGVyPSJ1cmwoI2EpIi8+PC9zdmc+';
  }

  private identifyCriticalSelectors(): string {
    const criticalSelectors = [
      'body', 'header', 'nav', 'main', 'h1', 'h2', '.hero',
      '.site-header', '.site-nav', '.container'
    ];
    
    return criticalSelectors.map(sel => `${sel} { /* critical styles */ }`).join('\n');
  }

  private getLoadDelay(): number {
    if (!this.connection) return 0;
    
    switch (this.connection.effectiveType) {
      case '4g': return 0;
      case '3g': return 500;
      case '2g': return 1000;
      case 'slow-2g': return 2000;
      default: return 0;
    }
  }

  private updatePrefetchStrategy(url: string, duration: number): void {
    this.priorityQueue.set(url, duration);
    
    if (this.priorityQueue.size > 10) {
      const sorted = Array.from(this.priorityQueue.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, 5);
      
      sorted.forEach(([url]) => {
        if (!this.prefetchCache.has(url)) {
          this.prefetchLink(url);
        }
      });
    }
  }

  public getConnectionInfo(): ConnectionType | null {
    return this.connection;
  }

  public getConfig(): ResourceConfig {
    return this.config;
  }

  public updateConfig(config: Partial<ResourceConfig>): void {
    this.config = { ...this.config, ...config };
    this.applyOptimizations();
  }

  public getPrefetchedResources(): string[] {
    return Array.from(this.prefetchCache);
  }

  public getResourceTimings(): Map<string, number> {
    return this.resourceTimings;
  }

  public forceOptimize(): void {
    this.applyOptimizations();
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    (window as any).resourceOptimizer = new ResourceOptimizer();
  });
} else {
  (window as any).resourceOptimizer = new ResourceOptimizer();
}

export default ResourceOptimizer;
