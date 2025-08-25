/**
 * Configuration Fallback Loader
 * Provides multiple fallback mechanisms for loading configuration
 * Ensures configuration is available even when primary sources fail
 */

class ConfigFallbackLoader {
    constructor() {
        this.configSources = [];
        this.loadedConfig = {};
        this.loadAttempts = {};
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.debug = window.location.hostname === 'localhost' || window.location.search.includes('debug=true');
        
        this.initializeConfigSources();
    }

    // Initialize all possible configuration sources
    initializeConfigSources() {
        this.configSources = [
            // Primary source: Static config file
            {
                name: 'supabase-config-file',
                priority: 1,
                loader: () => this.loadFromScript('/js/config/supabase-config.js'),
                validator: (config) => config.SUPABASE_CONFIG && config.SUPABASE_CONFIG.url
            },
            
            // Secondary source: Environment variables (if exposed)
            {
                name: 'environment-config',
                priority: 2,
                loader: () => this.loadFromEnvironment(),
                validator: (config) => config.url && config.anonKey
            },
            
            // Fallback source: LocalStorage cache
            {
                name: 'localstorage-cache',
                priority: 3,
                loader: () => this.loadFromLocalStorage(),
                validator: (config) => config.url && config.anonKey
            },
            
            // Emergency fallback: Hardcoded default
            {
                name: 'default-config',
                priority: 4,
                loader: () => this.loadDefaultConfig(),
                validator: (config) => config.url && config.anonKey
            },
            
            // Network fallback: Remote config
            {
                name: 'remote-config',
                priority: 5,
                loader: () => this.loadFromRemote(),
                validator: (config) => config.url && config.anonKey
            }
        ];
    }

