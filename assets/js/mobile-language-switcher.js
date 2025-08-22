/**
 * Mobile Language Switcher Enhancement
 * Provides enhanced mobile UX for language selection
 */

class MobileLangSwitcher {
  constructor() {
    this.init();
    this.setupEventListeners();
    this.setupTouchHandlers();
  }

  init() {
    this.elements = {
      langSwitcher: document.querySelector('.lang-switcher'),
      langSelect: document.querySelector('.lang-switch'),
      body: document.body
    };

    // Detect mobile device
    this.isMobile = this.detectMobile();
    this.isTouchDevice = this.detectTouch();
    
    // Add mobile class to body
    if (this.isMobile) {
      this.elements.body.classList.add('mobile-device');
    }
    
    if (this.isTouchDevice) {
      this.elements.body.classList.add('touch-device');
    }

    // Initialize mobile enhancements
    this.enhanceMobileExperience();
  }

  detectMobile() {
    return window.innerWidth <= 768 || 
           /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  detectTouch() {
    return 'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 || 
           navigator.msMaxTouchPoints > 0;
  }

  enhanceMobileExperience() {
    if (!this.elements.langSelect) return;

    // Add mobile-specific attributes
    this.elements.langSelect.setAttribute('data-mobile-enhanced', 'true');
    
    // Prevent zoom on focus (iOS)
    if (this.isMobile) {
      this.elements.langSelect.style.fontSize = '16px';
    }

    // Add touch feedback
    this.addTouchFeedback();
    
    // Setup haptic feedback
    this.setupHapticFeedback();
    
    // Create alternative UI for very small screens
    if (window.innerWidth <= 480) {
      this.createFlagInterface();
    }
  }

  addTouchFeedback() {
    const selector = this.elements.langSelect;
    if (!selector) return;

    // Add ripple effect on touch
    selector.addEventListener('touchstart', (e) => {
      this.createRipple(e, selector);
    });

    // Add active state handling
    selector.addEventListener('touchstart', () => {
      selector.classList.add('touch-active');
    });

    selector.addEventListener('touchend', () => {
      setTimeout(() => {
        selector.classList.remove('touch-active');
      }, 150);
    });
  }

  createRipple(event, element) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.touches[0].clientX - rect.left - size / 2;
    const y = event.touches[0].clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  setupHapticFeedback() {
    if (!navigator.vibrate) return;

    this.elements.langSelect?.addEventListener('change', () => {
      // Light haptic feedback on language change
      navigator.vibrate(50);
    });

    // Subtle feedback on focus
    this.elements.langSelect?.addEventListener('focus', () => {
      navigator.vibrate(25);
    });
  }

  createFlagInterface() {
    if (!this.elements.langSwitcher) return;

    // Create flag-based selector for very small screens
    const flagContainer = document.createElement('div');
    flagContainer.className = 'lang-flags-mobile';
    flagContainer.innerHTML = `
      <button class="lang-flag-btn" data-lang="en" aria-label="English">🇺🇸</button>
      <button class="lang-flag-btn" data-lang="es" aria-label="Español">🇪🇸</button>
      <button class="lang-flag-btn lang-flag-more" aria-label="More languages">⋯</button>
    `;

    // Insert flag interface
    this.elements.langSwitcher.appendChild(flagContainer);

    // Handle flag button clicks
    flagContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('lang-flag-btn')) {
        const langCode = e.target.dataset.lang;
        if (langCode) {
          this.switchLanguage(langCode);
        } else if (e.target.classList.contains('lang-flag-more')) {
          this.showLanguageBottomSheet();
        }
      }
    });

    // Hide original select on very small screens
    if (window.innerWidth <= 375) {
      this.elements.langSelect.style.display = 'none';
    }
  }

  showLanguageBottomSheet() {
    // Create bottom sheet for language selection
    const bottomSheet = document.createElement('div');
    bottomSheet.className = 'language-bottom-sheet';
    bottomSheet.innerHTML = `
      <div class="bottom-sheet-header">
        <div class="bottom-sheet-handle"></div>
        <h3>Select Language</h3>
      </div>
      <div class="bottom-sheet-content">
        <div class="language-grid">
          <button class="language-option" data-lang="en">
            <span class="flag">🇺🇸</span>
            <span class="name">English</span>
          </button>
          <button class="language-option" data-lang="es">
            <span class="flag">🇪🇸</span>
            <span class="name">Español</span>
          </button>
          <button class="language-option" data-lang="fr">
            <span class="flag">🇫🇷</span>
            <span class="name">Français</span>
          </button>
          <button class="language-option" data-lang="de">
            <span class="flag">🇩🇪</span>
            <span class="name">Deutsch</span>
          </button>
        </div>
      </div>
      <div class="bottom-sheet-footer">
        <button class="bottom-sheet-close">Close</button>
      </div>
    `;

    // Add overlay
    const overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';

    document.body.appendChild(overlay);
    document.body.appendChild(bottomSheet);

    // Animate in
    requestAnimationFrame(() => {
      bottomSheet.classList.add('open');
      overlay.classList.add('open');
    });

    // Handle interactions
    this.setupBottomSheetHandlers(bottomSheet, overlay);
  }

  setupBottomSheetHandlers(bottomSheet, overlay) {
    // Close handlers
    const closeSheet = () => {
      bottomSheet.classList.remove('open');
      overlay.classList.remove('open');
      setTimeout(() => {
        document.body.removeChild(bottomSheet);
        document.body.removeChild(overlay);
      }, 300);
    };

    overlay.addEventListener('click', closeSheet);
    bottomSheet.querySelector('.bottom-sheet-close').addEventListener('click', closeSheet);

    // Language selection
    bottomSheet.addEventListener('click', (e) => {
      if (e.target.closest('.language-option')) {
        const langCode = e.target.closest('.language-option').dataset.lang;
        this.switchLanguage(langCode);
        closeSheet();
      }
    });

    // Swipe down to close
    this.setupSwipeToClose(bottomSheet, closeSheet);

    // Escape key to close
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeSheet();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  setupSwipeToClose(element, closeCallback) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    element.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    });

    element.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 0) {
        element.style.transform = `translateY(${Math.min(diff, 200)}px)`;
        element.style.opacity = Math.max(1 - (diff / 300), 0.5);
      }
    });

    element.addEventListener('touchend', () => {
      if (!isDragging) return;
      
      const diff = currentY - startY;
      isDragging = false;
      
      if (diff > 100) {
        closeCallback();
      } else {
        element.style.transform = '';
        element.style.opacity = '';
      }
    });
  }

  switchLanguage(langCode) {
    // Update the select element
    if (this.elements.langSelect) {
      this.elements.langSelect.value = langCode;
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      this.elements.langSelect.dispatchEvent(event);
    }

    // Call the existing switchLanguage function if available
    if (typeof window.switchLanguage === 'function') {
      window.switchLanguage(langCode);
    }

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }

    // Show success toast
    this.showSuccessToast(langCode);
  }

  showSuccessToast(langCode) {
    const toast = document.createElement('div');
    toast.className = 'lang-success-toast';
    toast.textContent = `✓ Language changed`;
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 2000);
  }

  setupEventListeners() {
    // Resize handler to adjust mobile features
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });

    // Orientation change handler
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
  }

  setupTouchHandlers() {
    // Prevent double-tap zoom on language selector
    if (this.elements.langSelect) {
      this.elements.langSelect.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.target.click();
      });
    }

    // Add touch classes for CSS targeting
    document.addEventListener('touchstart', () => {
      this.elements.body.classList.add('user-touching');
    });

    document.addEventListener('mouseover', () => {
      this.elements.body.classList.remove('user-touching');
    });
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = this.detectMobile();

    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.elements.body.classList.add('mobile-device');
        this.enhanceMobileExperience();
      } else {
        this.elements.body.classList.remove('mobile-device');
        this.removeMobileEnhancements();
      }
    }
  }

  handleOrientationChange() {
    // Adjust UI for orientation changes
    if (this.isMobile) {
      // Hide keyboard if open
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      
      // Recalculate viewport units
      this.updateViewportHeight();
    }
  }

  updateViewportHeight() {
    // Fix for mobile viewport height issues
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  removeMobileEnhancements() {
    // Clean up mobile-specific features when switching to desktop
    const flagsMobile = document.querySelector('.lang-flags-mobile');
    if (flagsMobile) {
      flagsMobile.remove();
    }

    // Restore original select visibility
    if (this.elements.langSelect) {
      this.elements.langSelect.style.display = '';
    }
  }
}

