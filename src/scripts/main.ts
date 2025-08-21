// Main TypeScript entry point

import { SearchUI } from './search/search-ui';
import ProgressiveEnhancement from './core/progressive-enhancement';
import LazyLoader from './components/lazy-loading';
import TouchInteractions from './mobile/touch-interactions';
import ThemeManager from './core/theme-manager';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
   // Initialize progressive enhancement first
   const pe = new ProgressiveEnhancement();
   
   // Initialize theme manager
   new ThemeManager();
   
   // Initialize search if JS is available
   new SearchUI();
   
   // Initialize lazy loading if Intersection Observer is available
   if (pe.hasFeature('intersectionObserver')) {
       new LazyLoader();
   }
   
   // Initialize touch interactions for mobile devices
   if (pe.hasFeature('touch')) {
       new TouchInteractions();
   }
   
   console.log('Portfolio initialized with mobile optimizations');
});

export { ThemeManager, SearchUI, ProgressiveEnhancement, LazyLoader, TouchInteractions };