    // Load configuration from script file
    async loadFromScript(scriptPath) {
        return new Promise((resolve, reject) => {
            try {
                // Check if already loaded
                if (window.SUPABASE_CONFIG) {
                    this.log('Script config already loaded');
                    return resolve(window.SUPABASE_CONFIG);
                }
                
                // Create script element
                const script = document.createElement('script');
                script.src = scriptPath + '?v=' + Date.now(); // Cache busting
                script.async = true;
                
                script.onload = () => {
                    if (window.SUPABASE_CONFIG) {
                        this.log('Script config loaded successfully');
                        resolve(window.SUPABASE_CONFIG);
                    } else {
                        reject(new Error('Script loaded but config not found'));
                    }
                };
                
                script.onerror = (error) => {
                    this.log('Script config failed to load:', error);
                    reject(new Error('Failed to load config script'));
                };
                
                // Add to document if not already present
                if (!document.querySelector(`script[src*="${scriptPath}"]`)) {
                    document.head.appendChild(script);
                } else {
                    // Script already exists, check for config
                    setTimeout(() => {
                        if (window.SUPABASE_CONFIG) {
                            resolve(window.SUPABASE_CONFIG);
                        } else {
                            reject(new Error('Script exists but config not available'));
                        }
                    }, 100);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Load configuration from environment variables (if available)
    async loadFromEnvironment() {
        return new Promise((resolve, reject) => {
            try {
                // Check for exposed environment variables
                const envConfig = {
                    url: window.ENV_SUPABASE_URL || 
                         window.REACT_APP_SUPABASE_URL || 
                         window.NEXT_PUBLIC_SUPABASE_URL ||
                         window.VITE_SUPABASE_URL,
                    anonKey: window.ENV_SUPABASE_ANON_KEY || 
                             window.REACT_APP_SUPABASE_ANON_KEY || 
                             window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                             window.VITE_SUPABASE_ANON_KEY
                };
                
                if (envConfig.url && envConfig.anonKey) {
                    this.log('Environment config loaded');
                    resolve(envConfig);
                } else {
                    reject(new Error('Environment variables not available'));
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Load configuration from localStorage cache
    async loadFromLocalStorage() {
        return new Promise((resolve, reject) => {
            try {
                const cached = localStorage.getItem('supabase_config_cache');
                if (cached) {
                    const config = JSON.parse(cached);
                    
                    // Check if cache is not expired (24 hours)
                    if (config.timestamp && Date.now() - config.timestamp < 24 * 60 * 60 * 1000) {
                        this.log('LocalStorage cache loaded');
                        resolve(config.data);
                    } else {
                        localStorage.removeItem('supabase_config_cache');
                        reject(new Error('LocalStorage cache expired'));
                    }
                } else {
                    reject(new Error('No localStorage cache available'));
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Load default/hardcoded configuration
    async loadDefaultConfig() {
        return new Promise((resolve) => {
            const defaultConfig = {
                url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM',
                auth: {
                    session: {
                        persistSession: true,
                        storage: 'localStorage',
                        storageKey: 'supabase-auth-session',
                        autoRefresh: true
                    }
                },
                source: 'default-fallback'
            };
            
            this.log('Default config loaded as fallback');
            resolve(defaultConfig);
        });
    }

    // Load configuration from remote endpoint
    async loadFromRemote() {
        return new Promise(async (resolve, reject) => {
            try {
                const endpoints = [
                    '/.netlify/functions/config',
                    '/api/config',
                    '/config.json'
                ];
                
                for (const endpoint of endpoints) {
                    try {
                        const response = await fetch(endpoint, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'Cache-Control': 'no-cache'
                            },
                            timeout: 5000
                        });
                        
                        if (response.ok) {
                            const config = await response.json();
                            if (config && config.supabase) {
                                this.log('Remote config loaded from:', endpoint);
                                resolve(config.supabase);
                                return;
                            }
                        }
                    } catch (endpointError) {
                        this.log('Remote endpoint failed:', endpoint, endpointError.message);
                    }
                }
                
                reject(new Error('All remote endpoints failed'));
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Attempt to load configuration with retries
    async loadConfigWithRetry(source) {
        const attempts = this.loadAttempts[source.name] || 0;
        
        if (attempts >= this.maxRetries) {
            throw new Error(`Max retries exceeded for ${source.name}`);
        }
        
        this.loadAttempts[source.name] = attempts + 1;
        
        try {
            const config = await source.loader();
            
            if (source.validator(config)) {
                this.loadAttempts[source.name] = 0; // Reset on success
                return config;
            } else {
                throw new Error(`Config validation failed for ${source.name}`);
            }
            
        } catch (error) {
            this.log(`Attempt ${attempts + 1} failed for ${source.name}:`, error.message);
            
            if (attempts < this.maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.loadConfigWithRetry(source);
            } else {
                throw error;
            }
        }
    }

    // Load configuration from all sources in priority order
    async loadConfiguration() {
        this.log('Starting configuration loading process...');
        
        // Sort sources by priority
        const sortedSources = this.configSources.sort((a, b) => a.priority - b.priority);
        
        for (const source of sortedSources) {
            try {
                this.log(`Attempting to load from: ${source.name}`);
                
                const config = await this.loadConfigWithRetry(source);
                
                if (config) {
                    // Store successful config
                    this.loadedConfig = {
                        ...config,
                        loadedFrom: source.name,
                        loadedAt: new Date().toISOString()
                    };
                    
                    // Cache in localStorage for future use
                    this.cacheConfig(config);
                    
                    // Set global config
                    window.SUPABASE_CONFIG = this.loadedConfig;
                    
                    this.log(`Configuration loaded successfully from: ${source.name}`);
                    
                    // Dispatch success event
                    window.dispatchEvent(new CustomEvent('configLoaded', {
                        detail: {
                            source: source.name,
                            config: this.loadedConfig
                        }
                    }));
                    
                    return this.loadedConfig;
                }
                
            } catch (error) {
                this.log(`Failed to load from ${source.name}:`, error.message);
                continue; // Try next source
            }
        }
        
        // If we get here, all sources failed
        const errorMessage = 'All configuration sources failed';
        this.log(errorMessage);
        
        window.dispatchEvent(new CustomEvent('configLoadFailed', {
            detail: {
                error: errorMessage,
                attempts: this.loadAttempts
            }
        }));
        
        throw new Error(errorMessage);
    }

    // Cache configuration in localStorage
    cacheConfig(config) {
        try {
            const cacheData = {
                data: config,
                timestamp: Date.now(),
                source: 'cache'
            };
            
            localStorage.setItem('supabase_config_cache', JSON.stringify(cacheData));
            this.log('Configuration cached in localStorage');
            
        } catch (error) {
            this.log('Failed to cache configuration:', error.message);
        }
    }

    // Validate current configuration
    validateCurrentConfig() {
        const config = window.SUPABASE_CONFIG;
        
        if (!config) {
            return { valid: false, errors: ['No configuration found'] };
        }
        
        const errors = [];
        
        if (!config.url) {
            errors.push('Missing Supabase URL');
        } else if (!config.url.includes('supabase.co')) {
            errors.push('Invalid Supabase URL format');
        }
        
        if (!config.anonKey) {
            errors.push('Missing anonymous key');
        } else if (!config.anonKey.startsWith('eyJ')) {
            errors.push('Invalid anonymous key format');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            source: config.loadedFrom,
            loadedAt: config.loadedAt
        };
    }

    // Monitor configuration health
    startHealthMonitoring() {
        // Check configuration every 5 minutes
        setInterval(() => {
            const validation = this.validateCurrentConfig();
            
            if (!validation.valid) {
                this.log('Configuration validation failed, attempting reload...');
                this.loadConfiguration().catch(error => {
                    this.log('Configuration reload failed:', error.message);
                });
            }
        }, 5 * 60 * 1000);
        
        // Listen for network state changes
        window.addEventListener('online', () => {
            this.log('Network back online, checking configuration...');
            this.loadConfiguration().catch(() => {
                // Silent fail - config might already be working
            });
        });
    }

    // Repair configuration issues
    async repairConfiguration() {
        this.log('Starting configuration repair...');
        
        const repairs = [
            // Clear cache and reload
            () => {
                localStorage.removeItem('supabase_config_cache');
                delete window.SUPABASE_CONFIG;
                this.loadAttempts = {};
                return this.loadConfiguration();
            },
            
            // Force reload from remote
            () => {
                const remoteSource = this.configSources.find(s => s.name === 'remote-config');
                if (remoteSource) {
                    return this.loadConfigWithRetry(remoteSource);
                }
                throw new Error('Remote source not available');
            },
            
            // Force default config
            () => {
                return this.loadDefaultConfig();
            }
        ];
        
        for (const repair of repairs) {
            try {
                const config = await repair();
                if (config) {
                    this.log('Configuration repaired successfully');
                    return config;
                }
            } catch (error) {
                this.log('Repair attempt failed:', error.message);
            }
        }
        
        throw new Error('All repair attempts failed');
    }

    // Logging utility
    log(message, ...args) {
        if (this.debug) {
            console.log(`[ConfigFallbackLoader] ${message}`, ...args);
        }
    }

    // Get current configuration status
    getStatus() {
        return {
            loaded: !!window.SUPABASE_CONFIG,
            source: this.loadedConfig.loadedFrom,
            loadedAt: this.loadedConfig.loadedAt,
            validation: this.validateCurrentConfig(),
            attempts: this.loadAttempts
        };
    }
}

// Auto-initialize if window is available
if (typeof window !== 'undefined') {
    // Create global instance
    window.ConfigFallbackLoader = new ConfigFallbackLoader();
    
    // Auto-load configuration
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await window.ConfigFallbackLoader.loadConfiguration();
            window.ConfigFallbackLoader.startHealthMonitoring();
        } catch (error) {
            console.error('Failed to initialize configuration:', error);
        }
    });
    
    // Expose repair function globally
    window.repairConfiguration = () => window.ConfigFallbackLoader.repairConfiguration();
    window.getConfigStatus = () => window.ConfigFallbackLoader.getStatus();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigFallbackLoader;
}