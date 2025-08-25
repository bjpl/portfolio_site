/**
 * Network Monitor
 * Comprehensive network request monitoring and debugging tool
 */

class NetworkMonitor {
    constructor() {
        this.requests = [];
        this.interceptors = [];
        this.filters = [];
        this.isEnabled = true;
        this.maxRequests = 500; // Prevent memory overflow
        this.startTime = performance.now();
        
        this.stats = {
            total: 0,
            successful: 0,
            failed: 0,
            pending: 0,
            totalBytes: 0,
            totalDuration: 0
        };
        
        this.initializeMonitoring();
    }

    // Initialize network monitoring
    initializeMonitoring() {
        this.interceptFetch();
        this.interceptXHR();
        this.monitorWebSockets();
        this.monitorResourceLoading();
        this.setupGlobalInterface();
    }

    // Intercept fetch API
    interceptFetch() {
        if (typeof window.fetch !== 'function') return;
        
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(url, options = {}) {
            const requestId = self.generateRequestId();
            const startTime = performance.now();
            
            // Create request record
            const request = {
                id: requestId,
                url: typeof url === 'string' ? url : url.url,
                method: options.method || 'GET',
                headers: self.extractHeaders(options.headers),
                body: self.extractBody(options.body),
                type: 'fetch',
                status: 'pending',
                startTime: startTime,
                endTime: null,
                duration: null,
                response: null,
                error: null,
                size: 0,
                cached: false
            };
            
            self.addRequest(request);
            
            try {
                // Make the actual request
                const response = await originalFetch.call(this, url, options);
                const endTime = performance.now();
                
                // Update request with response data
                request.endTime = endTime;
                request.duration = Math.round(endTime - startTime);
                request.status = response.ok ? 'success' : 'error';
                request.response = {
                    status: response.status,
                    statusText: response.statusText,
                    headers: self.extractResponseHeaders(response.headers),
                    ok: response.ok,
                    redirected: response.redirected,
                    type: response.type,
                    url: response.url
                };
                
                // Estimate response size
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    request.size = parseInt(contentLength, 10);
                }
                
                // Check if cached
                request.cached = self.isResponseCached(response);
                
                self.updateRequest(request);
                
                return response;
                
            } catch (error) {
                const endTime = performance.now();
                
                // Update request with error data
                request.endTime = endTime;
                request.duration = Math.round(endTime - startTime);
                request.status = 'error';
                request.error = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                };
                
                self.updateRequest(request);
                
                throw error;
            }
        };
    }

    // Intercept XMLHttpRequest
    interceptXHR() {
        if (typeof window.XMLHttpRequest !== 'function') return;
        
        const OriginalXHR = window.XMLHttpRequest;
        const self = this;
        
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const requestId = self.generateRequestId();
            let startTime = null;
            let request = null;
            
            // Override open method
            const originalOpen = xhr.open;
            xhr.open = function(method, url, async = true, user, password) {
                request = {
                    id: requestId,
                    url: url,
                    method: method.toUpperCase(),
                    headers: {},
                    body: null,
                    type: 'xhr',
                    status: 'pending',
                    startTime: null,
                    endTime: null,
                    duration: null,
                    response: null,
                    error: null,
                    size: 0,
                    cached: false
                };
                
                return originalOpen.call(this, method, url, async, user, password);
            };
            
            // Override setRequestHeader method
            const originalSetRequestHeader = xhr.setRequestHeader;
            xhr.setRequestHeader = function(name, value) {
                if (request) {
                    request.headers[name] = value;
                }
                return originalSetRequestHeader.call(this, name, value);
            };
            
            // Override send method
            const originalSend = xhr.send;
            xhr.send = function(body) {
                if (request) {
                    startTime = performance.now();
                    request.startTime = startTime;
                    request.body = self.extractBody(body);
                    self.addRequest(request);
                }
                
                return originalSend.call(this, body);
            };
            
            // Handle state changes
            xhr.addEventListener('readystatechange', function() {
                if (!request) return;
                
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    const endTime = performance.now();
                    request.endTime = endTime;
                    request.duration = Math.round(endTime - startTime);
                    
                    if (xhr.status === 0) {
                        // Network error
                        request.status = 'error';
                        request.error = {
                            name: 'NetworkError',
                            message: 'Network request failed'
                        };
                    } else {
                        request.status = xhr.status >= 200 && xhr.status < 400 ? 'success' : 'error';
                        request.response = {
                            status: xhr.status,
                            statusText: xhr.statusText,
                            headers: self.parseXHRHeaders(xhr.getAllResponseHeaders()),
                            responseText: xhr.responseText,
                            responseXML: xhr.responseXML,
                            responseType: xhr.responseType
                        };
                        
                        // Estimate size from response
                        if (xhr.responseText) {
                            request.size = new Blob([xhr.responseText]).size;
                        }
                    }
                    
                    self.updateRequest(request);
                }
            });
            
            // Handle errors
            xhr.addEventListener('error', function() {
                if (request) {
                    const endTime = performance.now();
                    request.endTime = endTime;
                    request.duration = Math.round(endTime - startTime);
                    request.status = 'error';
                    request.error = {
                        name: 'NetworkError',
                        message: 'XMLHttpRequest failed'
                    };
                    self.updateRequest(request);
                }
            });
            
            // Handle timeouts
            xhr.addEventListener('timeout', function() {
                if (request) {
                    const endTime = performance.now();
                    request.endTime = endTime;
                    request.duration = Math.round(endTime - startTime);
                    request.status = 'error';
                    request.error = {
                        name: 'TimeoutError',
                        message: 'XMLHttpRequest timeout'
                    };
                    self.updateRequest(request);
                }
            });
            
            return xhr;
        };
        
        // Copy static properties
        Object.setPrototypeOf(window.XMLHttpRequest, OriginalXHR);
        Object.defineProperties(window.XMLHttpRequest, Object.getOwnPropertyDescriptors(OriginalXHR));
    }

    // Monitor WebSocket connections
    monitorWebSockets() {
        if (typeof window.WebSocket !== 'function') return;
        
        const OriginalWebSocket = window.WebSocket;
        const self = this;
        
        window.WebSocket = function(url, protocols) {
            const ws = new OriginalWebSocket(url, protocols);
            const connectionId = self.generateRequestId();
            const startTime = performance.now();
            
            const connection = {
                id: connectionId,
                url: url,
                protocols: protocols,
                type: 'websocket',
                status: 'connecting',
                startTime: startTime,
                connectTime: null,
                closeTime: null,
                messageCount: 0,
                bytesReceived: 0,
                bytesSent: 0,
                error: null
            };
            
            self.addRequest(connection);
            
            ws.addEventListener('open', function() {
                connection.connectTime = performance.now();
                connection.status = 'connected';
                self.updateRequest(connection);
            });
            
            ws.addEventListener('message', function(event) {
                connection.messageCount++;
                if (typeof event.data === 'string') {
                    connection.bytesReceived += new Blob([event.data]).size;
                }
                self.updateRequest(connection);
            });
            
            ws.addEventListener('close', function(event) {
                connection.closeTime = performance.now();
                connection.status = 'closed';
                connection.closeCode = event.code;
                connection.closeReason = event.reason;
                self.updateRequest(connection);
            });
            
            ws.addEventListener('error', function(error) {
                connection.status = 'error';
                connection.error = {
                    name: 'WebSocketError',
                    message: 'WebSocket connection failed'
                };
                self.updateRequest(connection);
            });
            
            // Override send to track sent bytes
            const originalSend = ws.send;
            ws.send = function(data) {
                if (typeof data === 'string') {
                    connection.bytesSent += new Blob([data]).size;
                }
                self.updateRequest(connection);
                return originalSend.call(this, data);
            };
            
            return ws;
        };
        
        // Copy static properties
        Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
        Object.defineProperties(window.WebSocket, Object.getOwnPropertyDescriptors(OriginalWebSocket));
    }

    // Monitor resource loading via Performance Observer
    monitorResourceLoading() {
        if (!window.PerformanceObserver) return;
        
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                // Only track certain resource types
                if (['script', 'stylesheet', 'image', 'xmlhttprequest', 'fetch'].includes(entry.initiatorType)) {
                    const request = {
                        id: this.generateRequestId(),
                        url: entry.name,
                        method: 'GET',
                        type: 'resource',
                        initiatorType: entry.initiatorType,
                        status: entry.transferSize > 0 ? 'success' : 'cached',
                        startTime: entry.startTime,
                        endTime: entry.responseEnd,
                        duration: Math.round(entry.duration),
                        size: entry.transferSize || entry.decodedBodySize || 0,
                        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
                        response: {
                            status: 200, // Assume success for resources that loaded
                            statusText: 'OK'
                        }
                    };
                    
                    this.addRequest(request);
                }
            });
        });
        
        try {
            observer.observe({ entryTypes: ['resource'] });
        } catch (error) {
            console.warn('Resource monitoring not available:', error);
        }
    }

    // Setup global interface
    setupGlobalInterface() {
        window.NetworkMonitor = this;
        
        // Expose utility functions
        window.getNetworkRequests = () => this.getRequests();
        window.clearNetworkRequests = () => this.clearRequests();
        window.exportNetworkRequests = (format) => this.exportRequests(format);
        window.getNetworkStats = () => this.getStats();
        window.filterNetworkRequests = (filter) => this.filterRequests(filter);
    }

    // Generate unique request ID
    generateRequestId() {
        return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add new request
    addRequest(request) {
        if (!this.isEnabled) return;
        
        this.requests.push(request);
        this.updateStats();
        
        // Limit requests to prevent memory issues
        if (this.requests.length > this.maxRequests) {
            this.requests = this.requests.slice(-this.maxRequests);
        }
        
        // Notify interceptors
        this.notifyInterceptors('request', request);
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('networkRequest', {
            detail: request
        }));
    }

    // Update existing request
    updateRequest(request) {
        const index = this.requests.findIndex(r => r.id === request.id);
        if (index !== -1) {
            this.requests[index] = request;
            this.updateStats();
            
            // Notify interceptors
            this.notifyInterceptors('response', request);
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('networkResponse', {
                detail: request
            }));
        }
    }

    // Update statistics
    updateStats() {
        this.stats = {
            total: this.requests.length,
            successful: this.requests.filter(r => r.status === 'success').length,
            failed: this.requests.filter(r => r.status === 'error').length,
            pending: this.requests.filter(r => r.status === 'pending').length,
            totalBytes: this.requests.reduce((sum, r) => sum + (r.size || 0), 0),
            totalDuration: this.requests.reduce((sum, r) => sum + (r.duration || 0), 0)
        };
    }

    // Extract headers from various formats
    extractHeaders(headers) {
        if (!headers) return {};
        
        if (headers instanceof Headers) {
            const result = {};
            for (const [key, value] of headers.entries()) {
                result[key] = value;
            }
            return result;
        } else if (typeof headers === 'object') {
            return { ...headers };
        }
        
        return {};
    }

    // Extract response headers
    extractResponseHeaders(headers) {
        const result = {};
        if (headers instanceof Headers) {
            for (const [key, value] of headers.entries()) {
                result[key] = value;
            }
        }
        return result;
    }

    // Extract request body
    extractBody(body) {
        if (!body) return null;
        
        if (typeof body === 'string') {
            return body;
        } else if (body instanceof FormData) {
            return '[FormData]';
        } else if (body instanceof URLSearchParams) {
            return body.toString();
        } else if (body instanceof Blob) {
            return `[Blob: ${body.size} bytes]`;
        } else if (body instanceof ArrayBuffer) {
            return `[ArrayBuffer: ${body.byteLength} bytes]`;
        }
        
        try {
            return JSON.stringify(body);
        } catch {
            return '[Object]';
        }
    }

    // Parse XHR headers string
    parseXHRHeaders(headersString) {
        const headers = {};
        if (!headersString) return headers;
        
        headersString.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
                headers[parts[0]] = parts[1];
            }
        });
        
        return headers;
    }

    // Check if response is cached
    isResponseCached(response) {
        const cacheControl = response.headers.get('cache-control');
        const expires = response.headers.get('expires');
        const lastModified = response.headers.get('last-modified');
        const etag = response.headers.get('etag');
        
        return !!(cacheControl || expires || lastModified || etag);
    }

    // Get requests with optional filtering
    getRequests(filter = null) {
        let requests = [...this.requests];
        
        if (filter) {
            if (typeof filter === 'string') {
                // Filter by URL or type
                requests = requests.filter(r => 
                    r.url.includes(filter) || 
                    r.type === filter || 
                    r.method === filter.toUpperCase()
                );
            } else if (typeof filter === 'function') {
                requests = requests.filter(filter);
            } else if (typeof filter === 'object') {
                // Filter by properties
                requests = requests.filter(r => {
                    return Object.keys(filter).every(key => {
                        if (key === 'url' && filter[key]) {
                            return r.url.includes(filter[key]);
                        }
                        return r[key] === filter[key];
                    });
                });
            }
        }
        
        return requests;
    }

    // Filter requests
    filterRequests(filter) {
        this.filters.push(filter);
        return this.getRequests(filter);
    }

    // Get network statistics
    getStats() {
        const avgDuration = this.stats.total > 0 ? 
            Math.round(this.stats.totalDuration / this.stats.total) : 0;
        
        return {
            ...this.stats,
            averageDuration: avgDuration,
            successRate: this.stats.total > 0 ? 
                Math.round((this.stats.successful / this.stats.total) * 100) : 0,
            sessionDuration: Math.round(performance.now() - this.startTime)
        };
    }

    // Get slow requests
    getSlowRequests(threshold = 1000) {
        return this.requests
            .filter(r => r.duration > threshold)
            .sort((a, b) => b.duration - a.duration);
    }

    // Get failed requests
    getFailedRequests() {
        return this.requests.filter(r => r.status === 'error');
    }

    // Get large requests
    getLargeRequests(threshold = 1024 * 1024) { // 1MB default
        return this.requests
            .filter(r => r.size > threshold)
            .sort((a, b) => b.size - a.size);
    }

    // Clear all requests
    clearRequests() {
        this.requests = [];
        this.updateStats();
        
        window.dispatchEvent(new CustomEvent('networkRequestsCleared'));
    }

    // Export requests in various formats
    exportRequests(format = 'json') {
        const data = {
            metadata: {
                exported: new Date().toISOString(),
                totalRequests: this.requests.length,
                stats: this.getStats()
            },
            requests: this.requests
        };
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.requestsToCSV(this.requests);
        } else if (format === 'har') {
            return this.requestsToHAR(this.requests);
        }
        
        return data;
    }

    // Convert requests to CSV
    requestsToCSV(requests) {
        const headers = ['Time', 'Method', 'URL', 'Status', 'Duration', 'Size', 'Type'];
        const rows = [headers.join(',')];
        
        requests.forEach(req => {
            const row = [
                new Date(this.startTime + req.startTime).toISOString(),
                req.method || '',
                `"${req.url}"`,
                req.response?.status || req.status,
                req.duration || 0,
                req.size || 0,
                req.type || ''
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }

    // Convert requests to HAR format
    requestsToHAR(requests) {
        const har = {
            log: {
                version: '1.2',
                creator: {
                    name: 'Network Monitor',
                    version: '1.0'
                },
                entries: requests.map(req => ({
                    startedDateTime: new Date(this.startTime + req.startTime).toISOString(),
                    time: req.duration || 0,
                    request: {
                        method: req.method || 'GET',
                        url: req.url,
                        headers: Object.keys(req.headers || {}).map(name => ({
                            name,
                            value: req.headers[name]
                        })),
                        bodySize: req.body ? new Blob([req.body]).size : 0
                    },
                    response: {
                        status: req.response?.status || 0,
                        statusText: req.response?.statusText || '',
                        headers: Object.keys(req.response?.headers || {}).map(name => ({
                            name,
                            value: req.response.headers[name]
                        })),
                        content: {
                            size: req.size || 0,
                            mimeType: req.response?.headers?.['content-type'] || 'text/plain'
                        }
                    },
                    timings: {
                        send: 0,
                        wait: req.duration || 0,
                        receive: 0
                    }
                }))
            }
        };
        
        return JSON.stringify(har, null, 2);
    }

    // Add interceptor
    addInterceptor(callback) {
        this.interceptors.push(callback);
    }

    // Remove interceptor
    removeInterceptor(callback) {
        const index = this.interceptors.indexOf(callback);
        if (index !== -1) {
            this.interceptors.splice(index, 1);
        }
    }

    // Notify interceptors
    notifyInterceptors(type, request) {
        this.interceptors.forEach(callback => {
            try {
                callback(type, request);
            } catch (error) {
                console.warn('Network interceptor error:', error);
            }
        });
    }

    // Enable/disable monitoring
    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }
}

// Auto-initialize if window is available
if (typeof window !== 'undefined') {
    window.networkMonitor = new NetworkMonitor();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkMonitor;
}