import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from '../../store/StoreProvider';
import './LanguageSelector.css';

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

const LanguageSelector = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  
  const { language } = useSelector(state => state.preferences);
  const currentLang = AVAILABLE_LANGUAGES.find(lang => lang.code === language) || AVAILABLE_LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle language change
  const handleLanguageChange = async (langCode) => {
    if (langCode === language) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    
    try {
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

  // Keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  if (compact) {
    return (
      <div className="language-selector language-selector--compact" ref={dropdownRef}>
        <button
          className="language-selector__toggle language-selector__toggle--compact"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-label={`Current language: ${currentLang.name}. Click to change language`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={isLoading}
        >
          <span className="language-selector__flag">{currentLang.flag}</span>
          <span className="language-selector__code">{currentLang.code.toUpperCase()}</span>
        </button>
        
        {isOpen && (
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
        )}
      </div>
    );
  }

  return (
    <div className="language-selector" ref={dropdownRef}>
      <label htmlFor="language-select" className="language-selector__label">
        Language / Idioma / Langue
      </label>
      
      <button
        id="language-select"
        className="language-selector__toggle"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-label={`Current language: ${currentLang.name}. Click to change language`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={isLoading}
      >
        <span className="language-selector__current">
          <span className="language-selector__flag">{currentLang.flag}</span>
          <span className="language-selector__name">{currentLang.name}</span>
        </span>
        <svg 
          className={`language-selector__arrow ${isOpen ? 'language-selector__arrow--open' : ''}`}
          width="12" 
          height="12" 
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </button>
      
      {isOpen && (
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
      )}
      
      {isLoading && (
        <div className="language-selector__loading">
          <span className="language-selector__spinner"></span>
          <span className="sr-only">Loading translation...</span>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;