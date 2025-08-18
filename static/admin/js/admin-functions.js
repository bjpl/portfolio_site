// Admin Functions - Real implementations for all admin tools
// Replaces all alert() placeholders with actual functionality

// Initialize API client
const API_BASE = 'http://localhost:3000/api';

// Helper function for authenticated requests
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    };
    
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations
if (!document.getElementById('admin-functions-styles')) {
    const style = document.createElement('style');
    style.id = 'admin-functions-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            margin-bottom: 20px;
        }
        .modal-title {
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
        }
        .modal-body {
            margin-bottom: 20px;
        }
        .modal-footer {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #4a5568;
        }
        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
        }
        .form-control:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
        }
    `;
    document.head.appendChild(style);
}

// Show modal dialog
function showModal(title, content, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal-content';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${title}</h2>
        </div>
        <div class="modal-body">
            ${content}
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" id="modal-confirm">Confirm</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    document.getElementById('modal-confirm').onclick = () => {
        if (onConfirm) {
            onConfirm(overlay);
        }
        overlay.remove();
    };
    
    return overlay;
}

// ============ PAGES MANAGEMENT ============

async function createPage() {
    const content = `
        <div class="form-group">
            <label class="form-label">Page Title</label>
            <input type="text" class="form-control" id="pageTitle" placeholder="Enter page title">
        </div>
        <div class="form-group">
            <label class="form-label">URL Slug</label>
            <input type="text" class="form-control" id="pageSlug" placeholder="page-url-slug">
        </div>
        <div class="form-group">
            <label class="form-label">Section</label>
            <select class="form-control" id="pageSection">
                <option value="learn">Learn</option>
                <option value="make">Make</option>
                <option value="think">Think</option>
                <option value="meet">Meet</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Content</label>
            <textarea class="form-control" id="pageContent" rows="10" placeholder="Page content in Markdown"></textarea>
        </div>
    `;
    
    showModal('Create New Page', content, async (modal) => {
        const title = modal.querySelector('#pageTitle').value;
        const slug = modal.querySelector('#pageSlug').value || title.toLowerCase().replace(/\s+/g, '-');
        const section = modal.querySelector('#pageSection').value;
        const content = modal.querySelector('#pageContent').value;
        
        if (!title) {
            showToast('Title is required', 'error');
            return;
        }
        
        try {
            const pageData = {
                title,
                slug,
                section,
                content,
                date: new Date().toISOString(),
                draft: false
            };
            
            await apiRequest('/content/pages', {
                method: 'POST',
                body: pageData
            });
            
            showToast('Page created successfully!', 'success');
            
            // Refresh page list if function exists
            if (typeof loadPages === 'function') {
                loadPages();
            }
        } catch (error) {
            showToast(`Failed to create page: ${error.message}`, 'error');
        }
    });
}

async function editPage(pageId, currentData) {
    const content = `
        <div class="form-group">
            <label class="form-label">Page Title</label>
            <input type="text" class="form-control" id="pageTitle" value="${currentData.title || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">URL Slug</label>
            <input type="text" class="form-control" id="pageSlug" value="${currentData.slug || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Content</label>
            <textarea class="form-control" id="pageContent" rows="10">${currentData.content || ''}</textarea>
        </div>
    `;
    
    showModal('Edit Page', content, async (modal) => {
        const title = modal.querySelector('#pageTitle').value;
        const slug = modal.querySelector('#pageSlug').value;
        const content = modal.querySelector('#pageContent').value;
        
        try {
            await apiRequest(`/content/pages/${pageId}`, {
                method: 'PUT',
                body: { title, slug, content }
            });
            
            showToast('Page updated successfully!', 'success');
            
            if (typeof loadPages === 'function') {
                loadPages();
            }
        } catch (error) {
            showToast(`Failed to update page: ${error.message}`, 'error');
        }
    });
}

async function deletePage(pageId, pageTitle) {
    if (confirm(`Are you sure you want to delete "${pageTitle}"?`)) {
        try {
            await apiRequest(`/content/pages/${pageId}`, {
                method: 'DELETE'
            });
            
            showToast('Page deleted successfully!', 'success');
            
            if (typeof loadPages === 'function') {
                loadPages();
            }
        } catch (error) {
            showToast(`Failed to delete page: ${error.message}`, 'error');
        }
    }
}

// ============ BLOG POSTS MANAGEMENT ============

async function createPost() {
    const content = `
        <div class="form-group">
            <label class="form-label">Post Title</label>
            <input type="text" class="form-control" id="postTitle" placeholder="Enter post title">
        </div>
        <div class="form-group">
            <label class="form-label">Tags (comma separated)</label>
            <input type="text" class="form-control" id="postTags" placeholder="hugo, web, design">
        </div>
        <div class="form-group">
            <label class="form-label">Content</label>
            <textarea class="form-control" id="postContent" rows="10" placeholder="Post content in Markdown"></textarea>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="postDraft"> Save as draft
            </label>
        </div>
    `;
    
    showModal('Create New Blog Post', content, async (modal) => {
        const title = modal.querySelector('#postTitle').value;
        const tags = modal.querySelector('#postTags').value.split(',').map(t => t.trim());
        const content = modal.querySelector('#postContent').value;
        const draft = modal.querySelector('#postDraft').checked;
        
        if (!title) {
            showToast('Title is required', 'error');
            return;
        }
        
        try {
            const postData = {
                title,
                tags,
                content,
                date: new Date().toISOString(),
                draft,
                section: 'think' // Blog posts go in think section
            };
            
            await apiRequest('/content/posts', {
                method: 'POST',
                body: postData
            });
            
            showToast('Blog post created successfully!', 'success');
            
            if (typeof loadBlogPosts === 'function') {
                loadBlogPosts();
            }
        } catch (error) {
            showToast(`Failed to create post: ${error.message}`, 'error');
        }
    });
}

async function publishPost(postId, publish = true) {
    try {
        await apiRequest(`/content/posts/${postId}`, {
            method: 'PATCH',
            body: { draft: !publish }
        });
        
        showToast(publish ? 'Post published!' : 'Post unpublished!', 'success');
        
        if (typeof loadBlogPosts === 'function') {
            loadBlogPosts();
        }
    } catch (error) {
        showToast(`Failed to update post: ${error.message}`, 'error');
    }
}

// ============ PORTFOLIO ITEMS MANAGEMENT ============

async function createPortfolioItem() {
    const content = `
        <div class="form-group">
            <label class="form-label">Project Title</label>
            <input type="text" class="form-control" id="itemTitle" placeholder="Project name">
        </div>
        <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" id="itemCategory">
                <option value="web">Web Development</option>
                <option value="design">Design</option>
                <option value="mobile">Mobile App</option>
                <option value="other">Other</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Technologies</label>
            <input type="text" class="form-control" id="itemTech" placeholder="React, Node.js, MongoDB">
        </div>
        <div class="form-group">
            <label class="form-label">Project URL</label>
            <input type="url" class="form-control" id="itemUrl" placeholder="https://project.com">
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-control" id="itemDescription" rows="6"></textarea>
        </div>
    `;
    
    showModal('Add Portfolio Item', content, async (modal) => {
        const title = modal.querySelector('#itemTitle').value;
        const category = modal.querySelector('#itemCategory').value;
        const technologies = modal.querySelector('#itemTech').value.split(',').map(t => t.trim());
        const url = modal.querySelector('#itemUrl').value;
        const description = modal.querySelector('#itemDescription').value;
        
        if (!title) {
            showToast('Title is required', 'error');
            return;
        }
        
        try {
            const itemData = {
                title,
                category,
                technologies,
                url,
                description,
                date: new Date().toISOString(),
                section: 'make' // Portfolio items go in make section
            };
            
            await apiRequest('/content/portfolio', {
                method: 'POST',
                body: itemData
            });
            
            showToast('Portfolio item added successfully!', 'success');
            
            if (typeof loadPortfolioItems === 'function') {
                loadPortfolioItems();
            }
        } catch (error) {
            showToast(`Failed to add item: ${error.message}`, 'error');
        }
    });
}

// ============ USER MANAGEMENT ============

async function createUser() {
    const content = `
        <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-control" id="username" placeholder="johndoe">
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" id="email" placeholder="john@example.com">
        </div>
        <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" id="password" placeholder="••••••••">
        </div>
        <div class="form-group">
            <label class="form-label">Role</label>
            <select class="form-control" id="role">
                <option value="editor">Editor</option>
                <option value="author">Author</option>
                <option value="admin">Admin</option>
            </select>
        </div>
    `;
    
    showModal('Create New User', content, async (modal) => {
        const username = modal.querySelector('#username').value;
        const email = modal.querySelector('#email').value;
        const password = modal.querySelector('#password').value;
        const role = modal.querySelector('#role').value;
        
        if (!username || !email || !password) {
            showToast('All fields are required', 'error');
            return;
        }
        
        try {
            await apiRequest('/users', {
                method: 'POST',
                body: { username, email, password, role }
            });
            
            showToast('User created successfully!', 'success');
            
            if (typeof loadUsers === 'function') {
                loadUsers();
            }
        } catch (error) {
            showToast(`Failed to create user: ${error.message}`, 'error');
        }
    });
}

// ============ SITE SETTINGS ============

async function saveSettings() {
    try {
        // Gather all settings from the form
        const settings = {
            siteName: document.getElementById('siteName')?.value,
            siteUrl: document.getElementById('siteUrl')?.value,
            siteDescription: document.getElementById('siteDescription')?.value,
            contactEmail: document.getElementById('contactEmail')?.value,
            socialLinks: {
                twitter: document.getElementById('twitterUrl')?.value,
                github: document.getElementById('githubUrl')?.value,
                linkedin: document.getElementById('linkedinUrl')?.value
            },
            seo: {
                defaultTitle: document.getElementById('seoTitle')?.value,
                defaultDescription: document.getElementById('seoDescription')?.value,
                keywords: document.getElementById('seoKeywords')?.value
            }
        };
        
        await apiRequest('/settings', {
            method: 'PUT',
            body: settings
        });
        
        showToast('Settings saved successfully!', 'success');
    } catch (error) {
        showToast(`Failed to save settings: ${error.message}`, 'error');
    }
}

async function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        try {
            await apiRequest('/settings/reset', {
                method: 'POST'
            });
            
            showToast('Settings reset to defaults!', 'success');
            
            // Reload page to show default values
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            showToast(`Failed to reset settings: ${error.message}`, 'error');
        }
    }
}

// ============ ANALYTICS ============

async function exportAnalyticsData() {
    try {
        const response = await fetch(`${API_BASE}/analytics/export`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        // Create download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showToast('Analytics data exported!', 'success');
    } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error');
    }
}

// ============ LOGS MANAGEMENT ============

async function clearLogs() {
    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
        try {
            await apiRequest('/logs/clear', {
                method: 'DELETE'
            });
            
            showToast('Logs cleared successfully!', 'success');
            
            if (typeof loadLogs === 'function') {
                loadLogs();
            }
        } catch (error) {
            showToast(`Failed to clear logs: ${error.message}`, 'error');
        }
    }
}

async function downloadLogs() {
    try {
        const response = await fetch(`${API_BASE}/logs/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showToast('Logs downloaded!', 'success');
    } catch (error) {
        showToast(`Download failed: ${error.message}`, 'error');
    }
}

