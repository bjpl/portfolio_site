/**
 * Data Service Layer
 * Provides high-level data access methods with caching and error handling
 */

class DataService {
    constructor(api) {
        this.api = api;
        this.cache = new Map();
        this.subscribers = new Map();
    }

    // Blog methods
    async getBlogPosts(params = {}) {
        try {
            const response = await this.api.getBlog(params);
            this.notifySubscribers('blog:posts', response.posts);
            return response;
        } catch (error) {
            console.error('Failed to fetch blog posts:', error);
            throw new Error('Unable to load blog posts. Please try again later.');
        }
    }

    async getBlogPost(slug) {
        try {
            const response = await this.api.getBlogPost(slug);
            this.notifySubscribers('blog:post', response);
            return response;
        } catch (error) {
            console.error('Failed to fetch blog post:', error);
            throw new Error('Unable to load blog post. Please try again later.');
        }
    }

    async searchBlogPosts(query, filters = {}) {
        try {
            const params = { search: query, ...filters };
            const response = await this.api.getBlog(params);
            return response;
        } catch (error) {
            console.error('Blog search failed:', error);
            throw new Error('Search failed. Please try again.');
        }
    }

    // Project methods
    async getProjects(params = {}) {
        try {
            const response = await this.api.getProjects(params);
            this.notifySubscribers('projects:list', response.projects);
            return response;
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            throw new Error('Unable to load projects. Please try again later.');
        }
    }

    async getProject(slug) {
        try {
            const response = await this.api.getProject(slug);
            this.notifySubscribers('projects:single', response);
            return response;
        } catch (error) {
            console.error('Failed to fetch project:', error);
            throw new Error('Unable to load project. Please try again later.');
        }
    }

