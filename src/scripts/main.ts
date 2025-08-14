// Main TypeScript entry point

import { SearchUI } from './search/search-ui';
import ProgressiveEnhancement from './core/progressive-enhancement';
import LazyLoader from './components/lazy-loading';
import TouchInteractions from './mobile/touch-interactions';

class ThemeManager {
   private currentTheme: 'light' | 'dark' | 'auto' = 'auto';
   
   constructor() {
       this.initTheme();
       this.bindEvents();
   }
   
   private initTheme(): void {
       const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'auto';
       if (saved) {
           this.currentTheme = saved;
           this.applyTheme();
       }
   }
   
   private applyTheme(): void {
       if (this.currentTheme === 'auto') {
           const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
           document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
       } else {
           document.documentElement.setAttribute('data-theme', this.currentTheme);
       }
   }
   
   private bindEvents(): void {
       const toggle = document.querySelector('.theme-toggle');
       if (toggle) {
           toggle.addEventListener('click', () => {
               const current = document.documentElement.getAttribute('data-theme');
               const next = current === 'dark' ? 'light' : 'dark';
               document.documentElement.setAttribute('data-theme', next);
               localStorage.setItem('theme', next);
           });
       }
       
       // Listen for system theme changes
       window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
           if (this.currentTheme === 'auto') {
               this.applyTheme();
           }
       });
   }
}

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
