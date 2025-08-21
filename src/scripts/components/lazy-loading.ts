// src/scripts/components/lazy-loading.ts

/**
 * Lazy Loading Component
 * Efficiently loads images, videos, and iframes as they enter the viewport
 */

export interface LazyLoaderOptions {
  rootMargin?: string;
  threshold?: number | number[];
  loadingClass?: string;
  loadedClass?: string;
  errorClass?: string;
  preloadOffset?: number;
  enableNativeLazyLoading?: boolean;
  loadInBackground?: boolean;
  onLoad?: (element: Element) => void;
  onError?: (element: Element, error: Error) => void;
}

export class LazyLoader {
  private observer: IntersectionObserver | null = null;
  private loadedElements: Set<Element> = new Set();
  private pendingElements: Map<Element, () => void> = new Map();
  private options: LazyLoaderOptions;

  constructor(options: Partial<LazyLoaderOptions> = {}) {
    this.options = {
      rootMargin: '50px 0px',
      threshold: 0.01,
      loadingClass: 'lazy-loading',
      loadedClass: 'lazy-loaded',
      errorClass: 'lazy-error',
      preloadOffset: 300,
      enableNativeLazyLoading: true,
      loadInBackground: true,
      ...options
    };

    this.init();
  }

  /**
   * Initialize the lazy loader
   */
  private init(): void {
    // Check for native lazy loading support
    if (this.options.enableNativeLazyLoading && 'loading' in HTMLImageElement.prototype) {
      this.handleNativeLazyLoading();
    }

    // Setup Intersection Observer
    if ('IntersectionObserver' in window) {
      this.setupObserver();
      this.observeElements();
    } else {
      // Fallback for browsers without Intersection Observer
      this.loadAllElements();
    }

    // Listen for new elements
    this.setupMutationObserver();

    // Handle print mode
    this.handlePrintMode();

    // Handle connection changes
    this.handleConnectionChanges();
  }

