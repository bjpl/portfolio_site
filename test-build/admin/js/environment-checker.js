/**
 * Environment and Secrets Checker for Admin Panel
 * Validates environment variables and configuration security
 */

class EnvironmentChecker {
    constructor() {
        this.requiredEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY'
        ];
        this.optionalEnvVars = [
            'SUPABASE_SERVICE_ROLE_KEY',
            'NETLIFY_SITE_ID',
            'NODE_ENV'
        ];
        this.sensitivePatterns = [
            /service_role/i,
            /secret/i,
            /private.*key/i,
            /password/i,
            /token.*[a-f0-9]{32}/i
        ];
        this.results = new Map();
    }

    /**
     * Check all environment variables and secrets
     */
    async checkEnvironment() {
        console.log('🔍 Checking environment variables and secrets...');

        await this.checkRequiredVariables();
        await this.checkOptionalVariables();
        await this.checkConfigurationSecurity();
        await this.checkClientSideExposure();
        await this.checkProductionReadiness();
        
        return this.generateReport();
    }

    /**
     * Check required environment variables
     */
    async checkRequiredVariables() {
        const missing = [];
        const present = [];

        for (const varName of this.requiredEnvVars) {
            const value = this.getEnvVar(varName);
            
            if (!value || value === 'undefined' || value === '') {
                missing.push(varName);
            } else {
                present.push({
                    name: varName,
                    hasValue: true,
                    source: this.getEnvSource(varName),
                    length: value.length,
                    masked: this.maskSensitiveValue(value)
                });
            }
        }

        this.results.set('requiredVars', {
            status: missing.length === 0 ? 'pass' : 'fail',
            missing,
            present,
            message: missing.length === 0 
                ? `All ${this.requiredEnvVars.length} required variables present`
                : `Missing required variables: ${missing.join(', ')}`
        });
    }

    /**
     * Check optional environment variables
     */
    async checkOptionalVariables() {
        const present = [];

        for (const varName of this.optionalEnvVars) {
            const value = this.getEnvVar(varName);
            
            if (value && value !== 'undefined' && value !== '') {
                present.push({
                    name: varName,
                    hasValue: true,
                    source: this.getEnvSource(varName),
                    length: value.length,
                    masked: this.maskSensitiveValue(value)
                });
            }
        }

        this.results.set('optionalVars', {
            status: 'info',
            present,
            message: `${present.length} optional variables configured`
        });
    }

    /**
     * Check configuration security
     */
    async checkConfigurationSecurity() {
        const securityIssues = [];
        const goodPractices = [];

        // Check for hardcoded secrets in global objects
        const globalObjects = ['window.SUPABASE_CONFIG', 'window.AdminConfig', 'window.ENV'];
        
        for (const objPath of globalObjects) {
            const obj = this.getObjectByPath(objPath);
            if (obj) {
                const issues = this.scanForSensitiveData(obj, objPath);
                securityIssues.push(...issues);
            }
        }

        // Check environment detection
        const isProduction = this.isProductionEnvironment();
        const isDevelopment = this.isDevelopmentEnvironment();

        if (!isProduction && !isDevelopment) {
            securityIssues.push('Environment not properly detected (neither prod nor dev)');
        } else {
            goodPractices.push(`Environment properly detected: ${isProduction ? 'production' : 'development'}`);
        }

        // Check for proper key masking
        if (this.isKeyProperlyMasked()) {
            goodPractices.push('Sensitive keys are properly masked in logs');
        } else {
            securityIssues.push('Sensitive keys may be exposed in logs or console');
        }

        this.results.set('security', {
            status: securityIssues.length === 0 ? 'pass' : 'warn',
            issues: securityIssues,
            goodPractices,
            message: securityIssues.length === 0 
                ? 'No security issues detected'
                : `${securityIssues.length} security concerns found`
        });
    }

    /**
     * Check for client-side exposure of sensitive data
     */
    async checkClientSideExposure() {
        const exposureRisks = [];
        const safeConfigurations = [];

        // Check localStorage for sensitive data
        try {
            const lsKeys = Object.keys(localStorage);
            for (const key of lsKeys) {
                const value = localStorage.getItem(key);
                if (this.isSensitiveData(value)) {
                    exposureRisks.push(`Sensitive data in localStorage: ${key}`);
                }
            }
        } catch (error) {
            // localStorage not available
        }

        // Check sessionStorage
        try {
            const ssKeys = Object.keys(sessionStorage);
            for (const key of ssKeys) {
                const value = sessionStorage.getItem(key);
                if (this.isSensitiveData(value)) {
                    exposureRisks.push(`Sensitive data in sessionStorage: ${key}`);
                }
            }
        } catch (error) {
            // sessionStorage not available
        }

        // Check for exposed service role keys
        const supabaseConfig = window.SUPABASE_CONFIG;
        if (supabaseConfig && supabaseConfig.serviceRoleKey) {
            exposureRisks.push('Service role key exposed in client-side config');
        } else {
            safeConfigurations.push('No service role key exposed client-side');
        }

        this.results.set('clientExposure', {
            status: exposureRisks.length === 0 ? 'pass' : 'warn',
            risks: exposureRisks,
            safeConfigs: safeConfigurations,
            message: exposureRisks.length === 0 
                ? 'No client-side exposure risks detected'
                : `${exposureRisks.length} exposure risks found`
        });
    }

    /**
     * Check production readiness
     */
    async checkProductionReadiness() {
        const readinessIssues = [];
        const readyFeatures = [];

        const isProduction = this.isProductionEnvironment();

        if (isProduction) {
            // Check production-specific requirements
            if (this.getEnvVar('NODE_ENV') !== 'production') {
                readinessIssues.push('NODE_ENV should be "production" in production environment');
            } else {
                readyFeatures.push('NODE_ENV correctly set to production');
            }

            // Check for development configurations
            if (window.location.protocol !== 'https:') {
                readinessIssues.push('Should use HTTPS in production');
            } else {
                readyFeatures.push('Using HTTPS');
            }

            // Check for debug flags
            if (this.hasDebugFlagsEnabled()) {
                readinessIssues.push('Debug flags enabled in production');
            } else {
                readyFeatures.push('Debug flags properly disabled');
            }
        } else {
            readyFeatures.push('Development environment detected');
        }

        this.results.set('productionReadiness', {
            status: isProduction && readinessIssues.length > 0 ? 'warn' : 'pass',
            issues: readinessIssues,
            readyFeatures,
            isProduction,
            message: readinessIssues.length === 0 
                ? 'Environment properly configured'
                : `${readinessIssues.length} production issues found`
        });
    }

    /**
     * Get environment variable from multiple sources
     */
    getEnvVar(name) {
        // Try multiple sources in order of preference
        return window.process?.env?.[name] ||
               window.process?.env?.[`REACT_APP_${name}`] ||
               window.process?.env?.[`VITE_${name}`] ||
               window.ENV?.[name] ||
               window.SUPABASE_CONFIG?.[name.toLowerCase().replace('supabase_', '')] ||
               this.getFromMetaTag(name) ||
               this.getFromGlobalConfig(name);
    }

    /**
     * Get variable source
     */
    getEnvSource(name) {
        if (window.process?.env?.[name]) return 'process.env';
        if (window.process?.env?.[`REACT_APP_${name}`]) return 'process.env (React)';
        if (window.process?.env?.[`VITE_${name}`]) return 'process.env (Vite)';
        if (window.ENV?.[name]) return 'window.ENV';
        if (window.SUPABASE_CONFIG?.[name.toLowerCase().replace('supabase_', '')]) return 'SUPABASE_CONFIG';
        if (this.getFromMetaTag(name)) return 'meta tag';
        if (this.getFromGlobalConfig(name)) return 'global config';
        return 'unknown';
    }

    /**
     * Get from meta tag
     */
    getFromMetaTag(name) {
        const meta = document.querySelector(`meta[name="${name}"]`);
        return meta ? meta.getAttribute('content') : null;
    }

    /**
     * Get from global configuration
     */
    getFromGlobalConfig(name) {
        const configs = [window.AdminConfig, window.APIConfig, window.CentralAPIConfig];
        
        for (const config of configs) {
            if (config && typeof config.get === 'function') {
                const value = config.get(name.toLowerCase());
                if (value) return value;
            }
        }
        
        return null;
    }

    /**
     * Get object by path
     */
    getObjectByPath(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], window);
    }

    /**
     * Scan object for sensitive data
     */
    scanForSensitiveData(obj, path, visited = new Set()) {
        if (!obj || typeof obj !== 'object' || visited.has(obj)) {
            return [];
        }
        
        visited.add(obj);
        const issues = [];

        for (const [key, value] of Object.entries(obj)) {
            const fullPath = `${path}.${key}`;
            
            if (typeof value === 'string' && this.isSensitiveData(value)) {
                issues.push(`Potential sensitive data at ${fullPath}`);
            } else if (typeof value === 'object' && value !== null) {
                issues.push(...this.scanForSensitiveData(value, fullPath, visited));
            }
        }

        return issues;
    }

    /**
     * Check if value contains sensitive data
     */
    isSensitiveData(value) {
        if (typeof value !== 'string' || value.length < 20) {
            return false;
        }

        return this.sensitivePatterns.some(pattern => pattern.test(value));
    }

    /**
     * Mask sensitive value for logging
     */
    maskSensitiveValue(value) {
        if (!value || value.length < 8) return '[REDACTED]';
        return value.substring(0, 4) + '***' + value.substring(value.length - 4);
    }

    /**
     * Check if environment is production
     */
    isProductionEnvironment() {
        const hostname = window.location.hostname;
        return !hostname.includes('localhost') && 
               !hostname.includes('127.0.0.1') && 
               !hostname.includes('dev') &&
               !hostname.includes('staging');
    }

    /**
     * Check if environment is development
     */
    isDevelopmentEnvironment() {
        const hostname = window.location.hostname;
        return hostname.includes('localhost') || hostname.includes('127.0.0.1');
    }

    /**
     * Check if key is properly masked
     */
    isKeyProperlyMasked() {
        // Check if sensitive values are being logged in plain text
        const originalLog = console.log;
        let hasExposedKeys = false;

        console.log = function(...args) {
            const message = args.join(' ');
            if (message.includes('eyJ') && message.length > 100) {
                hasExposedKeys = true;
            }
            originalLog.apply(console, args);
        };

        // Restore original console.log after test
        setTimeout(() => {
            console.log = originalLog;
        }, 100);

        return !hasExposedKeys;
    }

    /**
     * Check if debug flags are enabled
     */
    hasDebugFlagsEnabled() {
        const debugFlags = [
            window.DEBUG,
            window.AdminConfig?.logging?.level === 'debug',
            window.APIConfig?.get?.('logging.enableNetworkLogs'),
            localStorage.getItem('debug') === 'true'
        ];

        return debugFlags.some(flag => Boolean(flag));
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            environment: {
                type: this.isProductionEnvironment() ? 'production' : 'development',
                hostname: window.location.hostname,
                protocol: window.location.protocol,
                userAgent: navigator.userAgent.substring(0, 50) + '...'
            },
            overall: {
                status: 'pass',
                warnings: 0,
                errors: 0
            },
            checks: {},
            recommendations: []
        };

        // Process all results
        for (const [checkName, result] of this.results) {
            report.checks[checkName] = result;

            if (result.status === 'warn') {
                report.overall.warnings++;
                report.overall.status = 'warn';
            } else if (result.status === 'fail') {
                report.overall.errors++;
                report.overall.status = 'fail';
            }
        }

        // Generate recommendations
        if (report.overall.errors > 0) {
            report.recommendations.push('🚨 Critical environment issues must be resolved before production use');
        }

        if (report.overall.warnings > 0) {
            report.recommendations.push('⚠️ Review security warnings and consider improvements');
        }

        if (this.isProductionEnvironment() && report.overall.status !== 'pass') {
            report.recommendations.push('🔒 Production environment detected - resolve all issues immediately');
        }

        return report;
    }

    /**
     * Display report
     */
    displayReport(report) {
        console.group('🔍 Environment & Security Check Report');
        
        console.log(`Environment: ${report.environment.type}`);
        console.log(`Overall Status: ${report.overall.status.toUpperCase()}`);
        
        if (report.overall.warnings > 0 || report.overall.errors > 0) {
            console.warn(`Issues: ${report.overall.errors} errors, ${report.overall.warnings} warnings`);
        }

        console.group('Check Results:');
        for (const [checkName, result] of Object.entries(report.checks)) {
            const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
            console.log(`${icon} ${checkName}: ${result.message}`);
        }
        console.groupEnd();

        if (report.recommendations.length > 0) {
            console.group('Recommendations:');
            report.recommendations.forEach(rec => console.log(rec));
            console.groupEnd();
        }

        console.groupEnd();

        return report;
    }
}

// Create global environment checker
window.environmentChecker = new EnvironmentChecker();

// Auto-run check in admin pages
if (window.location.pathname.includes('/admin/')) {
    document.addEventListener('DOMContentLoaded', async () => {
        setTimeout(async () => {
            const report = await window.environmentChecker.checkEnvironment();
            window.environmentChecker.displayReport(report);
            
            // Store report for debugging
            window.environmentReport = report;
        }, 3000);
    });
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentChecker;
}