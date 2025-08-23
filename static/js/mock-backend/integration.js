/**
 * Mock Backend Integration
 * Integrates the mock backend with the existing admin system
 * Provides seamless fallback and compatibility layer
 */

(function() {
    'use strict';

    // Check if mock backend is available
    if (!window.mockBackendClient) {
        console.warn('[Integration] Mock backend client not available');
        return;
    }

    const mockClient = window.mockBackendClient;
    let isIntegrated = false;

    // Integration configuration
    const config = {
        autoEnable: true,
        fallbackToMock: true,
        syncOnReconnect: true,
        enableOfflineMode: true,
        debug: true
    };

    // Initialize integration
    async function initIntegration() {
        if (isIntegrated) return true;

        try {
            // Initialize mock backend
            const success = await mockClient.initialize({
                debug: config.debug,
                enableWebSocket: true,
                enableSync: true,
                autoRegister: true
            });

            if (!success) {
                console.error('[Integration] Failed to initialize mock backend');
                return false;
            }

            // Set up integration
            setupAPIInterception();
            setupEventForwarding();
            setupOfflineHandling();
            
            isIntegrated = true;
            console.log('[Integration] Mock backend integration complete');
            
            // Emit custom event
            window.dispatchEvent(new CustomEvent('mock-backend-integrated', {
                detail: { timestamp: new Date().toISOString() }
            }));

            return true;

        } catch (error) {
            console.error('[Integration] Integration failed:', error);
            return false;
        }
    }

    // Intercept existing API calls and route to mock backend when needed
    function setupAPIInterception() {
        // Store original fetch
        const originalFetch = window.fetch;

        // Override fetch to intercept API calls
        window.fetch = async function(input, init = {}) {
            const url = typeof input === 'string' ? input : input.url;
            
            // Check if this is an API call
            if (url.startsWith('/api/') || url.includes('/api/')) {
                
                // Check if real backend is available
                const isRealBackendAvailable = await checkRealBackend();
                
                if (!isRealBackendAvailable && config.fallbackToMock) {
                    console.log('[Integration] Routing to mock backend:', url);
                    return handleMockRequest(url, init);
                }
            }

            // Use original fetch for non-API calls or when real backend is available
            return originalFetch.call(this, input, init);
        };
    }

    // Handle requests through mock backend
    async function handleMockRequest(url, init) {
        try {
            const method = init.method || 'GET';
            const path = url.replace('/api', '').replace(window.location.origin, '');
            
            let response;
            
            switch (method.toLowerCase()) {
                case 'get':
                    response = await mockClient.makeRequest(path, { method: 'GET' });
                    break;
                    
                case 'post':
                    response = await mockClient.makeRequest(path, {
                        method: 'POST',
                        body: init.body
                    });
                    break;
                    
                case 'put':
                    response = await mockClient.makeRequest(path, {
                        method: 'PUT',
                        body: init.body
                    });
                    break;
                    
                case 'delete':
                    response = await mockClient.makeRequest(path, { method: 'DELETE' });
                    break;
                    
                default:
                    response = await mockClient.makeRequest(path, init);
            }

            return response;

        } catch (error) {
            console.error('[Integration] Mock request failed:', error);
            // Return error response
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // Check if real backend is available
    async function checkRealBackend() {
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                cache: 'no-cache',
                timeout: 3000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Forward mock backend events to existing systems
    function setupEventForwarding() {
        // Authentication events
        mockClient.on('login-success', (data) => {
            // Update existing auth state
            if (window.authManager) {
                window.authManager.handleLoginSuccess(data);
            }
            
            // Emit custom event for other systems
            window.dispatchEvent(new CustomEvent('auth-login-success', {
                detail: data
            }));
        });

        mockClient.on('logout-success', () => {
            // Update existing auth state
            if (window.authManager) {
                window.authManager.handleLogout();
            }
            
            // Emit custom event
            window.dispatchEvent(new CustomEvent('auth-logout-success'));
        });

        mockClient.on('authentication-changed', (data) => {
            // Update UI state
            updateAuthenticationUI(data);
            
            // Forward to existing systems
            if (window.updateAuthUI) {
                window.updateAuthUI(data.isAuthenticated, data.user);
            }
        });

        // Network events
        mockClient.on('network-status-changed', (data) => {
            updateNetworkStatus(data.isOnline);
            
            // Show/hide offline indicators
            toggleOfflineMode(!data.isOnline);
        });

        // Sync events
        mockClient.on('sync-completed', (data) => {
            showNotification('Sync completed successfully', 'success');
        });

        mockClient.on('sync-error', (data) => {
            showNotification(`Sync failed: ${data.error}`, 'error');
        });
    }

    // Setup offline mode handling
    function setupOfflineHandling() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('[Integration] Back online - syncing data');
            if (config.syncOnReconnect) {
                mockClient.manualSync().catch(console.error);
            }
            updateNetworkStatus(true);
        });

        window.addEventListener('offline', () => {
            console.log('[Integration] Gone offline - enabling offline mode');
            updateNetworkStatus(false);
        });

        // Periodic sync when online
        if (config.syncOnReconnect) {
            setInterval(async () => {
                if (navigator.onLine) {
                    try {
                        await mockClient.manualSync();
                    } catch (error) {
                        console.warn('[Integration] Background sync failed:', error);
                    }
                }
            }, 5 * 60 * 1000); // Every 5 minutes
        }
    }

    // Update authentication UI
    function updateAuthenticationUI(data) {
        const authElements = document.querySelectorAll('[data-auth-state]');
        
        authElements.forEach(element => {
            const state = element.dataset.authState;
            
            if (state === 'authenticated') {
                element.style.display = data.isAuthenticated ? 'block' : 'none';
            } else if (state === 'unauthenticated') {
                element.style.display = data.isAuthenticated ? 'none' : 'block';
            }
        });

        // Update user info displays
        const userElements = document.querySelectorAll('[data-user-field]');
        userElements.forEach(element => {
            const field = element.dataset.userField;
            if (data.user && data.user[field]) {
                element.textContent = data.user[field];
            }
        });
    }

    // Update network status indicators
    function updateNetworkStatus(isOnline) {
        const statusElements = document.querySelectorAll('[data-network-status]');
        
        statusElements.forEach(element => {
            element.className = element.className.replace(/\b(online|offline)\b/g, '');
            element.classList.add(isOnline ? 'online' : 'offline');
            
            if (element.dataset.networkStatus === 'text') {
                element.textContent = isOnline ? 'Online' : 'Offline';
            }
        });

        // Update document class
        document.documentElement.classList.toggle('network-offline', !isOnline);
        document.documentElement.classList.toggle('network-online', isOnline);
    }

    // Toggle offline mode UI
    function toggleOfflineMode(isOffline) {
        const offlineElements = document.querySelectorAll('[data-offline-mode]');
        
        offlineElements.forEach(element => {
            const mode = element.dataset.offlineMode;
            
            if (mode === 'show') {
                element.style.display = isOffline ? 'block' : 'none';
            } else if (mode === 'hide') {
                element.style.display = isOffline ? 'none' : 'block';
            }
        });

        // Show offline banner
        if (isOffline && config.enableOfflineMode) {
            showOfflineBanner();
        } else {
            hideOfflineBanner();
        }
    }

    // Show offline notification banner
    function showOfflineBanner() {
        let banner = document.getElementById('offline-banner');
        
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.className = 'offline-banner';
            banner.innerHTML = `
                <div class="offline-banner-content">
                    <span class="offline-icon">📡</span>
                    <span class="offline-text">You're offline. Changes will sync when connection is restored.</span>
                    <button class="offline-dismiss" onclick="this.parentElement.parentElement.style.display='none'">&times;</button>
                </div>
            `;
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .offline-banner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: #ff9800;
                    color: white;
                    z-index: 10000;
                    padding: 10px;
                    text-align: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                .offline-banner-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .offline-icon {
                    margin-right: 10px;
                }
                .offline-dismiss {
                    margin-left: 15px;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }
            `;
            document.head.appendChild(style);
            document.body.prepend(banner);
        }
        
        banner.style.display = 'block';
    }

    // Hide offline banner
    function hideOfflineBanner() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }

    // Show notification (integrate with existing notification system)
    function showNotification(message, type = 'info') {
        // Try to use existing notification system
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Public API for integration
    window.mockBackendIntegration = {
        // Initialize integration
        init: initIntegration,
        
        // Configuration
        configure: (newConfig) => {
            Object.assign(config, newConfig);
        },
        
        // Status
        isIntegrated: () => isIntegrated,
        isOnline: () => navigator.onLine,
        
        // Manual operations
        sync: () => mockClient.manualSync(),
        checkBackend: checkRealBackend,
        
        // Mock backend access
        getMockClient: () => mockClient,
        
        // Utilities
        showOfflineBanner,
        hideOfflineBanner,
        updateNetworkStatus
    };

    // Enhanced API client with mock backend support
    window.createEnhancedAPIClient = function() {
        return {
            // Standard API methods with mock backend fallback
            async get(endpoint) {
                return mockClient.makeRequest(endpoint, { method: 'GET' });
            },
            
            async post(endpoint, data) {
                return mockClient.makeRequest(endpoint, {
                    method: 'POST',
                    body: data
                });
            },
            
            async put(endpoint, data) {
                return mockClient.makeRequest(endpoint, {
                    method: 'PUT',
                    body: data
                });
            },
            
            async delete(endpoint) {
                return mockClient.makeRequest(endpoint, { method: 'DELETE' });
            },

            // Authentication
            async login(email, password) {
                return mockClient.login(email, password);
            },
            
            async logout() {
                return mockClient.logout();
            },
            
            async getCurrentUser() {
                return mockClient.makeRequest('/auth/me');
            },

            // Content management
            async getContent(path) {
                return mockClient.getContent(path);
            },
            
            async createContent(data) {
                return mockClient.createContent(data);
            },
            
            async updateContent(path, data) {
                return mockClient.updateContent(path, data);
            },
            
            // File management
            async uploadFile(file, path) {
                return mockClient.uploadFile(file, path);
            },
            
            async getFiles(path) {
                return mockClient.getFiles(path);
            },

            // Settings
            async getSettings() {
                return mockClient.getSettings();
            },
            
            async updateSettings(settings) {
                return mockClient.updateSettings(settings);
            },

            // Dashboard
            async getDashboardStats() {
                return mockClient.getDashboardStats();
            }
        };
    };

    // Auto-initialize if enabled
    if (config.autoEnable) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initIntegration);
        } else {
            // DOM is already ready
            setTimeout(initIntegration, 100);
        }
    }

    // Export for manual initialization
    window.initMockBackendIntegration = initIntegration;

    console.log('[Integration] Mock backend integration loaded');
})();