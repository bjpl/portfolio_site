// src/scripts/components/lazy-loading.ts
// Fixed version with proper TypeScript interface

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

  private init(): void {
    if (this.options.enableNativeLazyLoading && 'loading' in HTMLImageElement.prototype) {
      this.handleNativeLazyLoading();
    }

    if ('IntersectionObserver' in window) {
      this.setupObserver();
      this.observeElements();
    } else {
      this.loadAllElements();
    }

    this.setupMutationObserver();
    this.handlePrintMode();
    this.handleConnectionChanges();
  }

  // ... rest of your existing methods remain the same ...
  // I'm truncating here for brevity, but all your existing methods go here unchanged

  public destroy(): void {
    this.observer?.disconnect();
    this.loadedElements.clear();
    this.pendingElements.clear();
  }
}

export default LazyLoader;
