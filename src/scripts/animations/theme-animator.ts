/**
 * Theme Animation Controller
 * Advanced animation system for smooth dark mode transitions
 */

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  stagger?: number;
}

export class ThemeAnimator {
  private isAnimating = false;
  private observer: IntersectionObserver | null = null;
  private prefersReducedMotion = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.checkMotionPreferences();
    this.setupIntersectionObserver();
    this.bindEvents();
  }

  private checkMotionPreferences(): void {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Listen for changes in motion preferences
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
    });
  }

  /**
   * Smooth theme transition with ripple effect
   */
  public async animateThemeChange(triggerElement: HTMLElement): Promise<void> {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    try {
      // Add transition class to document
      document.documentElement.classList.add('theme-transition');
      
      // Create ripple effect from toggle button
      await this.createRippleEffect(triggerElement);
      
      // Animate icon rotation
      this.animateIcon(triggerElement);
      
      // Stagger content animations
      this.staggerContentAnimations();
      
      // Wait for transition to complete
      await this.waitForTransition();
      
    } finally {
      // Clean up
      document.documentElement.classList.remove('theme-transition');
      this.isAnimating = false;
    }
  }

  /**
   * Create ripple effect emanating from trigger element
   */
  private async createRippleEffect(element: HTMLElement): Promise<void> {
    if (this.prefersReducedMotion) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const ripple = document.createElement('div');
    ripple.className = 'theme-ripple';
    ripple.style.cssText = `
      position: fixed;
      top: ${centerY}px;
      left: ${centerX}px;
      width: 20px;
      height: 20px;
      background: var(--color-primary);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0.3;
      pointer-events: none;
      z-index: 9999;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    document.body.appendChild(ripple);
    
    // Trigger animation
    requestAnimationFrame(() => {
      const maxDimension = Math.max(window.innerWidth, window.innerHeight);
      const scale = (maxDimension * 2) / 20; // Scale to cover entire viewport
      
      ripple.style.transform = `translate(-50%, -50%) scale(${scale})`;
      ripple.style.opacity = '0';
    });
    
    // Clean up after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Animate theme toggle icon with smooth rotation
   */
  private animateIcon(element: HTMLElement): void {
    const icon = element.querySelector('.theme-icon') as HTMLElement;
    if (!icon) return;

    icon.style.transform = 'rotate(180deg) scale(0.8)';
    
    setTimeout(() => {
      icon.style.transform = 'rotate(0deg) scale(1)';
    }, 150);
  }

  /**
   * Stagger animations for content elements
   */
  private staggerContentAnimations(): void {
    if (this.prefersReducedMotion) return;

    const elements = document.querySelectorAll('.content-list article, .section-card, .feature-card');
    
    elements.forEach((element, index) => {
      const delay = index * 50; // 50ms stagger
      
      setTimeout(() => {
        element.classList.add('animate-theme-change');
      }, delay);
    });

    // Clean up classes after animation
    setTimeout(() => {
      elements.forEach(element => {
        element.classList.remove('animate-theme-change');
      });
    }, 500);
  }

  /**
   * Setup intersection observer for scroll-triggered animations
   */
  private setupIntersectionObserver(): void {
    if (this.prefersReducedMotion) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '-50px'
      }
    );

    // Observe elements that should animate on scroll
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    animateElements.forEach(element => {
      this.observer?.observe(element);
    });
  }

  /**
   * Animate page load to prevent flash
   */
  public animatePageLoad(): void {
    document.documentElement.classList.remove('theme-loading');
    document.documentElement.classList.add('theme-loaded');

    if (this.prefersReducedMotion) return;

    // Stagger navigation items
    const navItems = document.querySelectorAll('.site-nav li');
    navItems.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('nav-loaded');
      }, index * 50);
    });

    // Animate main content
    setTimeout(() => {
      document.querySelector('main')?.classList.add('content-loaded');
    }, 200);
  }

  /**
   * Enhanced card hover animations
   */
  public setupCardAnimations(): void {
    if (this.prefersReducedMotion) return;

    const cards = document.querySelectorAll('.section-card, .content-list article, .feature-card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.animateCardHover(card as HTMLElement, true);
      });
      
      card.addEventListener('mouseleave', () => {
        this.animateCardHover(card as HTMLElement, false);
      });
    });
  }

  private animateCardHover(card: HTMLElement, isHover: boolean): void {
    const shimmer = card.querySelector('.card-shimmer') as HTMLElement;
    
    if (isHover) {
      card.style.transform = 'translateY(-4px) scale(1.02)';
      
      // Add shimmer effect for dark mode
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        if (!shimmer) {
          const shimmerEl = document.createElement('div');
          shimmerEl.className = 'card-shimmer';
          shimmerEl.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            pointer-events: none;
            transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          `;
          card.style.position = 'relative';
          card.appendChild(shimmerEl);
          
          setTimeout(() => {
            shimmerEl.style.left = '100%';
          }, 50);
        }
      }
    } else {
      card.style.transform = '';
      shimmer?.remove();
    }
  }

  /**
   * Smooth scroll with easing
   */
  public smoothScrollTo(target: HTMLElement, offset = 0): void {
    const targetPosition = target.offsetTop - offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = Math.abs(distance) / 2; // Adaptive duration
    
    let start: number | null = null;
    
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };
    
    const animateScroll = (currentTime: number): void => {
      if (start === null) start = currentTime;
      
      const timeElapsed = currentTime - start;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);
      
      window.scrollTo(0, startPosition + distance * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  }

  /**
   * Parallax effect for background elements
   */
  public setupParallax(): void {
    if (this.prefersReducedMotion) return;

    const parallaxElements = document.querySelectorAll('.parallax-bg');
    
    const updateParallax = (): void => {
      const scrollY = window.pageYOffset;
      
      parallaxElements.forEach((element) => {
        const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
        const yPos = -(scrollY * speed);
        (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
    };
    
    // Throttled scroll listener
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateParallax();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  private waitForTransition(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 350); // Match CSS transition duration
    });
  }

  private bindEvents(): void {
    // Clean up observer on page unload
    window.addEventListener('beforeunload', () => {
      this.observer?.disconnect();
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pause animations when tab is not visible
        document.documentElement.style.setProperty('--animation-play-state', 'paused');
      } else {
        document.documentElement.style.setProperty('--animation-play-state', 'running');
      }
    });
  }

  /**
   * Initialize all animations
   */
  public initializeAll(): void {
    this.animatePageLoad();
    this.setupCardAnimations();
    this.setupParallax();

    // Add scroll-triggered animation classes
    const elements = document.querySelectorAll(
      '.content-list article, .section-card, .feature-card, h1, h2, .hero-section'
    );
    elements.forEach(element => {
      element.classList.add('animate-on-scroll');
    });
  }

  /**
   * Public method to trigger theme animation
   */
  public static async triggerThemeAnimation(toggleButton: HTMLElement): Promise<void> {
    const animator = new ThemeAnimator();
    await animator.animateThemeChange(toggleButton);
  }
}

// Export singleton instance
export const themeAnimator = new ThemeAnimator();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    themeAnimator.initializeAll();
  });
} else {
  themeAnimator.initializeAll();
}