/**
 * Main Application Entry Point
 * Orchestrates all theme and animation systems
 */

import { ThemeManager } from './core/theme-manager';
import { themeAnimator } from './animations/theme-animator';
import ThemeFlashPrevention from '../utils/theme-flash-prevention';

class PortfolioApp {
  private themeManager: ThemeManager;
  private isInitialized = false;

  constructor() {
    this.themeManager = new ThemeManager();
    this.init();
  }

  private async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure theme system is properly initialized
      ThemeFlashPrevention.initialize();
      
      // Initialize theme manager
      await this.themeManager.init();
      
      // Setup enhanced theme animations
      this.setupThemeAnimations();
      
      // Initialize all animation systems
      themeAnimator.initializeAll();
      
      // Setup global theme toggle with animations
      this.setupGlobalToggle();
      
      this.isInitialized = true;
      console.log('🎨 Portfolio app initialized with advanced theme animations');
      
    } catch (error) {
      console.error('Failed to initialize portfolio app:', error);
      // Fallback to basic functionality
      this.initializeFallback();
    }
  }

  private setupThemeAnimations(): void {
    // Enhanced theme toggle with animations
    const toggleButton = document.querySelector('.theme-toggle') as HTMLElement;
    
    if (toggleButton) {
      toggleButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Trigger animated theme change
        await themeAnimator.animateThemeChange(toggleButton);
        
        // Update theme
        this.themeManager.setTheme(newTheme as 'light' | 'dark');
        
        console.log(`🌗 Theme changed to: ${newTheme}`);
      });
    }
  }

  private setupGlobalToggle(): void {
    // Make theme toggle globally available with animations
    (window as any).toggleTheme = async () => {
      const toggleButton = document.querySelector('.theme-toggle') as HTMLElement;
      if (toggleButton) {
        toggleButton.click();
      }
    };

    // Keyboard shortcut (Ctrl/Cmd + Shift + L)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        (window as any).toggleTheme();
      }
    });
  }

  private initializeFallback(): void {
    console.warn('🚨 Falling back to basic theme functionality');
    
    // Basic theme toggle without animations
    const toggleButton = document.querySelector('.theme-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update button
        toggleButton.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
      });
    }
  }

  /**
   * Public method to manually trigger theme animation
   */
  public async animateThemeChange(): Promise<void> {
    const toggleButton = document.querySelector('.theme-toggle') as HTMLElement;
    if (toggleButton) {
      await themeAnimator.animateThemeChange(toggleButton);
    }
  }

  /**
   * Get current theme
   */
  public getCurrentTheme(): string {
    return this.themeManager.getTheme();
  }

  /**
   * Set theme programmatically with animation
   */
  public async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    const toggleButton = document.querySelector('.theme-toggle') as HTMLElement;
    
    if (toggleButton) {
      await themeAnimator.animateThemeChange(toggleButton);
    }
    
    this.themeManager.setTheme(theme);
  }
}

// Initialize app
let app: PortfolioApp;

const initializeApp = (): void => {
  if (!app) {
    app = new PortfolioApp();
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for external access
export { PortfolioApp };
export default app;