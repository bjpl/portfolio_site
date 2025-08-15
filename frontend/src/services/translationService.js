/**
 * Translation Service
 * Integrates with Claude API for real-time translation
 */

class TranslationService {
  constructor() {
    this.cache = new Map();
    this.currentLanguage = localStorage.getItem('preferred_language') || 'en';
    this.translationQueue = [];
    this.isTranslating = false;
    this.observers = new Set();
    
    // Language mappings
    this.languages = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      zh: 'Chinese (Simplified)',
      ja: 'Japanese',
      ko: 'Korean',
      ar: 'Arabic',
      he: 'Hebrew',
      hi: 'Hindi',
      nl: 'Dutch',
      sv: 'Swedish'
    };
    
    // Initialize intersection observer for lazy translation
    this.setupIntersectionObserver();
  }
  
  /**
   * Translate text using Claude API via backend
   */
  async translateText(text, targetLang = this.currentLanguage, sourceLang = 'en') {
    if (targetLang === sourceLang || targetLang === 'en') {
      return text;
    }
    
    // Check cache
    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          text,
          targetLang,
          sourceLang
        })
      });
      
      if (!response.ok) {
        throw new Error('Translation failed');
      }
      
      const { translatedText } = await response.json();
      
      // Cache the translation
      this.cache.set(cacheKey, translatedText);
      
      // Store in localStorage for offline access
      this.saveToLocalStorage(cacheKey, translatedText);
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      
      // Try to get from localStorage if online translation fails
      const cached = this.getFromLocalStorage(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Return original text as fallback
      return text;
    }
  }
  
  /**
   * Translate multiple texts in batch
   */
  async translateBatch(texts, targetLang = this.currentLanguage, sourceLang = 'en') {
    if (targetLang === sourceLang || targetLang === 'en') {
      return texts;
    }
    
    // Filter out already cached translations
    const uncachedTexts = texts.filter(text => {
      const cacheKey = `${sourceLang}:${targetLang}:${text}`;
      return !this.cache.has(cacheKey);
    });
    
    if (uncachedTexts.length === 0) {
      return texts.map(text => {
        const cacheKey = `${sourceLang}:${targetLang}:${text}`;
        return this.cache.get(cacheKey);
      });
    }
    
    try {
      const response = await fetch('/api/translate/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          texts: uncachedTexts,
          targetLang,
          sourceLang
        })
      });
      
      if (!response.ok) {
        throw new Error('Batch translation failed');
      }
      
      const { translations } = await response.json();
      
      // Cache translations
      uncachedTexts.forEach((text, index) => {
        const cacheKey = `${sourceLang}:${targetLang}:${text}`;
        this.cache.set(cacheKey, translations[index]);
        this.saveToLocalStorage(cacheKey, translations[index]);
      });
      
      // Return all translations in original order
      return texts.map(text => {
        const cacheKey = `${sourceLang}:${targetLang}:${text}`;
        return this.cache.get(cacheKey);
      });
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts;
    }
  }
  
  /**
   * Translate entire page
   */
  async translatePage(targetLang = this.currentLanguage) {
    if (targetLang === 'en') {
      this.restoreOriginalContent();
      return;
    }
    
    this.currentLanguage = targetLang;
    localStorage.setItem('preferred_language', targetLang);
    
    // Show loading indicator
    this.showTranslationProgress();
    
    try {
      // Get all translatable elements
      const elements = this.getTranslatableElements();
      
      // Group elements by type for batch processing
      const textElements = [];
      const titleElements = [];
      const placeholderElements = [];
      const altElements = [];
      
      elements.forEach(el => {
        if (!el.dataset.originalText) {
          el.dataset.originalText = el.textContent || el.innerText;
        }
        
        if (el.hasAttribute('title') && !el.dataset.originalTitle) {
          el.dataset.originalTitle = el.title;
          titleElements.push(el);
        }
        
        if (el.hasAttribute('placeholder') && !el.dataset.originalPlaceholder) {
          el.dataset.originalPlaceholder = el.placeholder;
          placeholderElements.push(el);
        }
        
        if (el.hasAttribute('alt') && !el.dataset.originalAlt) {
          el.dataset.originalAlt = el.alt;
          altElements.push(el);
        }
        
        if (el.dataset.originalText) {
          textElements.push(el);
        }
      });
      
      // Translate text content
      if (textElements.length > 0) {
        const texts = textElements.map(el => el.dataset.originalText);
        const translations = await this.translateBatch(texts, targetLang);
        
        textElements.forEach((el, index) => {
          if (translations[index]) {
            el.textContent = translations[index];
            el.dataset.translated = 'true';
          }
        });
      }
      
      // Translate titles
      if (titleElements.length > 0) {
        const titles = titleElements.map(el => el.dataset.originalTitle);
        const translations = await this.translateBatch(titles, targetLang);
        
        titleElements.forEach((el, index) => {
          if (translations[index]) {
            el.title = translations[index];
          }
        });
      }
      
      // Translate placeholders
      if (placeholderElements.length > 0) {
        const placeholders = placeholderElements.map(el => el.dataset.originalPlaceholder);
        const translations = await this.translateBatch(placeholders, targetLang);
        
        placeholderElements.forEach((el, index) => {
          if (translations[index]) {
            el.placeholder = translations[index];
          }
        });
      }
      
      // Translate alt texts
      if (altElements.length > 0) {
        const alts = altElements.map(el => el.dataset.originalAlt);
        const translations = await this.translateBatch(alts, targetLang);
        
        altElements.forEach((el, index) => {
          if (translations[index]) {
            el.alt = translations[index];
          }
        });
      }
      
      // Update page language
      document.documentElement.lang = targetLang;
      
      // Notify observers
      this.notifyObservers('page-translated', { language: targetLang });
      
    } catch (error) {
      console.error('Page translation error:', error);
      this.notifyObservers('translation-error', { error });
    } finally {
      this.hideTranslationProgress();
    }
  }
  
  /**
   * Get all translatable elements on the page
   */
  getTranslatableElements() {
    const selector = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span:not(.no-translate)',
      'a', 'button', 'label',
      'td', 'th', 'li',
      '[data-translate]',
      '.translatable'
    ].join(', ');
    
    const elements = document.querySelectorAll(selector);
    
    // Filter out elements that shouldn't be translated
    return Array.from(elements).filter(el => {
      // Skip if marked as no-translate
      if (el.classList.contains('no-translate') || 
          el.closest('.no-translate') ||
          el.dataset.noTranslate === 'true') {
        return false;
      }
      
      // Skip code elements
      if (el.tagName === 'CODE' || el.tagName === 'PRE' || el.closest('code, pre')) {
        return false;
      }
      
      // Skip empty elements
      const text = el.textContent || el.innerText;
      if (!text || !text.trim()) {
        return false;
      }
      
      // Skip if already translated
      if (el.dataset.translated === 'true' && el.dataset.translatedLang === this.currentLanguage) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Restore original content
   */
  restoreOriginalContent() {
    const elements = document.querySelectorAll('[data-original-text]');
    
    elements.forEach(el => {
      if (el.dataset.originalText) {
        el.textContent = el.dataset.originalText;
      }
      if (el.dataset.originalTitle) {
        el.title = el.dataset.originalTitle;
      }
      if (el.dataset.originalPlaceholder) {
        el.placeholder = el.dataset.originalPlaceholder;
      }
      if (el.dataset.originalAlt) {
        el.alt = el.dataset.originalAlt;
      }
      
      el.dataset.translated = 'false';
      delete el.dataset.translatedLang;
    });
    
    document.documentElement.lang = 'en';
    this.currentLanguage = 'en';
    
    this.notifyObservers('content-restored', { language: 'en' });
  }
  
  /**
   * Setup intersection observer for lazy translation
   */
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      return;
    }
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.currentLanguage !== 'en') {
          const element = entry.target;
          
          if (!element.dataset.translated || element.dataset.translatedLang !== this.currentLanguage) {
            this.translateElement(element);
          }
          
          this.observer.unobserve(element);
        }
      });
    }, {
      rootMargin: '50px'
    });
  }
  
  /**
   * Translate a single element
   */
  async translateElement(element) {
    if (!element.dataset.originalText) {
      element.dataset.originalText = element.textContent || element.innerText;
    }
    
    const text = element.dataset.originalText;
    if (!text) return;
    
    try {
      const translated = await this.translateText(text, this.currentLanguage);
      element.textContent = translated;
      element.dataset.translated = 'true';
      element.dataset.translatedLang = this.currentLanguage;
    } catch (error) {
      console.error('Element translation error:', error);
    }
  }
  
  /**
   * Observe element for lazy translation
   */
  observeElement(element) {
    if (this.observer && element) {
      this.observer.observe(element);
    }
  }
  
  /**
   * Show translation progress
   */
  showTranslationProgress() {
    const progress = document.createElement('div');
    progress.id = 'translation-progress';
    progress.className = 'translation-progress';
    progress.innerHTML = `
      <div class="translation-progress__content">
        <div class="translation-progress__spinner"></div>
        <span>Translating to ${this.languages[this.currentLanguage]}...</span>
      </div>
    `;
    document.body.appendChild(progress);
  }
  
  /**
   * Hide translation progress
   */
  hideTranslationProgress() {
    const progress = document.getElementById('translation-progress');
    if (progress) {
      progress.remove();
    }
  }
  
  /**
   * Subscribe to translation events
   */
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }
  
  /**
   * Notify observers
   */
  notifyObservers(event, data) {
    this.observers.forEach(callback => callback(event, data));
  }
  
  /**
   * Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }
  
  /**
   * Save translation to localStorage
   */
  saveToLocalStorage(key, value) {
    try {
      const translations = JSON.parse(localStorage.getItem('translations') || '{}');
      translations[key] = value;
      
      // Limit storage size
      const keys = Object.keys(translations);
      if (keys.length > 1000) {
        // Remove oldest entries
        keys.slice(0, 100).forEach(k => delete translations[k]);
      }
      
      localStorage.setItem('translations', JSON.stringify(translations));
    } catch (error) {
      console.error('Failed to save translation to localStorage:', error);
    }
  }
  
  /**
   * Get translation from localStorage
   */
  getFromLocalStorage(key) {
    try {
      const translations = JSON.parse(localStorage.getItem('translations') || '{}');
      return translations[key];
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache.clear();
    localStorage.removeItem('translations');
  }
  
  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }
  
  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return Object.entries(this.languages).map(([code, name]) => ({
      code,
      name
    }));
  }
}

// Create singleton instance
const translationService = new TranslationService();

// Make it available globally
if (typeof window !== 'undefined') {
  window.translationService = translationService;
}

export default translationService;