  /**
   * Setup Intersection Observer
   */
  private setupObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );
  }

  /**
   * Handle intersection observer entries
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
        this.loadElement(entry.target);
      }
    });
  }

  /**
   * Observe lazy-loadable elements
   */
  private observeElements(): void {
    const elements = this.getLazyElements();
    
    elements.forEach(element => {
      if (!this.loadedElements.has(element)) {
        this.observer?.observe(element);
        
        // Add loading class
        element.classList.add(this.options.loadingClass!);
        
        // Preload if close to viewport
        if (this.shouldPreload(element)) {
          this.preloadElement(element);
        }
      }
    });
  }

  /**
   * Get all lazy-loadable elements
   */
  private getLazyElements(): Element[] {
    const selectors = [
      'img[data-src]',
      'img[data-srcset]',
      'picture > source[data-srcset]',
      'video[data-src]',
      'iframe[data-src]',
      '.lazy',
      '[data-lazy]'
    ];
    
    return Array.from(document.querySelectorAll(selectors.join(', ')));
  }

  /**
   * Load an element
   */
  private async loadElement(element: Element): Promise<void> {
    if (this.loadedElements.has(element)) return;
    
    try {
      element.classList.add(this.options.loadingClass!);
      
      if (element.tagName === 'IMG') {
        await this.loadImage(element as HTMLImageElement);
      } else if (element.tagName === 'VIDEO') {
        await this.loadVideo(element as HTMLVideoElement);
      } else if (element.tagName === 'IFRAME') {
        await this.loadIframe(element as HTMLIFrameElement);
      } else if (element.tagName === 'SOURCE') {
        await this.loadSource(element as HTMLSourceElement);
      } else if (element.hasAttribute('data-lazy')) {
        await this.loadCustomElement(element);
      }
      
      // Mark as loaded
      this.loadedElements.add(element);
      element.classList.remove(this.options.loadingClass!);
      element.classList.add(this.options.loadedClass!);
      
      // Unobserve element
      this.observer?.unobserve(element);
      
      // Trigger callback
      this.options.onLoad?.(element);
      
      // Dispatch custom event
      element.dispatchEvent(new CustomEvent('lazyloaded', {
        bubbles: true,
        detail: { element }
      }));
      
    } catch (error) {
      console.error('Failed to load element:', error);
      element.classList.add(this.options.errorClass!);
      
      // Try fallback
      this.handleLoadError(element, error as Error);
      
      // Trigger error callback
      this.options.onError?.(element, error as Error);
      
      // Dispatch error event
      element.dispatchEvent(new CustomEvent('lazyerror', {
        bubbles: true,
        detail: { element, error }
      }));
    }
  }

  /**
   * Load an image
   */
  private async loadImage(img: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempImg = new Image();
      
      // Handle load
      tempImg.onload = () => {
        // Set sources
        if (img.dataset.src) {
          img.src = img.dataset.src;
          delete img.dataset.src;
        }
        
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          delete img.dataset.srcset;
        }
        
        if (img.dataset.sizes) {
          img.sizes = img.dataset.sizes;
          delete img.dataset.sizes;
        }
        
        // Handle picture element sources
        if (img.parentElement?.tagName === 'PICTURE') {
          const sources = img.parentElement.querySelectorAll('source[data-srcset]');
          sources.forEach(source => {
            const sourceEl = source as HTMLSourceElement;
            if (sourceEl.dataset.srcset) {
              sourceEl.srcset = sourceEl.dataset.srcset;
              delete sourceEl.dataset.srcset;
            }
          });
        }
        
        // Add fade-in effect
        this.addFadeInEffect(img);
        
        resolve();
      };
      
      // Handle error
      tempImg.onerror = () => {
        reject(new Error(`Failed to load image: ${img.dataset.src}`));
      };
      
      // Start loading
      if (img.dataset.srcset) {
        tempImg.srcset = img.dataset.srcset;
      }
      tempImg.src = img.dataset.src || img.src;
    });
  }

  /**
   * Load a video
   */
  private async loadVideo(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set source
      if (video.dataset.src) {
        video.src = video.dataset.src;
        delete video.dataset.src;
      }
      
      // Set poster
      if (video.dataset.poster) {
        video.poster = video.dataset.poster;
        delete video.dataset.poster;
      }
      
      // Handle sources
      const sources = video.querySelectorAll('source[data-src]');
      sources.forEach(source => {
        const sourceEl = source as HTMLSourceElement;
        if (sourceEl.dataset.src) {
          sourceEl.src = sourceEl.dataset.src;
          delete sourceEl.dataset.src;
        }
      });
      
      // Load video
      video.load();
      
      // Handle events
      video.addEventListener('loadeddata', () => resolve(), { once: true });
      video.addEventListener('error', () => reject(new Error('Failed to load video')), { once: true });
      
      // Preload metadata
      if (video.preload === 'none') {
        video.preload = 'metadata';
      }
    });
  }

  /**
   * Load an iframe
   */
  private async loadIframe(iframe: HTMLIFrameElement): Promise<void> {
    return new Promise((resolve) => {
      if (iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
        delete iframe.dataset.src;
      }
      
      // Add loading placeholder
      if (!iframe.src && iframe.dataset.placeholder) {
        this.addPlaceholder(iframe);
      }
      
      iframe.addEventListener('load', () => {
        this.removePlaceholder(iframe);
        resolve();
      }, { once: true });
      
      // Resolve immediately if no src to load
      if (!iframe.src) {
        resolve();
      }
    });
  }

  /**
   * Load a source element
   */
  private async loadSource(source: HTMLSourceElement): Promise<void> {
    if (source.dataset.srcset) {
      source.srcset = source.dataset.srcset;
      delete source.dataset.srcset;
    }
    
    if (source.dataset.src) {
      source.src = source.dataset.src;
      delete source.dataset.src;
    }
  }

  /**
   * Load a custom lazy element
   */
  private async loadCustomElement(element: Element): Promise<void> {
    const lazyType = element.getAttribute('data-lazy');
    
    switch (lazyType) {
      case 'background':
        await this.loadBackgroundImage(element as HTMLElement);
        break;
      case 'script':
        await this.loadScript(element as HTMLScriptElement);
        break;
      case 'style':
        await this.loadStylesheet(element as HTMLLinkElement);
        break;
      default:
        // Custom handler
        const handler = this.pendingElements.get(element);
        if (handler) {
          handler();
          this.pendingElements.delete(element);
        }
    }
  }

  /**
   * Load background image
   */
  private async loadBackgroundImage(element: HTMLElement): Promise<void> {
    const imageUrl = element.dataset.bg || element.dataset.backgroundImage;
    
    if (!imageUrl) return;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        element.style.backgroundImage = `url(${imageUrl})`;
        delete element.dataset.bg;
        delete element.dataset.backgroundImage;
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load background image: ${imageUrl}`));
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Load a script dynamically
   */
  private async loadScript(script: HTMLScriptElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const newScript = document.createElement('script');
      
      // Copy attributes
      Array.from(script.attributes).forEach(attr => {
        if (attr.name !== 'data-lazy') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      
      // Set source
      if (script.dataset.src) {
        newScript.src = script.dataset.src;
        delete script.dataset.src;
      } else if (script.textContent) {
        newScript.textContent = script.textContent;
      }
      
      newScript.onload = () => resolve();
      newScript.onerror = () => reject(new Error('Failed to load script'));
      
      // Replace old script with new one
      script.parentNode?.replaceChild(newScript, script);
    });
  }

  /**
   * Load a stylesheet dynamically
   */
  private async loadStylesheet(link: HTMLLinkElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (link.dataset.href) {
        link.href = link.dataset.href;
        delete link.dataset.href;
      }
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Failed to load stylesheet'));
      
      // If already has href, resolve immediately
      if (link.href) {
        resolve();
      }
    });
  }

  /**
   * Check if element should be preloaded
   */
  private shouldPreload(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const offset = this.options.preloadOffset || 0;
    
    return rect.top <= viewportHeight + offset;
  }

  /**
   * Preload an element
   */
  private preloadElement(element: Element): void {
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      if (img.dataset.src) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = img.dataset.src;
        
        if (img.dataset.srcset) {
          preloadLink.setAttribute('imagesrcset', img.dataset.srcset);
        }
        
        document.head.appendChild(preloadLink);
      }
    }
  }

  /**
   * Add fade-in effect to element
   */
  private addFadeInEffect(element: Element): void {
    element.style.transition = 'opacity 0.3s';
    element.style.opacity = '0';
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
    });
  }

  /**
   * Add placeholder to element
   */
  private addPlaceholder(element: Element): void {
    const placeholder = document.createElement('div');
    placeholder.className = 'lazy-placeholder';
    placeholder.innerHTML = '<div class="lazy-spinner"></div>';
    element.parentNode?.insertBefore(placeholder, element);
  }

  /**
   * Remove placeholder from element
   */
  private removePlaceholder(element: Element): void {
    const placeholder = element.previousElementSibling;
    if (placeholder?.classList.contains('lazy-placeholder')) {
      placeholder.remove();
    }
  }

  /**
   * Handle load error
   */
  private handleLoadError(element: Element, error: Error): void {
    // Try fallback source
    const fallback = element.getAttribute('data-fallback');
    
    if (fallback && element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      img.src = fallback;
      element.removeAttribute('data-fallback');
    } else {
      // Add error placeholder
      const errorPlaceholder = document.createElement('div');
      errorPlaceholder.className = 'lazy-error-placeholder';
      errorPlaceholder.innerHTML = '⚠️ Failed to load';
      errorPlaceholder.title = error.message;
      
      element.parentNode?.replaceChild(errorPlaceholder, element);
    }
  }

  /**
   * Handle native lazy loading
   */
  private handleNativeLazyLoading(): void {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    images.forEach(img => {
      const image = img as HTMLImageElement;
      
      // Move data-src to src for native lazy loading
      if (image.dataset.src && !image.src) {
        image.src = image.dataset.src;
        delete image.dataset.src;
      }
      
      if (image.dataset.srcset && !image.srcset) {
        image.srcset = image.dataset.srcset;
        delete image.dataset.srcset;
      }
      
      // Mark as loaded for tracking
      this.loadedElements.add(image);
    });
  }

  /**
   * Setup mutation observer to watch for new elements
   */
  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check if element itself is lazy-loadable
              if (this.isLazyLoadable(element)) {
                this.observer?.observe(element);
              }
              
              // Check for lazy-loadable children
              const lazyChildren = this.getLazyElements();
              lazyChildren.forEach(child => {
                if (!this.loadedElements.has(child)) {
                  this.observer?.observe(child);
                }
              });
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if element is lazy-loadable
   */
  private isLazyLoadable(element: Element): boolean {
    return !!(
      element.hasAttribute('data-src') ||
      element.hasAttribute('data-srcset') ||
      element.hasAttribute('data-lazy') ||
      element.classList.contains('lazy')
    );
  }

  /**
   * Handle print mode - load all images for printing
   */
  private handlePrintMode(): void {
    window.addEventListener('beforeprint', () => {
      this.loadAllElements();
    });
  }

  /**
   * Handle connection changes
   */
  private handleConnectionChanges(): void {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', () => {
        // Adjust loading strategy based on connection
        if (connection.effectiveType === '4g' || connection.effectiveType === 'wifi') {
          // More aggressive preloading on fast connections
          this.options.rootMargin = '200px 0px';
          this.options.preloadOffset = 500;
        } else if (connection.effectiveType === '3g') {
          // Normal loading
          this.options.rootMargin = '50px 0px';
          this.options.preloadOffset = 300;
        } else {
          // Conservative loading on slow connections
          this.options.rootMargin = '0px';
          this.options.preloadOffset = 0;
        }
        
        // Recreate observer with new settings
        this.observer?.disconnect();
        this.setupObserver();
        this.observeElements();
      });
    }
  }

  /**
   * Load all elements immediately
   */
  private loadAllElements(): void {
    const elements = this.getLazyElements();
    elements.forEach(element => this.loadElement(element));
  }

  /**
   * Register custom lazy loading handler
   */
  public registerHandler(element: Element, handler: () => void): void {
    this.pendingElements.set(element, handler);
    this.observer?.observe(element);
  }

  /**
   * Manually trigger loading of an element
   */
  public load(element: Element): Promise<void> {
    return this.loadElement(element);
  }

  /**
   * Destroy the lazy loader
   */
  public destroy(): void {
    this.observer?.disconnect();
    this.loadedElements.clear();
    this.pendingElements.clear();
  }

  /**
   * Update lazy loader options
   */
  public updateOptions(options: Partial<LazyLoaderOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Recreate observer with new options
    this.observer?.disconnect();
    this.setupObserver();
    this.observeElements();
  }
}

// Auto-initialize if data-lazy-auto attribute exists
if (document.querySelector('[data-lazy-auto]')) {
  new LazyLoader();
}

export default LazyLoader;
