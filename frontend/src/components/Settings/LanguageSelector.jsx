import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from '../../store/StoreProvider';
import './LanguageSelector.css';

// Mobile detection utility
const isMobile = () => {
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Touch device detection
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'zh', name: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'he', name: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪', dir: 'ltr' }
];

const LanguageSelector = ({ compact = false, variant = 'auto' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const dropdownRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const dispatch = useDispatch();
  
  // Determine which variant to show
  const getVariant = () => {
    if (variant !== 'auto') return variant;
    if (window.innerWidth <= 480) return 'flags';
    if (window.innerWidth <= 768) return 'dropdown';
    return 'dropdown';
  };
  
  const [activeVariant, setActiveVariant] = useState(getVariant());
  
  const { language } = useSelector(state => state.preferences);
  const currentLang = AVAILABLE_LANGUAGES.find(lang => lang.code === language) || AVAILABLE_LANGUAGES[0];

  // Handle responsive behavior and outside clicks
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(isMobile());
      setActiveVariant(getVariant());
    };
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (bottomSheetRef.current && !bottomSheetRef.current.contains(event.target)) {
        setShowBottomSheet(false);
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowBottomSheet(false);
      }
    };

    // Set initial mobile state
    handleResize();
    
    // Add touch class for touch devices
    if (isTouchDevice()) {
      document.documentElement.classList.add('touch-device');
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [variant]);

  // Handle language change with mobile optimizations
  const handleLanguageChange = async (langCode) => {
    if (langCode === language) {
      setIsOpen(false);
      setShowBottomSheet(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Add haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Update store
      dispatch({ 
        type: 'PREFERENCES/SET_LANGUAGE', 
        payload: langCode 
      });

      // Update document language and direction
      const selectedLang = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
      document.documentElement.lang = langCode;
      document.documentElement.dir = selectedLang.dir;
      
      // Store in localStorage
      localStorage.setItem('preferred_language', langCode);
      
      // If translation service is available, translate the page
      if (window.translationService) {
        await window.translationService.translatePage(langCode);
      }
      
      // Announce change for screen readers
      announceChange(`Language changed to ${selectedLang.name}`);
      
      // Show success feedback on mobile
      if (isMobileView) {
        const successElement = document.createElement('div');
        successElement.className = 'lang-success-toast';
        successElement.textContent = `✓ ${selectedLang.name}`;
        document.body.appendChild(successElement);
        setTimeout(() => {
          if (document.body.contains(successElement)) {
            document.body.removeChild(successElement);
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('Failed to change language:', error);
      
      // Show error notification
      dispatch({
        type: 'NOTIFICATIONS/ADD',
        payload: {
          type: 'error',
          message: 'Failed to change language. Please try again.',
          id: Date.now()
        }
      });
    } finally {
      setIsLoading(false);
      setIsOpen(false);
      setShowBottomSheet(false);
    }
  };

  // Announce changes for screen readers
  const announceChange = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  // Enhanced keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setShowBottomSheet(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isMobileView && activeVariant === 'dropdown') {
        setShowBottomSheet(!showBottomSheet);
      } else {
        setIsOpen(!isOpen);
      }
    }
  };
  
  // Handle bottom sheet trigger
  const handleBottomSheetToggle = () => {
    if (isMobileView) {
      setShowBottomSheet(!showBottomSheet);
    } else {
      setIsOpen(!isOpen);
    }
  };
  
  // Handle swipe gestures for bottom sheet
  const handleTouchStart = (event) => {
    if (!showBottomSheet) return;
    
    const startY = event.touches[0].clientY;
    
    const handleTouchMove = (moveEvent) => {
      const currentY = moveEvent.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 100) { // Swipe down threshold
        setShowBottomSheet(false);
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchend', handleTouchEnd, { once: true });
  };

  // Flag buttons variant for mobile
  const renderFlagButtons = () => (
    <div className="lang-flags" ref={dropdownRef}>
      {AVAILABLE_LANGUAGES.slice(0, 5).map(lang => ( // Show top 5 languages
        <button
          key={lang.code}
          className={`lang-flags__button ${lang.code === language ? 'lang-flags__button--active' : ''} ${isLoading ? 'lang-flags__button--loading' : ''}`}
          onClick={() => handleLanguageChange(lang.code)}
          aria-label={`Switch to ${lang.name}`}
          disabled={isLoading}
          data-lang={lang.code}
        >
          <span role="img" aria-label={lang.name}>{lang.flag}</span>
          <div className="lang-flags__tooltip">{lang.name}</div>
        </button>
      ))}
      {AVAILABLE_LANGUAGES.length > 5 && (
        <button
          className="lang-flags__button"
          onClick={handleBottomSheetToggle}
          aria-label="More languages"
        >
          ⋯
        </button>
      )}
    </div>
  );
  
  // Bottom sheet variant for mobile
  const renderBottomSheet = () => (
    <>
      {showBottomSheet && <div className="lang-overlay open" onClick={() => setShowBottomSheet(false)} />}
      <div 
        className={`lang-bottom-sheet ${showBottomSheet ? 'open' : ''}`}
        ref={bottomSheetRef}
        onTouchStart={handleTouchStart}
      >
        <div className="lang-bottom-sheet__header">
          <h3>Select Language</h3>
          <p>Choose your preferred language</p>
        </div>
        <div className="lang-bottom-sheet__languages">
          {AVAILABLE_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-bottom-sheet__language ${lang.code === language ? 'lang-bottom-sheet__language--active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={isLoading}
              lang={lang.code}
              dir={lang.dir}
            >
              <span className="lang-bottom-sheet__flag" role="img" aria-label={lang.name}>
                {lang.flag}
              </span>
              <div className="lang-bottom-sheet__info">
                <div className="lang-bottom-sheet__name">{lang.name}</div>
                <div className="lang-bottom-sheet__native">{lang.name}</div>
              </div>
              <svg className="lang-bottom-sheet__check" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          ))}
        </div>
        <div className="lang-bottom-sheet__footer">
          <button onClick={() => setShowBottomSheet(false)}>
            Close
          </button>
        </div>
      </div>
    </>
  );
  
  if (compact) {
    return (
      <div className="language-selector language-selector--compact" ref={dropdownRef}>
        {activeVariant === 'flags' ? (
          renderFlagButtons()
        ) : (
          <button
            className="language-selector__toggle language-selector__toggle--compact"
            onClick={isMobileView ? handleBottomSheetToggle : () => setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            aria-label={`Current language: ${currentLang.name}. Click to change language`}
            aria-expanded={isMobileView ? showBottomSheet : isOpen}
            aria-haspopup="listbox"
            disabled={isLoading}
          >
            <span className="language-selector__flag">{currentLang.flag}</span>
            <span className="language-selector__code">{currentLang.code.toUpperCase()}</span>
          </button>
        )}
        
        {isMobileView ? (
          renderBottomSheet()
        ) : (
          isOpen && (
            <ul 
              className="language-selector__dropdown language-selector__dropdown--compact"
              role="listbox"
              aria-label="Select language"
            >
              {AVAILABLE_LANGUAGES.map(lang => (
                <li key={lang.code}>
                  <button
                    className={`language-selector__option ${lang.code === language ? 'language-selector__option--active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                    role="option"
                    aria-selected={lang.code === language}
                    lang={lang.code}
                    dir={lang.dir}
                  >
                    <span className="language-selector__flag">{lang.flag}</span>
                    <span className="language-selector__name">{lang.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    );
  }

  return (
    <div className={`language-selector ${isLoading ? 'lang-loading' : ''}`} ref={dropdownRef}>
      <label htmlFor="language-select" className="language-selector__label">
        Language / Idioma / Langue
      </label>
      
      {activeVariant === 'flags' && isMobileView ? (
        renderFlagButtons()
      ) : (
        <button
          id="language-select"
          className="language-selector__toggle"
          onClick={isMobileView ? handleBottomSheetToggle : () => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-label={`Current language: ${currentLang.name}. Click to change language`}
          aria-expanded={isMobileView ? showBottomSheet : isOpen}
          aria-haspopup="listbox"
          disabled={isLoading}
        >
          <span className="language-selector__current">
            <span className="language-selector__flag">{currentLang.flag}</span>
            <span className="language-selector__name">{currentLang.name}</span>
          </span>
          <svg 
            className={`language-selector__arrow ${(isMobileView ? showBottomSheet : isOpen) ? 'language-selector__arrow--open' : ''}`}
            width="12" 
            height="12" 
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        </button>
      )}
      
      {isMobileView ? (
        renderBottomSheet()
      ) : (
        isOpen && (
          <ul 
            className="language-selector__dropdown"
            role="listbox"
            aria-label="Select language"
          >
            {AVAILABLE_LANGUAGES.map(lang => (
              <li key={lang.code}>
                <button
                  className={`language-selector__option ${lang.code === language ? 'language-selector__option--active' : ''}`}
                  onClick={() => handleLanguageChange(lang.code)}
                  role="option"
                  aria-selected={lang.code === language}
                  lang={lang.code}
                  dir={lang.dir}
                >
                  <span className="language-selector__flag">{lang.flag}</span>
                  <span className="language-selector__name">{lang.name}</span>
                  {lang.code === language && (
                    <svg 
                      className="language-selector__check" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    >
                      <path 
                        d="M2 8L6 12L14 4" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        fill="none"
                      />
                    </svg>
                  )}
                </button>
                </li>
              ))}
            </ul>
          )
        )}
      
      {isLoading && (
        <div className="language-selector__loading">
          <span className="language-selector__spinner"></span>
          <span className="sr-only">Loading translation...</span>
        </div>
      )}
      
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-announcement" />
    </div>
  );
};

export default LanguageSelector;