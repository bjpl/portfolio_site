/**
 * Authentication Guard
 * Protects admin pages and handles authentication redirects
 */

class AuthGuard {
    constructor() {
        this.initialized = false;
        this.checkInterval = null;
    }

    /**
     * Initialize auth guard
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Wait for unified auth manager
            if (!window.UnifiedAuthManager.initialized) {
                await window.UnifiedAuthManager.init();
            }
            
            // Set up auth checking
            this.setupAuthCheck();
            this.setupPeriodicCheck();
            
            this.initialized = true;
            console.log('🛡️ Auth Guard initialized');
            
        } catch (error) {
            console.error('❌ Auth Guard initialization failed:', error);
        }
    }

    /**
     * Set up authentication checking
     */
    setupAuthCheck() {
        // Check auth on page load
        this.checkAuthentication();
        
        // Check auth when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkAuthentication();
            }
        });
        
        // Listen for storage changes (multi-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.includes('auth_') || e.key === 'token')) {
                setTimeout(() => this.checkAuthentication(), 100);
            }
        });
    }

    /**
     * Set up periodic authentication checking
     */
    setupPeriodicCheck() {
        // Check every 30 seconds
        this.checkInterval = setInterval(() => {
            this.checkAuthentication();
        }, 30000);
    }

    /**
     * Check if user is authenticated
     */
    checkAuthentication() {
        // Skip check on login page
        if (window.location.pathname.includes('/login.html')) {
            return true;
        }
        
        // Skip check if not in admin area
        if (!window.location.pathname.includes('/admin/')) {
            return true;
        }
        
        try {
            // Check authentication
            if (!window.UnifiedAuthManager.isAuthenticated()) {
                console.log('🚫 Authentication required, redirecting to login');
                this.redirectToLogin();
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Auth check error:', error);
            this.redirectToLogin();
            return false;
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        const currentUrl = window.location.pathname + window.location.search;
        const loginUrl = `/admin/login.html?returnTo=${encodeURIComponent(currentUrl)}`;
        
        // Prevent infinite redirects
        if (window.location.pathname !== '/admin/login.html') {
            window.location.href = loginUrl;
        }
    }

    /**
     * Require authentication for current page
     */
    requireAuth() {
        return this.checkAuthentication();
    }

    /**
     * Require specific role
     */
    requireRole(role) {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!window.UnifiedAuthManager.hasRole(role)) {
            console.log(`🚫 Role ${role} required, access denied`);
            this.showAccessDenied();
            return false;
        }
        
        return true;
    }

    /**
     * Show access denied message
     */
    showAccessDenied() {
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <h1 style="color: #e74c3c; margin-bottom: 1rem;">🚫 Access Denied</h1>
                <p style="color: #666; margin-bottom: 2rem;">You don't have permission to access this page.</p>
                <div>
                    <button onclick="window.history.back()" style="
                        padding: 0.75rem 1.5rem;
                        margin: 0.5rem;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Go Back</button>
                    <button onclick="window.location.href='/admin/dashboard.html'" style="
                        padding: 0.75rem 1.5rem;
                        margin: 0.5rem;
                        background: #95a5a6;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Dashboard</button>
                </div>
            </div>
        `;
    }

    /**
     * Destroy auth guard
     */
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.initialized = false;
    }
}

// Create global instance
window.AuthGuard = new AuthGuard();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AuthGuard.init();
    });
} else {
    window.AuthGuard.init();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthGuard;
}