// Initialize mobile language switcher when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MobileLangSwitcher();
  });
} else {
  new MobileLangSwitcher();
}

// CSS for mobile enhancements (injected via JavaScript)
const mobileStyles = `
  .lang-success-toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--color-success, #10b981);
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10000;
  }

  .lang-success-toast.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }

  .lang-flags-mobile {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .lang-flag-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: var(--color-surface, #f8f9fa);
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lang-flag-btn:active {
    transform: scale(0.95);
  }

  .lang-flag-btn:focus {
    border-color: var(--color-primary, #3b82f6);
    outline: none;
  }

  .language-bottom-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-bg, white);
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10000;
    max-height: 80vh;
    overflow: hidden;
  }

  .language-bottom-sheet.open {
    transform: translateY(0);
  }

  .bottom-sheet-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
    z-index: 9999;
  }

  .bottom-sheet-overlay.open {
    opacity: 1;
    visibility: visible;
  }

  .bottom-sheet-header {
    padding: 20px 20px 16px;
    text-align: center;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .bottom-sheet-handle {
    width: 36px;
    height: 4px;
    background: var(--color-border, #e5e7eb);
    border-radius: 2px;
    margin: 0 auto 16px;
  }

  .language-grid {
    padding: 16px;
    display: grid;
    gap: 8px;
  }

  .language-option {
    display: flex;
    align-items: center;
    padding: 16px;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    min-height: 44px;
  }

  .language-option:active {
    background: var(--color-surface, #f8f9fa);
  }

  .language-option .flag {
    font-size: 24px;
    margin-right: 16px;
  }

  .bottom-sheet-footer {
    padding: 16px 20px 20px;
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  .bottom-sheet-close {
    width: 100%;
    padding: 12px;
    background: var(--color-surface, #f8f9fa);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .bottom-sheet-close:active {
    background: var(--color-border, #e5e7eb);
  }

  .touch-active {
    opacity: 0.7 !important;
    transform: scale(0.98);
  }

  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }

  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;

// Inject mobile styles
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);