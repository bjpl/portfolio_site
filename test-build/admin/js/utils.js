/**
 * Shared Utilities
 * Common functions used across admin pages
 */

const Utils = {
    // Format date for display
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Debounce function for search inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show loading state
    showLoading(element, message = 'Loading...') {
        if (!element) return;
        
        element.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    },

    // Show empty state
    showEmpty(element, message = 'No data available') {
        if (!element) return;
        
        element.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `;
    },

    // Show error state
    showError(element, message = 'An error occurred') {
        if (!element) return;
        
        element.innerHTML = `
            <div class="error-state">
                <p>❌ ${message}</p>
            </div>
        `;
    },

    // Handle API errors consistently
    handleError(error) {
        const message = error.message || 'An unexpected error occurred';
        
        // Log error
        if (window.Log) {
            window.Log.error(message, error);
        } else {
            console.error(message, error);
        }

        // Show toast if available
        if (window.Toast) {
            window.Toast.error(message);
        }

        return message;
    },

    // Safe JSON parse
    parseJSON(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    },

    // Get query parameter
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    // Update query parameter
    updateQueryParam(param, value) {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(param, value);
        } else {
            url.searchParams.delete(param);
        }
        window.history.pushState({}, '', url);
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            if (window.Toast) {
                window.Toast.success('Copied to clipboard!');
            }
            return true;
        } catch (err) {
            if (window.Toast) {
                window.Toast.error('Failed to copy');
            }
            return false;
        }
    },

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Sanitize HTML to prevent XSS
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Check if dark mode is enabled
    isDarkMode() {
        return document.body.classList.contains('dark-theme') || 
               localStorage.getItem('theme') === 'dark';
    },

    // Toggle dark mode
    toggleDarkMode() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        if (window.Toast) {
            window.Toast.info(`${isDark ? 'Dark' : 'Light'} mode enabled`);
        }
    }
};

// Make available globally
window.Utils = Utils;