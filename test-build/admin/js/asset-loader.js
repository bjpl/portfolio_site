/**
 * Admin Panel Asset Loader
 * Optimized loading of CSS, JS, and other assets with fallbacks
 */

class AssetLoader {
    constructor() {
        this.loadedAssets = new Set();
        this.failedAssets = new Set();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.loadTimeout = 10000;
        this.setupLoadingIndicator();
    }

    /**
     * Load CSS file with fallback
     */
    async loadCSS(href, fallbackHrefs = []) {
        if (this.loadedAssets.has(href)) {
            return { success: true, source: href, cached: true };
        }

        const allUrls = [href, ...fallbackHrefs];
        
        for (const url of allUrls) {
            try {
                await this.loadCSSFile(url);
                this.loadedAssets.add(href);
                return { success: true, source: url, cached: false };
            } catch (error) {
                console.warn(`Failed to load CSS: ${url}`, error);
                continue;
            }
        }

        this.failedAssets.add(href);
        throw new Error(`All CSS sources failed: ${href}`);
    }

    /**
     * Load JavaScript file with fallback
     */
    async loadJS(src, fallbackSrcs = []) {
        if (this.loadedAssets.has(src)) {
            return { success: true, source: src, cached: true };
        }

        const allUrls = [src, ...fallbackSrcs];
        
        for (const url of allUrls) {
            try {
                await this.loadJSFile(url);
                this.loadedAssets.add(src);
                return { success: true, source: url, cached: false };
            } catch (error) {
                console.warn(`Failed to load JS: ${url}`, error);
                continue;
            }
        }

        this.failedAssets.add(src);
        throw new Error(`All JS sources failed: ${src}`);
    }

    /**
     * Load multiple assets in parallel
     */
    async loadAssets(assets) {
        const promises = assets.map(asset => {
            if (asset.type === 'css') {
                return this.loadCSS(asset.href, asset.fallbacks);
            } else if (asset.type === 'js') {
                return this.loadJS(asset.src, asset.fallbacks);
            }
        });

        const results = await Promise.allSettled(promises);
        
        return results.map((result, index) => ({
            asset: assets[index],
            success: result.status === 'fulfilled',
            result: result.status === 'fulfilled' ? result.value : result.reason,
            critical: assets[index].critical || false
        }));
    }

    /**
     * Load essential admin panel assets
     */
    async loadAdminAssets() {
        const adminAssets = [
            {
                type: 'css',
                href: '/admin/styles.css',
                fallbacks: ['/css/admin.css', '/static/admin/styles.css'],
                critical: true
            },
            {
                type: 'css', 
                href: '/admin/design-system.css',
                fallbacks: ['/css/design-system.css'],
                critical: false
            },
            {
                type: 'js',
                src: '/admin/js/toast.js',
                fallbacks: ['/js/toast.js'],
                critical: true
            },
            {
                type: 'js',
                src: '/admin/js/utils.js', 
                fallbacks: ['/js/utils.js'],
                critical: true
            },
            {
                type: 'js',
                src: '/admin/js/navigation.js',
                fallbacks: [],
                critical: false
            }
        ];

        console.log('🔄 Loading admin panel assets...');
        this.showLoadingIndicator();

        try {
            const results = await this.loadAssets(adminAssets);
            
            const failed = results.filter(r => !r.success);
            const criticalFailed = failed.filter(r => r.critical);

            if (criticalFailed.length > 0) {
                throw new Error(`Critical assets failed: ${criticalFailed.map(f => f.asset.href || f.asset.src).join(', ')}`);
            }

            console.log(`✅ Admin assets loaded: ${results.filter(r => r.success).length}/${results.length}`);
            
            if (failed.length > 0) {
                console.warn(`⚠️ Non-critical assets failed: ${failed.map(f => f.asset.href || f.asset.src).join(', ')}`);
            }

            this.hideLoadingIndicator();
            return { success: true, results, failed: failed.length };

        } catch (error) {
            this.hideLoadingIndicator();
            console.error('❌ Critical admin assets failed to load:', error);
            throw error;
        }
    }

