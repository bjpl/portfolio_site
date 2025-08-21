/**
 * Theme Flash Prevention System
 * Prevents FOUC (Flash of Unstyled Content) during theme initialization
 */

export class ThemeFlashPrevention {
  private static readonly STORAGE_KEY = 'theme';
  private static readonly ATTRIBUTE_NAME = 'data-theme';
  private static readonly LOADING_CLASS = 'theme-loading';

  /**
   * Initialize theme immediately to prevent flash
   * This should be called as early as possible, ideally inline in the HTML head
   */
  public static initializeTheme(): void {
    // Hide content initially
    document.documentElement.style.visibility = 'hidden';
    document.documentElement.classList.add(this.LOADING_CLASS);

    try {
      // Get saved theme or detect system preference
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = this.determineInitialTheme(savedTheme, systemPrefersDark);

      // Apply theme immediately
      document.documentElement.setAttribute(this.ATTRIBUTE_NAME, initialTheme);
      
      // Store the theme if it wasn't already saved
      if (!savedTheme) {
        localStorage.setItem(this.STORAGE_KEY, initialTheme);
      }

    } catch (error) {
      // Fallback to light theme if there's any error
      console.warn('Theme initialization failed, falling back to light theme:', error);
      document.documentElement.setAttribute(this.ATTRIBUTE_NAME, 'light');
    }

    // Show content after theme is applied
    this.revealContent();
  }

  /**
   * Determine the initial theme based on saved preference and system setting
   */
  private static determineInitialTheme(
    savedTheme: string | null,
    systemPrefersDark: boolean
  ): string {
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      if (savedTheme === 'auto') {
        return systemPrefersDark ? 'dark' : 'light';
      }
      return savedTheme;
    }
    
