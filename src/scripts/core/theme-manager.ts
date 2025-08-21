// Enhanced Theme Manager Component
// Handles theme switching, persistence, system detection, and smooth transitions

type ThemeType = 'light' | 'dark' | 'auto';
type EventCallback = (theme: ThemeType) => void;

export class ThemeManager {
  private currentTheme: ThemeType = 'auto';
  private eventListeners: EventCallback[] = [];
  private mediaQuery: MediaQueryList;
  private isInitialized = false;
  
  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.preventFlash();
    this.initTheme();
    this.bindEvents();
    this.addKeyboardShortcuts();
    this.isInitialized = true;
  }
  
  /**
   * Prevent flash of incorrect theme on page load
   */
  private preventFlash(): void {
    try {
      const saved = localStorage.getItem('theme') as ThemeType;
      const theme = saved || 'auto';
      const effectiveTheme = theme === 'auto' 
        ? (this.mediaQuery.matches ? 'dark' : 'light')
        : theme;
      
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      document.documentElement.style.setProperty('--theme-transition', 'none');
    } catch (error) {
      console.warn('Failed to prevent theme flash:', error);
    }
  }
  
  /**
   * Initialize theme from saved preference or system default
   */
  private initTheme(): void {
    try {
      const saved = localStorage.getItem('theme') as ThemeType;
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        this.currentTheme = saved;
      } else {
        // Default to system preference
        this.currentTheme = 'auto';
      }
      
      this.applyTheme();
      this.enableTransitions();
    } catch (error) {
      console.warn('Failed to initialize theme:', error);
      this.currentTheme = 'light';
      this.applyTheme();
    }
  }
  
  /**
   * Enable smooth transitions after initial load
   */
  private enableTransitions(): void {
    // Small delay to ensure smooth transitions don't affect initial load
    setTimeout(() => {
      document.documentElement.style.removeProperty('--theme-transition');
    }, 100);
  }
  
  /**
   * Apply the current theme to the document
   */
  private applyTheme(): void {
    const effectiveTheme = this.getEffectiveTheme();
    const previousTheme = document.documentElement.getAttribute('data-theme');
    
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    
    // Dispatch theme change event
    if (this.isInitialized && previousTheme !== effectiveTheme) {
      this.dispatchThemeChangeEvent(effectiveTheme as ThemeType);
    }
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(effectiveTheme);
  }
  
  /**
   * Get the effective theme (resolving 'auto' to actual theme)
   */
  private getEffectiveTheme(): string {
    if (this.currentTheme === 'auto') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return this.currentTheme;
  }
  
  /**
   * Update meta theme-color for mobile browser chrome
   */
  private updateMetaThemeColor(theme: string): void {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = theme === 'dark' ? '#1a1a1a' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }
  }
  
  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    // Theme toggle button
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', this.handleToggleClick.bind(this));
    }
    
    // System theme change detection
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    
    // Listen for storage changes (multi-tab sync)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }
  
  /**
   * Handle theme toggle button click
   */
  private handleToggleClick(): void {
    const themes: ThemeType[] = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    this.setTheme(nextTheme);
  }
  
  /**
   * Handle system theme preference change
   */
  private handleSystemThemeChange(): void {
    if (this.currentTheme === 'auto') {
      this.applyTheme();
    }
  }
  
  /**
   * Handle localStorage changes from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'theme' && event.newValue) {
      const newTheme = event.newValue as ThemeType;
      if (['light', 'dark', 'auto'].includes(newTheme)) {
        this.currentTheme = newTheme;
        this.applyTheme();
      }
    }
  }
  
  /**
   * Add keyboard shortcuts for theme switching
   */
  private addKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Ctrl+Shift+D (or Cmd+Shift+D on Mac)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.handleToggleClick();
      }
    });
  }
  
  /**
   * Dispatch custom theme change event
   */
  private dispatchThemeChangeEvent(theme: ThemeType): void {
    // Notify registered listeners
    this.eventListeners.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.warn('Theme change listener error:', error);
      }
    });
    
    // Dispatch custom event
    const event = new CustomEvent('themechange', {
      detail: { 
        theme,
        effectiveTheme: this.getEffectiveTheme(),
        previousTheme: document.documentElement.getAttribute('data-theme')
      }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Set theme programmatically
   */
  public setTheme(theme: ThemeType): void {
    if (!['light', 'dark', 'auto'].includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Using 'auto' instead.`);
      theme = 'auto';
    }
    
    this.currentTheme = theme;
    this.applyTheme();
    
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }
  
  /**
   * Get current theme preference
   */
  public getTheme(): ThemeType {
    return this.currentTheme;
  }
  
  /**
   * Get effective theme (resolving 'auto')
   */
  public getEffectiveThemeType(): 'light' | 'dark' {
    return this.getEffectiveTheme() as 'light' | 'dark';
  }
  
  /**
   * Check if system prefers dark mode
   */
  public getSystemPreference(): 'light' | 'dark' {
    return this.mediaQuery.matches ? 'dark' : 'light';
  }
  
  /**
   * Register a theme change listener
   */
  public onThemeChange(callback: EventCallback): () => void {
    this.eventListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Clean up event listeners
   */
  public destroy(): void {
    this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
    window.removeEventListener('storage', this.handleStorageChange);
    this.eventListeners = [];
  }
}

export default ThemeManager;