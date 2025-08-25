/**
 * Configuration Debug Script
 * Comprehensive diagnostic tool for configuration and API connectivity issues
 * Auto-runs when loaded to help diagnose config problems
 * 
 * Usage: Add <script src="/js/debug/config-debug.js"></script> to any page
 * Or run manually: window.ConfigDebugger.runFullDiagnostic()
 */

class ConfigurationDebugger {
    constructor() {
        this.results = {};
        this.startTime = Date.now();
        this.autoRun = true;
        
        console.log('🔍 Configuration Debugger initialized');
        
        // Auto-run diagnostic when loaded
        if (this.autoRun) {
            setTimeout(() => this.runFullDiagnostic(), 100);
        }
    }

    /**
     * Run complete diagnostic suite
     */
    async runFullDiagnostic() {
        console.group('🔍 Configuration Debug Report');
        console.log('Starting comprehensive configuration diagnostic...');
        
        const diagnostics = [
            { name: 'Environment Detection', test: () => this.checkEnvironment() },
            { name: 'Window Global Objects', test: () => this.checkWindowGlobals() },
            { name: 'Supabase Configuration', test: () => this.checkSupabaseConfig() },
            { name: 'API Configuration', test: () => this.checkAPIConfig() },
            { name: 'Environment Variables', test: () => this.checkEnvironmentVariables() },
            { name: 'Local Storage', test: () => this.checkLocalStorage() },
            { name: 'Network Connectivity', test: () => this.testNetworkConnectivity() },
            { name: 'Supabase Connection', test: () => this.testSupabaseConnection() },
            { name: 'API Endpoints', test: () => this.testAPIEndpoints() },
            { name: 'Authentication State', test: () => this.checkAuthenticationState() },
            { name: 'Script Loading', test: () => this.checkScriptLoading() },
            { name: 'Browser Compatibility', test: () => this.checkBrowserCompatibility() }
        ];

        for (const diagnostic of diagnostics) {
            try {
                console.group(`🔍 ${diagnostic.name}`);
                const result = await diagnostic.test();
                this.results[diagnostic.name] = result;
                
                const status = result.status || 'unknown';
                const emoji = this.getStatusEmoji(status);
                
                console.log(`${emoji} Status: ${status.toUpperCase()}`);
                console.log(`📝 Message: ${result.message || 'No message'}`);
                
                if (result.details) {
                    console.log('📊 Details:', result.details);
                }
                
                if (result.solution) {
                    console.warn(`💡 Solution: ${result.solution}`);
                }
                
                if (result.errors && result.errors.length > 0) {
                    console.error('❌ Errors:', result.errors);
                }
                
                console.groupEnd();
            } catch (error) {
                console.error(`❌ ${diagnostic.name} failed:`, error);
                this.results[diagnostic.name] = {
                    status: 'error',
                    message: `Diagnostic failed: ${error.message}`,
                    error: error
                };
                console.groupEnd();
            }
        }
        
        // Summary
        this.printSummary();
        console.groupEnd();
        
        // Create visual debug panel
        this.createDebugPanel();
        
        return this.results;
    }

    /**
     * Check current environment
     */
    checkEnvironment() {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isNetlify = hostname.includes('netlify');
        const isDevelopment = isLocalhost || hostname.includes('dev');
        const isProduction = !isDevelopment && !isNetlify;

        return {
            status: 'info',
            message: `Running in ${isProduction ? 'production' : isDevelopment ? 'development' : 'staging'} environment`,
            details: {
                hostname,
                protocol: window.location.protocol,
                port: window.location.port,
                pathname: window.location.pathname,
                search: window.location.search,
                isLocalhost,
                isNetlify,
                isDevelopment,
                isProduction,
                userAgent: navigator.userAgent,
                online: navigator.onLine,
                language: navigator.language,
                platform: navigator.platform
            }
        };
    }

