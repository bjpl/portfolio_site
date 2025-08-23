/**
 * Enhanced Language Switcher - Improved UX and Functionality
 * Provides robust language switching with smooth transitions, error handling, and comprehensive URL mappings
 */

class LanguageSwitcher {
    constructor() {
        this.currentLang = document.documentElement.lang || 'en';
        this.isTransitioning = false;
        this.fallbackDelay = 2000; // 2 seconds
        
        // Comprehensive URL mappings for all sections
        this.urlMappings = {
            'en': {
                '/': '/',
                '/es/': '/',
                '/photography/': '/photography/',
                '/es/fotografia/': '/photography/',
                '/teaching-learning/': '/teaching-learning/',
                '/es/ensenanza-aprendizaje/': '/teaching-learning/',
                '/me/': '/me/',
                '/es/yo/': '/me/',
                '/services/': '/services/',
                '/es/servicios/': '/services/',
                '/cv/': '/cv/',
                '/es/cv/': '/cv/',
                '/tools/': '/tools/',
                '/es/tools/': '/tools/',
                '/writing/': '/writing/',
                '/es/writing/': '/writing/',
                '/contact/': '/contact/',
                '/es/contact/': '/contact/',
                '/admin': '/admin'
            },
            'es': {
                '/': '/es/',
                '/photography/': '/es/fotografia/',
                '/teaching-learning/': '/es/ensenanza-aprendizaje/',
                '/me/': '/es/yo/',
                '/services/': '/es/servicios/',
                '/cv/': '/es/cv/',
                '/tools/': '/es/tools/',
                '/writing/': '/es/writing/',
                '/contact/': '/es/contact/',
                '/admin': '/admin'
            }
        };

        // Initialize the switcher
        this.init();
    }

    init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Check for saved language preference
        this.loadSavedPreference();
        
        // Auto-detect language if no preference is saved
        this.autoDetectLanguage();
        
