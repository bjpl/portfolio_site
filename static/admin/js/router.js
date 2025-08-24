/**
 * Admin Panel Router
 * Handles client-side routing and navigation for admin panel
 */

class AdminRouter {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.setupDefaultRoutes();
        this.setupNavigationHandlers();
        this.setupAuthGuards();
    }

    /**
     * Setup default admin routes
     */
    setupDefaultRoutes() {
        this.addRoute('dashboard', {
            path: '/admin/dashboard.html',
            title: 'Dashboard',
            auth: true,
            permissions: []
        });

        this.addRoute('login', {
            path: '/admin/login.html',
            title: 'Login',
            auth: false,
            permissions: []
        });

        this.addRoute('analytics', {
            path: '/admin/analytics.html',
            title: 'Analytics',
            auth: true,
            permissions: ['view_analytics']
        });

        this.addRoute('media', {
            path: '/admin/media-dashboard.html',
            title: 'Media Library',
            auth: true,
            permissions: ['manage_media']
        });

        this.addRoute('users', {
            path: '/admin/user-management.html',
            title: 'User Management',
            auth: true,
            permissions: ['admin']
        });

        this.addRoute('settings', {
            path: '/admin/settings.html',
            title: 'Settings',
            auth: true,
            permissions: ['super_admin']
        });

        this.addRoute('content', {
            path: '/admin/enhanced-simple-editor.html',
            title: 'Content Editor',
            auth: true,
            permissions: ['edit_content']
        });
    }

    /**
     * Add a new route
     */
    addRoute(name, config) {
        this.routes.set(name, {
            name,
            ...config,
            // Normalize path
            path: config.path.startsWith('/') ? config.path : '/' + config.path
        });
    }

    /**
     * Get route by name or path
     */
    getRoute(identifier) {
        // Try by name first
        if (this.routes.has(identifier)) {
            return this.routes.get(identifier);
        }

        // Try by path
        for (const [name, route] of this.routes) {
            if (route.path === identifier || route.path.includes(identifier)) {
                return route;
            }
        }

        return null;
    }

    /**
     * Navigate to route
     */
    async navigate(routeName, options = {}) {
        const route = this.getRoute(routeName);
        
        if (!route) {
            console.error(`Route not found: ${routeName}`);
            return false;
        }

        // Check authentication
        if (route.auth && !this.isAuthenticated()) {
            console.log('Authentication required, redirecting to login');
            this.navigate('login', { 
                returnTo: encodeURIComponent(route.path) 
            });
            return false;
        }

        // Check permissions
        if (route.permissions.length > 0 && !this.hasPermissions(route.permissions)) {
            console.warn('Insufficient permissions for route:', routeName);
            this.showUnauthorizedMessage();
            return false;
        }

        // Navigate
        try {
            const url = this.buildUrl(route.path, options.params);
            
            if (options.replace) {
                window.location.replace(url);
            } else {
                window.location.href = url;
            }
            
            this.currentRoute = route;
            return true;
        } catch (error) {
            console.error('Navigation failed:', error);
            return false;
        }
    }

    /**
     * Build URL with parameters
     */
    buildUrl(path, params = {}) {
        const url = new URL(path, window.location.origin);
        
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, params[key]);
        });
        
        return url.toString();
    }

    /**
     * Get current route info
     */
    getCurrentRoute() {
        const currentPath = window.location.pathname;
        
        // Try to find matching route
        for (const [name, route] of this.routes) {
            if (currentPath.includes(route.path.replace('.html', ''))) {
                return route;
            }
        }

        return {
            name: 'unknown',
            path: currentPath,
            title: 'Unknown Page',
            auth: true,
            permissions: []
        };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        // Check multiple auth sources
        if (window.AuthManager && typeof window.AuthManager.isAuthenticated === 'function') {
            return window.AuthManager.isAuthenticated();
        }
        
        if (window.authService && typeof window.authService.isAuthenticated === 'function') {
            return window.authService.isAuthenticated();
        }
        
        if (window.ClientAuth && typeof window.ClientAuth.isAuthenticated === 'function') {
            return window.ClientAuth.isAuthenticated();
        }

        // Fallback token check
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        return token && token !== 'null' && token !== 'undefined';
    }

    /**
     * Check if user has required permissions
     */
    hasPermissions(requiredPermissions) {
        if (requiredPermissions.length === 0) {
            return true;
        }

        // Get user info from auth systems
        let userInfo = null;

        if (window.AuthManager && typeof window.AuthManager.getUserInfo === 'function') {
            userInfo = window.AuthManager.getUserInfo();
        } else if (window.authService && typeof window.authService.getCurrentUser === 'function') {
            userInfo = window.authService.getCurrentUser();
        } else if (window.ClientAuth && typeof window.ClientAuth.getCurrentUser === 'function') {
            userInfo = window.ClientAuth.getCurrentUser();
        }

        if (!userInfo) {
            return false;
        }

        // Check role-based permissions
        const userRole = userInfo.role || 'user';
        const userPermissions = userInfo.permissions || [];

        // Admin and super_admin have all permissions
        if (userRole === 'admin' || userRole === 'super_admin') {
            return true;
        }

        // Check specific permissions
        return requiredPermissions.every(permission => 
            userPermissions.includes(permission) || 
            permission === userRole
        );
    }

    /**
     * Setup navigation event handlers
     */
    setupNavigationHandlers() {
        // Handle navigation menu clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const routeName = link.dataset.route;
                const params = link.dataset.params ? JSON.parse(link.dataset.params) : {};
                this.navigate(routeName, { params });
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.currentRoute = this.getCurrentRoute();
            this.updateNavigationState();
        });

        // Initialize current route
        this.currentRoute = this.getCurrentRoute();
        this.updateNavigationState();
    }

    /**
     * Setup authentication guards
     */
    setupAuthGuards() {
        // Run auth check on page load
        document.addEventListener('DOMContentLoaded', () => {
            const currentRoute = this.getCurrentRoute();
            
            // Skip auth check for login page
            if (currentRoute.name === 'login' || currentRoute.path.includes('login')) {
                return;
            }

            // Check if auth is required
            if (currentRoute.auth && !this.isAuthenticated()) {
                console.log('User not authenticated, redirecting to login');
                this.navigate('login', { 
                    params: { returnTo: encodeURIComponent(window.location.pathname) }
                });
                return;
            }

            // Check permissions
            if (currentRoute.permissions.length > 0 && !this.hasPermissions(currentRoute.permissions)) {
                this.showUnauthorizedMessage();
                return;
            }
        });
    }

    /**
     * Update navigation state (active links, breadcrumbs)
     */
    updateNavigationState() {
        const currentPath = window.location.pathname;

        // Update active navigation links
        document.querySelectorAll('.nav-item a').forEach(link => {
            link.classList.remove('active');
            
            if (link.href && currentPath.includes(link.pathname)) {
                link.classList.add('active');
            }
        });

        // Update page title
        if (this.currentRoute && this.currentRoute.title) {
            document.title = `${this.currentRoute.title} - Admin Panel`;
        }

        // Update breadcrumb
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb && this.currentRoute) {
            breadcrumb.textContent = `/ ${this.currentRoute.title}`;
        }
    }

    /**
     * Show unauthorized message
     */
    showUnauthorizedMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000; text-align: center; font-family: -apple-system, sans-serif;
        `;
        message.innerHTML = `
            <h2 style="color: #e74c3c; margin-bottom: 15px;">🚫 Access Denied</h2>
            <p style="color: #666; margin-bottom: 20px;">You don't have permission to access this page.</p>
            <button onclick="this.parentElement.remove(); window.history.back();" 
                    style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Go Back
            </button>
        `;
        document.body.appendChild(message);
    }

    /**
     * Get all routes
     */
    getAllRoutes() {
        return Array.from(this.routes.values());
    }

    /**
     * Get available routes for current user
     */
    getAvailableRoutes() {
        return this.getAllRoutes().filter(route => {
            if (route.auth && !this.isAuthenticated()) {
                return false;
            }
            
            if (route.permissions.length > 0 && !this.hasPermissions(route.permissions)) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Generate navigation menu
     */
    generateNavigationMenu() {
        const availableRoutes = this.getAvailableRoutes()
            .filter(route => route.name !== 'login') // Exclude login from menu
            .sort((a, b) => a.title.localeCompare(b.title));

        return availableRoutes.map(route => ({
            name: route.name,
            title: route.title,
            path: route.path,
            active: this.currentRoute && this.currentRoute.name === route.name
        }));
    }

    /**
     * Get debugging information
     */
    getDebugInfo() {
        return {
            currentRoute: this.currentRoute,
            totalRoutes: this.routes.size,
            availableRoutes: this.getAvailableRoutes().length,
            isAuthenticated: this.isAuthenticated(),
            currentPath: window.location.pathname,
            routes: Object.fromEntries(this.routes)
        };
    }
}

// Create global router instance
window.adminRouter = new AdminRouter();

// Auto-initialize router
document.addEventListener('DOMContentLoaded', () => {
    console.log('🗺️ Admin router initialized');
    
    // Add debug info to console in development
    if (window.location.hostname === 'localhost') {
        console.log('Router debug info:', window.adminRouter.getDebugInfo());
    }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminRouter;
}