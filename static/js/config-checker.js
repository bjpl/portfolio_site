/**
 * Configuration Checker Utility
 * Validates API connection and provides debugging information
 */

class ConfigChecker {
    constructor() {
        this.checks = [];
        this.results = {};
        this.ui = null;
    }

    /**
     * Initialize configuration checker
     */
    async init() {
        await this.runAllChecks();
        this.createUI();
        this.bindEvents();
    }

    /**
     * Run all configuration checks
     */
    async runAllChecks() {
        this.checks = [
            { name: 'API Configuration', check: this.checkAPIConfig.bind(this) },
            { name: 'Backend Availability', check: this.checkBackendAvailability.bind(this) },
            { name: 'Token Status', check: this.checkTokenStatus.bind(this) },
            { name: 'LocalStorage', check: this.checkLocalStorage.bind(this) },
            { name: 'Network Connectivity', check: this.checkNetworkConnectivity.bind(this) },
            { name: 'CORS Configuration', check: this.checkCORSConfiguration.bind(this) }
        ];

        for (const checkItem of this.checks) {
            try {
                this.results[checkItem.name] = await checkItem.check();
            } catch (error) {
                this.results[checkItem.name] = {
                    status: 'error',
                    message: error.message,
                    details: error.stack
                };
            }
        }
    }

    /**
     * Check API configuration
     */
    async checkAPIConfig() {
        const apiConfig = window.CentralAPIConfig || window.apiConfig;
        
        if (!apiConfig) {
            return {
                status: 'error',
                message: 'Central API configuration not loaded',
                solution: 'Ensure api-config-central.js is loaded before this script'
            };
        }

        const status = apiConfig.getStatus ? apiConfig.getStatus() : {
            initialized: false,
            environment: 'unknown',
            apiBaseURL: 'not configured'
        };

        return {
            status: status.initialized ? 'success' : 'warning',
            message: `Environment: ${status.environment}, API: ${status.apiBaseURL}`,
            details: status,
            solution: !status.initialized ? 'Wait for configuration to initialize' : null
        };
    }

    /**
     * Check backend availability
     */
    async checkBackendAvailability() {
        const apiConfig = window.CentralAPIConfig;
        
        if (!apiConfig) {
            return {
                status: 'error',
                message: 'Cannot check backend - API config not available'
            };
        }

        try {
            const available = await apiConfig.refreshBackendStatus();
            
            return {
                status: available ? 'success' : 'error',
                message: available ? 'Backend is available' : 'Backend is not responding',
                details: {
                    baseURL: apiConfig.getAPIBaseURL(),
                    available: available
                },
                solution: !available ? 'Start the backend server on port 3001' : null
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Backend check failed: ${error.message}`,
                solution: 'Check if backend server is running and accessible'
            };
        }
    }

    /**
     * Check token status
     */
    async checkTokenStatus() {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        
        if (!token) {
            return {
                status: 'info',
                message: 'No authentication token found',
                solution: 'Login to obtain a valid token'
            };
        }

        try {
            // Decode JWT to check expiration
            const parts = token.split('.');
            if (parts.length !== 3) {
                return {
                    status: 'error',
                    message: 'Invalid token format',
                    solution: 'Clear token and login again'
                };
            }

            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
            const isExpired = payload.exp < now;

            return {
                status: isExpired ? 'error' : 'success',
                message: isExpired ? 'Token has expired' : 'Token is valid',
                details: {
                    expires: new Date(payload.exp * 1000).toISOString(),
                    isExpired: isExpired,
                    userId: payload.sub || payload.userId
                },
                solution: isExpired ? 'Clear token and login again' : null
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Failed to decode token',
                solution: 'Clear token and login again'
            };
        }
    }

    /**
     * Check localStorage
     */
    async checkLocalStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');

            const keys = Object.keys(localStorage);
            const authKeys = keys.filter(key => 
                key.includes('token') || 
                key.includes('auth') || 
                key.includes('user')
            );

            return {
                status: 'success',
                message: `LocalStorage working. ${authKeys.length} auth-related keys found`,
                details: {
                    totalKeys: keys.length,
                    authKeys: authKeys
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'LocalStorage not available',
                solution: 'Enable localStorage in browser settings'
            };
        }
    }

    /**
     * Check network connectivity
     */
    async checkNetworkConnectivity() {
        try {
            const response = await fetch(window.location.origin, {
                method: 'HEAD',
                cache: 'no-cache'
            });

            return {
                status: 'success',
                message: 'Network connectivity OK',
                details: {
                    online: navigator.onLine,
                    origin: window.location.origin
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Network connectivity issue: ${error.message}`,
                solution: 'Check internet connection'
            };
        }
    }

