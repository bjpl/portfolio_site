/**
 * Configuration Tracer
 * Comprehensive logging and tracing system for configuration loading
 */

class ConfigTracer {
    constructor() {
        this.traces = [];
        this.startTime = performance.now();
        this.isEnabled = this.shouldEnable();
        this.maxTraces = 1000; // Prevent memory overflow
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        this.currentLogLevel = this.isEnabled ? this.logLevels.DEBUG : this.logLevels.WARN;
        
        this.initializeTracing();
    }

    // Determine if tracing should be enabled
    shouldEnable() {
        return (
            window.location.hostname === 'localhost' ||
            window.location.search.includes('debug=true') ||
            window.location.search.includes('trace=true') ||
            localStorage.getItem('config-trace-enabled') === 'true'
        );
    }

    // Initialize tracing system
    initializeTracing() {
        if (!this.isEnabled) return;
        
        this.trace('INIT', 'Configuration tracer initialized', {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            enabled: true
        });

        // Intercept configuration-related events
        this.setupEventListeners();
        
        // Monitor performance
        this.setupPerformanceMonitoring();
        
        // Create global interface
        this.setupGlobalInterface();
    }

    // Setup event listeners for configuration events
    setupEventListeners() {
        // Script loading events
        const originalAppendChild = Element.prototype.appendChild;
        const self = this;
        
        Element.prototype.appendChild = function(child) {
            if (child.tagName === 'SCRIPT' && child.src) {
                self.trace('SCRIPT_LOAD', `Loading script: ${child.src}`, {
                    src: child.src,
                    async: child.async,
                    defer: child.defer
                });
                
                child.addEventListener('load', () => {
                    self.trace('SCRIPT_SUCCESS', `Script loaded: ${child.src}`, {
                        src: child.src,
                        loadTime: performance.now() - self.startTime
                    });
                });
                
                child.addEventListener('error', (error) => {
                    self.trace('SCRIPT_ERROR', `Script failed: ${child.src}`, {
                        src: child.src,
                        error: error.message,
                        loadTime: performance.now() - self.startTime
                    });
                });
            }
            
            return originalAppendChild.call(this, child);
        };

        // Configuration events
        window.addEventListener('supabaseConfigReady', (event) => {
            this.trace('CONFIG_READY', 'Supabase configuration ready', {
                config: event.detail,
                loadTime: performance.now() - this.startTime
            });
        });

        window.addEventListener('configLoaded', (event) => {
            this.trace('CONFIG_LOADED', 'Configuration loaded successfully', {
                source: event.detail.source,
                config: event.detail.config,
                loadTime: performance.now() - this.startTime
            });
        });

        window.addEventListener('configLoadFailed', (event) => {
            this.trace('CONFIG_FAILED', 'Configuration loading failed', {
                error: event.detail.error,
                attempts: event.detail.attempts,
                loadTime: performance.now() - this.startTime
            });
        });

        // DOM ready events
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.trace('DOM_READY', 'DOM content loaded', {
                    loadTime: performance.now() - this.startTime
                });
            });
        }

        window.addEventListener('load', () => {
            this.trace('WINDOW_LOADED', 'Window fully loaded', {
                loadTime: performance.now() - this.startTime
            });
        });
    }

    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor resource loading
        if (window.PerformanceObserver) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.name.includes('config') || entry.name.includes('supabase')) {
                        this.trace('RESOURCE_TIMING', `Resource loaded: ${entry.name}`, {
                            name: entry.name,
                            duration: entry.duration,
                            transferSize: entry.transferSize,
                            type: entry.initiatorType
                        });
                    }
                });
            });
            
            try {
                observer.observe({ entryTypes: ['resource'] });
            } catch (error) {
                this.trace('PERF_OBSERVER_ERROR', 'Performance observer setup failed', {
                    error: error.message
                });
            }
        }

        // Monitor memory usage
        setInterval(() => {
            if (performance.memory) {
                const memory = performance.memory;
                const memoryMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                
                if (memoryMB > 30) { // Only log if memory usage is significant
                    this.trace('MEMORY_USAGE', 'Memory usage check', {
                        usedJSHeapSize: memoryMB + 'MB',
                        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
                        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
                    });
                }
            }
        }, 30000); // Check every 30 seconds
    }

    // Setup global interface for external access
    setupGlobalInterface() {
        window.ConfigTracer = this;
        
        // Add console commands
        window.getConfigTraces = () => this.getTraces();
        window.clearConfigTraces = () => this.clearTraces();
        window.exportConfigTraces = () => this.exportTraces();
        window.setConfigTraceLevel = (level) => this.setLogLevel(level);
        window.enableConfigTrace = () => this.enable();
        window.disableConfigTrace = () => this.disable();
    }

    // Main tracing function
    trace(type, message, data = {}) {
        if (!this.isEnabled && !this.isImportantTrace(type)) {
            return;
        }
        
        const timestamp = performance.now();
        const traceEntry = {
            id: this.generateTraceId(),
            timestamp: timestamp,
            relativeTime: timestamp - this.startTime,
            type: type,
            message: message,
            data: data,
            stack: this.getStackTrace(),
            level: this.getLogLevel(type)
        };

        // Add to traces array
        this.traces.push(traceEntry);
        
        // Limit traces to prevent memory issues
        if (this.traces.length > this.maxTraces) {
            this.traces = this.traces.slice(-this.maxTraces);
        }

        // Console output based on log level
        if (this.shouldLog(traceEntry.level)) {
            this.outputToConsole(traceEntry);
        }

        // Dispatch trace event for external listeners
        window.dispatchEvent(new CustomEvent('configTrace', {
            detail: traceEntry
        }));

        return traceEntry;
    }

    // Generate unique trace ID
    generateTraceId() {
        return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get stack trace for debugging
    getStackTrace() {
        try {
            throw new Error();
        } catch (e) {
            const stack = e.stack.split('\n').slice(2, 5); // Get relevant stack frames
            return stack.map(line => line.trim()).join(' -> ');
        }
    }

    // Determine log level for trace type
    getLogLevel(type) {
        const errorTypes = ['ERROR', 'SCRIPT_ERROR', 'CONFIG_FAILED', 'FETCH_ERROR'];
        const warnTypes = ['WARN', 'PERF_OBSERVER_ERROR', 'VALIDATION_FAILED'];
        const debugTypes = ['DEBUG', 'SCRIPT_LOAD', 'RESOURCE_TIMING'];
        
        if (errorTypes.includes(type)) return this.logLevels.ERROR;
        if (warnTypes.includes(type)) return this.logLevels.WARN;
        if (debugTypes.includes(type)) return this.logLevels.DEBUG;
        return this.logLevels.INFO;
    }

    // Check if this trace type is important enough to always log
    isImportantTrace(type) {
        const importantTypes = ['ERROR', 'CONFIG_FAILED', 'SCRIPT_ERROR', 'CRITICAL'];
        return importantTypes.includes(type);
    }

    // Check if we should log this level
    shouldLog(level) {
        return level >= this.currentLogLevel;
    }

    // Output trace to console with appropriate styling
    outputToConsole(trace) {
        const timeStr = `${Math.round(trace.relativeTime)}ms`;
        const typeStr = `[${trace.type}]`;
        
        switch (trace.level) {
            case this.logLevels.ERROR:
                console.error(`🔴 ${timeStr} ${typeStr}`, trace.message, trace.data);
                break;
            case this.logLevels.WARN:
                console.warn(`🟡 ${timeStr} ${typeStr}`, trace.message, trace.data);
                break;
            case this.logLevels.DEBUG:
                console.debug(`🔍 ${timeStr} ${typeStr}`, trace.message, trace.data);
                break;
            default:
                console.log(`ℹ️ ${timeStr} ${typeStr}`, trace.message, trace.data);
        }
    }

    // Trace configuration state changes
    traceConfigState(stateName, state, context = {}) {
        this.trace('CONFIG_STATE', `Configuration state: ${stateName}`, {
            state: state,
            context: context,
            timestamp: new Date().toISOString()
        });
    }

    // Trace API calls
    traceApiCall(method, url, options = {}, response = null, error = null) {
        const baseData = {
            method: method,
            url: url,
            options: options,
            timestamp: new Date().toISOString()
        };

        if (error) {
            this.trace('API_ERROR', `API call failed: ${method} ${url}`, {
                ...baseData,
                error: error.message,
                stack: error.stack
            });
        } else {
            this.trace('API_SUCCESS', `API call completed: ${method} ${url}`, {
                ...baseData,
                status: response?.status,
                statusText: response?.statusText
            });
        }
    }

    // Trace authentication events
    traceAuth(event, details = {}) {
        this.trace('AUTH', `Authentication event: ${event}`, {
            event: event,
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    // Trace performance metrics
    tracePerformance(metric, value, context = {}) {
        this.trace('PERFORMANCE', `Performance metric: ${metric}`, {
            metric: metric,
            value: value,
            context: context,
            timestamp: new Date().toISOString()
        });
    }

    // Get all traces
    getTraces(filter = null) {
        if (filter) {
            return this.traces.filter(trace => {
                if (typeof filter === 'string') {
                    return trace.type === filter;
                } else if (typeof filter === 'function') {
                    return filter(trace);
                }
                return true;
            });
        }
        return [...this.traces];
    }

    // Get traces by type
    getTracesByType(type) {
        return this.traces.filter(trace => trace.type === type);
    }

    // Get recent traces
    getRecentTraces(count = 50) {
        return this.traces.slice(-count);
    }

    // Get traces by time range
    getTracesByTimeRange(startTime, endTime) {
        return this.traces.filter(trace => 
            trace.relativeTime >= startTime && trace.relativeTime <= endTime
        );
    }

    // Clear traces
    clearTraces() {
        this.traces = [];
        this.trace('CLEAR', 'Traces cleared', {
            clearedAt: new Date().toISOString()
        });
    }

    // Export traces
    exportTraces(format = 'json') {
        const exportData = {
            metadata: {
                exported: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                traceCount: this.traces.length,
                sessionDuration: performance.now() - this.startTime
            },
            traces: this.traces
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'csv') {
            return this.tracesToCsv(this.traces);
        }

        return exportData;
    }

    // Convert traces to CSV format
    tracesToCsv(traces) {
        const headers = ['Timestamp', 'Type', 'Message', 'Level', 'Data'];
        const csvRows = [headers.join(',')];

        traces.forEach(trace => {
            const row = [
                trace.timestamp,
                trace.type,
                `"${trace.message.replace(/"/g, '""')}"`,
                trace.level,
                `"${JSON.stringify(trace.data).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    // Download traces as file
    downloadTraces(format = 'json') {
        const data = this.exportTraces(format);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `config-traces-${timestamp}.${format}`;
        
        const blob = new Blob([data], { 
            type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.trace('EXPORT', `Traces exported: ${filename}`, {
            format: format,
            traceCount: this.traces.length
        });
    }

    // Set log level
    setLogLevel(level) {
        if (typeof level === 'string') {
            level = this.logLevels[level.toUpperCase()];
        }
        
        if (level !== undefined) {
            this.currentLogLevel = level;
            this.trace('LOG_LEVEL', `Log level changed`, {
                newLevel: level,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Enable tracing
    enable() {
        this.isEnabled = true;
        localStorage.setItem('config-trace-enabled', 'true');
        this.trace('ENABLE', 'Configuration tracing enabled', {
            timestamp: new Date().toISOString()
        });
    }

    // Disable tracing
    disable() {
        this.trace('DISABLE', 'Configuration tracing disabled', {
            timestamp: new Date().toISOString()
        });
        this.isEnabled = false;
        localStorage.setItem('config-trace-enabled', 'false');
    }

    // Get summary statistics
    getSummary() {
        const summary = {
            totalTraces: this.traces.length,
            sessionDuration: performance.now() - this.startTime,
            traceTypes: {},
            logLevels: {},
            timeline: []
        };

        this.traces.forEach(trace => {
            // Count by type
            summary.traceTypes[trace.type] = (summary.traceTypes[trace.type] || 0) + 1;
            
            // Count by level
            const levelName = Object.keys(this.logLevels).find(key => 
                this.logLevels[key] === trace.level
            );
            summary.logLevels[levelName] = (summary.logLevels[levelName] || 0) + 1;
        });

        // Create timeline (last 20 traces)
        summary.timeline = this.traces.slice(-20).map(trace => ({
            time: Math.round(trace.relativeTime),
            type: trace.type,
            message: trace.message
        }));

        return summary;
    }
}

// Auto-initialize if window is available
if (typeof window !== 'undefined') {
    // Initialize tracer
    window.configTracer = new ConfigTracer();
    
    // Expose global functions
    window.traceConfig = (type, message, data) => window.configTracer.trace(type, message, data);
    window.traceConfigState = (stateName, state, context) => window.configTracer.traceConfigState(stateName, state, context);
    window.traceApiCall = (method, url, options, response, error) => window.configTracer.traceApiCall(method, url, options, response, error);
    window.traceAuth = (event, details) => window.configTracer.traceAuth(event, details);
    window.tracePerformance = (metric, value, context) => window.configTracer.tracePerformance(metric, value, context);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigTracer;
}