/**
 * Admin Panel Initialization Script
 * Ensures all dependencies are loaded in correct order
 */

(function() {
    'use strict';

    // Check if running in admin context
    if (!window.location.pathname.includes('/admin/')) {
        return;
    }

    // Define load order for scripts
    const scriptsToLoad = [
        '/admin/js/logger.js',
        '/admin/js/modal-dialog.js',
        '/admin/js/toast.js',
        '/admin/api-client.js',
        '/admin/utils/auth-check.js'
    ];

    // Track loaded scripts
    const loadedScripts = new Set();

    /**
     * Load a script dynamically
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (loadedScripts.has(src)) {
                resolve();
                return;
            }

            // Check if script element already exists
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                loadedScripts.add(src);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            
            script.onload = () => {
                loadedScripts.add(src);
                resolve();
            };
            
            script.onerror = () => {
                console.error(`Failed to load script: ${src}`);
                reject(new Error(`Failed to load ${src}`));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize admin panel
     */
    async function initializeAdmin() {
        try {
            // Load core scripts in sequence
            for (const script of scriptsToLoad) {
                await loadScript(script);
            }

            // Initialize logger if available
            if (window.Log) {
                window.Log.info('Admin panel initialized');
            }

            // Check authentication
            if (window.checkAuth && typeof window.checkAuth === 'function') {
                const isAuthenticated = await window.checkAuth();
                if (!isAuthenticated && !window.location.pathname.includes('/login')) {
                    window.location.href = '/admin/login.html';
                    return;
                }
            }

            // Initialize API client WebSocket if authenticated
            if (window.apiClient && window.apiClient.token) {
                window.apiClient.initWebSocket();
            }

            // Set up global error handler
            window.addEventListener('error', function(event) {
                if (window.Log) {
                    window.Log.error('Uncaught error', {
                        message: event.message,
                        filename: event.filename,
                        line: event.lineno,
                        column: event.colno,
                        error: event.error
                    });
                }
            });

            // Set up unhandled promise rejection handler
            window.addEventListener('unhandledrejection', function(event) {
                if (window.Log) {
                    window.Log.error('Unhandled promise rejection', {
                        reason: event.reason
                    });
                }
            });

            // Initialize page-specific functionality
            initializePageFeatures();

        } catch (error) {
            console.error('Failed to initialize admin panel:', error);
            
            // Show fallback error message
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 15px; border-radius: 4px; z-index: 9999;';
            errorDiv.textContent = 'Failed to load admin panel. Please refresh the page.';
            document.body.appendChild(errorDiv);
        }
    }

    /**
     * Initialize page-specific features
     */
    function initializePageFeatures() {
        const path = window.location.pathname;

        // Dashboard specific
        if (path.includes('dashboard.html') || path.includes('index.html')) {
            initializeDashboard();
        }

        // Content editor specific
        if (path.includes('content-editor.html')) {
            initializeContentEditor();
        }

        // File manager specific
        if (path.includes('file-manager.html')) {
            initializeFileManager();
        }

        // Image optimizer specific
        if (path.includes('image-optimizer.html')) {
            initializeImageOptimizer();
        }

        // Analytics specific
        if (path.includes('analytics.html')) {
            initializeAnalytics();
        }

        // Initialize common features
        initializeCommonFeatures();
    }

    /**
     * Initialize dashboard features
     */
    function initializeDashboard() {
        if (window.Log) {
            window.Log.debug('Initializing dashboard features');
        }

        // Load dashboard data
        if (window.loadDashboardData && typeof window.loadDashboardData === 'function') {
            window.loadDashboardData();
        }

        // Initialize charts
        if (window.initializeCharts && typeof window.initializeCharts === 'function') {
            window.initializeCharts();
        }
    }

    /**
     * Initialize content editor
     */
    function initializeContentEditor() {
        if (window.Log) {
            window.Log.debug('Initializing content editor');
        }

        // Initialize auto-save
        if (window.initializeAutoSave && typeof window.initializeAutoSave === 'function') {
            window.initializeAutoSave();
        }

        // Initialize markdown preview
        if (window.initializeMarkdownPreview && typeof window.initializeMarkdownPreview === 'function') {
            window.initializeMarkdownPreview();
        }
    }

    /**
     * Initialize file manager
     */
    function initializeFileManager() {
        if (window.Log) {
            window.Log.debug('Initializing file manager');
        }

        // Set up drag and drop
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                
                const files = Array.from(e.dataTransfer.files);
                if (window.handleFileUpload && typeof window.handleFileUpload === 'function') {
                    window.handleFileUpload(files);
                }
            });
        }
    }

    /**
     * Initialize image optimizer
     */
    function initializeImageOptimizer() {
        if (window.Log) {
            window.Log.debug('Initializing image optimizer');
        }

        // Set up image preview
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && window.previewImage && typeof window.previewImage === 'function') {
                    window.previewImage(file);
                }
            });
        }
    }

    /**
     * Initialize analytics
     */
    function initializeAnalytics() {
        if (window.Log) {
            window.Log.debug('Initializing analytics');
        }

        // Load analytics data
        if (window.loadAnalyticsData && typeof window.loadAnalyticsData === 'function') {
            window.loadAnalyticsData();
        }
    }

    /**
     * Initialize common features across all pages
     */
    function initializeCommonFeatures() {
        // Set up logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (window.Modal) {
                    const confirmed = await window.Modal.confirm(
                        'Are you sure you want to logout?',
                        { title: 'Logout', confirmText: 'Logout' }
                    );
                    
                    if (confirmed && window.apiClient) {
                        await window.apiClient.logout();
                        window.location.href = '/admin/login.html';
                    }
                } else if (confirm('Are you sure you want to logout?')) {
                    if (window.apiClient) {
                        await window.apiClient.logout();
                    }
                    window.location.href = '/admin/login.html';
                }
            });
        }

        // Set up search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (window.performSearch && typeof window.performSearch === 'function') {
                        window.performSearch(e.target.value);
                    }
                }, 300); // Debounce
            });
        }

        // Set up notification icon
        const notificationIcon = document.querySelector('.notification-icon');
        if (notificationIcon) {
            notificationIcon.addEventListener('click', () => {
                if (window.toggleNotifications && typeof window.toggleNotifications === 'function') {
                    window.toggleNotifications();
                }
            });
        }

        // Set up theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
            });
        }

        // Apply saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // Set up keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (window.saveCurrentWork && typeof window.saveCurrentWork === 'function') {
                    window.saveCurrentWork();
                }
            }

            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // ESC to close modals
            if (e.key === 'Escape') {
                if (window.Modal && window.Modal.activeModal) {
                    window.Modal.closeModal();
                }
            }
        });

        // Initialize tooltips
        const tooltips = document.querySelectorAll('[data-tooltip]');
        tooltips.forEach(element => {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
        });
    }

    /**
     * Show tooltip
     */
    function showTooltip(e) {
        const text = e.target.getAttribute('data-tooltip');
        if (!text) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
        `;

        document.body.appendChild(tooltip);

        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.bottom + 5 + 'px';

        e.target._tooltip = tooltip;
    }

    /**
     * Hide tooltip
     */
    function hideTooltip(e) {
        if (e.target._tooltip) {
            e.target._tooltip.remove();
            delete e.target._tooltip;
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAdmin);
    } else {
        initializeAdmin();
    }

})();