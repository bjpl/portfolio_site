/**
 * Animation System Index
 * Central export point for all animation modules
 */

export { ThemeAnimator, themeAnimator } from './theme-animator';
export { default as ThemeFlashPrevention } from '../utils/theme-flash-prevention';

// Re-export types
export type { AnimationConfig } from './theme-animator';

/**
 * Initialize complete animation system
 */
export const initializeAnimations = async (): Promise<void> => {
  const { themeAnimator } = await import('./theme-animator');
  const { default: ThemeFlashPrevention } = await import('../utils/theme-flash-prevention');
  
  // Initialize flash prevention
  ThemeFlashPrevention.initialize();
  
  // Initialize all animations
  themeAnimator.initializeAll();
  
  console.log('🎨 Animation system fully initialized');
};

/**
 * Utility function to create smooth theme toggle
 */
export const createThemeToggle = (buttonSelector = '.theme-toggle'): void => {
  const button = document.querySelector(buttonSelector) as HTMLElement;
  
  if (!button) {
    console.warn(`Theme toggle button not found: ${buttonSelector}`);
    return;
  }
  
  button.addEventListener('click', async () => {
    const { themeAnimator } = await import('./theme-animator');
    const { default: ThemeFlashPrevention } = await import('../utils/theme-flash-prevention');
    
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Animate the change
    await themeAnimator.animateThemeChange(button);
    
    // Update theme
    await ThemeFlashPrevention.switchTheme(newTheme, button);
  });
};

/**
 * Performance monitoring for animations
 */
export const monitorAnimationPerformance = (): void => {
  if (!('PerformanceObserver' in window)) {
    console.warn('Performance Observer not supported');
    return;
  }
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    
    entries.forEach((entry) => {
      if (entry.entryType === 'measure' && entry.name.includes('theme')) {
        console.log(`🎯 Theme animation performance: ${entry.duration.toFixed(2)}ms`);
        
        if (entry.duration > 500) {
          console.warn('⚠️ Theme animation took longer than expected');
        }
      }
    });
  });
  
  observer.observe({ entryTypes: ['measure'] });
};

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimations);
  } else {
    initializeAnimations();
  }
}