    /**
     * Load CSS file helper
     */
    loadCSSFile(href) {
        return new Promise((resolve, reject) => {
            // Check if already exists
            const existing = document.querySelector(`link[href="${href}"]`);
            if (existing) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            const timeout = setTimeout(() => {
                reject(new Error(`CSS load timeout: ${href}`));
            }, this.loadTimeout);

            link.onload = () => {
                clearTimeout(timeout);
                resolve();
            };

            link.onerror = () => {
                clearTimeout(timeout);
                reject(new Error(`CSS load error: ${href}`));
            };

            document.head.appendChild(link);
        });
    }

    /**
     * Load JavaScript file helper
     */
    loadJSFile(src) {
        return new Promise((resolve, reject) => {
            // Check if already exists
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            const timeout = setTimeout(() => {
                reject(new Error(`JS load timeout: ${src}`));
            }, this.loadTimeout);

            script.onload = () => {
                clearTimeout(timeout);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error(`JS load error: ${src}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Preload critical assets
     */
    preloadAssets(assets) {
        assets.forEach(asset => {
            const link = document.createElement('link');
            link.rel = 'preload';
            
            if (asset.type === 'css') {
                link.as = 'style';
                link.href = asset.href;
            } else if (asset.type === 'js') {
                link.as = 'script';
                link.href = asset.src;
            }
            
            document.head.appendChild(link);
        });
    }

    /**
     * Setup loading indicator
     */
    setupLoadingIndicator() {
        const style = document.createElement('style');
        style.textContent = `
            #asset-loading-indicator {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3498db, #2ecc71);
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s;
                animation: loading-pulse 2s ease-in-out infinite;
            }
            
            #asset-loading-indicator.visible {
                opacity: 1;
            }
            
            @keyframes loading-pulse {
                0%, 100% { transform: scaleX(1); }
                50% { transform: scaleX(1.1); }
            }
        `;
        document.head.appendChild(style);

        const indicator = document.createElement('div');
        indicator.id = 'asset-loading-indicator';
        document.body.appendChild(indicator);
    }

    /**
     * Show loading indicator
     */
    showLoadingIndicator() {
        const indicator = document.getElementById('asset-loading-indicator');
        if (indicator) {
            indicator.classList.add('visible');
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        const indicator = document.getElementById('asset-loading-indicator');
        if (indicator) {
            indicator.classList.remove('visible');
        }
    }

    /**
     * Optimize images with lazy loading
     */
    setupImageOptimization() {
        // Use IntersectionObserver for lazy loading if available
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }

    /**
     * Get load statistics
     */
    getStats() {
        return {
            loaded: this.loadedAssets.size,
            failed: this.failedAssets.size,
            loadedAssets: Array.from(this.loadedAssets),
            failedAssets: Array.from(this.failedAssets),
            retryAttempts: Object.fromEntries(this.retryAttempts)
        };
    }

    /**
     * Clean up failed attempts for retry
     */
    resetFailures() {
        this.failedAssets.clear();
        this.retryAttempts.clear();
    }

    /**
     * Force reload specific asset
     */
    async reloadAsset(href, type = 'auto') {
        // Remove from loaded set to force reload
        this.loadedAssets.delete(href);
        this.failedAssets.delete(href);

        // Determine type if auto
        if (type === 'auto') {
            type = href.endsWith('.css') ? 'css' : 'js';
        }

        try {
            if (type === 'css') {
                return await this.loadCSS(href);
            } else {
                return await this.loadJS(href);
            }
        } catch (error) {
            console.error(`Failed to reload asset: ${href}`, error);
            throw error;
        }
    }
}

// Create global asset loader
window.assetLoader = new AssetLoader();

// Auto-load admin assets when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('/admin/')) {
        try {
            await window.assetLoader.loadAdminAssets();
            window.assetLoader.setupImageOptimization();
            
            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('adminAssetsLoaded', {
                detail: window.assetLoader.getStats()
            }));
        } catch (error) {
            console.error('Failed to load admin assets:', error);
            
            // Show user-friendly error
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                background: #f44336; color: white; padding: 15px 20px; border-radius: 4px;
                z-index: 10001; font-family: -apple-system, sans-serif;
            `;
            errorDiv.innerHTML = `
                <strong>⚠️ Admin Panel Loading Error</strong><br>
                Some assets failed to load. Please refresh the page.<br>
                <small>${error.message}</small>
            `;
            document.body.appendChild(errorDiv);
        }
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetLoader;
}