    /**
     * Check window global objects
     */
    checkWindowGlobals() {
        const expectedGlobals = [
            'SUPABASE_CONFIG',
            'apiConfig', 
            'CentralAPIConfig',
            'ENV',
            'process'
        ];
        
        const found = {};
        const missing = [];
        
        expectedGlobals.forEach(global => {
            if (window[global] !== undefined) {
                found[global] = typeof window[global];
            } else {
                missing.push(global);
            }
        });

        return {
            status: missing.length === 0 ? 'success' : 'warning',
            message: `Found ${Object.keys(found).length}/${expectedGlobals.length} expected globals`,
            details: {
                found,
                missing,
                allWindowProperties: Object.keys(window).filter(key => 
                    key.includes('config') || 
                    key.includes('Config') || 
                    key.includes('SUPABASE') || 
                    key.includes('API')
                )
            },
            solution: missing.length > 0 ? `Missing globals: ${missing.join(', ')}. Check script loading order.` : null
        };
    }

    /**
     * Check Supabase configuration
     */
    checkSupabaseConfig() {
        const errors = [];
        const warnings = [];
        const info = {};

        // Check window.SUPABASE_CONFIG
        if (!window.SUPABASE_CONFIG) {
            errors.push('window.SUPABASE_CONFIG not found');
        } else {
            info.SUPABASE_CONFIG = {
                url: window.SUPABASE_CONFIG.url,
                hasAnonKey: !!window.SUPABASE_CONFIG.anonKey,
                anonKeyLength: window.SUPABASE_CONFIG.anonKey ? window.SUPABASE_CONFIG.anonKey.length : 0,
                hasPlaceholder: window.SUPABASE_CONFIG.anonKey && window.SUPABASE_CONFIG.anonKey.includes('{{'),
                auth: !!window.SUPABASE_CONFIG.auth,
                authPersistSession: window.SUPABASE_CONFIG.auth?.session?.persistSession,
                authAutoRefresh: window.SUPABASE_CONFIG.auth?.session?.autoRefresh
            };

            // Validate URL
            if (!window.SUPABASE_CONFIG.url) {
                errors.push('Supabase URL is missing');
            } else if (!window.SUPABASE_CONFIG.url.startsWith('https://')) {
                warnings.push('Supabase URL should use HTTPS');
            }

            // Validate anon key
            if (!window.SUPABASE_CONFIG.anonKey) {
                errors.push('Supabase anon key is missing');
            } else if (window.SUPABASE_CONFIG.anonKey.includes('{{')) {
                errors.push('Supabase anon key contains placeholder - not replaced by build process');
            } else if (window.SUPABASE_CONFIG.anonKey.length < 100) {
                warnings.push('Supabase anon key seems too short');
            }
        }

        // Check validation function
        if (window.validateSupabaseConfig) {
            try {
                const isValid = window.validateSupabaseConfig();
                info.validationResult = isValid;
            } catch (error) {
                errors.push(`validateSupabaseConfig failed: ${error.message}`);
            }
        } else {
            warnings.push('validateSupabaseConfig function not found');
        }

        const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success';

        return {
            status,
            message: `Supabase config ${status === 'success' ? 'looks good' : `has ${errors.length} errors and ${warnings.length} warnings`}`,
            details: info,
            errors,
            warnings,
            solution: errors.length > 0 ? 'Fix configuration errors and ensure config scripts load properly' : null
        };
    }

    /**
     * Check API configuration
     */
    checkAPIConfig() {
        const errors = [];
        const warnings = [];
        const info = {};

        // Check window.apiConfig
        if (window.apiConfig) {
            info.apiConfig = {
                hasConfig: !!window.apiConfig.config,
                environment: window.apiConfig.config?.environment,
                supabaseUrl: window.apiConfig.config?.endpoints?.supabase?.url,
                hasSupabaseKey: !!window.apiConfig.config?.supabase?.anonKey,
                validation: null
            };

            try {
                const validation = window.apiConfig.validate();
                info.apiConfig.validation = validation;
                
                if (!validation.valid) {
                    errors.push(...validation.issues);
                }
            } catch (error) {
                errors.push(`API config validation failed: ${error.message}`);
            }
        } else {
            warnings.push('window.apiConfig not found');
        }

        // Check window.CentralAPIConfig
        if (window.CentralAPIConfig) {
            info.CentralAPIConfig = {
                hasGetStatus: typeof window.CentralAPIConfig.getStatus === 'function',
                hasGetAPIBaseURL: typeof window.CentralAPIConfig.getAPIBaseURL === 'function'
            };

            if (typeof window.CentralAPIConfig.getStatus === 'function') {
                try {
                    const status = window.CentralAPIConfig.getStatus();
                    info.CentralAPIConfig.status = status;
                } catch (error) {
                    errors.push(`CentralAPIConfig.getStatus failed: ${error.message}`);
                }
            }
        } else {
            warnings.push('window.CentralAPIConfig not found');
        }

        const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success';

        return {
            status,
            message: `API config ${status === 'success' ? 'configured correctly' : `has issues`}`,
            details: info,
            errors,
            warnings,
            solution: errors.length > 0 ? 'Check API configuration loading and fix validation errors' : null
        };
    }