        // Add CSS for transitions
        this.injectStyles();
    }

    setupEventListeners() {
        // Handle language switcher select change
        const langSwitcher = document.querySelector('.lang-switch');
        if (langSwitcher) {
            langSwitcher.addEventListener('change', (e) => {
                this.switchLanguage(e.target.value);
            });
        }

        // Handle page visibility change (for recovery)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            
            // Check if we're stuck in a transition
            if (this.isTransitioning) {
                setTimeout(() => {
                    if (this.isTransitioning) {
                        this.hideLoadingIndicator();
                        this.isTransitioning = false;
                    }
                }, 1000);
            }
        });
    }

    loadSavedPreference() {
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && savedLang !== this.currentLang) {
            // Update current language if different from saved preference
            this.currentLang = savedLang;
        }
    }

    autoDetectLanguage() {
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang) return; // Don't auto-detect if user has a preference

        // Get browser language
        const browserLang = navigator.language || navigator.languages?.[0] || 'en';
        const detectedLang = browserLang.startsWith('es') ? 'es' : 'en';
        
        // Only auto-switch if significantly different from current
        if (detectedLang !== this.currentLang && !sessionStorage.getItem('languageDetected')) {
            sessionStorage.setItem('languageDetected', 'true');
            
            // Show a subtle notification about language detection
            this.showLanguageDetectionNotice(detectedLang);
        }
    }

    showLanguageDetectionNotice(detectedLang) {
        const langNames = { 'en': 'English', 'es': 'Español' };
        const currentLangName = langNames[this.currentLang];
        const detectedLangName = langNames[detectedLang];
        
        const notice = document.createElement('div');
        notice.className = 'language-detection-notice';
        notice.innerHTML = `
            <div class="notice-content">
                <span>Detected language: ${detectedLangName}</span>
                <button onclick="window.languageSwitcher.switchLanguage('${detectedLang}')" class="switch-btn">
                    Switch to ${detectedLangName}
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">×</button>
            </div>
        `;
        
        document.body.appendChild(notice);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (notice.parentElement) {
                notice.remove();
            }
        }, 8000);
    }

    switchLanguage(targetLang) {
        if (this.isTransitioning) {
            this.showToast('Language switch in progress...', 'info');
            return;
        }

        if (targetLang === this.currentLang) {
            this.showToast('Already viewing in this language', 'info');
            return;
        }

        this.isTransitioning = true;
        this.showLoadingIndicator();

        try {
            const targetPath = this.getTargetPath(targetLang);
            
            // Save preference
            localStorage.setItem('preferredLanguage', targetLang);
            
            // Add transition class to body
            document.body.classList.add('language-switching');
            
            // Navigate with smooth transition
            this.navigateToPath(targetPath, targetLang);
            
        } catch (error) {
            console.error('Language switch error:', error);
            this.handleSwitchError(targetLang);
        }
    }

    getTargetPath(targetLang) {
        const currentPath = window.location.pathname;
        
        // Check direct mapping first
        if (this.urlMappings[targetLang][currentPath]) {
            return this.urlMappings[targetLang][currentPath];
        }

        // Smart fallback logic
        return this.smartPathMapping(currentPath, targetLang);
    }

    smartPathMapping(currentPath, targetLang) {
        // Handle complex paths that might not be in direct mapping
        
        if (targetLang === 'es') {
            // English to Spanish
            if (currentPath === '/' || currentPath === '') {
                return '/es/';
            }
            
            // Check for specific section mappings
            const sectionMappings = {
                '/photography/': '/es/fotografia/',
                '/teaching-learning/': '/es/ensenanza-aprendizaje/',
                '/me/': '/es/yo/',
                '/services/': '/es/servicios/'
            };
            
            for (const [en, es] of Object.entries(sectionMappings)) {
                if (currentPath.startsWith(en)) {
                    return currentPath.replace(en, es);
                }
            }
            
            // Generic fallback - add /es prefix
            return currentPath.startsWith('/es/') ? currentPath : '/es' + currentPath;
            
        } else {
            // Spanish to English
            if (currentPath === '/es/' || currentPath === '/es') {
                return '/';
            }
            
            if (currentPath.startsWith('/es/')) {
                const pathWithoutLang = currentPath.replace('/es', '');
                
                // Specific Spanish to English mappings
                const sectionMappings = {
                    '/fotografia/': '/photography/',
                    '/ensenanza-aprendizaje/': '/teaching-learning/',
                    '/yo/': '/me/',
                    '/servicios/': '/services/'
                };
                
                for (const [es, en] of Object.entries(sectionMappings)) {
                    if (pathWithoutLang.startsWith(es)) {
                        return pathWithoutLang.replace(es, en);
                    }
                }
                
                // Remove /es prefix for generic pages
                return pathWithoutLang || '/';
            }
            
            return currentPath;
        }
    }

    navigateToPath(targetPath, targetLang) {
        // Set a fallback timeout
        const fallbackTimeout = setTimeout(() => {
            this.handleNavigationTimeout(targetPath);
        }, this.fallbackDelay);

        try {
            // Update page language before navigation
            document.documentElement.lang = targetLang;
            
            // Navigate to new path
            window.location.href = targetPath;
            
        } catch (error) {
            clearTimeout(fallbackTimeout);
            throw error;
        }
    }

    handleNavigationTimeout(targetPath) {
        console.warn('Navigation timeout, attempting direct redirect');
        this.hideLoadingIndicator();
        this.isTransitioning = false;
        
        // Try direct navigation as fallback
        try {
            window.location.replace(targetPath);
        } catch (error) {
            this.showToast('Navigation failed. Please try again.', 'error');
        }
    }

    handleSwitchError(targetLang) {
        this.hideLoadingIndicator();
        this.isTransitioning = false;
        document.body.classList.remove('language-switching');
        
        // Try fallback to homepage
        const fallbackPath = targetLang === 'es' ? '/es/' : '/';
        
        this.showToast('Page not available in selected language. Redirecting to homepage.', 'warning');
        
        setTimeout(() => {
            try {
                window.location.href = fallbackPath;
            } catch (error) {
                this.showToast('Unable to switch language. Please try again.', 'error');
            }
        }, 1500);
    }

    showLoadingIndicator() {
        // Remove existing indicator
        this.hideLoadingIndicator();
        
        const indicator = document.createElement('div');
        indicator.id = 'language-switch-loading';
        indicator.className = 'language-loading-indicator';
        indicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <span>Switching language...</span>
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        // Force a reflow to ensure the element is rendered
        indicator.offsetHeight;
        
        // Add the visible class for animation
        requestAnimationFrame(() => {
            indicator.classList.add('visible');
        });
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('language-switch-loading');
        if (indicator) {
            indicator.classList.remove('visible');
            setTimeout(() => {
                if (indicator.parentElement) {
                    indicator.remove();
                }
            }, 300); // Wait for fade out animation
        }
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.language-toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `language-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast with animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('visible');
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 4000);
    }

    injectStyles() {
        if (document.getElementById('language-switcher-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'language-switcher-styles';
        styles.textContent = `
            /* Language switching transition */
            .language-switching {
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            /* Loading indicator */
            .language-loading-indicator {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .language-loading-indicator.visible {
                opacity: 1;
            }

            .loading-content {
                background: var(--background-color, #fff);
                color: var(--text-color, #333);
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
                min-width: 200px;
                text-align: center;
            }

            .loading-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid var(--text-color-muted, #ccc);
                border-top: 3px solid var(--accent-color, #007bff);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Toast notifications */
            .language-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10001;
                max-width: 400px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            }

            .language-toast.visible {
                opacity: 1;
                transform: translateX(0);
            }

            .toast-content {
                background: var(--background-color, #fff);
                color: var(--text-color, #333);
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                border-left: 4px solid var(--accent-color, #007bff);
            }

            .toast-info .toast-content { border-left-color: #17a2b8; }
            .toast-warning .toast-content { border-left-color: #ffc107; }
            .toast-error .toast-content { border-left-color: #dc3545; }

            .toast-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-color-muted, #666);
                padding: 0;
                line-height: 1;
            }

            .toast-close:hover {
                color: var(--text-color, #333);
            }

            /* Language detection notice */
            .language-detection-notice {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: var(--accent-color, #007bff);
                color: white;
                z-index: 9999;
                animation: slideDown 0.3s ease;
            }

            .notice-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                padding: 0.75rem 1rem;
                max-width: 1200px;
                margin: 0 auto;
            }

            .switch-btn, .dismiss-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: background 0.2s ease;
            }

            .switch-btn:hover, .dismiss-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .dismiss-btn {
                padding: 0.25rem 0.5rem;
                font-weight: bold;
            }

            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .language-toast {
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }

                .loading-content {
                    margin: 0 1rem;
                    padding: 1.5rem;
                }

                .notice-content {
                    flex-direction: column;
                    gap: 0.5rem;
                    text-align: center;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Public method to get current language
    getCurrentLanguage() {
        return this.currentLang;
    }

    // Public method to check if switching is in progress
    isSwitching() {
        return this.isTransitioning;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.languageSwitcher = new LanguageSwitcher();
});

// Backward compatibility - keep the original function
function switchLanguage(targetLang) {
    if (window.languageSwitcher) {
        window.languageSwitcher.switchLanguage(targetLang);
    } else {
        // Fallback for immediate use
        console.warn('Language switcher not fully initialized, using basic fallback');
        localStorage.setItem('preferredLanguage', targetLang);
        
        const currentPath = window.location.pathname;
        let targetPath;
        
        if (targetLang === 'es' && !currentPath.startsWith('/es/')) {
            targetPath = currentPath === '/' ? '/es/' : '/es' + currentPath;
        } else if (targetLang === 'en' && currentPath.startsWith('/es/')) {
            targetPath = currentPath.replace('/es/', '/') || '/';
        } else {
            targetPath = currentPath;
        }
        
        window.location.href = targetPath;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageSwitcher;
}