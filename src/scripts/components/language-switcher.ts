/**
 * Enhanced Language Switcher Component
 * Provides accessible language switching with proper ARIA announcements,
 * smooth transitions, and robust error handling
 */

interface LanguageOption {
  code: string;
  name: string;
  flag?: string;
  dir: 'ltr' | 'rtl';
}

class LanguageSwitcher {
  private element: HTMLSelectElement;
  private currentLanguage: string;
  private availableLanguages: LanguageOption[];
  private isLoading: boolean = false;
  private loadingTimeout: number | null = null;

  constructor(element: HTMLSelectElement) {
    this.element = element;
    this.currentLanguage = this.element.value;
    this.availableLanguages = this.extractLanguageOptions();
    this.init();
  }

  /**
   * Initialize the language switcher with event handlers and accessibility features
   */
  private init(): void {
    this.setupEventListeners();
    this.enhanceAccessibility();
    this.restoreStoredLanguage();
  }

  /**
   * Extract language options from the select element
   */
  private extractLanguageOptions(): LanguageOption[] {
    const options = Array.from(this.element.options);
    return options.map(option => ({
      code: option.value,
      name: option.textContent || option.value,
      dir: option.getAttribute('dir') as 'ltr' | 'rtl' || 'ltr'
    }));
  }

