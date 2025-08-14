// src/scripts/core/progressive-enhancement.ts

/**
 * Progressive Enhancement Core
 * Ensures the site works without JavaScript and enhances when JS is available
 */

export class ProgressiveEnhancement {
  private features: Map<string, boolean> = new Map();
  private enhancementsApplied: Set<string> = new Set();

  constructor() {
    this.detectFeatures();
    this.applyEnhancements();
    this.setupFallbacks();
  }

  /**
   * Detect browser features and capabilities
   */
  private detectFeatures(): void {
    // JavaScript enabled (obviously, if this is running)
    this.features.set('js', true);
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');

    // Touch support
    this.features.set('touch', 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (this.features.get('touch')) {
      document.documentElement.classList.add('touch');
    } else {
      document.documentElement.classList.add('no-touch');
    }

    // CSS Grid support
    this.features.set('grid', CSS.supports('display', 'grid'));
    if (this.features.get('grid')) {
      document.documentElement.classList.add('grid');
    }

    // WebP support
    this.detectWebPSupport().then(supported => {
      this.features.set('webp', supported);
      if (supported) {
        document.documentElement.classList.add('webp');
      } else {
        document.documentElement.classList.add('no-webp');
      }
    });

    // AVIF support
    this.detectAVIFSupport().then(supported => {
      this.features.set('avif', supported);
      if (supported) {
        document.documentElement.classList.add('avif');
      }
    });

    // Intersection Observer
    this.features.set('intersectionObserver', 'IntersectionObserver' in window);

    // Service Worker
    this.features.set('serviceWorker', 'serviceWorker' in navigator);

    // Local Storage
    this.features.set('localStorage', this.checkLocalStorage());

    // Session Storage
    this.features.set('sessionStorage', this.checkSessionStorage());

    // Reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.features.set('reducedMotion', prefersReducedMotion);
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    }

    // Network connection
    this.detectConnection();

    // Viewport size
    this.detectViewport();

    // Print styles
    this.detectPrintMode();
  }

  /**
   * Apply progressive enhancements based on detected features
   */
  private applyEnhancements(): void {
    // Enhance forms
    if (this.features.get('js')) {
      this.enhanceForms();
    }

    // Enhance navigation
    this.enhanceNavigation();

    // Enhance images
    if (this.features.get('intersectionObserver')) {
      this.enhanceImages();
    }

    // Enhance links
    this.enhanceLinks();

    // Enhance tables
    this.enhanceTables();

    // Enhance code blocks
    this.enhanceCodeBlocks();

    // Add smooth scrolling if not reduced motion
    if (!this.features.get('reducedMotion')) {
      this.addSmoothScrolling();
    }

    // Add keyboard shortcuts
    this.addKeyboardShortcuts();

    // Enhance media
    this.enhanceMedia();
  }

  /**
   * Setup fallbacks for missing features
   */
  private setupFallbacks(): void {
    // Fallback for IntersectionObserver
    if (!this.features.get('intersectionObserver')) {
      this.loadIntersectionObserverPolyfill();
    }

    // Fallback for CSS Grid
    if (!this.features.get('grid')) {
      document.documentElement.classList.add('no-grid');
    }

    // Fallback for smooth scroll
    if (!CSS.supports('scroll-behavior', 'smooth')) {
      this.polyfillSmoothScroll();
    }

    // Fallback for focus-visible
    if (!CSS.supports(':focus-visible')) {
      this.polyfillFocusVisible();
    }
  }