    // Default to system preference
    return systemPrefersDark ? 'dark' : 'light';
  }

  /**
   * Reveal content with smooth transition
   */
  private static revealContent(): void {
    // Use requestAnimationFrame to ensure theme is applied before revealing
    requestAnimationFrame(() => {
      document.documentElement.style.visibility = 'visible';
      document.documentElement.classList.remove(this.LOADING_CLASS);
      document.documentElement.classList.add('theme-loaded');
    });
  }

  /**
   * Advanced theme switching with smooth animation
   */
  public static async switchTheme(newTheme: string, triggerElement?: HTMLElement): Promise<void> {
    const currentTheme = document.documentElement.getAttribute(this.ATTRIBUTE_NAME);
    
    if (currentTheme === newTheme) return;

    try {
      // Add transition class for smooth change
      document.documentElement.classList.add('theme-transition');

      // Create ripple effect if trigger element is provided
      if (triggerElement) {
        await this.createTransitionEffect(triggerElement);
      }

      // Apply new theme
      document.documentElement.setAttribute(this.ATTRIBUTE_NAME, newTheme);
      localStorage.setItem(this.STORAGE_KEY, newTheme);

      // Update toggle button icon
      this.updateToggleButton(newTheme);

      // Wait for transition to complete
      await this.waitForTransition();

    } finally {
      // Clean up transition class
      document.documentElement.classList.remove('theme-transition');
    }
  }

  /**
   * Create visual transition effect
   */
  private static async createTransitionEffect(triggerElement: HTMLElement): Promise<void> {
    const rect = triggerElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: ${centerY}px;
      left: ${centerX}px;
      width: 0;
      height: 0;
      background: var(--color-bg);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 9999;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                  height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    document.body.appendChild(overlay);

    // Trigger expansion
    requestAnimationFrame(() => {
      const maxDimension = Math.max(window.innerWidth, window.innerHeight) * 2;
      overlay.style.width = `${maxDimension}px`;
      overlay.style.height = `${maxDimension}px`;
    });

    // Remove overlay after animation
    setTimeout(() => {
      overlay.remove();
    }, 400);
  }

  /**
   * Update toggle button icon and aria-label
   */
  private static updateToggleButton(theme: string): void {
    const toggleButton = document.querySelector('.theme-toggle') as HTMLElement;
    if (!toggleButton) return;

    const icon = theme === 'dark' ? '☀️' : '🌙';
    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

    toggleButton.innerHTML = icon;
    toggleButton.setAttribute('aria-label', label);
    toggleButton.setAttribute('title', label);
  }

  /**
   * Wait for CSS transition to complete
   */
  private static waitForTransition(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 350); // Match CSS transition duration
    });
  }

  /**
   * Listen for system theme changes
   */
  public static setupSystemThemeListener(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      
      // Only auto-switch if user hasn't explicitly set a theme or set it to 'auto'
      if (!savedTheme || savedTheme === 'auto') {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute(this.ATTRIBUTE_NAME, newTheme);
        this.updateToggleButton(newTheme);
      }
    });
  }

  /**
   * Enhanced script for HTML head injection
   * This should be injected as early as possible in the <head>
   */
  public static getInlineScript(): string {
    return `
    <script>
      (function() {
        'use strict';
        
        // Hide content immediately
        document.documentElement.style.visibility = 'hidden';
        document.documentElement.classList.add('theme-loading');
        
        try {
          // Get theme preference
          const saved = localStorage.getItem('theme');
          const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
          
          let theme;
          if (saved && ['light', 'dark', 'auto'].includes(saved)) {
            theme = saved === 'auto' ? (system ? 'dark' : 'light') : saved;
          } else {
            theme = system ? 'dark' : 'light';
          }
          
          // Apply theme immediately
          document.documentElement.setAttribute('data-theme', theme);
          
          // Store theme if not already saved
          if (!saved) {
            localStorage.setItem('theme', theme);
          }
          
        } catch (e) {
          // Fallback to light theme
          document.documentElement.setAttribute('data-theme', 'light');
        }
        
        // Reveal content after theme is set
        requestAnimationFrame(function() {
          document.documentElement.style.visibility = 'visible';
          document.documentElement.classList.remove('theme-loading');
          document.documentElement.classList.add('theme-loaded');
        });
        
      })();
    </script>
    `;
  }

  /**
   * CSS for preventing flash (should be in critical CSS)
   */
  public static getCriticalCSS(): string {
    return `
    <style>
      /* Critical CSS for theme flash prevention */
      .theme-loading {
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      .theme-loaded {
        visibility: visible !important;
        opacity: 1 !important;
        transition: opacity 0.25s ease !important;
      }
      
      /* Prevent transitions during initial load */
      .theme-loading *,
      .theme-loading *::before,
      .theme-loading *::after {
        transition: none !important;
        animation: none !important;
      }
      
      /* Basic theme variables (critical subset) */
      :root {
        --color-bg: #F5F5F7;
        --color-text: #2C3E50;
        --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      [data-theme="dark"] {
        --color-bg: #0A0B0D;
        --color-text: #F7F8FA;
      }
      
      body {
        background: var(--color-bg);
        color: var(--color-text);
        transition: background-color var(--transition-base), color var(--transition-base);
      }
    </style>
    `;
  }

  /**
   * Initialize complete theme system
   */
  public static initialize(): void {
    // Only initialize if not already done
    if (document.documentElement.classList.contains('theme-loaded')) {
      return;
    }

    this.initializeTheme();
    this.setupSystemThemeListener();

    // Setup global theme toggle function
    (window as any).toggleTheme = async () => {
      const current = document.documentElement.getAttribute(this.ATTRIBUTE_NAME);
      const newTheme = current === 'dark' ? 'light' : 'dark';
      const toggleButton = document.querySelector('.theme-toggle') as HTMLElement;
      
      await this.switchTheme(newTheme, toggleButton);
    };

    console.log('Theme system initialized successfully');
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ThemeFlashPrevention.initialize();
  });
} else {
  ThemeFlashPrevention.initialize();
}

// Export for external use
export default ThemeFlashPrevention;
    `;
  }
}