    async getFeaturedProjects() {\n        try {\n            const response = await this.api.getProjects({ featured: true });\n            return response;\n        } catch (error) {\n            console.error('Failed to fetch featured projects:', error);\n            throw new Error('Unable to load featured projects.');\n        }\n    }\n\n    // Admin methods (require authentication)\n    async createBlogPost(postData) {\n        try {\n            const response = await this.api.createBlogPost(postData);\n            this.invalidateCache('blog');\n            this.notifySubscribers('blog:created', response.post);\n            return response;\n        } catch (error) {\n            console.error('Failed to create blog post:', error);\n            throw new Error('Failed to create blog post. Please check your data and try again.');\n        }\n    }\n\n    async updateBlogPost(id, postData) {\n        try {\n            const response = await this.api.updateBlogPost(id, postData);\n            this.invalidateCache('blog');\n            this.notifySubscribers('blog:updated', response.post);\n            return response;\n        } catch (error) {\n            console.error('Failed to update blog post:', error);\n            throw new Error('Failed to update blog post. Please try again.');\n        }\n    }\n\n    async deleteBlogPost(id) {\n        try {\n            const response = await this.api.deleteBlogPost(id);\n            this.invalidateCache('blog');\n            this.notifySubscribers('blog:deleted', { id });\n            return response;\n        } catch (error) {\n            console.error('Failed to delete blog post:', error);\n            throw new Error('Failed to delete blog post. Please try again.');\n        }\n    }\n\n    async createProject(projectData) {\n        try {\n            const response = await this.api.createProject(projectData);\n            this.invalidateCache('projects');\n            this.notifySubscribers('projects:created', response.project);\n            return response;\n        } catch (error) {\n            console.error('Failed to create project:', error);\n            throw new Error('Failed to create project. Please check your data and try again.');\n        }\n    }\n\n    async updateProject(id, projectData) {\n        try {\n            const response = await this.api.updateProject(id, projectData);\n            this.invalidateCache('projects');\n            this.notifySubscribers('projects:updated', response.project);\n            return response;\n        } catch (error) {\n            console.error('Failed to update project:', error);\n            throw new Error('Failed to update project. Please try again.');\n        }\n    }\n\n    async deleteProject(id) {\n        try {\n            const response = await this.api.deleteProject(id);\n            this.invalidateCache('projects');\n            this.notifySubscribers('projects:deleted', { id });\n            return response;\n        } catch (error) {\n            console.error('Failed to delete project:', error);\n            throw new Error('Failed to delete project. Please try again.');\n        }\n    }\n\n    // File upload\n    async uploadFile(file, category = 'general', onProgress) {\n        try {\n            // Add progress tracking if provided\n            if (onProgress && file.size > 1024 * 1024) { // Files larger than 1MB\n                // Create a custom upload with progress\n                return this.uploadWithProgress(file, category, onProgress);\n            }\n            \n            const response = await this.api.uploadFile(file, category);\n            this.notifySubscribers('file:uploaded', response);\n            return response;\n        } catch (error) {\n            console.error('File upload failed:', error);\n            throw new Error('File upload failed. Please check the file and try again.');\n        }\n    }\n\n    async uploadWithProgress(file, category, onProgress) {\n        return new Promise((resolve, reject) => {\n            const formData = new FormData();\n            formData.append('file', file);\n            formData.append('category', category);\n\n            const xhr = new XMLHttpRequest();\n            \n            xhr.upload.addEventListener('progress', (event) => {\n                if (event.lengthComputable) {\n                    const percentComplete = (event.loaded / event.total) * 100;\n                    onProgress(percentComplete);\n                }\n            });\n\n            xhr.addEventListener('load', () => {\n                if (xhr.status === 200) {\n                    try {\n                        const response = JSON.parse(xhr.responseText);\n                        this.notifySubscribers('file:uploaded', response);\n                        resolve(response);\n                    } catch (error) {\n                        reject(new Error('Invalid response format'));\n                    }\n                } else {\n                    reject(new Error(`Upload failed: ${xhr.statusText}`));\n                }\n            });\n\n            xhr.addEventListener('error', () => {\n                reject(new Error('Upload failed due to network error'));\n            });\n\n            xhr.open('POST', `${this.api.baseURL}/admin/upload`);\n            \n            // Add auth header if available\n            if (this.api.auth.token) {\n                xhr.setRequestHeader('Authorization', `Bearer ${this.api.auth.token}`);\n            }\n            \n            xhr.send(formData);\n        });\n    }\n\n    // Contact form\n    async submitContactForm(formData) {\n        try {\n            const response = await this.api.submitContact(formData);\n            this.notifySubscribers('contact:submitted', response);\n            return response;\n        } catch (error) {\n            console.error('Contact form submission failed:', error);\n            throw new Error('Failed to send message. Please try again later.');\n        }\n    }\n\n    // Subscription system for real-time updates\n    subscribe(event, callback) {\n        if (!this.subscribers.has(event)) {\n            this.subscribers.set(event, new Set());\n        }\n        this.subscribers.get(event).add(callback);\n    }\n\n    unsubscribe(event, callback) {\n        if (this.subscribers.has(event)) {\n            this.subscribers.get(event).delete(callback);\n        }\n    }\n\n    notifySubscribers(event, data) {\n        if (this.subscribers.has(event)) {\n            this.subscribers.get(event).forEach(callback => {\n                try {\n                    callback(data);\n                } catch (error) {\n                    console.error('Subscriber callback error:', error);\n                }\n            });\n        }\n    }\n\n    // Cache management\n    invalidateCache(pattern) {\n        this.api.clearCache(pattern);\n        this.cache.clear();\n    }\n\n    // Utility methods\n    async preloadData() {\n        try {\n            // Preload essential data\n            const promises = [\n                this.getBlogPosts({ limit: 5 }),\n                this.getProjects({ featured: true })\n            ];\n            \n            await Promise.allSettled(promises);\n            console.log('Essential data preloaded');\n        } catch (error) {\n            console.warn('Data preloading failed:', error);\n        }\n    }\n\n    // Health check\n    async checkHealth() {\n        try {\n            const response = await this.api.health();\n            return response.status === 'ok';\n        } catch (error) {\n            console.error('Health check failed:', error);\n            return false;\n        }\n    }\n\n    // Export/Import data (admin only)\n    async exportData(type = 'all') {\n        try {\n            const response = await this.api.get(`/admin/export/${type}`);\n            return response;\n        } catch (error) {\n            console.error('Data export failed:', error);\n            throw new Error('Failed to export data.');\n        }\n    }\n\n    async importData(file) {\n        try {\n            const response = await this.api.uploadFile(file, 'import');\n            this.invalidateCache(); // Clear all cache\n            this.notifySubscribers('data:imported', response);\n            return response;\n        } catch (error) {\n            console.error('Data import failed:', error);\n            throw new Error('Failed to import data.');\n        }\n    }\n}\n\n// Initialize data service with the global API instance\nwindow.dataService = new DataService(window.universalAPI);\n\n// Export for modules\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = DataService;\n}"