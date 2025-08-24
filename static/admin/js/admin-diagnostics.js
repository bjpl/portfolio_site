/**
 * Admin Panel Diagnostics Tool
 * Comprehensive system health checker and troubleshooter
 */

class AdminDiagnostics {
    constructor() {
        this.checks = new Map();
        this.results = [];
        this.startTime = Date.now();
        
        this.init();
    }

    /**
     * Initialize diagnostics
     */
    init() {
        this.setupDiagnosticChecks();
        console.log('🔧 Admin Diagnostics initialized');
    }

    /**
     * Run comprehensive diagnostics
     */
    async runDiagnostics(showUI = true) {
        console.group('🔧 Running Admin Panel Diagnostics');
        this.results = [];
        const startTime = Date.now();

        if (showUI) {
            this.showDiagnosticsUI();
        }

        // Run all diagnostic checks
        const checkPromises = Array.from(this.checks.entries()).map(([name, checkFn]) => 
            this.runSingleCheck(name, checkFn)
        );

        await Promise.all(checkPromises);

        const duration = Date.now() - startTime;
        const summary = this.generateSummary(duration);

        console.log('📊 Diagnostics Summary:', summary);
        console.groupEnd();

        if (showUI) {
            this.updateDiagnosticsUI(summary);
        }

        return summary;
    }

    /**
     * Run a single diagnostic check
     */
    async runSingleCheck(name, checkFn) {
        const startTime = Date.now();
        console.log(`🔍 Checking: ${name}`);

        try {
            const result = await checkFn();
            const duration = Date.now() - startTime;

            const checkResult = {
                name,
                status: result.status || 'pass',
                message: result.message || 'OK',
                details: result.details || {},
                duration,
                timestamp: new Date().toISOString()
            };

            this.results.push(checkResult);

            const statusIcon = this.getStatusIcon(checkResult.status);
            console.log(`${statusIcon} ${name}: ${checkResult.message} (${duration}ms)`);

            return checkResult;

        } catch (error) {
            const duration = Date.now() - startTime;
            const checkResult = {
                name,
                status: 'error',
                message: error.message,
                details: { error: error.stack },
                duration,
                timestamp: new Date().toISOString()
            };

            this.results.push(checkResult);
            console.error(`❌ ${name}: ${error.message} (${duration}ms)`);

            return checkResult;
        }
    }