// ============ API EXPLORER ============

async function testAllEndpoints() {
    const endpoints = [
        { method: 'GET', path: '/health' },
        { method: 'GET', path: '/dashboard/stats' },
        { method: 'GET', path: '/content' },
        { method: 'GET', path: '/files/list/content' },
        { method: 'GET', path: '/images/list' },
        { method: 'GET', path: '/build/status' }
    ];
    
    showToast('Testing all endpoints...', 'info');
    
    let passed = 0;
    let failed = 0;
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${API_BASE}${endpoint.path}`, {
                method: endpoint.method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                passed++;
                console.log(`✅ ${endpoint.method} ${endpoint.path}`);
            } else {
                failed++;
                console.error(`❌ ${endpoint.method} ${endpoint.path}: ${response.status}`);
            }
        } catch (error) {
            failed++;
            console.error(`❌ ${endpoint.method} ${endpoint.path}: ${error.message}`);
        }
    }
    
    showToast(`Test complete: ${passed} passed, ${failed} failed`, failed > 0 ? 'warning' : 'success');
}

// Export functions for global use
window.adminFunctions = {
    // Pages
    createPage,
    editPage,
    deletePage,
    
    // Blog
    createPost,
    publishPost,
    
    // Portfolio
    createPortfolioItem,
    
    // Users
    createUser,
    
    // Settings
    saveSettings,
    resetSettings,
    
    // Analytics
    exportAnalyticsData,
    
    // Logs
    clearLogs,
    downloadLogs,
    
    // API
    testAllEndpoints,
    
    // Utilities
    showToast,
    showModal,
    apiRequest
};

console.log('Admin functions loaded - all placeholders replaced with real functionality');