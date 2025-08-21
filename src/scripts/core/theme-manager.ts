// Theme Manager Component
// Handles theme switching and persistence

export class ThemeManager {
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
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme === 'auto') {
        this.applyTheme();
      }
    });
  }
  
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.currentTheme = theme;
    this.applyTheme();
    localStorage.setItem('theme', theme);
  }
  
  public getTheme(): 'light' | 'dark' | 'auto' {
    return this.currentTheme;
  }
}

export default ThemeManager;