  /**
   * Set up event listeners for language switching
   */
  private setupEventListeners(): void {
    this.element.addEventListener('change', this.handleLanguageChange.bind(this));
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Listen for storage changes for cross-tab synchronization
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  /**
   * Enhance accessibility with proper ARIA attributes and descriptions
   */
  private enhanceAccessibility(): void {
    // Ensure proper labeling
    if (!this.element.getAttribute('aria-label')) {
      this.element.setAttribute('aria-label', 'Choose website language');
    }

    // Add live region for announcements
    if (!document.getElementById('language-announcements')) {
      const liveRegion = document.createElement('div');
      liveRegion.id = 'language-announcements';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    // Enhance options with proper language attributes
    Array.from(this.element.options).forEach(option => {
      if (!option.getAttribute('lang')) {
        option.setAttribute('lang', option.value);
      }
    });
  }

  /**
   * Restore language preference from localStorage
   */
  private restoreStoredLanguage(): void {
    try {
      const storedLanguage = localStorage.getItem('preferred_language');
      if (storedLanguage && storedLanguage !== this.currentLanguage) {
        const isValidLanguage = this.availableLanguages.some(
          lang => lang.code === storedLanguage
        );
        
        if (isValidLanguage) {
          this.switchLanguage(storedLanguage, false); // Silent switch
        }
      }
    } catch (error) {
      console.warn('Failed to restore language preference:', error);
    }
  }

  /**
   * Handle language change events
   */
  private async handleLanguageChange(event: Event): Promise<void> {
    event.preventDefault();
    const target = event.target as HTMLSelectElement;
    const newLanguage = target.value;
    
    if (newLanguage !== this.currentLanguage) {
      await this.switchLanguage(newLanguage);
    }
  }

  /**
   * Handle keyboard navigation improvements
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Add smooth scrolling for long language lists
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      setTimeout(() => {
        const selectedOption = this.element.options[this.element.selectedIndex];
        selectedOption?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 0);
    }
  }

  /**
   * Handle storage changes for cross-tab synchronization
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'preferred_language' && event.newValue) {
      const newLanguage = event.newValue;
      if (newLanguage !== this.currentLanguage) {
        this.switchLanguage(newLanguage, false); // Silent cross-tab sync
      }
    }
  }

  /**
   * Switch to a new language with proper loading states and error handling
   */
  private async switchLanguage(
    languageCode: string, 
    announce: boolean = true
  ): Promise<void> {
    if (this.isLoading) {
      return; // Prevent concurrent language switches
    }

    const targetLanguage = this.availableLanguages.find(
      lang => lang.code === languageCode
    );

    if (!targetLanguage) {
      this.handleLanguageError(`Language '${languageCode}' is not available`);
      return;
    }

    try {
      this.setLoadingState(true);
      
      // Update select value
      this.element.value = languageCode;
      
      // Store preference
      localStorage.setItem('preferred_language', languageCode);
      
      // Update document attributes
      this.updateDocumentLanguage(targetLanguage);
      
      // Announce change if requested
      if (announce) {
        this.announceLanguageChange(targetLanguage);
      }
      
      // Navigate to new language version
      await this.navigateToLanguage(languageCode);
      
      this.currentLanguage = languageCode;
      
    } catch (error) {
      this.handleLanguageError(`Failed to switch to ${targetLanguage.name}`, error);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Update document language and direction attributes
   */
  private updateDocumentLanguage(language: LanguageOption): void {
    document.documentElement.lang = language.code;
    document.documentElement.dir = language.dir;
    
    // Update meta tags if they exist
    const langMeta = document.querySelector('meta[property="og:locale"]') as HTMLMetaElement;
    if (langMeta) {
      langMeta.content = language.code.replace('-', '_');
    }
  }

  /**
   * Navigate to the new language version of the current page
   */
  private async navigateToLanguage(languageCode: string): Promise<void> {
    const currentPath = window.location.pathname;
    const currentLang = this.detectCurrentLanguageFromPath();
    
    let newPath: string;
    
    if (currentLang && currentPath.startsWith(`/${currentLang}/`)) {
      // Replace existing language prefix
      newPath = currentPath.replace(`/${currentLang}/`, `/${languageCode}/`);
    } else if (currentLang === this.getDefaultLanguage()) {
      // Add language prefix for non-default language
      newPath = languageCode === this.getDefaultLanguage() 
        ? currentPath 
        : `/${languageCode}${currentPath}`;
    } else {
      // Add language prefix
      newPath = `/${languageCode}${currentPath}`;
    }
    
    // Preserve query parameters and hash
    const search = window.location.search;
    const hash = window.location.hash;
    const fullUrl = `${newPath}${search}${hash}`;
    
    // Use smooth transition if supported
    if ('startViewTransition' in document) {
      // @ts-ignore - View Transitions API
      document.startViewTransition(() => {
        window.location.href = fullUrl;
      });
    } else {
      window.location.href = fullUrl;
    }
  }

  /**
   * Detect current language from URL path
   */
  private detectCurrentLanguageFromPath(): string | null {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];
    
    return this.availableLanguages.some(lang => lang.code === firstSegment) 
      ? firstSegment 
      : null;
  }

  /**
   * Get the default language (assumed to be the first one without path prefix)
   */
  private getDefaultLanguage(): string {
    // This would typically come from site configuration
    return this.availableLanguages[0]?.code || 'en';
  }

  /**
   * Set loading state with visual feedback
   */
  private setLoadingState(loading: boolean): void {
    this.isLoading = loading;
    this.element.disabled = loading;
    
    if (loading) {
      this.element.style.opacity = '0.7';
      this.element.style.cursor = 'wait';
      this.element.setAttribute('aria-busy', 'true');
      
      // Set timeout to prevent infinite loading
      this.loadingTimeout = window.setTimeout(() => {
        this.setLoadingState(false);
        this.handleLanguageError('Language switch timed out');
      }, 10000); // 10 second timeout
      
    } else {
      this.element.style.opacity = '';
      this.element.style.cursor = '';
      this.element.removeAttribute('aria-busy');
      
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }
    }
  }

  /**
   * Announce language change to screen readers
   */
  private announceLanguageChange(language: LanguageOption): void {
    const announcement = `Language changed to ${language.name}`;
    
    const liveRegion = document.getElementById('language-announcements');
    if (liveRegion) {
      liveRegion.textContent = announcement;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
    
    // Also log for debugging
    console.info(announcement);
  }

  /**
   * Handle language switching errors
   */
  private handleLanguageError(message: string, error?: any): void {
    console.error('Language switcher error:', message, error);
    
    // Reset select to current language
    this.element.value = this.currentLanguage;
    
    // Show user-friendly error message
    const errorMessage = 'Unable to change language. Please try again.';
    
    // Use toast notification if available, otherwise alert
    if (window.showToast) {
      window.showToast(errorMessage, 'error');
    } else {
      alert(errorMessage);
    }
    
    // Announce error to screen readers
    const liveRegion = document.getElementById('language-announcements');
    if (liveRegion) {
      liveRegion.textContent = errorMessage;
    }
  }

  /**
   * Public method to programmatically change language
   */
  public async changeLanguage(languageCode: string): Promise<void> {
    await this.switchLanguage(languageCode);
  }

  /**
   * Get current language
   */
  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   */
  public getAvailableLanguages(): LanguageOption[] {
    return [...this.availableLanguages];
  }

  /**
   * Destroy the language switcher and clean up event listeners
   */
  public destroy(): void {
    this.element.removeEventListener('change', this.handleLanguageChange);
    this.element.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('storage', this.handleStorageChange);
    
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
  }
}

/**
 * Initialize language switchers when DOM is ready
 */
function initializeLanguageSwitchers(): void {
  const switchers = document.querySelectorAll('.lang-switch') as NodeListOf<HTMLSelectElement>;
  
  switchers.forEach(switcher => {
    // Prevent double initialization
    if (!switcher.dataset.initialized) {
      new LanguageSwitcher(switcher);
      switcher.dataset.initialized = 'true';
    }
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLanguageSwitchers);
} else {
  initializeLanguageSwitchers();
}

// Re-initialize on dynamic content changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.matches('.lang-switch') || element.querySelector('.lang-switch')) {
          initializeLanguageSwitchers();
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Export for external use
export { LanguageSwitcher, initializeLanguageSwitchers };

// Global fallback function for HTML onclick handlers
(window as any).switchLanguage = async function(languageCode: string) {
  const switchers = document.querySelectorAll('.lang-switch') as NodeListOf<HTMLSelectElement>;
  const switcher = switchers[0];
  
  if (switcher && switcher.dataset.initialized) {
    // Use the enhanced switcher if available
    const enhancedSwitcher = (switcher as any).__languageSwitcher as LanguageSwitcher;
    if (enhancedSwitcher) {
      await enhancedSwitcher.changeLanguage(languageCode);
      return;
    }
  }
  
  // Fallback to simple navigation
  const currentPath = window.location.pathname;
  const newPath = `/${languageCode}${currentPath}`;
  window.location.href = newPath;
};