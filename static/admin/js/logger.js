/**
 * Logger System
 * Professional logging with levels, filtering, and remote logging capability
 */

class Logger {
    constructor(options = {}) {
        this.config = {
            level: options.level || 'info',
            remote: options.remote || false,
            remoteUrl: options.remoteUrl || '/api/logs',
            buffer: options.buffer || true,
            bufferSize: options.bufferSize || 100,
            timestamp: options.timestamp !== false,
            prefix: options.prefix || '',
            ...options
        };

        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            critical: 4
        };

        this.buffer = [];
        this.init();
    }

    init() {
        // Set up remote logging interval if enabled
        if (this.config.remote && this.config.buffer) {
            setInterval(() => this.flushBuffer(), 30000); // Flush every 30 seconds
        }

        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.error('Uncaught error:', {
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled promise rejection:', event.reason);
        });
    }

    /**
     * Check if should log based on level
     */
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.config.level];
    }

    /**
     * Format log message
     */
    formatMessage(level, message, data) {
        const parts = [];

        if (this.config.timestamp) {
            parts.push(`[${new Date().toISOString()}]`);
        }

        parts.push(`[${level.toUpperCase()}]`);

        if (this.config.prefix) {
            parts.push(`[${this.config.prefix}]`);
        }

        parts.push(message);

        return parts.join(' ');
    }

    /**
     * Log with specific level
     */
    log(level, message, data = null) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, data);
        const logEntry = {
            level,
            message: formattedMessage,
            data,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Console output (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const consoleMethod = level === 'error' || level === 'critical' ? 'error' :
                                 level === 'warn' ? 'warn' :
                                 level === 'debug' ? 'debug' : 'log';
            
            if (data) {
                console[consoleMethod](formattedMessage, data);
            } else {
                console[consoleMethod](formattedMessage);
            }
        }

        // Add to buffer for remote logging
        if (this.config.remote) {
            this.buffer.push(logEntry);
            
            if (this.buffer.length >= this.config.bufferSize) {
                this.flushBuffer();
            }
        }

        // Store locally for debugging
        this.storeLocal(logEntry);

        // Send critical errors immediately
        if (level === 'critical' && this.config.remote) {
            this.sendToRemote([logEntry]);
        }
    }

    /**
     * Debug level logging
     */
    debug(message, data = null) {
        this.log('debug', message, data);
    }

    /**
     * Info level logging
     */
    info(message, data = null) {
        this.log('info', message, data);
    }

    /**
     * Warning level logging
     */
    warn(message, data = null) {
        this.log('warn', message, data);
    }

    /**
     * Error level logging
     */
    error(message, data = null) {
        this.log('error', message, data);
        
        // Show toast for errors
        if (window.Toast) {
            window.Toast.error(typeof message === 'string' ? message : 'An error occurred');
        }
    }

    /**
     * Critical error logging
     */
    critical(message, data = null) {
        this.log('critical', message, data);
        
        // Show toast for critical errors
        if (window.Toast) {
            window.Toast.error(`Critical: ${typeof message === 'string' ? message : 'System error'}`);
        }
    }

    /**
     * Store logs locally
     */
    storeLocal(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
            logs.push(logEntry);
            
            // Keep only last 500 logs
            if (logs.length > 500) {
                logs.splice(0, logs.length - 500);
            }
            
            localStorage.setItem('app_logs', JSON.stringify(logs));
        } catch (e) {
            // Silently fail if localStorage is full
        }
    }

    /**
     * Send logs to remote server
     */
    async sendToRemote(logs) {
        if (!this.config.remote || logs.length === 0) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(this.config.remoteUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ logs })
            });

            if (!response.ok) {
                throw new Error(`Failed to send logs: ${response.status}`);
            }
        } catch (error) {
            // Store failed logs for retry
            const failedLogs = JSON.parse(localStorage.getItem('failed_logs') || '[]');
            failedLogs.push(...logs);
            localStorage.setItem('failed_logs', JSON.stringify(failedLogs));
        }
    }

    /**
     * Flush log buffer
     */
    async flushBuffer() {
        if (this.buffer.length === 0) {
            return;
        }

        const logsToSend = [...this.buffer];
        this.buffer = [];
        
        await this.sendToRemote(logsToSend);
    }

    /**
     * Get stored logs
     */
    getStoredLogs(filter = {}) {
        try {
            const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
            
            return logs.filter(log => {
                if (filter.level && this.levels[log.level] < this.levels[filter.level]) {
                    return false;
                }
                if (filter.startDate && new Date(log.timestamp) < new Date(filter.startDate)) {
                    return false;
                }
                if (filter.endDate && new Date(log.timestamp) > new Date(filter.endDate)) {
                    return false;
                }
                if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) {
                    return false;
                }
                return true;
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * Clear stored logs
     */
    clearStoredLogs() {
        localStorage.removeItem('app_logs');
        localStorage.removeItem('failed_logs');
        this.buffer = [];
    }

    /**
     * Export logs
     */
    exportLogs(format = 'json') {
        const logs = this.getStoredLogs();
        
        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        } else if (format === 'csv') {
            const headers = ['timestamp', 'level', 'message', 'url'];
            const rows = logs.map(log => [
                log.timestamp,
                log.level,
                log.message.replace(/"/g, '""'),
                log.url
            ]);
            
            return [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
        }
        
        return logs;
    }

    /**
     * Performance logging
     */
    time(label) {
        performance.mark(`${label}-start`);
    }

    timeEnd(label) {
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);
        
        const measure = performance.getEntriesByName(label)[0];
        if (measure) {
            this.debug(`${label}: ${measure.duration.toFixed(2)}ms`);
        }
        
        // Clean up
        performance.clearMarks(`${label}-start`);
        performance.clearMarks(`${label}-end`);
        performance.clearMeasures(label);
    }

    /**
     * Group logging
     */
    group(label) {
        this.info(`--- ${label} ---`);
    }

    groupEnd() {
        this.info('--- End ---');
    }

    /**
     * Table logging (for development)
     */
    table(data) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.table(data);
        }
        this.debug('Table data', data);
    }
}

// Create global logger instance
window.AppLogger = new Logger({
    level: window.location.hostname === 'localhost' ? 'debug' : 'info',
    remote: window.location.hostname !== 'localhost',
    prefix: 'Admin'
});

// Shorter alias
window.Log = window.AppLogger;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}