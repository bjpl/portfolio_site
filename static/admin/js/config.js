/**
 * Admin Panel Configuration
 * Central configuration for all admin panel settings
 */

const AdminConfig = {
    // API Configuration
    api: {
        baseUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : window.location.origin,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    },
    
    // WebSocket Configuration
    websocket: {
        url: window.location.hostname === 'localhost'
            ? 'ws://localhost:3000'
            : `wss://${window.location.host}`,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
    },
    
    // Authentication
    auth: {
        tokenKey: 'token',
        userKey: 'user',
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        refreshThreshold: 60 * 60 * 1000 // Refresh if less than 1 hour left
    },
    
    // File Upload
    upload: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        allowedDocTypes: ['application/pdf', 'text/markdown', 'text/plain'],
        chunkSize: 1024 * 1024 // 1MB chunks for large files
    },
    
    // UI Settings
    ui: {
        toastDuration: 3000,
        animationSpeed: 300,
        debounceDelay: 500,
        itemsPerPage: 20,
        maxRecentItems: 10
    },
    
    // Build & Deploy
    build: {
        pollInterval: 1000,
        defaultEnvironment: 'production',
        defaultCommand: 'hugo',
        outputPath: 'public'
    },
    
    // Feature Flags
    features: {
        enableWebSocket: true,
        enableAutoSave: true,
        enableDarkMode: false,
        enableAnalytics: true,
        enableAIContent: true,
        enableBackup: true
    },
    
    // Storage Keys
    storage: {
        theme: 'admin_theme',
        sidebar: 'admin_sidebar_state',
        recentFiles: 'admin_recent_files',
        editorSettings: 'admin_editor_settings',
        buildHistory: 'admin_build_history'
    }
};

// Helper function to get API URL
function getApiUrl(endpoint) {
    const baseUrl = AdminConfig.api.baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}/api${cleanEndpoint}`;
}

// Helper function to get WebSocket URL
function getWebSocketUrl(channel) {
    const baseUrl = AdminConfig.websocket.url;
    const cleanChannel = channel ? `/${channel}` : '';
    return `${baseUrl}${cleanChannel}`;
}

// Helper function for authenticated fetch
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem(AdminConfig.auth.tokenKey);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        const response = await fetch(getApiUrl(endpoint), mergedOptions);
        
        if (response.status === 401) {
            // Token expired, redirect to login
            localStorage.clear();
            window.location.href = '/admin/login.html';
            return;
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Helper function for form validation
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
            
            // Add error message if not exists
            if (!input.nextElementSibling?.classList.contains('error-message')) {
                const errorMsg = document.createElement('span');
                errorMsg.className = 'error-message';
                errorMsg.textContent = `${input.name || 'This field'} is required`;
                errorMsg.style.cssText = 'color: red; font-size: 12px; display: block; margin-top: 4px;';
                input.parentNode.insertBefore(errorMsg, input.nextSibling);
            }
        } else {
            input.classList.remove('error');
            const errorMsg = input.nextElementSibling;
            if (errorMsg?.classList.contains('error-message')) {
                errorMsg.remove();
            }
        }
    });
    
    return isValid;
}

// Helper function for debouncing
function debounce(func, wait = AdminConfig.ui.debounceDelay) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Helper function for throttling
function throttle(func, limit = 1000) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AdminConfig,
        getApiUrl,
        getWebSocketUrl,
        apiFetch,
        validateForm,
        debounce,
        throttle
    };
}