    /**
     * Check environment variables
     */
    checkEnvironmentVariables() {
        const envSources = {
            'window.ENV': window.ENV,
            'window.process.env': window.process?.env,
            'import.meta.env': typeof importMeta !== 'undefined' ? importMeta.env : undefined
        };

        const expectedVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY',
            'REACT_APP_SUPABASE_URL',
            'REACT_APP_SUPABASE_ANON_KEY'
        ];

        const foundVars = {};
        let totalFound = 0;

        Object.entries(envSources).forEach(([source, envObj]) => {
            if (envObj) {
                foundVars[source] = {};
                expectedVars.forEach(varName => {
                    if (envObj[varName] !== undefined) {
                        foundVars[source][varName] = envObj[varName] === 'undefined' ? '[UNDEFINED]' : '[SET]';
                        totalFound++;
                    }
                });
            }
        });

        return {
            status: totalFound > 0 ? 'success' : 'warning',
            message: `Found ${totalFound} environment variables across ${Object.keys(foundVars).length} sources`,
            details: {
                sources: foundVars,
                expectedVars,
                totalExpected: expectedVars.length,
                totalFound
            },
            solution: totalFound === 0 ? 'Environment variables not set. Check build process and deployment configuration.' : null
        };
    }

    /**
     * Check local storage
     */
    checkLocalStorage() {
        const errors = [];
        const info = {};

        try {
            // Test localStorage functionality
            localStorage.setItem('debug-test', 'test');
            localStorage.removeItem('debug-test');
            info.localStorageWorking = true;

            // Check for relevant stored data
            const allKeys = Object.keys(localStorage);
            const authKeys = allKeys.filter(key => 
                key.includes('auth') || 
                key.includes('token') || 
                key.includes('supabase') ||
                key.includes('user')
            );
            const configKeys = allKeys.filter(key => 
                key.includes('config') || 
                key.includes('api')
            );

            info.totalKeys = allKeys.length;
            info.authKeys = authKeys;
            info.configKeys = configKeys;
            info.allKeys = allKeys;

            // Check specific important keys
            const importantKeys = [
                'supabase-auth-session',
                'token',
                'accessToken',
                'api_config',
                'supabase.auth.token'
            ];

            info.importantKeysStatus = {};
            importantKeys.forEach(key => {
                const value = localStorage.getItem(key);
                info.importantKeysStatus[key] = value ? '[PRESENT]' : '[MISSING]';
            });

        } catch (error) {
            errors.push(`localStorage test failed: ${error.message}`);
            info.localStorageWorking = false;
        }

        return {
            status: errors.length > 0 ? 'error' : 'success',
            message: `localStorage ${errors.length > 0 ? 'not working' : `working with ${info.totalKeys} keys`}`,
            details: info,
            errors,
            solution: errors.length > 0 ? 'Enable localStorage in browser or check private browsing mode' : null
        };
    }

    /**
     * Test network connectivity
     */
    async testNetworkConnectivity() {
        const tests = [];

        // Test 1: Basic connectivity to current origin
        try {
            const response = await fetch(window.location.origin + '/js/debug/config-debug.js', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            tests.push({
                name: 'Self connectivity',
                success: response.ok,
                status: response.status,
                url: window.location.origin
            });
        } catch (error) {
            tests.push({
                name: 'Self connectivity',
                success: false,
                error: error.message,
                url: window.location.origin
            });
        }

        // Test 2: External connectivity
        try {
            const response = await fetch('https://httpbin.org/status/200', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            tests.push({
                name: 'External connectivity',
                success: response.ok,
                status: response.status,
                url: 'https://httpbin.org'
            });
        } catch (error) {
            tests.push({
                name: 'External connectivity',
                success: false,
                error: error.message,
                url: 'https://httpbin.org'
            });
        }

        const successfulTests = tests.filter(t => t.success).length;
        const totalTests = tests.length;

        return {
            status: successfulTests === totalTests ? 'success' : successfulTests > 0 ? 'warning' : 'error',
            message: `${successfulTests}/${totalTests} connectivity tests passed`,
            details: {
                tests,
                navigator: {
                    onLine: navigator.onLine,
                    connection: navigator.connection ? {
                        effectiveType: navigator.connection.effectiveType,
                        downlink: navigator.connection.downlink,
                        rtt: navigator.connection.rtt
                    } : 'Not available'
                }
            },
            solution: successfulTests === 0 ? 'Check internet connection and firewall settings' : null
        };
    }

    /**
     * Test Supabase connection
     */
    async testSupabaseConnection() {
        const errors = [];
        const tests = [];

        // Get Supabase config
        const supabaseUrl = window.SUPABASE_CONFIG?.url || window.apiConfig?.getSupabaseUrl?.() || 'https://tdmzayzkqyegvfgxlolj.supabase.co';
        const supabaseKey = window.SUPABASE_CONFIG?.anonKey || window.apiConfig?.getSupabaseAnonKey?.() || null;

        if (!supabaseUrl) {
            errors.push('No Supabase URL found');
        }

        if (!supabaseKey || supabaseKey.includes('{{')) {
            errors.push('No valid Supabase key found');
        }

        if (errors.length === 0) {
            // Test 1: Basic connectivity to Supabase
            try {
                const response = await fetch(supabaseUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey
                    }
                });
                tests.push({
                    name: 'Supabase base URL',
                    success: response.status < 500,
                    status: response.status,
                    url: supabaseUrl
                });
            } catch (error) {
                tests.push({
                    name: 'Supabase base URL',
                    success: false,
                    error: error.message,
                    url: supabaseUrl
                });
            }

            // Test 2: REST API endpoint
            try {
                const restUrl = `${supabaseUrl}/rest/v1/`;
                const response = await fetch(restUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                tests.push({
                    name: 'Supabase REST API',
                    success: response.status < 500,
                    status: response.status,
                    url: restUrl
                });
            } catch (error) {
                tests.push({
                    name: 'Supabase REST API',
                    success: false,
                    error: error.message,
                    url: `${supabaseUrl}/rest/v1/`
                });
            }

            // Test 3: Auth endpoint
            try {
                const authUrl = `${supabaseUrl}/auth/v1/health`;
                const response = await fetch(authUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey
                    }
                });
                tests.push({
                    name: 'Supabase Auth API',
                    success: response.ok,
                    status: response.status,
                    url: authUrl
                });
            } catch (error) {
                tests.push({
                    name: 'Supabase Auth API',
                    success: false,
                    error: error.message,
                    url: `${supabaseUrl}/auth/v1/health`
                });
            }
        }

        const successfulTests = tests.filter(t => t.success).length;
        const totalTests = tests.length;

        return {
            status: errors.length > 0 ? 'error' : successfulTests === totalTests ? 'success' : 'warning',
            message: errors.length > 0 ? `Configuration errors: ${errors.length}` : `${successfulTests}/${totalTests} Supabase tests passed`,
            details: {
                supabaseUrl,
                hasKey: !!supabaseKey,
                keyLength: supabaseKey ? supabaseKey.length : 0,
                tests,
                errors
            },
            errors,
            solution: errors.length > 0 ? 'Fix Supabase configuration' : successfulTests < totalTests ? 'Check Supabase service status' : null
        };
    }

    /**
     * Test API endpoints
     */
    async testAPIEndpoints() {
        const errors = [];
        const tests = [];

        // Get API endpoints
        const endpoints = [];

        if (window.apiConfig) {
            const primary = window.apiConfig.getEndpoint('primary');
            const rest = window.apiConfig.getEndpoint('rest');
            const auth = window.apiConfig.getEndpoint('auth');
            
            endpoints.push(
                { name: 'Primary API', url: primary },
                { name: 'REST API', url: rest },
                { name: 'Auth API', url: auth + '/health' }
            );
        }

        if (window.CentralAPIConfig && window.CentralAPIConfig.getAPIBaseURL) {
            endpoints.push({
                name: 'Central API',
                url: window.CentralAPIConfig.getAPIBaseURL() + '/health'
            });
        }

        // Test each endpoint
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url, {
                    method: 'GET',
                    cache: 'no-cache'
                });
                tests.push({
                    name: endpoint.name,
                    success: response.status < 500,
                    status: response.status,
                    url: endpoint.url
                });
            } catch (error) {
                tests.push({
                    name: endpoint.name,
                    success: false,
                    error: error.message,
                    url: endpoint.url
                });
            }
        }

        const successfulTests = tests.filter(t => t.success).length;
        const totalTests = tests.length;

        return {
            status: totalTests === 0 ? 'warning' : successfulTests === totalTests ? 'success' : 'error',
            message: totalTests === 0 ? 'No API endpoints found' : `${successfulTests}/${totalTests} API endpoints responding`,
            details: {
                tests,
                totalEndpoints: endpoints.length
            },
            solution: totalTests === 0 ? 'Check API configuration loading' : successfulTests < totalTests ? 'Check API service status' : null
        };
    }

    /**
     * Check authentication state
     */
    checkAuthenticationState() {
        const info = {};
        const warnings = [];

        // Check localStorage for auth tokens
        const authKeys = [
            'supabase-auth-session',
            'token',
            'accessToken',
            'supabase.auth.token'
        ];

        info.tokens = {};
        authKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    const parsed = JSON.parse(value);
                    info.tokens[key] = {
                        present: true,
                        type: typeof parsed,
                        hasAccessToken: !!parsed.access_token,
                        hasRefreshToken: !!parsed.refresh_token,
                        hasUser: !!parsed.user
                    };
                } catch {
                    info.tokens[key] = {
                        present: true,
                        type: 'string',
                        length: value.length
                    };
                }
            } else {
                info.tokens[key] = { present: false };
            }
        });

        // Check for auth-related globals
        info.authGlobals = {
            supabase: typeof window.supabase,
            createClient: typeof window.createClient,
            authManager: typeof window.authManager,
            AuthManager: typeof window.AuthManager
        };

        const hasTokens = Object.values(info.tokens).some(token => token.present);
        const hasAuthGlobals = Object.values(info.authGlobals).some(global => global !== 'undefined');

        if (!hasTokens) {
            warnings.push('No authentication tokens found');
        }

        if (!hasAuthGlobals) {
            warnings.push('No authentication globals found');
        }

        return {
            status: warnings.length === 0 ? 'success' : 'warning',
            message: `Auth state: ${hasTokens ? 'tokens present' : 'no tokens'}, ${hasAuthGlobals ? 'auth globals present' : 'no auth globals'}`,
            details: info,
            warnings,
            solution: warnings.length > 0 ? 'Check authentication setup and login flow' : null
        };
    }

    /**
     * Check script loading
     */
    checkScriptLoading() {
        const info = {};
        const warnings = [];

        // Check for expected script tags
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const scriptSources = scripts.map(script => script.src);

        const expectedScripts = [
            'config',
            'supabase',
            'api-config',
            'auth'
        ];

        info.allScripts = scriptSources;
        info.expectedScriptsFound = {};

        expectedScripts.forEach(expected => {
            const found = scriptSources.filter(src => src.includes(expected));
            info.expectedScriptsFound[expected] = found;
            if (found.length === 0) {
                warnings.push(`No scripts found containing '${expected}'`);
            }
        });

        // Check for script errors
        info.scriptErrors = window.scriptLoadErrors || [];

        return {
            status: warnings.length === 0 ? 'success' : 'warning',
            message: `${scripts.length} scripts loaded, ${warnings.length} missing expected scripts`,
            details: info,
            warnings,
            solution: warnings.length > 0 ? 'Check script loading order and paths' : null
        };
    }

    /**
     * Check browser compatibility
     */
    checkBrowserCompatibility() {
        const info = {};
        const warnings = [];

        // Check for required features
        const requiredFeatures = {
            'fetch': typeof fetch !== 'undefined',
            'localStorage': typeof localStorage !== 'undefined',
            'sessionStorage': typeof sessionStorage !== 'undefined',
            'WebSocket': typeof WebSocket !== 'undefined',
            'Promise': typeof Promise !== 'undefined',
            'async/await': (async function(){})().constructor.name === 'AsyncFunction',
            'ES6 modules': typeof Symbol !== 'undefined',
            'JSON': typeof JSON !== 'undefined'
        };

        info.features = requiredFeatures;
        info.userAgent = navigator.userAgent;
        info.language = navigator.language;
        info.platform = navigator.platform;
        info.cookieEnabled = navigator.cookieEnabled;

        Object.entries(requiredFeatures).forEach(([feature, supported]) => {
            if (!supported) {
                warnings.push(`${feature} not supported`);
            }
        });

        return {
            status: warnings.length === 0 ? 'success' : 'error',
            message: warnings.length === 0 ? 'All required features supported' : `${warnings.length} required features missing`,
            details: info,
            warnings,
            solution: warnings.length > 0 ? 'Update browser or enable required features' : null
        };
    }

    /**
     * Get status emoji
     */
    getStatusEmoji(status) {
        const emojis = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        return emojis[status] || '❓';
    }

    /**
     * Print summary
     */
    printSummary() {
        const diagnosticCount = Object.keys(this.results).length;
        const successCount = Object.values(this.results).filter(r => r.status === 'success').length;
        const warningCount = Object.values(this.results).filter(r => r.status === 'warning').length;
        const errorCount = Object.values(this.results).filter(r => r.status === 'error').length;
        
        const duration = Date.now() - this.startTime;

        console.log('\n🎯 DIAGNOSTIC SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Tests Run: ${diagnosticCount}`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`⚠️ Warnings: ${warningCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`⏱️ Duration: ${duration}ms`);
        
        if (errorCount > 0) {
            console.log('\n🚨 CRITICAL ISSUES FOUND:');
            Object.entries(this.results)
                .filter(([_, result]) => result.status === 'error')
                .forEach(([name, result]) => {
                    console.log(`   ❌ ${name}: ${result.message}`);
                    if (result.solution) {
                        console.log(`      💡 ${result.solution}`);
                    }
                });
        }

        if (warningCount > 0) {
            console.log('\n⚠️ WARNINGS:');
            Object.entries(this.results)
                .filter(([_, result]) => result.status === 'warning')
                .forEach(([name, result]) => {
                    console.log(`   ⚠️ ${name}: ${result.message}`);
                });
        }

        console.log('\n💡 QUICK FIXES:');
        const fixes = this.generateQuickFixes();
        fixes.forEach(fix => console.log(`   • ${fix}`));
    }

    /**
     * Generate quick fixes
     */
    generateQuickFixes() {
        const fixes = [];
        
        if (this.results['Supabase Configuration']?.status === 'error') {
            fixes.push('Check Supabase configuration in window.SUPABASE_CONFIG');
        }
        
        if (this.results['API Configuration']?.status === 'error') {
            fixes.push('Verify API configuration scripts are loaded');
        }
        
        if (this.results['Network Connectivity']?.status === 'error') {
            fixes.push('Check internet connection and firewall');
        }
        
        if (this.results['Environment Variables']?.status === 'warning') {
            fixes.push('Set up environment variables for Supabase keys');
        }
        
        if (this.results['Script Loading']?.status === 'warning') {
            fixes.push('Check script loading order in HTML');
        }

        if (fixes.length === 0) {
            fixes.push('All systems appear to be working correctly');
        }
        
        return fixes;
    }

    /**
     * Create visual debug panel
     */
    createDebugPanel() {
        // Remove existing panel
        const existing = document.getElementById('config-debug-panel');
        if (existing) {
            existing.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'config-debug-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                width: 300px;
                max-height: 80vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                z-index: 999999;
                overflow: hidden;
            ">
                <div style="
                    padding: 15px;
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; font-size: 14px; font-weight: 600;">🔍 Config Debug</h3>
                    <button onclick="this.parentElement.parentElement.style.display='none'" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 16px;
                        cursor: pointer;
                        padding: 0;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                <div style="
                    padding: 15px;
                    max-height: 60vh;
                    overflow-y: auto;
                ">
                    ${this.generatePanelHTML()}
                </div>
                <div style="
                    padding: 10px 15px;
                    background: rgba(0,0,0,0.2);
                    display: flex;
                    gap: 10px;
                ">
                    <button onclick="window.ConfigDebugger.runFullDiagnostic()" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 5px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 10px;
                    ">Refresh</button>
                    <button onclick="console.log(window.ConfigDebugger.results)" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 5px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 10px;
                    ">Log Data</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
    }

    /**
     * Generate panel HTML
     */
    generatePanelHTML() {
        const diagnosticCount = Object.keys(this.results).length;
        const successCount = Object.values(this.results).filter(r => r.status === 'success').length;
        const warningCount = Object.values(this.results).filter(r => r.status === 'warning').length;
        const errorCount = Object.values(this.results).filter(r => r.status === 'error').length;

        let html = `
            <div style="margin-bottom: 15px; text-align: center;">
                <div style="font-size: 14px; margin-bottom: 5px;">
                    ${this.getStatusEmoji(errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success')} 
                    ${errorCount > 0 ? 'Issues Found' : warningCount > 0 ? 'Some Warnings' : 'All Good'}
                </div>
                <div style="font-size: 10px; opacity: 0.8;">
                    ${successCount}/${diagnosticCount} checks passed
                </div>
            </div>
        `;

        // Show critical errors first
        const errorResults = Object.entries(this.results).filter(([_, result]) => result.status === 'error');
        if (errorResults.length > 0) {
            html += '<div style="margin-bottom: 10px;"><strong style="color: #ff6b6b;">❌ Critical Issues:</strong></div>';
            errorResults.forEach(([name, result]) => {
                html += `
                    <div style="
                        margin-bottom: 8px;
                        padding: 8px;
                        background: rgba(255,107,107,0.2);
                        border-left: 3px solid #ff6b6b;
                        border-radius: 3px;
                        font-size: 11px;
                    ">
                        <strong>${name}</strong><br>
                        ${result.message}
                        ${result.solution ? `<br><span style="opacity: 0.8;">💡 ${result.solution}</span>` : ''}
                    </div>
                `;
            });
        }

        // Show warnings
        const warningResults = Object.entries(this.results).filter(([_, result]) => result.status === 'warning');
        if (warningResults.length > 0) {
            html += '<div style="margin: 10px 0 5px 0;"><strong style="color: #feca57;">⚠️ Warnings:</strong></div>';
            warningResults.forEach(([name, result]) => {
                html += `
                    <div style="
                        margin-bottom: 6px;
                        padding: 6px;
                        background: rgba(254,202,87,0.2);
                        border-left: 2px solid #feca57;
                        border-radius: 3px;
                        font-size: 10px;
                    ">
                        <strong>${name}</strong>: ${result.message}
                    </div>
                `;
            });
        }

        return html;
    }

    /**
     * Export results for external use
     */
    exportResults() {
        return {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            results: this.results,
            summary: {
                total: Object.keys(this.results).length,
                success: Object.values(this.results).filter(r => r.status === 'success').length,
                warnings: Object.values(this.results).filter(r => r.status === 'warning').length,
                errors: Object.values(this.results).filter(r => r.status === 'error').length
            },
            quickFixes: this.generateQuickFixes()
        };
    }
}

// Create global instance
window.ConfigDebugger = new ConfigurationDebugger();

// Track script loading errors
window.scriptLoadErrors = window.scriptLoadErrors || [];
window.addEventListener('error', (event) => {
    if (event.filename) {
        window.scriptLoadErrors.push({
            filename: event.filename,
            message: event.message,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString()
        });
    }
});

console.log('🔍 Configuration Debugger loaded and ready');
console.log('Use window.ConfigDebugger.runFullDiagnostic() to run diagnostics manually');
console.log('Check window.ConfigDebugger.results for detailed results');