// api-client.js - Unified API client for all Hugo management tools
// Include this in each HTML file or as a separate script

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3001';

class HugoManagementAPI {
    constructor() {
        this.ws = null;
        this.initWebSocket();
    }

    // WebSocket for real-time updates
    initWebSocket() {
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
    }

    handleRealtimeUpdate(data) {
        // Dispatch custom events for UI updates
        window.dispatchEvent(new CustomEvent('hugo-update', { detail: data }));
    }

    // ============================================
    // DASHBOARD API METHODS
    // ============================================

    async createContent(data) {
        return this.post('/dashboard/create', data);
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

    // ============================================
    // REVIEW TOOL API METHODS
    // ============================================

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

    // ============================================
    // BULK UPLOAD API METHODS
    // ============================================

    async uploadImages(files, metadata) {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));
        Object.keys(metadata).forEach(key => formData.append(key, metadata[key]));
        
        return this.postFormData('/bulk/images', formData);
    }

    async processYouTube(data) {
        return this.post('/bulk/youtube', data);
    }

    async uploadPDFs(files, metadata) {
        const formData = new FormData();
        files.forEach(file => formData.append('pdfs', file));
        Object.keys(metadata).forEach(key => formData.append(key, metadata[key]));
        
        return this.postFormData('/bulk/pdf', formData);
    }

    async processSocialMedia(data) {
        return this.post('/bulk/social', data);
    }

    async generateBulkContent(data) {
        return this.post('/bulk/generate', data);
    }

    // ============================================
    // HTTP METHODS
    // ============================================

    async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('GET request failed:', error);
            throw error;
        }
    }

    async post(endpoint, data = {}) {
        try {
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
            throw error;
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
            throw error;
        }
    }
}

// Initialize API client
const hugoAPI = new HugoManagementAPI();

// ============================================
// DASHBOARD SPECIFIC FUNCTIONS
// ============================================

async function dashboardCreateContent(title, section, language, tags, description, isDraft) {
    try {
        const result = await hugoAPI.createContent({
            title,
            section,
            language,
            tags,
            description,
            isDraft
        });
        
        if (result.success) {
            showToast(`Created "${title}" successfully!`, 'success');
            await updateDashboardStats();
        }
        
        return result;
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function updateDashboardStats() {
    try {
        const stats = await hugoAPI.getSiteStats();
        
        document.getElementById('totalPosts').textContent = stats.totalPosts || 0;
        document.getElementById('draftPosts').textContent = stats.draftPosts || 0;
        document.getElementById('publishedPosts').textContent = stats.publishedPosts || 0;
        document.getElementById('bilingualPosts').textContent = stats.bilingualPosts || 0;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ============================================
// REVIEW TOOL SPECIFIC FUNCTIONS
// ============================================

async function reviewLoadContent(id) {
    try {
        const content = await hugoAPI.getContent(id);
        
        document.getElementById('titleInput').value = content.title;
        document.getElementById('frontMatterInput').value = content.frontMatter;
        document.getElementById('contentInput').value = content.content;
        
        showToast('Content loaded successfully');
        return content;
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function reviewSaveContent(id) {
    try {
        const result = await hugoAPI.saveContent(id, {
            frontMatter: document.getElementById('frontMatterInput').value,
            content: document.getElementById('contentInput').value
        });
        
        if (result.success) {
            showToast('Content saved successfully', 'success');
        }
        
        return result;
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ============================================
// BULK UPLOAD SPECIFIC FUNCTIONS
// ============================================

async function bulkProcessContent(items, metadata) {
    try {
        showToast('Processing content...', 'info');
        
        const result = await hugoAPI.generateBulkContent({
            items,
            section: metadata.section,
            subsection: metadata.subsection,
            customPath: metadata.customPath,
            format: metadata.format || 'hugo'
        });
        
        if (result.success) {
            showToast(`Successfully processed ${result.itemCount} items!`, 'success');
            displayBulkOutput(result.output);
        }
        
        return result;
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function bulkUploadImages(files, metadata) {
    try {
        showToast('Uploading images...', 'info');
        
        const result = await hugoAPI.uploadImages(files, metadata);
        
        if (result.success) {
            showToast(`Successfully uploaded ${result.processed} images!`, 'success');
        }
        
        return result;
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

function displayBulkOutput(output) {
    const outputPanel = document.getElementById('outputPanel');
    if (outputPanel) {
        if (typeof output === 'object') {
            outputPanel.textContent = JSON.stringify(output, null, 2);
        } else {
            outputPanel.textContent = output;
        }
    }
}

// ============================================
// SHARED UI UTILITIES
// ============================================

function showToast(message, type = 'success') {
    // Check if we're using the bulk upload toast system
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = `toast show ${type}`;
        toast.innerHTML = `
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            ${message}
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    } else {
        // Fallback for other tools
        const existingToast = document.getElementById('toast');
        if (existingToast) {
            existingToast.textContent = message;
            existingToast.className = 'toast show';
            
            if (type === 'error') {
                existingToast.style.background = 'var(--danger)';
            } else if (type === 'warning') {
                existingToast.style.background = 'var(--warning)';
            } else if (type === 'info') {
                existingToast.style.background = 'var(--info)';
            } else {
                existingToast.style.background = 'var(--success)';
            }
            
            setTimeout(() => {
                existingToast.classList.remove('show');
            }, 3000);
        }
    }
}

// Listen for real-time updates
window.addEventListener('hugo-update', (event) => {
    const { type, data } = event.detail;
    
    switch (type) {
        case 'stats-update':
            updateDashboardStats();
            break;
        case 'content-change':
            // Refresh content list if in review tool
            if (typeof loadContentList === 'function') {
                loadContentList();
            }
            break;
        case 'server-status':
            // Update server status indicator
            const statusEl = document.getElementById('serverStatus');
            if (statusEl) {
                statusEl.textContent = data.status;
                statusEl.style.color = data.status === 'Running' ? '#28a745' : '#dc3545';
            }
            break;
    }
});

// Export for use in HTML files
window.hugoAPI = hugoAPI;
window.dashboardCreateContent = dashboardCreateContent;
window.reviewLoadContent = reviewLoadContent;
window.reviewSaveContent = reviewSaveContent;
window.bulkProcessContent = bulkProcessContent;
window.bulkUploadImages = bulkUploadImages;
window.showToast = showToast;