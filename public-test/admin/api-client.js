// Unified API Client for Portfolio Admin - Using Central Configuration
const getAPIConfig = () => {
    if (window.CentralAPIConfig) {
        return {
            API_BASE: window.CentralAPIConfig.getAPIBaseURL(),
            WS_BASE: window.CentralAPIConfig.getWebSocketURL()
        };
    }
    
    // Fallback configuration
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return {
        API_BASE: isDev ? 'http://localhost:3000/api' : '/api',
        WS_BASE: isDev ? 'ws://localhost:3000/ws' : `wss://${window.location.host}/ws`
    };
};

const config = getAPIConfig();
const API_BASE = config.API_BASE;
const WS_BASE = config.WS_BASE;

class APIClient {
    constructor() {
        this.baseURL = API_BASE;
        this.wsURL = WS_BASE;
        this.token = localStorage.getItem('token');
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    // Authentication
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    // Base HTTP request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            }
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.handleAuthError();
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            if (window.Log) {
                window.Log.error(`API Error [${endpoint}]:`, error);
            } else {
                console.error(`API Error [${endpoint}]:`, error);
            }
            throw error;
        }
    }

    // HTTP methods
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async upload(endpoint, formData) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: 'POST',
            body: formData,
            headers: {}
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        return response.json();
    }

    // WebSocket connection
    initWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(`${this.wsURL}/ws`);
            
            this.ws.onopen = () => {
                if (window.Log) {
                    window.Log.info('WebSocket connected');
                }
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                
                // Send auth token
                if (this.token) {
                    this.ws.send(JSON.stringify({
                        type: 'auth',
                        token: this.token
                    }));
                }
                
                // Notify listeners
                window.dispatchEvent(new CustomEvent('ws-connected'));
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    if (window.Log) {
                        window.Log.error('WebSocket message parse error:', error);
                    }
                }
            };
            
            this.ws.onerror = (error) => {
                if (window.Log) {
                    window.Log.error('WebSocket error:', error);
                }
                window.dispatchEvent(new CustomEvent('ws-error', { detail: error }));
            };
            
            this.ws.onclose = () => {
                if (window.Log) {
                    window.Log.info('WebSocket disconnected');
                }
                window.dispatchEvent(new CustomEvent('ws-disconnected'));
                this.attemptReconnect();
            };
        } catch (error) {
            if (window.Log) {
                window.Log.error('WebSocket init error:', error);
            }
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (window.Log) {
                window.Log.warn('Max reconnection attempts reached');
            }
            return;
        }

        this.reconnectAttempts++;
        if (window.Log) {
            window.Log.info(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        }
        
        setTimeout(() => {
            this.initWebSocket();
        }, this.reconnectDelay);
        
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    }

    handleWebSocketMessage(data) {
        // Dispatch custom events based on message type
        window.dispatchEvent(new CustomEvent('ws-message', { detail: data }));
        
        if (data.type) {
            window.dispatchEvent(new CustomEvent(`ws-${data.type}`, { detail: data }));
        }
    }

    closeWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Auth error handler
    handleAuthError() {
        this.clearToken();
        window.location.href = '/admin/login.html';
    }

    // API Endpoints

    // Authentication
    async login(username, password) {
        const response = await this.post('/auth/login', { username, password });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } finally {
            this.clearToken();
            this.closeWebSocket();
        }
    }

    async getMe() {
        return this.get('/auth/me');
    }

    // Dashboard
    async getDashboardStats() {
        return this.get('/dashboard/stats');
    }

    async getRecentActivity() {
        return this.get('/dashboard/recent');
    }

    // Content Management
    async getContent(path = '') {
        return this.get(`/content${path ? '/' + path : ''}`);
    }

    async createContent(data) {
        return this.post('/content', data);
    }

    async updateContent(path, data) {
        return this.put(`/content/${path}`, data);
    }

    async deleteContent(path) {
        return this.delete(`/content/${path}`);
    }

    async searchContent(query) {
        return this.get(`/content/search?q=${encodeURIComponent(query)}`);
    }

    // File Management
    async getFiles(path = '') {
        return this.get(`/files${path ? '/' + path : ''}`);
    }

    async uploadFile(file, path = '') {
        const formData = new FormData();
        formData.append('file', file);
        if (path) formData.append('path', path);
        return this.upload('/files/upload', formData);
    }

    async deleteFile(path) {
        return this.delete(`/files/${path}`);
    }

    async createFolder(name, parentPath = '') {
        return this.post('/files/folder', { name, parentPath });
    }

    // Image Optimization
    async optimizeImage(file, options = {}) {
        const formData = new FormData();
        formData.append('image', file);
        Object.entries(options).forEach(([key, value]) => {
            formData.append(key, value);
        });
        return this.upload('/images/optimize', formData);
    }

    async getOptimizedImages() {
        return this.get('/images/optimized');
    }

    // Build & Deploy
    async buildSite() {
        return this.post('/build/start');
    }

    async getBuildStatus() {
        return this.get('/build/status');
    }

    async getBuildLogs() {
        return this.get('/build/logs');
    }

    async deploySite(target = 'production') {
        return this.post('/deploy', { target });
    }

    // Logs
    async getLogs(options = {}) {
        const params = new URLSearchParams(options);
        return this.get(`/logs?${params}`);
    }

    async getLogFile(filename) {
        return this.get(`/logs/${filename}`);
    }

    // Analytics
    async getAnalytics(period = '30d') {
        return this.get(`/analytics?period=${period}`);
    }

    async trackEvent(event) {
        return this.post('/analytics/track', event);
    }

    // Backup
    async createBackup() {
        return this.post('/backup/create');
    }

    async getBackups() {
        return this.get('/backup/list');
    }

    async restoreBackup(id) {
        return this.post(`/backup/restore/${id}`);
    }

    // Site Settings
    async getSettings() {
        return this.get('/settings');
    }

    async updateSettings(settings) {
        return this.put('/settings', settings);
    }

    // User Management
    async getUsers() {
        return this.get('/users');
    }

    async createUser(userData) {
        return this.post('/users', userData);
    }

    async updateUser(userId, userData) {
        return this.put(`/users/${userId}`, userData);
    }

    async deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    }

    // Health Check
    async checkHealth() {
        try {
            return await this.get('/health');
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
}

// Create global instance
const apiClient = new APIClient();

// Auto-init WebSocket if authenticated
if (apiClient.token) {
    apiClient.initWebSocket();
}

// Export for use in other scripts
window.apiClient = apiClient;

// Helper function for auth check
async function checkAuth() {
    if (!apiClient.token) {
        window.location.href = '/admin/login.html';
        return false;
    }
    
    try {
        await apiClient.getMe();
        return true;
    } catch (error) {
        apiClient.clearToken();
        window.location.href = '/admin/login.html';
        return false;
    }
}

window.checkAuth = checkAuth;

if (window.Log) {
    window.Log.info('API Client initialized');
}