// api-client.js - Unified API client for all Hugo management tools
// Detect if we're in production (Netlify) or local development
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE = isProduction ? '/.netlify/functions' : 'http://localhost:3335/api';
const WS_URL = isProduction ? null : 'ws://localhost:3335';  // No WebSocket in production

class HugoManagementAPI {
    constructor() {
        this.ws = null;
        // Only init WebSocket if authenticated
        if (window.auth && window.auth.isAuthenticated()) {
            this.initWebSocket();
        }
    }

    initWebSocket() {
        // Skip WebSocket in production (Netlify)
        if (!WS_URL) {
            console.log('WebSocket not available in production mode');
            return;
        }
        
        try {
            this.ws = new WebSocket(WS_URL);
            
            this.ws.onopen = () => {
                console.log('Connected to WebSocket server');
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleRealtimeUpdate(data);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected. Reconnecting in 5s...');
                setTimeout(() => this.initWebSocket(), 5000);
            };
        } catch (error) {
            console.log('WebSocket not available, using polling mode');
        }
    }

    handleRealtimeUpdate(data) {
        window.dispatchEvent(new CustomEvent('hugo-update', { detail: data }));
    }

    // Dashboard endpoints
    async createContent(data) {
        return this.post('/dashboard/content', data);
    }

    async startServer() {
        return this.post('/dashboard/server/start');
    }

    async stopServer() {
        return this.post('/dashboard/server/stop');
    }

    async buildSite() {
        return this.post('/dashboard/build');
    }

    async getSiteStats() {
        return this.get('/dashboard/stats');
    }

    // Review endpoints
    async getContentList(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.get(`/review/content${query ? '?' + query : ''}`);
    }

    async getContent(id) {
        return this.get(`/review/content/${id}`);
    }

    async saveContent(id, data) {
        return this.post(`/review/content/${id}/save`, data);
    }

    async checkQuality(data) {
        return this.post('/review/quality', data);
    }

    // Bulk upload endpoints
    async uploadImages(files, metadata) {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));
        Object.keys(metadata).forEach(key => formData.append(key, metadata[key]));
        return this.postFormData('/bulk/images', formData);
    }

    async processYouTube(data) {
        return this.post('/bulk/youtube', data);
    }

    async generateBulkContent(data) {
        return this.post('/bulk/generate', data);
    }

    // Health check
    async checkHealth() {
        return this.get('/health');
    }

    // Base HTTP methods - now with authentication
    async get(endpoint) {
        try {
            // Use auth manager if available
            if (window.auth && window.auth.isAuthenticated()) {
                const response = await window.auth.makeAuthenticatedRequest(`${API_BASE}${endpoint}`);
                return await response.json();
            }
            
            // Fallback to unauthenticated request
            const response = await fetch(`${API_BASE}${endpoint}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('GET request failed:', error);
            // Return simulated data for demo
            return this.getSimulatedData(endpoint);
        }
    }

    async post(endpoint, data = {}) {
        try {
            // Use auth manager if available
            if (window.auth && window.auth.isAuthenticated()) {
                const response = await window.auth.makeAuthenticatedRequest(`${API_BASE}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                return await response.json();
            }
            
            // Fallback to unauthenticated request
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('POST request failed:', error);
            // Return simulated success
            return { success: true, message: 'Operation completed (simulated)' };
        }
    }

    async postFormData(endpoint, formData) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('POST FormData failed:', error);
            return { success: true, message: 'Upload completed (simulated)' };
        }
    }

    // Simulated data for when API is not available
    getSimulatedData(endpoint) {
        if (endpoint.includes('/stats')) {
            return {
                content: { 
                    total: 42, 
                    drafts: 5, 
                    published: 37, 
                    byLanguage: { en: 30, es: 12 } 
                },
                storage: { 
                    total: { count: 156, size: 52428800 },
                    images: { count: 89, size: 41943040 },
                    pdfs: { count: 12, size: 10485760 },
                    videos: { count: 3, size: 0 }
                }
            };
        }
        if (endpoint.includes('/health')) {
            return { status: 'simulated', message: 'API running in demo mode' };
        }
        if (endpoint.includes('/content')) {
            return [
                { id: '1', title: 'Sample Post 1', status: 'draft', modified: '2 hours ago', wordCount: 523 },
                { id: '2', title: 'Sample Post 2', status: 'review', modified: 'yesterday', wordCount: 1234 },
                { id: '3', title: 'Sample Post 3', status: 'published', modified: '3 days ago', wordCount: 892 }
            ];
        }
        return {};
    }
}

// Initialize API client
const hugoAPI = new HugoManagementAPI();
window.hugoAPI = hugoAPI;

// Log status
console.log('Hugo Management API Client loaded successfully');
