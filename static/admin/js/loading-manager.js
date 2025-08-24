/**
 * Admin Loading Manager
 * Handles loading states, error fallbacks, and graceful degradation
 */

class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.dependencies = new Map();
        this.timeouts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.defaultTimeout = 30000;
        
        this.init();
    }

    /**
     * Initialize loading manager
     */
    init() {
        this.setupGlobalErrorHandling();
        this.setupLoadingUI();
        console.log('🔄 Loading Manager initialized');
    }

    /**
     * Show loading screen with message
     */
    showLoading(message = 'Loading...', containerId = 'loading-screen') {
        let loadingScreen = document.getElementById(containerId);
        
        if (!loadingScreen) {
            loadingScreen = this.createLoadingScreen(containerId, message);
            document.body.appendChild(loadingScreen);
        }
        
        loadingScreen.style.display = 'flex';
        loadingScreen.querySelector('.loading-message').textContent = message;
        
        console.log(`🔄 Loading: ${message}`);
    }

    /**
     * Hide loading screen
     */
    hideLoading(containerId = 'loading-screen') {
        const loadingScreen = document.getElementById(containerId);
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    /**
     * Create loading screen element
     */
    createLoadingScreen(id, message) {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = id;
        loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        loadingScreen.innerHTML = `
            <div class="loading-spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <div class="loading-message" style="
                color: #666;
                font-size: 16px;
                text-align: center;
                margin-bottom: 20px;
            ">${message}</div>
            <div class="loading-details" style="
                color: #999;
                font-size: 12px;
                text-align: center;
                max-width: 400px;
            "></div>
        `;
        
        // Add CSS animation
        if (!document.querySelector('#loading-animation-styles')) {
            const styles = document.createElement('style');
            styles.id = 'loading-animation-styles';
            styles.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(styles);
        }
        
        return loadingScreen;
    }

    /**
     * Load dependency with retry logic
     */
    async loadDependency(name, loader, options = {}) {
        const {
            timeout = this.defaultTimeout,
            retries = this.maxRetries,
            required = true,
            fallback = null
        } = options;

        console.log(`🔄 Loading dependency: ${name}`);
        this.loadingStates.set(name, 'loading');

        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Timeout loading ${name}`)), timeout);
                });

                const result = await Promise.race([loader(), timeoutPromise]);
                
                this.loadingStates.set(name, 'loaded');
                console.log(`✅ Loaded dependency: ${name}`);
                return result;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Failed to load ${name} (attempt ${attempt + 1}/${retries + 1}):`, error.message);
                
                if (attempt < retries) {
                    await this.delay(this.retryDelay * (attempt + 1));
                }
            }
        }

        // Handle failure
        this.loadingStates.set(name, 'failed');
        
        if (fallback) {
            console.log(`🔄 Using fallback for ${name}`);
            try {
                const result = await fallback();
                this.loadingStates.set(name, 'fallback');
                return result;
            } catch (fallbackError) {
                console.error(`❌ Fallback also failed for ${name}:`, fallbackError.message);
            }
        }

        if (required) {
            throw new Error(`Required dependency ${name} failed to load: ${lastError.message}`);
        }

        console.warn(`⚠️ Optional dependency ${name} failed to load`);
        return null;
    }

    /**
     * Load multiple dependencies with progress tracking
     */
    async loadDependencies(dependencies, onProgress = null) {
        const results = new Map();
        const total = dependencies.length;
        let loaded = 0;

        this.showLoading('Loading dependencies...');

        for (const dep of dependencies) {
            try {
                const result = await this.loadDependency(dep.name, dep.loader, dep.options);
                results.set(dep.name, result);
                loaded++;

                if (onProgress) {
                    onProgress(loaded, total, dep.name);
                }

                // Update loading message
                const percentage = Math.round((loaded / total) * 100);
                this.updateLoadingMessage(`Loading dependencies... ${percentage}%`);

            } catch (error) {
                console.error(`❌ Critical dependency ${dep.name} failed:`, error);
                
                if (dep.options?.required !== false) {
                    this.showError(`Failed to load required dependency: ${dep.name}`, error.message);
                    throw error;
                }
            }
        }

        this.hideLoading();
        return results;
    }

    /**
     * Update loading message
     */
    updateLoadingMessage(message, details = '') {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            const messageEl = loadingScreen.querySelector('.loading-message');
            const detailsEl = loadingScreen.querySelector('.loading-details');
            
            if (messageEl) messageEl.textContent = message;
            if (detailsEl) detailsEl.textContent = details;
        }
    }

    /**
     * Show error screen
     */
    showError(title, message = '', allowRetry = true) {
        const errorScreen = this.createErrorScreen(title, message, allowRetry);
        document.body.appendChild(errorScreen);
        
        // Hide loading screen
        this.hideLoading();
        
        console.error(`❌ ${title}: ${message}`);
    }

    /**
     * Create error screen
     */
    createErrorScreen(title, message, allowRetry) {
        const errorScreen = document.createElement('div');
        errorScreen.id = 'error-screen';
        errorScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 40px;
            text-align: center;
        `;
        
        errorScreen.innerHTML = `
            <div style="color: #e74c3c; font-size: 48px; margin-bottom: 20px;">❌</div>
            <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 24px;">${title}</h2>
            <p style="color: #666; margin-bottom: 30px; max-width: 500px; line-height: 1.5;">${message}</p>
            <div class="error-actions">
                ${allowRetry ? '<button onclick="location.reload()" style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-right: 10px;">Retry</button>' : ''}
                <button onclick="window.history.back()" style="padding: 12px 24px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Go Back</button>
            </div>
        `;
        
        return errorScreen;
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            // Don't show error for network failures in admin context
            if (window.location.pathname.includes('/admin/')) {
                event.preventDefault();
            }
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            
            // Show error for critical failures
            if (event.error?.message?.includes('ChunkLoadError') || 
                event.error?.message?.includes('Loading chunk')) {
                this.showError(
                    'Application Update Available',
                    'The application has been updated. Please refresh the page to continue.',
                    true
                );
            }
        });
    }

    /**
     * Setup loading UI
     */
    setupLoadingUI() {
        // Remove existing loading screen if admin is already authenticated
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (window.AuthManager?.isAuthenticated() || window.ClientAuth?.isAuthenticated()) {
                    this.hideLoading();
                }
            }, 1000);
        });
    }

    /**
     * Check if dependency is loaded
     */
    isDependencyLoaded(name) {
        const state = this.loadingStates.get(name);
        return state === 'loaded' || state === 'fallback';
    }

    /**
     * Get loading status
     */
    getLoadingStatus() {
        return {
            states: Object.fromEntries(this.loadingStates),
            totalDependencies: this.loadingStates.size,
            loadedCount: Array.from(this.loadingStates.values()).filter(s => s === 'loaded' || s === 'fallback').length,
            failedCount: Array.from(this.loadingStates.values()).filter(s => s === 'failed').length
        };
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear all loading states
     */
    reset() {
        this.loadingStates.clear();
        this.dependencies.clear();
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts.clear();
        
        this.hideLoading();
        
        const errorScreen = document.getElementById('error-screen');
        if (errorScreen) {
            errorScreen.remove();
        }
    }
}

// Create global instance
window.LoadingManager = new LoadingManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
}