    /**
     * Setup all diagnostic checks
     */
    setupDiagnosticChecks() {
        // Authentication System Check
        this.checks.set('Authentication System', async () => {
            const systems = [];
            
            if (window.ClientAuth) {
                systems.push({
                    name: 'ClientAuth',
                    initialized: window.ClientAuth.initialized,
                    authenticated: window.ClientAuth.isAuthenticated(),
                    user: window.ClientAuth.getCurrentUser()
                });
            }
            
            if (window.AuthManager) {
                systems.push({
                    name: 'AuthManager',
                    authenticated: window.AuthManager.isAuthenticated(),
                    user: window.AuthManager.getUserInfo()
                });
            }

            if (systems.length === 0) {
                return {
                    status: 'error',
                    message: 'No authentication systems found',
                    details: { systems }
                };
            }

            const authenticatedSystems = systems.filter(s => s.authenticated);
            
            return {
                status: authenticatedSystems.length > 0 ? 'pass' : 'warn',
                message: `${authenticatedSystems.length}/${systems.length} auth systems active`,
                details: { systems, authenticated: authenticatedSystems }
            };
        });

        // API Configuration Check
        this.checks.set('API Configuration', async () => {
            const configs = [];
            
            if (window.APIConfig) {
                configs.push({
                    name: 'APIConfig',
                    baseURL: window.APIConfig.getBaseURL(),
                    healthy: await window.APIConfig.checkHealth?.() || null
                });
            }
            
            if (window.AdminConfig) {
                configs.push({
                    name: 'AdminConfig',
                    apiUrl: window.AdminConfig.api?.baseUrl,
                    features: window.AdminConfig.features
                });
            }

            return {
                status: configs.length > 0 ? 'pass' : 'warn',
                message: `${configs.length} API configuration(s) found`,
                details: { configs }
            };
        });

        // Network Connectivity Check
        this.checks.set('Network Connectivity', async () => {
            const endpoints = [
                { name: 'Health Check', url: '/api/health' },
                { name: 'Admin Auth', url: '/.netlify/edge-functions/admin-auth' },
                { name: 'Netlify Functions', url: '/.netlify/functions/auth' }
            ];

            const results = await Promise.all(
                endpoints.map(async endpoint => {
                    try {
                        const response = await fetch(endpoint.url, { 
                            method: endpoint.url.includes('admin-auth') ? 'OPTIONS' : 'GET'
                        });
                        return {
                            ...endpoint,
                            status: response.status,
                            ok: response.ok,
                            available: true
                        };
                    } catch (error) {
                        return {
                            ...endpoint,
                            status: 0,
                            ok: false,
                            available: false,
                            error: error.message
                        };
                    }
                })
            );

            const availableCount = results.filter(r => r.available).length;
            
            return {
                status: availableCount > 0 ? 'pass' : 'error',
                message: `${availableCount}/${endpoints.length} endpoints reachable`,
                details: { endpoints: results }
            };
        });

        // Local Storage Check
        this.checks.set('Local Storage', async () => {
            try {
                const testKey = 'diagnostic_test';
                const testValue = 'test_data_' + Date.now();
                
                localStorage.setItem(testKey, testValue);
                const retrieved = localStorage.getItem(testKey);
                localStorage.removeItem(testKey);

                if (retrieved !== testValue) {
                    throw new Error('Storage read/write mismatch');
                }

                const items = Object.keys(localStorage);
                const relevantItems = items.filter(key => 
                    key.includes('admin') || 
                    key.includes('token') || 
                    key.includes('user')
                );

                return {
                    status: 'pass',
                    message: `Storage functional, ${relevantItems.length} admin items found`,
                    details: { 
                        totalItems: items.length,
                        adminItems: relevantItems
                    }
                };

            } catch (error) {
                return {
                    status: 'error',
                    message: `Storage not available: ${error.message}`,
                    details: { error: error.message }
                };
            }
        });

        // Script Loading Check
        this.checks.set('Script Dependencies', async () => {
            const requiredScripts = [
                'ClientAuth',
                'AuthManager',
                'APIConfig',
                'LoadingManager'
            ];

            const optional = [
                'AdminConfig',
                'environmentChecker',
                'UnifiedAPIClient'
            ];

            const loaded = requiredScripts.filter(script => window[script]).length;
            const optionalLoaded = optional.filter(script => window[script]).length;

            const status = loaded === requiredScripts.length ? 'pass' : 
                         loaded > 0 ? 'warn' : 'error';

            return {
                status,
                message: `${loaded}/${requiredScripts.length} required, ${optionalLoaded}/${optional.length} optional`,
                details: {
                    required: requiredScripts.map(s => ({ name: s, loaded: !!window[s] })),
                    optional: optional.map(s => ({ name: s, loaded: !!window[s] }))
                }
            };
        });

        // Environment Check
        this.checks.set('Environment', async () => {
            const env = {
                hostname: window.location.hostname,
                protocol: window.location.protocol,
                isLocalhost: window.location.hostname.includes('localhost'),
                isNetlify: window.location.hostname.includes('netlify.app'),
                isProduction: !window.location.hostname.includes('localhost'),
                hasSupabaseConfig: !!window.SUPABASE_CONFIG,
                userAgent: navigator.userAgent.substring(0, 50) + '...'
            };

            const issues = [];
            
            if (env.isProduction && env.protocol !== 'https:') {
                issues.push('Should use HTTPS in production');
            }
            
            if (!env.hasSupabaseConfig) {
                issues.push('Supabase configuration missing');
            }

            return {
                status: issues.length === 0 ? 'pass' : 'warn',
                message: issues.length === 0 ? 'Environment OK' : `${issues.length} environment issues`,
                details: { environment: env, issues }
            };
        });

        // Performance Check
        this.checks.set('Performance', async () => {
            const metrics = {
                loadTime: Date.now() - this.startTime,
                memoryUsage: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                } : null,
                connectionType: navigator.connection?.effectiveType || 'unknown'
            };

            const issues = [];
            
            if (metrics.loadTime > 5000) {
                issues.push('Slow page load time');
            }
            
            if (metrics.memoryUsage && metrics.memoryUsage.used > 100) {
                issues.push('High memory usage');
            }

            return {
                status: issues.length === 0 ? 'pass' : 'warn',
                message: `Load: ${metrics.loadTime}ms, Memory: ${metrics.memoryUsage?.used || 'N/A'}MB`,
                details: { metrics, issues }
            };
        });
    }

    /**
     * Generate diagnostics summary
     */
    generateSummary(duration) {
        const statusCounts = {
            pass: 0,
            warn: 0,
            error: 0
        };

        this.results.forEach(result => {
            statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
        });

        const overallStatus = statusCounts.error > 0 ? 'error' :
                            statusCounts.warn > 0 ? 'warn' : 'pass';

        return {
            overallStatus,
            duration,
            totalChecks: this.results.length,
            statusCounts,
            checks: this.results,
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * Generate recommendations based on results
     */
    generateRecommendations() {
        const recommendations = [];
        
        this.results.forEach(result => {
            switch (result.name) {
                case 'Authentication System':
                    if (result.status === 'error') {
                        recommendations.push('⚠️ Fix authentication system - admin panel will not function');
                    }
                    break;
                    
                case 'Network Connectivity':
                    if (result.status === 'error') {
                        recommendations.push('🌐 Check network connection and backend services');
                    }
                    break;
                    
                case 'Local Storage':
                    if (result.status === 'error') {
                        recommendations.push('💾 Enable browser storage - required for admin functionality');
                    }
                    break;
                    
                case 'Script Dependencies':
                    if (result.status === 'error') {
                        recommendations.push('📦 Critical scripts missing - check script loading order');
                    }
                    break;
            }
        });

        if (recommendations.length === 0) {
            recommendations.push('✅ All systems operational');
        }

        return recommendations;
    }

    /**
     * Show diagnostics UI
     */
    showDiagnosticsUI() {
        const ui = document.createElement('div');
        ui.id = 'diagnostics-ui';
        ui.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 400px;
            font-family: monospace;
            font-size: 12px;
        `;

        ui.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #2c3e50;">🔧 Diagnostics</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 16px; cursor: pointer;">×</button>
            </div>
            <div id="diagnostics-content">
                <div style="color: #666; margin: 10px 0;">Running checks...</div>
                <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px;">
                    <div id="diagnostics-progress" style="height: 4px; background: #3498db; border-radius: 2px; width: 0%; transition: width 0.3s;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(ui);
    }

    /**
     * Update diagnostics UI
     */
    updateDiagnosticsUI(summary) {
        const content = document.getElementById('diagnostics-content');
        if (!content) return;

        const statusColor = {
            pass: '#27ae60',
            warn: '#f39c12',
            error: '#e74c3c'
        };

        content.innerHTML = `
            <div style="color: ${statusColor[summary.overallStatus]}; font-weight: bold; margin-bottom: 10px;">
                ${this.getStatusIcon(summary.overallStatus)} Overall: ${summary.overallStatus.toUpperCase()}
            </div>
            
            <div style="margin-bottom: 10px;">
                Duration: ${summary.duration}ms
            </div>
            
            <div style="margin-bottom: 10px;">
                ✅ ${summary.statusCounts.pass} passed
                ⚠️ ${summary.statusCounts.warn} warnings  
                ❌ ${summary.statusCounts.error} errors
            </div>
            
            <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #666;">Check Details</summary>
                <div style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
                    ${summary.checks.map(check => `
                        <div style="margin: 5px 0; padding: 5px; background: ${statusColor[check.status]}20; border-radius: 3px;">
                            <strong>${this.getStatusIcon(check.status)} ${check.name}</strong><br>
                            <span style="color: #666; font-size: 11px;">${check.message} (${check.duration}ms)</span>
                        </div>
                    `).join('')}
                </div>
            </details>
            
            ${summary.recommendations.length > 0 ? `
                <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                    <strong>Recommendations:</strong><br>
                    ${summary.recommendations.map(rec => `<div style="margin: 5px 0;">${rec}</div>`).join('')}
                </div>
            ` : ''}
        `;
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            pass: '✅',
            warn: '⚠️',
            error: '❌'
        };
        return icons[status] || '❓';
    }

    /**
     * Export diagnostics report
     */
    exportReport(summary) {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...summary
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Create global instance
window.AdminDiagnostics = new AdminDiagnostics();

// Auto-run diagnostics if URL parameter is present
if (new URLSearchParams(window.location.search).has('diagnostics')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.AdminDiagnostics.runDiagnostics(true);
        }, 2000);
    });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDiagnostics;
}