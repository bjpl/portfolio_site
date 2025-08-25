// Simple, robust language switcher with error handling
(function() {
    'use strict';
    
    // Language mapping for URL translation
    const urlMappings = {
        // English to Spanish
        '/': '/es/',
        '/photography/': '/es/fotografia/',
        '/teaching-learning/': '/es/ensenanza-aprendizaje/',
        '/me/': '/es/yo/',
        '/services/': '/es/servicios/',
        
        // Spanish to English
        '/es/': '/',
        '/es/fotografia/': '/photography/',
        '/es/ensenanza-aprendizaje/': '/teaching-learning/',
        '/es/yo/': '/me/',
        '/es/servicios/': '/services/'
    };
    
    // Enhanced language switching function
    window.switchLanguage = function(targetLang) {
        try {
            // Validate input
            if (!targetLang || (targetLang !== 'en' && targetLang !== 'es')) {
                console.warn('Invalid language:', targetLang);
                return;
            }
            
            // Get current language from HTML lang attribute or URL
            const htmlLang = document.documentElement.lang || 'en';
            const currentLang = htmlLang.substring(0, 2);
            
            // Don't switch if already on target language
            if (currentLang === targetLang) {
                console.log('Already on language:', targetLang);
                return;
            }
            
            // Store preference
            localStorage.setItem('preferredLanguage', targetLang);
            
            // Get current path
            const currentPath = window.location.pathname;
            let targetPath = currentPath;
            
            // Try exact mapping first
            if (urlMappings[currentPath]) {
                targetPath = urlMappings[currentPath];
            } else {
                // Fallback logic for unmapped pages
                if (targetLang === 'es' && !currentPath.startsWith('/es/')) {
                    targetPath = '/es' + currentPath;
                } else if (targetLang === 'en' && currentPath.startsWith('/es/')) {
                    targetPath = currentPath.replace('/es/', '/').replace('/es', '/');
                }
            }
            
            // Preserve hash if exists
            if (window.location.hash) {
                targetPath += window.location.hash;
            }
            
            // Navigate to new URL
            console.log('Switching language from', currentLang, 'to', targetLang);
            console.log('Navigating to:', targetPath);
            window.location.href = targetPath;
            
        } catch (error) {
            console.error('Error switching language:', error);
            // Fallback to homepage of target language
            window.location.href = targetLang === 'es' ? '/es/' : '/';
        }
    };
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        const languageSelect = document.getElementById('language-select');
        
        if (languageSelect) {
            // Set current language as selected
            const currentLang = document.documentElement.lang?.substring(0, 2) || 'en';
            languageSelect.value = currentLang;
            
            // Add error handling to select element
            languageSelect.addEventListener('change', function(e) {
                e.preventDefault();
                const selectedLang = this.value;
                if (selectedLang) {
                    window.switchLanguage(selectedLang);
                }
            });
            
            // Prevent form submission if inside a form
            languageSelect.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.dispatchEvent(new Event('change'));
                }
            });
        }
        
        // Apply saved language preference on page load
        const savedLang = localStorage.getItem('preferredLanguage');
        const currentLang = document.documentElement.lang?.substring(0, 2) || 'en';
        
        if (savedLang && savedLang !== currentLang) {
            // User has a saved preference different from current page
            // You could auto-redirect here or show a notification
            console.log('Saved language preference:', savedLang, 'Current:', currentLang);
        }
    });
    
    // Expose for debugging
    window.languageSwitcherDebug = {
        getCurrentLanguage: function() {
            return document.documentElement.lang?.substring(0, 2) || 'en';
        },
        getSavedPreference: function() {
            return localStorage.getItem('preferredLanguage');
        },
        getMappings: function() {
            return urlMappings;
        }
    };
})();