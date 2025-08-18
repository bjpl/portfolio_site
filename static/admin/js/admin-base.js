/**
 * Admin Base Functionality
 * Common initialization for all admin pages
 */

class AdminBase {
    constructor() {
        this.init();
    }

    async init() {
        // Load required scripts in order
        await this.loadDependencies();
        
        // Initialize authentication
        if (window.AuthManager) {
            AuthManager.init();
        }

        // Initialize API configuration
        if (window.APIConfig) {
            await APIConfig.init();
        }

        // Set up common event handlers
        this.setupEventHandlers();

        // Apply saved theme
        this.applyTheme();

        // Initialize page-specific functionality
        this.initializePage();
    }

    async loadDependencies() {
        // Scripts that should be loaded on every admin page
        const scripts = [
            '/admin/js/auth-manager.js',
            '/admin/js/api-config.js',
            '/admin/js/utils.js',
            '/admin/js/logger.js',
            '/admin/js/modal-dialog.js',
            '/admin/js/toast.js'
        ];

        // Load scripts that aren't already loaded
        for (const src of scripts) {
            if (!document.querySelector(`script[src="${src}"]`)) {
                await this.loadScript(src);
            }
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupEventHandlers() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (window.Utils) {
                    Utils.toggleDarkMode();
                }
            });
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput && window.Utils) {
            searchInput.addEventListener('input', 
                Utils.debounce((e) => this.handleSearch(e.target.value), 300)
            );
        }

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.querySelector('.admin-sidebar')?.classList.toggle('open');
            });
        }
    }

    async handleLogout() {
        const confirmed = window.Modal ? 
            await Modal.confirm('Are you sure you want to logout?') :
            confirm('Are you sure you want to logout?');

        if (confirmed) {
            if (window.AuthManager) {
                AuthManager.logout();
            }
            window.location.href = '/admin/login.html';
        }
    }

    handleSearch(query) {
        // Override in specific pages
        console.log('Search:', query);
    }

    applyTheme() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    initializePage() {
        // Get page name from URL
        const path = window.location.pathname;
        const pageName = path.split('/').pop().replace('.html', '');

        // Call page-specific initialization
        switch(pageName) {
            case 'dashboard':
                this.initDashboard();
                break;
            case 'content-editor':
                this.initContentEditor();
                break;
            case 'file-manager':
                this.initFileManager();
                break;
            case 'analytics':
                this.initAnalytics();
                break;
            // Add more pages as needed
        }

        // Log page load
        if (window.Log) {
            Log.info(`Admin page loaded: ${pageName}`);
        }
    }

    // Page-specific initialization methods (override in specific pages)
    initDashboard() {
        // Dashboard specific code
    }

    initContentEditor() {
        // Content editor specific code
    }

    initFileManager() {
        // File manager specific code
    }

    initAnalytics() {
        // Analytics specific code
    }

    // Utility method to load data with error handling
    async loadData(endpoint, container) {
        if (!container) return;

        try {
            if (window.Utils) {
                Utils.showLoading(container);
            }

            const response = await fetch(APIConfig.buildURL(endpoint), {
                headers: {
                    'Authorization': `Bearer ${AuthManager.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            if (window.Utils) {
                Utils.showError(container, Utils.handleError(error));
            }
            return null;
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adminBase = new AdminBase();
    });
} else {
    window.adminBase = new AdminBase();
}