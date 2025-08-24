/**
 * Admin Cache Buster Utility
 * Ensures admin pages always load fresh content by adding cache-busting parameters
 */

class AdminCacheBuster {
    constructor() {
        this.version = '2025-08-24-v4';
        this.timestamp = Date.now();
    }

    /**
     * Add cache busting parameters to URLs
     */
    bustUrl(url) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${this.version}&t=${this.timestamp}`;
    }

    /**
     * Bust cache for admin navigation links
     */
    bustNavigationLinks() {
        const adminLinks = document.querySelectorAll('a[href*="/admin"]');
        adminLinks.forEach(link => {
            const originalHref = link.href;
            if (!originalHref.includes('v=') && !originalHref.includes('t=')) {
                link.href = this.bustUrl(originalHref);
            }
        });
    }

    /**
     * Bust cache for dynamic content loading
     */
    bustAjaxRequests() {
        // Override fetch for admin requests
        const originalFetch = window.fetch;
        window.fetch = (resource, options = {}) => {
            if (typeof resource === 'string' && resource.includes('/admin')) {
                resource = this.bustUrl(resource);
            }
            return originalFetch(resource, options);
        };

        // Override XMLHttpRequest for admin requests
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (typeof url === 'string' && url.includes('/admin')) {
                url = this.bustUrl ? this.bustUrl(url) : url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
            }
            return originalOpen.call(this, method, url, ...args);
        };
    }

    /**
     * Force reload admin page with cache busting
     */
    forceReload() {
        const currentUrl = window.location.href;
        const bustedUrl = this.bustUrl(currentUrl.split('?')[0].split('#')[0]);
        window.location.replace(bustedUrl);
    }

    /**
     * Clear all browser caches for admin routes
     */
    async clearAdminCache() {
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    const cache = await caches.open(cacheName);
                    const requests = await cache.keys();
                    for (const request of requests) {
                        if (request.url.includes('/admin')) {
                            await cache.delete(request);
                        }
                    }
                }
                console.log('Admin cache cleared successfully');
            } catch (error) {
                console.warn('Failed to clear admin cache:', error);
            }
        }
    }

    /**
     * Initialize cache busting
     */
    init() {
        // Clear existing admin caches
        this.clearAdminCache();

        // Bust navigation links
        this.bustNavigationLinks();

        // Bust AJAX requests
        this.bustAjaxRequests();

        // Bust URLs when page loads
        document.addEventListener('DOMContentLoaded', () => {
            this.bustNavigationLinks();
        });

        // Re-bust links when content changes
        const observer = new MutationObserver(() => {
            this.bustNavigationLinks();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log(`Admin cache buster initialized (v${this.version})`);
    }
}

// Auto-initialize if on admin page
if (window.location.pathname.includes('/admin') || document.querySelector('body[data-admin]')) {
    const cacheBuster = new AdminCacheBuster();
    cacheBuster.init();
    
    // Make available globally for manual cache busting
    window.adminCacheBuster = cacheBuster;
}