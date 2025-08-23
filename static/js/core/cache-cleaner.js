/**
 * Cache Cleaner Utility
 * Safely clears browser cache and localStorage data
 */

class CacheCleaner {
    constructor() {
        this.isClearing = false;
    }

    /**
     * Clear all authentication and API related cache data
     */
    async clearAll() {
        if (this.isClearing) return;
        this.isClearing = true;

        try {
            console.log('[Cache Cleaner] Starting comprehensive cache clear...');

            // Clear localStorage
            this.clearLocalStorage();

            // Clear sessionStorage
            this.clearSessionStorage();

            // Clear browser cache if supported
            await this.clearBrowserCache();

            // Clear service worker cache if available
            await this.clearServiceWorkerCache();

            // Clear cookies
            this.clearCookies();

            console.log('[Cache Cleaner] Cache clearing completed');
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('cacheCleared', {
                detail: { timestamp: new Date().toISOString() }
            }));

        } catch (error) {
            console.error('[Cache Cleaner] Error during cache clearing:', error);
        } finally {
            this.isClearing = false;
        }
    }

    /**
     * Clear localStorage data
     */
    clearLocalStorage() {
        const keysToRemove = [
            // Auth tokens
            'token', 'accessToken', 'refreshToken', 'authToken',
            
            // User data
            'currentUser', 'userKey', 'userData', 'userProfile',
            
            // Session data
            'sessionData', 'authState', 'loginTime', 'lastLogin',
            
            // Preferences
            'userPreferences', 'settings', 'appSettings',
            
            // API cache
            'apiCache', 'requestCache', 'responseCache',
            
            // Form data
            'remember', 'rememberMe', 'savedCredentials',
            
            // Debug data
            'debugMode', 'logLevel', 'apiDebug'
        ];

        let clearedCount = 0;
        keysToRemove.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                clearedCount++;
            }
        });

        // Also clear any keys that contain common patterns
        const patterns = ['auth', 'token', 'user', 'session', 'api', 'cache'];
        Object.keys(localStorage).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (patterns.some(pattern => lowerKey.includes(pattern))) {
                localStorage.removeItem(key);
                clearedCount++;
            }
        });

        console.log(`[Cache Cleaner] Cleared ${clearedCount} localStorage items`);
    }

    /**
     * Clear sessionStorage data
     */
    clearSessionStorage() {
        const keys = Object.keys(sessionStorage);
        sessionStorage.clear();
        console.log(`[Cache Cleaner] Cleared ${keys.length} sessionStorage items`);
    }

    /**
     * Clear browser cache using Cache API
     */
    async clearBrowserCache() {
        if (!('caches' in window)) {
            console.log('[Cache Cleaner] Cache API not supported');
            return;
        }

        try {
            const cacheNames = await caches.keys();
            
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log(`[Cache Cleaner] Deleted cache: ${cacheName}`);
            }
            
            console.log(`[Cache Cleaner] Cleared ${cacheNames.length} browser caches`);
        } catch (error) {
            console.error('[Cache Cleaner] Error clearing browser cache:', error);
        }
    }

    /**
     * Clear service worker cache
     */
    async clearServiceWorkerCache() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            
            for (const registration of registrations) {
                await registration.unregister();
                console.log('[Cache Cleaner] Unregistered service worker');
            }
        } catch (error) {
            console.error('[Cache Cleaner] Error clearing service worker cache:', error);
        }
    }

    /**
     * Clear cookies (domain-specific)
     */
    clearCookies() {
        const cookies = document.cookie.split(';');
        let clearedCount = 0;

        cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name) {
                // Clear for current domain
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
                clearedCount++;
            }
        });

        console.log(`[Cache Cleaner] Cleared ${clearedCount} cookies`);
    }

    /**
     * Clear specific authentication data only
     */
    clearAuthData() {
        const authKeys = [
            'token', 'accessToken', 'refreshToken', 'authToken',
            'currentUser', 'userKey', 'userData', 'authState',
            'sessionData', 'loginTime', 'lastLogin', 'remember'
        ];

        authKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        console.log('[Cache Cleaner] Cleared authentication data');
        
        window.dispatchEvent(new CustomEvent('authDataCleared'));
    }

    /**
     * Clear API cache data only
     */
    clearAPICache() {
        const apiKeys = ['apiCache', 'requestCache', 'responseCache'];
        
        apiKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        console.log('[Cache Cleaner] Cleared API cache data');
        
        window.dispatchEvent(new CustomEvent('apiCacheCleared'));
    }

    /**
     * Get cache status
     */
    getCacheStatus() {
        const localStorageCount = Object.keys(localStorage).length;
        const sessionStorageCount = Object.keys(sessionStorage).length;
        
        return {
            localStorage: localStorageCount,
            sessionStorage: sessionStorageCount,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create UI button for manual cache clearing
     */
    createClearCacheButton() {
        const button = document.createElement('button');
        button.id = 'clear-cache-btn';
        button.textContent = '🧹 Clear Cache';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', async () => {
            if (confirm('Clear all cache and reload the page?')) {
                button.textContent = '🧹 Clearing...';
                button.disabled = true;
                
                await this.clearAll();
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        });

        // Only add if not already present and if on admin page
        if (!document.getElementById('clear-cache-btn') && 
            (window.location.pathname.includes('/admin/') || window.location.search.includes('debug=true'))) {
            document.body.appendChild(button);
        }
    }

    /**
     * Auto-clear cache on authentication errors
     */
    setupAutoClearing() {
        // Listen for auth errors
        window.addEventListener('authError', () => {
            console.log('[Cache Cleaner] Auth error detected, clearing auth data');
            this.clearAuthData();
        });

        // Listen for API errors
        window.addEventListener('apiError', (event) => {
            if (event.detail && event.detail.status === 401) {
                console.log('[Cache Cleaner] 401 error detected, clearing auth data');
                this.clearAuthData();
            }
        });

        // Clear cache on page unload if there were errors
        window.addEventListener('beforeunload', () => {
            if (window.authErrorOccurred) {
                this.clearAuthData();
            }
        });
    }
}

// Create global instance
const cacheCleaner = new CacheCleaner();

// Make available globally
window.CacheCleaner = cacheCleaner;

// Auto-setup
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cacheCleaner.setupAutoClearing();
        cacheCleaner.createClearCacheButton();
    });
} else {
    cacheCleaner.setupAutoClearing();
    cacheCleaner.createClearCacheButton();
}

console.log('[Cache Cleaner] Cache cleaner utility loaded');