  /**
   * Enhance forms with validation and better UX
   */
  private enhanceForms(): void {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      // Add novalidate to use custom validation
      form.setAttribute('novalidate', '');
      
      // Real-time validation
      form.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.validateField(target);
      });

      // Form submission
      form.addEventListener('submit', (e) => {
        const isValid = this.validateForm(form as HTMLFormElement);
        if (!isValid) {
          e.preventDefault();
          this.showFormErrors(form as HTMLFormElement);
        }
      });

      // Add ARIA attributes
      const requiredFields = form.querySelectorAll('[required]');
      requiredFields.forEach(field => {
        field.setAttribute('aria-required', 'true');
      });
    });

    this.enhancementsApplied.add('forms');
  }

  /**
   * Validate individual form field
   */
  private validateField(field: HTMLInputElement): boolean {
    const validity = field.validity;
    const errorElement = field.parentElement?.querySelector('.field-error');

    if (!validity.valid) {
      field.classList.add('invalid');
      field.classList.remove('valid');
      field.setAttribute('aria-invalid', 'true');
      
      if (errorElement) {
        errorElement.textContent = this.getErrorMessage(field);
      }
      
      return false;
    } else {
      field.classList.remove('invalid');
      field.classList.add('valid');
      field.setAttribute('aria-invalid', 'false');
      
      if (errorElement) {
        errorElement.textContent = '';
      }
      
      return true;
    }
  }

  /**
   * Validate entire form
   */
  private validateForm(form: HTMLFormElement): boolean {
    const fields = form.querySelectorAll('input, textarea, select');
    let isValid = true;

    fields.forEach(field => {
      if (!this.validateField(field as HTMLInputElement)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Get appropriate error message for field
   */
  private getErrorMessage(field: HTMLInputElement): string {
    if (field.validity.valueMissing) {
      return 'This field is required';
    }
    if (field.validity.typeMismatch) {
      return `Please enter a valid ${field.type}`;
    }
    if (field.validity.tooShort) {
      return `Minimum length is ${field.minLength} characters`;
    }
    if (field.validity.tooLong) {
      return `Maximum length is ${field.maxLength} characters`;
    }
    if (field.validity.patternMismatch) {
      return field.dataset.errorMessage || 'Please match the requested format';
    }
    return 'Please correct this field';
  }

  /**
   * Show form validation errors
   */
  private showFormErrors(form: HTMLFormElement): void {
    const firstInvalid = form.querySelector('.invalid') as HTMLElement;
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Announce errors to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = 'Please correct the errors in the form';
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.remove(), 1000);
  }

  /**
   * Enhance navigation with better keyboard support
   */
  private enhanceNavigation(): void {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    // Add keyboard navigation
    const links = nav.querySelectorAll('a');
    links.forEach((link, index) => {
      link.addEventListener('keydown', (e) => {
        const key = e as KeyboardEvent;
        
        switch (key.key) {
          case 'ArrowRight':
            e.preventDefault();
            const next = links[index + 1] || links[0];
            (next as HTMLElement).focus();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            const prev = links[index - 1] || links[links.length - 1];
            (prev as HTMLElement).focus();
            break;
          case 'Home':
            e.preventDefault();
            (links[0] as HTMLElement).focus();
            break;
          case 'End':
            e.preventDefault();
            (links[links.length - 1] as HTMLElement).focus();
            break;
        }
      });
    });

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', (!expanded).toString());
        nav.classList.toggle('nav--open');
        
        // Trap focus when menu is open
        if (!expanded) {
          this.trapFocus(nav as HTMLElement);
        }
      });
    }

    this.enhancementsApplied.add('navigation');
  }

  /**
   * Enhance images with lazy loading and responsive images
   */
  private enhanceImages(): void {
    const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    
    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy loading supported
      images.forEach(img => {
        const image = img as HTMLImageElement;
        if (image.dataset.src) {
          image.src = image.dataset.src;
          delete image.dataset.src;
        }
      });
    } else {
      // Use Intersection Observer for lazy loading
      import('../components/lazy-loading').then(({ LazyLoader }) => {
        new LazyLoader();
      });
    }

    // Add loading indicators
    images.forEach(img => {
      img.addEventListener('load', () => {
        img.classList.add('loaded');
      });
      
      img.addEventListener('error', () => {
        img.classList.add('error');
        // Add fallback image
        const fallback = img.getAttribute('data-fallback');
        if (fallback && img.getAttribute('src') !== fallback) {
          (img as HTMLImageElement).src = fallback;
        }
      });
    });

    this.enhancementsApplied.add('images');
  }

  /**
   * Enhance links with better accessibility
   */
  private enhanceLinks(): void {
    const links = document.querySelectorAll('a');
    
    links.forEach(link => {
      // External links
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('rel', 'noopener noreferrer');
        
        // Add visual indicator for external links
        if (!link.querySelector('.external-icon')) {
          const icon = document.createElement('span');
          icon.className = 'external-icon';
          icon.setAttribute('aria-label', '(opens in new tab)');
          icon.innerHTML = '↗';
          link.appendChild(icon);
        }
        
        // Add screen reader text
        if (!link.getAttribute('aria-label')) {
          const text = link.textContent || '';
          link.setAttribute('aria-label', `${text} (opens in new tab)`);
        }
      }

      // File downloads
      if (link.hasAttribute('download') || /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(link.href)) {
        const extension = link.href.split('.').pop()?.toUpperCase();
        if (extension && !link.querySelector('.file-type')) {
          const badge = document.createElement('span');
          badge.className = 'file-type';
          badge.textContent = extension;
          link.appendChild(badge);
        }
      }

      // Smooth scroll for anchor links
      if (link.hash && link.hostname === window.location.hostname && link.pathname === window.location.pathname) {
        link.addEventListener('click', (e) => {
          const target = document.querySelector(link.hash);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
            
            // Update URL without jumping
            history.pushState(null, '', link.hash);
            
            // Move focus to target
            (target as HTMLElement).focus();
          }
        });
      }
    });

    this.enhancementsApplied.add('links');
  }

  /**
   * Enhance tables for better mobile experience
   */
  private enhanceTables(): void {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      // Wrap table for horizontal scroll on mobile
      if (!table.parentElement?.classList.contains('table-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }

      // Add scope to headers
      const headers = table.querySelectorAll('th');
      headers.forEach(th => {
        if (!th.hasAttribute('scope')) {
          th.setAttribute('scope', th.parentElement?.parentElement?.tagName === 'THEAD' ? 'col' : 'row');
        }
      });

      // Add caption if missing
      if (!table.querySelector('caption') && table.getAttribute('aria-label')) {
        const caption = document.createElement('caption');
        caption.textContent = table.getAttribute('aria-label') || '';
        caption.className = 'visually-hidden';
        table.insertBefore(caption, table.firstChild);
      }

      // Make responsive on mobile
      if (window.innerWidth < 768) {
        this.makeTableResponsive(table);
      }
    });

    this.enhancementsApplied.add('tables');
  }

  /**
   * Make table responsive for mobile
   */
  private makeTableResponsive(table: HTMLTableElement): void {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, index) => {
        if (headers[index] && !cell.getAttribute('data-label')) {
          cell.setAttribute('data-label', headers[index]);
        }
      });
    });
    
    table.classList.add('table--responsive');
  }

  /**
   * Enhance code blocks with copy button and syntax highlighting
   */
  private enhanceCodeBlocks(): void {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(block => {
      const pre = block.parentElement;
      if (!pre) return;

      // Add copy button
      if (!pre.querySelector('.copy-button')) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        copyButton.setAttribute('aria-label', 'Copy code to clipboard');
        
        copyButton.addEventListener('click', async () => {
          const code = block.textContent || '';
          
          try {
            await navigator.clipboard.writeText(code);
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            
            setTimeout(() => {
              copyButton.textContent = 'Copy';
              copyButton.classList.remove('copied');
            }, 2000);
          } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = code;
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
              copyButton.textContent = 'Copy';
            }, 2000);
          }
        });
        
        pre.style.position = 'relative';
        pre.appendChild(copyButton);
      }

      // Add language label
      const language = block.className.match(/language-(\w+)/)?.[1];
      if (language && !pre.querySelector('.language-label')) {
        const label = document.createElement('span');
        label.className = 'language-label';
        label.textContent = language.toUpperCase();
        pre.appendChild(label);
      }

      // Add line numbers
      if (block.textContent && !block.querySelector('.line-number')) {
        const lines = block.textContent.split('\n');
        if (lines.length > 1) {
          const lineNumbers = document.createElement('span');
          lineNumbers.className = 'line-numbers';
          lineNumbers.setAttribute('aria-hidden', 'true');
          
          for (let i = 1; i <= lines.length; i++) {
            const number = document.createElement('span');
            number.className = 'line-number';
            number.textContent = i.toString();
            lineNumbers.appendChild(number);
          }
          
          pre.insertBefore(lineNumbers, block);
          pre.classList.add('line-numbers');
        }
      }
    });

    this.enhancementsApplied.add('codeBlocks');
  }

  /**
   * Add smooth scrolling behavior
   */
  private addSmoothScrolling(): void {
    // Only if not already set in CSS
    if (!CSS.supports('scroll-behavior', 'smooth')) {
      document.documentElement.style.scrollBehavior = 'smooth';
    }

    // Scroll to top button
    const scrollButton = document.createElement('button');
    scrollButton.className = 'scroll-to-top';
    scrollButton.innerHTML = '↑';
    scrollButton.setAttribute('aria-label', 'Scroll to top');
    scrollButton.style.display = 'none';
    
    scrollButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    document.body.appendChild(scrollButton);
    
    // Show/hide scroll button
    let scrollTimeout: ReturnType<typeof setTimeout>;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      
      if (window.scrollY > 300) {
        scrollButton.style.display = 'block';
        scrollButton.classList.add('visible');
      } else {
        scrollButton.classList.remove('visible');
        scrollTimeout = setTimeout(() => {
          scrollButton.style.display = 'none';
        }, 300);
      }
    });

    this.enhancementsApplied.add('smoothScrolling');
  }

  /**
   * Add keyboard shortcuts
   */
  private addKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input
      if ((e.target as HTMLElement).matches('input, textarea, select')) {
        return;
      }

      // Shortcuts
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        // Focus search
        e.preventDefault();
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        searchInput?.focus();
      }

      if (e.key === 'Escape') {
        // Close modals, menus, etc.
        document.querySelectorAll('.modal--open, .menu--open, .search--open').forEach(el => {
          el.classList.remove('modal--open', 'menu--open', 'search--open');
        });
      }

      if (e.altKey && e.key === 'h') {
        // Go home
        e.preventDefault();
        window.location.href = '/';
      }

      if (e.altKey && e.key === 't') {
        // Toggle theme
        e.preventDefault();
        const themeToggle = document.querySelector('.theme-toggle') as HTMLButtonElement;
        themeToggle?.click();
      }
    });

    this.enhancementsApplied.add('keyboardShortcuts');
  }

  /**
   * Enhance media elements
   */
  private enhanceMedia(): void {
    // Videos
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      // Add play/pause on click
      video.addEventListener('click', () => {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });

      // Add keyboard controls
      video.addEventListener('keydown', (e) => {
        switch (e.key) {
          case ' ':
          case 'k':
            e.preventDefault();
            video.paused ? video.play() : video.pause();
            break;
          case 'ArrowLeft':
            video.currentTime -= 10;
            break;
          case 'ArrowRight':
            video.currentTime += 10;
            break;
          case 'ArrowUp':
            video.volume = Math.min(1, video.volume + 0.1);
            break;
          case 'ArrowDown':
            video.volume = Math.max(0, video.volume - 0.1);
            break;
          case 'm':
            video.muted = !video.muted;
            break;
          case 'f':
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              video.requestFullscreen();
            }
            break;
        }
      });
    });

    // Audio
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
      // Add visualizer if supported
      if ('AudioContext' in window && audio.src) {
        this.addAudioVisualizer(audio);
      }
    });

    this.enhancementsApplied.add('media');
  }

  /**
   * Add audio visualizer
   */
  private addAudioVisualizer(audio: HTMLAudioElement): void {
    const canvas = document.createElement('canvas');
    canvas.className = 'audio-visualizer';
    canvas.width = 300;
    canvas.height = 100;
    audio.parentElement?.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        ctx.fillStyle = `rgb(50, ${barHeight + 100}, 250)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    }
    
    audio.addEventListener('play', () => {
      audioContext.resume();
      draw();
    });
  }

  /**
   * Detect WebP support
   */
  private async detectWebPSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Detect AVIF support
   */
  private async detectAVIFSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = () => resolve(true);
      avif.onerror = () => resolve(false);
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  }

  /**
   * Check localStorage availability
   */
  private checkLocalStorage(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check sessionStorage availability
   */
  private checkSessionStorage(): boolean {
    try {
      const test = '__sessionStorage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect network connection type
   */
  private detectConnection(): void {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      this.features.set('connectionType', connection.effectiveType);
      
      // Add class based on connection speed
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        document.documentElement.classList.add('slow-connection');
      } else if (connection.effectiveType === '3g') {
        document.documentElement.classList.add('medium-connection');
      } else {
        document.documentElement.classList.add('fast-connection');
      }
      
      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.detectConnection();
      });
    }
  }

  /**
   * Detect viewport size and orientation
   */
  private detectViewport(): void {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Remove old classes
      document.documentElement.classList.remove('viewport-xs', 'viewport-sm', 'viewport-md', 'viewport-lg', 'viewport-xl');
      
      // Add new class
      if (width < 576) {
        document.documentElement.classList.add('viewport-xs');
      } else if (width < 768) {
        document.documentElement.classList.add('viewport-sm');
      } else if (width < 992) {
        document.documentElement.classList.add('viewport-md');
      } else if (width < 1200) {
        document.documentElement.classList.add('viewport-lg');
      } else {
        document.documentElement.classList.add('viewport-xl');
      }
      
      // Orientation
      if (width > height) {
        document.documentElement.classList.add('landscape');
        document.documentElement.classList.remove('portrait');
      } else {
        document.documentElement.classList.add('portrait');
        document.documentElement.classList.remove('landscape');
      }
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
  }

  /**
   * Detect print mode
   */
  private detectPrintMode(): void {
    window.addEventListener('beforeprint', () => {
      document.documentElement.classList.add('print-mode');
    });
    
    window.addEventListener('afterprint', () => {
      document.documentElement.classList.remove('print-mode');
    });
  }

  /**
   * Load Intersection Observer polyfill
   */
  private async loadIntersectionObserverPolyfill(): Promise<void> {
    try {
      await import('intersection-observer');
      this.features.set('intersectionObserver', true);
    } catch (error) {
      console.warn('Failed to load Intersection Observer polyfill');
    }
  }

  /**
   * Polyfill smooth scroll
   */
  private polyfillSmoothScroll(): void {
    // Simple smooth scroll polyfill
    const originalScrollTo = window.scrollTo;
    
    window.scrollTo = function(options: any) {
      if (options && typeof options === 'object' && 'behavior' in options && options.behavior === 'smooth') {
        const start = window.pageYOffset;
        const startTime = performance.now();
        const duration = 500;
        const distance = (options.top || 0) - start;
        
        function animation(currentTime: number) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
          
          window.scrollTo(0, start + distance * easeProgress);
          
          if (progress < 1) {
            requestAnimationFrame(animation);
          }
        }
        
        requestAnimationFrame(animation);
      } else {
        originalScrollTo.apply(window, arguments as any);
      }
    };
  }

  /**
   * Polyfill focus-visible
   */
  private polyfillFocusVisible(): void {
    // Add focus-visible class when navigating with keyboard
    let hadKeyboardEvent = false;
    
    const keydownHandler = () => {
      hadKeyboardEvent = true;
    };
    
    const mousedownHandler = () => {
      hadKeyboardEvent = false;
    };
    
    const focusHandler = (e: FocusEvent) => {
      if (hadKeyboardEvent || (e.target as HTMLElement).matches(':focus-visible')) {
        (e.target as HTMLElement).classList.add('focus-visible');
      }
    };
    
    const blurHandler = (e: FocusEvent) => {
      (e.target as HTMLElement).classList.remove('focus-visible');
    };
    
    document.addEventListener('keydown', keydownHandler, true);
    document.addEventListener('mousedown', mousedownHandler, true);
    document.addEventListener('focus', focusHandler, true);
    document.addEventListener('blur', blurHandler, true);
  }

  /**
   * Trap focus within an element
   */
  private trapFocus(element: HTMLElement): void {
    const focusableElements = element.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    });
    
    firstFocusable?.focus();
  }

  /**
   * Check if a feature is supported
   */
  public hasFeature(feature: string): boolean {
    return this.features.get(feature) || false;
  }

  /**
   * Check if an enhancement was applied
   */
  public isEnhanced(enhancement: string): boolean {
    return this.enhancementsApplied.has(enhancement);
  }

  /**
   * Get all detected features
   */
  public getFeatures(): Map<string, boolean> {
    return this.features;
  }
}

// Initialize progressive enhancement when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ProgressiveEnhancement();
  });
} else {
  new ProgressiveEnhancement();
}

export default ProgressiveEnhancement;