    /**
     * Check CORS configuration
     */
    async checkCORSConfiguration() {
        const apiConfig = window.CentralAPIConfig;
        if (!apiConfig) {
            return {
                status: 'warning',
                message: 'Cannot check CORS - API config not available'
            };
        }

        try {
            const response = await fetch(apiConfig.getEndpointURL('/health'), {
                method: 'OPTIONS'
            });

            const corsHeaders = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            };

            return {
                status: 'success',
                message: 'CORS preflight successful',
                details: corsHeaders
            };
        } catch (error) {
            return {
                status: 'warning',
                message: `CORS check inconclusive: ${error.message}`,
                details: {
                    currentOrigin: window.location.origin,
                    apiBaseURL: apiConfig.getAPIBaseURL()
                }
            };
        }
    }

    /**
     * Create debug UI
     */
    createUI() {
        // Only create UI if we're on an admin page or if explicitly requested
        if (!window.location.pathname.includes('/admin/') && !window.location.search.includes('debug=true')) {
            return;
        }

        const existingUI = document.getElementById('config-checker-ui');
        if (existingUI) {
            existingUI.remove();
        }

        const ui = document.createElement('div');
        ui.id = 'config-checker-ui';
        ui.innerHTML = `
            <div class="config-checker-panel" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 12px;
                z-index: 10000;
                display: none;
            ">
                <div class="config-checker-header" style="
                    background: #f8f9fa;
                    padding: 12px 16px;
                    border-bottom: 1px solid #eee;
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Config Checker</h3>
                    <button id="config-checker-close" style="
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        padding: 0;
                        width: 20px;
                        height: 20px;
                    ">&times;</button>
                </div>
                <div class="config-checker-content" style="
                    padding: 16px;
                    max-height: 400px;
                    overflow-y: auto;
                ">
                    ${this.generateResultsHTML()}
                </div>
                <div class="config-checker-footer" style="
                    padding: 12px 16px;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 8px;
                ">
                    <button id="config-checker-refresh" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">Refresh</button>
                    <button id="config-checker-clear-cache" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">Clear Cache</button>
                </div>
            </div>
            <div class="config-checker-toggle" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 9999;
            ">🔧</div>
        `;

        document.body.appendChild(ui);
        this.ui = ui;
    }

    /**
     * Generate results HTML
     */
    generateResultsHTML() {
        return Object.entries(this.results).map(([name, result]) => {
            const statusColor = {
                success: '#28a745',
                warning: '#ffc107',
                error: '#dc3545',
                info: '#17a2b8'
            }[result.status] || '#6c757d';

            return `
                <div class="config-check-result" style="
                    margin-bottom: 12px;
                    padding: 8px;
                    border-left: 3px solid ${statusColor};
                    background: ${result.status === 'error' ? '#fff5f5' : result.status === 'warning' ? '#fffbf0' : '#f8fff8'};
                ">
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        ${name} 
                        <span style="
                            color: ${statusColor};
                            font-size: 10px;
                            text-transform: uppercase;
                            font-weight: 700;
                        ">[${result.status}]</span>
                    </div>
                    <div style="color: #666; margin-bottom: 4px;">${result.message}</div>
                    ${result.solution ? `<div style="color: #007bff; font-size: 11px;">💡 ${result.solution}</div>` : ''}
                    ${result.details ? `
                        <details style="margin-top: 4px;">
                            <summary style="cursor: pointer; font-size: 10px; color: #888;">Details</summary>
                            <pre style="
                                font-size: 10px;
                                background: #f8f9fa;
                                padding: 4px;
                                margin: 4px 0;
                                overflow-x: auto;
                                border-radius: 2px;
                            ">${JSON.stringify(result.details, null, 2)}</pre>
                        </details>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Bind UI events
     */
    bindEvents() {
        if (!this.ui) return;

        const toggle = this.ui.querySelector('.config-checker-toggle');
        const panel = this.ui.querySelector('.config-checker-panel');
        const close = this.ui.querySelector('#config-checker-close');
        const refresh = this.ui.querySelector('#config-checker-refresh');
        const clearCache = this.ui.querySelector('#config-checker-clear-cache');

        toggle?.addEventListener('click', () => {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
        });

        close?.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        refresh?.addEventListener('click', async () => {
            refresh.textContent = 'Refreshing...';
            refresh.disabled = true;
            
            await this.runAllChecks();
            
            const content = this.ui.querySelector('.config-checker-content');
            content.innerHTML = this.generateResultsHTML();
            
            refresh.textContent = 'Refresh';
            refresh.disabled = false;
        });

        clearCache?.addEventListener('click', () => {
            if (confirm('Clear all cache and localStorage data?')) {
                if (window.CentralAPIConfig) {
                    window.CentralAPIConfig.clearCache();
                }
                
                clearCache.textContent = 'Cleared!';
                setTimeout(() => {
                    clearCache.textContent = 'Clear Cache';
                }, 2000);
            }
        });

        // Auto-show on errors
        const hasErrors = Object.values(this.results).some(result => result.status === 'error');
        if (hasErrors) {
            setTimeout(() => {
                panel.style.display = 'block';
            }, 1000);
        }
    }

    /**
     * Quick health check
     */
    async quickHealthCheck() {
        try {
            const apiConfig = window.CentralAPIConfig;
            if (!apiConfig) {
                return { healthy: false, message: 'API config not loaded' };
            }

            const isHealthy = await apiConfig.refreshBackendStatus();
            return { 
                healthy: isHealthy, 
                message: isHealthy ? 'All systems operational' : 'Backend unavailable' 
            };
        } catch (error) {
            return { healthy: false, message: error.message };
        }
    }
}

// Create instance and initialize
const configChecker = new ConfigChecker();

// Make globally available
window.ConfigChecker = configChecker;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        configChecker.init();
    });
} else {
    configChecker.init();
}

console.log('[Config Checker] Configuration checker loaded');