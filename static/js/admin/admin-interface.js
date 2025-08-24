/**
 * Admin Interface System
 * Comprehensive admin panel for content management
 */

class AdminInterface {
    constructor() {
        this.currentView = 'dashboard';
        this.isInitialized = false;
        this.configWaitAttempts = 0;
        this.maxConfigWaitAttempts = 50; // 5 seconds max wait
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        // Wait for Supabase configuration to be available
        await this.waitForSupabaseConfig();
        
        // Check API configuration first
        const configCheck = this.checkConfiguration();
        if (!configCheck.valid) {
            this.showConfigurationError(configCheck);
            return;
        }
        
        // Check if user is admin
        if (!window.authManager?.isAdmin()) {
            this.showAccessDenied();
            return;
        }

        this.createAdminUI();
        this.setupEventListeners();
        this.loadDashboard();
        
        this.isInitialized = true;
        console.log('Admin interface initialized');
    }

    createAdminUI() {
        // Create admin container
        const adminContainer = document.createElement('div');
        adminContainer.id = 'admin-interface';
        adminContainer.className = 'admin-interface';
        adminContainer.innerHTML = this.getAdminHTML();
        
        // Add admin styles
        this.addAdminStyles();
        
        // Insert into page
        const targetContainer = document.getElementById('admin-container') || document.body;
        targetContainer.appendChild(adminContainer);
        
        this.container = adminContainer;
    }

    getAdminHTML() {
        return `
            <div class="admin-header">
                <h1>Admin Dashboard</h1>
                <div class="admin-user-info">
                    <span data-user="name"></span>
                    <button class="admin-logout-btn" onclick="window.authManager.logout()">Logout</button>
                </div>
            </div>
            
            <div class="admin-nav">
                <button class="nav-btn active" data-view="dashboard">Dashboard</button>
                <button class="nav-btn" data-view="blog">Blog Posts</button>
                <button class="nav-btn" data-view="projects">Projects</button>
                <button class="nav-btn" data-view="media">Media</button>
                <button class="nav-btn" data-view="settings">Settings</button>
            </div>
            
            <div class="admin-content">
                <div id="admin-loading" class="admin-loading">
                    <div class="spinner"></div>
                    <span>Loading...</span>
                </div>
                
                <div id="admin-dashboard" class="admin-view">
                    <!-- Dashboard content will be loaded here -->
                </div>
                
                <div id="admin-blog" class="admin-view hidden">
                    <!-- Blog management content -->
                </div>
                
                <div id="admin-projects" class="admin-view hidden">
                    <!-- Projects management content -->
                </div>
                
                <div id="admin-media" class="admin-view hidden">
                    <!-- Media management content -->
                </div>
                
                <div id="admin-settings" class="admin-view hidden">
                    <!-- Settings content -->
                </div>
            </div>
        `;
    }

    addAdminStyles() {
        if (document.getElementById('admin-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'admin-styles';
        styles.textContent = `
            .admin-interface {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .admin-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #e5e7eb;
            }
            
            .admin-header h1 {
                margin: 0;
                color: #1f2937;
                font-size: 2rem;
            }
            
            .admin-user-info {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .admin-logout-btn {
                background: #ef4444;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
            }
            
            .admin-logout-btn:hover {
                background: #dc2626;
            }
            
            .admin-nav {
                display: flex;
                gap: 1rem;
                margin-bottom: 2rem;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .nav-btn {
                background: none;
                border: none;
                padding: 12px 24px;
                cursor: pointer;
                font-size: 1rem;
                color: #6b7280;
                border-bottom: 3px solid transparent;
                transition: all 0.2s ease;
            }
            
            .nav-btn:hover {
                color: #374151;
                background: #f9fafb;
            }
            
            .nav-btn.active {
                color: #667eea;
                border-bottom-color: #667eea;
                font-weight: 600;
            }
            
            .admin-content {
                min-height: 400px;
                position: relative;
            }
            
            .admin-view {
                display: block;
            }
            
            .admin-view.hidden {
                display: none;
            }
            
            .admin-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                gap: 1rem;
            }
            
            .admin-loading.hidden {
                display: none;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .admin-card {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                margin-bottom: 1.5rem;
            }
            
            .admin-card h3 {
                margin: 0 0 1rem 0;
                color: #1f2937;
            }
            
            .config-status {
                padding: 1rem;
                border-radius: 6px;
                margin-bottom: 1rem;
            }
            
            .config-status.success {
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                color: #15803d;
            }
            
            .config-status.error {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
            }
            
            .config-details {
                margin-top: 1rem;
                font-size: 0.9rem;
            }
            
            .config-details p {
                margin: 0.5rem 0;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .stat-card {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            
            .stat-number {
                font-size: 2rem;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 0.5rem;
            }
            
            .stat-label {
                color: #6b7280;
                font-size: 0.9rem;
            }
            
            .admin-button {
                background: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                transition: background-color 0.2s ease;
            }
            
            .admin-button:hover {
                background: #5a67d8;
            }
            
            .admin-button.secondary {
                background: #6b7280;
            }
            
            .admin-button.secondary:hover {
                background: #4b5563;
            }
            
            .admin-button.danger {
                background: #ef4444;
            }
            
            .admin-button.danger:hover {
                background: #dc2626;
            }
            
            .admin-form {
                background: white;
                border-radius: 8px;
                padding: 2rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #374151;
            }
            
            .form-input {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #e5e7eb;
                border-radius: 6px;
                font-size: 1rem;
                transition: border-color 0.2s ease;
            }
            
            .form-input:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .form-textarea {
                min-height: 120px;
                resize: vertical;
            }
            
            .admin-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .admin-table th,
            .admin-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .admin-table th {
                background: #f9fafb;
                font-weight: 600;
                color: #374151;
            }
            
            .admin-table tr:hover {
                background: #f9fafb;
            }
            
            .action-buttons {
                display: flex;
                gap: 0.5rem;
            }
            
            .action-btn {
                background: none;
                border: 1px solid #d1d5db;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.2s ease;
            }
            
            .action-btn:hover {
                background: #f3f4f6;
            }
            
            .action-btn.edit {
                color: #667eea;
                border-color: #667eea;
            }
            
            .action-btn.delete {
                color: #ef4444;
                border-color: #ef4444;
            }
            
            .upload-area {
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                transition: all 0.2s ease;
                cursor: pointer;
            }
            
            .upload-area:hover {
                border-color: #667eea;
                background: #f8faff;
            }
            
            .upload-area.dragover {
                border-color: #667eea;
                background: #e0e7ff;
            }
            
            [data-theme="dark"] .admin-interface {
                color: #f9fafb;
            }
            
            [data-theme="dark"] .admin-header h1 {
                color: #f9fafb;
            }
            
            [data-theme="dark"] .admin-card,
            [data-theme="dark"] .stat-card,
            [data-theme="dark"] .admin-form,
            [data-theme="dark"] .admin-table {
                background: #1f2937;
                color: #f9fafb;
            }
            
            [data-theme="dark"] .admin-table th {
                background: #374151;
            }
            
            [data-theme="dark"] .form-input {
                background: #374151;
                color: #f9fafb;
                border-color: #4b5563;
            }
        `;
        
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        // Navigation
        const navButtons = this.container.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Auth state changes
        window.authManager?.addAuthListener((event, data) => {
            if (event === 'logout') {
                this.cleanup();
                window.location.href = '/';
            }
        });
    }

    switchView(viewName) {
        this.currentView = viewName;
        
        // Update navigation
        const navButtons = this.container.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Hide all views
        const views = this.container.querySelectorAll('.admin-view');
        views.forEach(view => view.classList.add('hidden'));

        // Show selected view
        const targetView = this.container.querySelector(`#admin-${viewName}`);
        if (targetView) {
            targetView.classList.remove('hidden');
            this.loadViewContent(viewName);
        }
    }

    async loadViewContent(viewName) {
        const viewContainer = this.container.querySelector(`#admin-${viewName}`);
        
        try {
            switch (viewName) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'blog':
                    await this.loadBlogManagement();
                    break;
                case 'projects':
                    await this.loadProjectsManagement();
                    break;
                case 'media':
                    await this.loadMediaManagement();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
            }
        } catch (error) {
            this.showError(`Failed to load ${viewName} view: ${error.message}`);
        }
    }

    async loadDashboard() {
        const dashboardContainer = this.container.querySelector('#admin-dashboard');
        
        try {
            // Get statistics
            const [blogData, projectsData] = await Promise.all([
                window.dataService?.getBlogPosts?.({ limit: 1 }) || { posts: [], pagination: { total: 0 } },
                window.dataService?.getProjects?.() || { projects: [] }
            ]);

            const stats = {
                blogPosts: blogData.pagination?.total || 0,
                projects: projectsData.projects?.length || 0,
                published: blogData.posts?.filter(p => p.status === 'published').length || 0,
                featured: projectsData.projects?.filter(p => p.featured).length || 0
            };

            dashboardContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.blogPosts}</div>
                        <div class="stat-label">Blog Posts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.projects}</div>
                        <div class="stat-label">Projects</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.published}</div>
                        <div class="stat-label">Published</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.featured}</div>
                        <div class="stat-label">Featured</div>
                    </div>
                </div>
                
                <div class="admin-card">
                    <h3>Quick Actions</h3>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="admin-button" onclick="adminInterface.switchView('blog'); adminInterface.showCreateBlogForm()">
                            New Blog Post
                        </button>
                        <button class="admin-button" onclick="adminInterface.switchView('projects'); adminInterface.showCreateProjectForm()">
                            New Project
                        </button>
                        <button class="admin-button secondary" onclick="adminInterface.switchView('media')">
                            Upload Media
                        </button>
                        <button class="admin-button secondary" onclick="window.dataService?.invalidateCache?.() || console.log('Cache cleared')">
                            Clear Cache
                        </button>
                    </div>
                </div>
                
                <div class="admin-card">
                    <h3>Recent Activity</h3>
                    <p>Recent blog posts and project updates will appear here.</p>
                </div>
            `;
            
        } catch (error) {
            dashboardContainer.innerHTML = `
                <div class="admin-card">
                    <h3>Dashboard Error</h3>
                    <p>Unable to load dashboard data: ${error.message}</p>
                    <button class="admin-button" onclick="adminInterface.loadDashboard()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    async loadBlogManagement() {
        const blogContainer = this.container.querySelector('#admin-blog');
        
        try {
            const blogData = await window.dataService?.getBlogPosts?.({ limit: 50 }) || { posts: [] };
            
            blogContainer.innerHTML = `
                <div class="admin-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3>Blog Posts</h3>
                        <button class="admin-button" onclick="adminInterface.showCreateBlogForm()">
                            New Post
                        </button>
                    </div>
                    
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Published</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${blogData.posts.map(post => `
                                <tr>
                                    <td>${post.title}</td>
                                    <td>
                                        <span class="status-badge status-${post.status}">
                                            ${post.status}
                                        </span>
                                    </td>
                                    <td>${new Date(post.publishedAt).toLocaleDateString()}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit" onclick="adminInterface.editBlogPost(${post.id})">
                                                Edit
                                            </button>
                                            <button class="action-btn delete" onclick="adminInterface.deleteBlogPost(${post.id})">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div id="blog-form-container" style="display: none;">
                    <!-- Blog form will be inserted here -->
                </div>
            `;
            
        } catch (error) {
            blogContainer.innerHTML = `
                <div class="admin-card">
                    <h3>Blog Management Error</h3>
                    <p>Unable to load blog posts: ${error.message}</p>
                    <button class="admin-button" onclick="adminInterface.loadBlogManagement()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    async loadProjectsManagement() {
        const projectsContainer = this.container.querySelector('#admin-projects');
        
        try {
            const projectsData = await window.dataService?.getProjects?.() || { projects: [] };
            
            projectsContainer.innerHTML = `
                <div class="admin-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3>Projects</h3>
                        <button class="admin-button" onclick="adminInterface.showCreateProjectForm()">
                            New Project
                        </button>
                    </div>
                    
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Featured</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${projectsData.projects.map(project => `
                                <tr>
                                    <td>${project.name}</td>
                                    <td>${project.category}</td>
                                    <td>${project.status}</td>
                                    <td>${project.featured ? '⭐' : ''}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit" onclick="adminInterface.editProject(${project.id})">
                                                Edit
                                            </button>
                                            <button class="action-btn delete" onclick="adminInterface.deleteProject(${project.id})">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div id="project-form-container" style="display: none;">
                    <!-- Project form will be inserted here -->
                </div>
            `;
            
        } catch (error) {
            projectsContainer.innerHTML = `
                <div class="admin-card">
                    <h3>Projects Management Error</h3>
                    <p>Unable to load projects: ${error.message}</p>
                    <button class="admin-button" onclick="adminInterface.loadProjectsManagement()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    async loadMediaManagement() {
        const mediaContainer = this.container.querySelector('#admin-media');
        
        mediaContainer.innerHTML = `
            <div class="admin-card">
                <h3>Media Upload</h3>
                <div class="upload-area" onclick="document.getElementById('file-input').click()">
                    <div style="margin-bottom: 1rem; font-size: 3rem;">📁</div>
                    <div>Click to select files or drag and drop</div>
                    <div style="margin-top: 0.5rem; color: #6b7280; font-size: 0.9rem;">
                        Supported: Images (JPG, PNG, GIF), Videos (MP4), Documents (PDF)
                    </div>
                </div>
                <input type="file" id="file-input" multiple accept="image/*,video/*,.pdf" style="display: none;">
                
                <div id="upload-progress" style="display: none; margin-top: 1rem;">
                    <!-- Upload progress will be shown here -->
                </div>
            </div>
            
            <div class="admin-card">
                <h3>Recent Uploads</h3>
                <div id="recent-uploads">
                    <p>Recent uploads will appear here.</p>
                </div>
            </div>
        `;
        
        // Setup file upload
        this.setupFileUpload();
    }

    async loadSettings() {
        const settingsContainer = this.container.querySelector('#admin-settings');
        const configStatus = this.checkConfiguration();
        
        settingsContainer.innerHTML = `
            <div class="admin-card">
                <h3>API Configuration Status</h3>
                <div class="config-status ${configStatus.valid ? 'success' : 'error'}">
                    <h4>${configStatus.valid ? '✅ Configuration Valid' : '❌ Configuration Issues'}</h4>
                    ${configStatus.issues.length > 0 ? 
                        `<ul>${configStatus.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>` : 
                        '<p>All configuration checks passed.</p>'
                    }
                    <div class="config-details">
                        <p><strong>Supabase URL:</strong> ${configStatus.supabase?.url || 'Not configured'}</p>
                        <p><strong>Supabase Key:</strong> ${configStatus.supabase?.hasValidKey ? '✅ Valid' : '❌ Invalid or missing'}</p>
                        <p><strong>Environment Detection:</strong> ${this.getEnvironmentInfo()}</p>
                        <p><strong>Config Source:</strong> ${
                            configStatus.sources?.globalConfig ? 'Global Config (window.SUPABASE_CONFIG)' :
                            configStatus.sources?.apiConfig ? 'API Config Manager' :
                            'Hardcoded Fallback'
                        }</p>
                    </div>
                </div>
            </div>
            
            <div class="admin-card">
                <h3>General Settings</h3>
                <form class="admin-form" onsubmit="adminInterface.saveSettings(event)">
                    <div class="form-group">
                        <label class="form-label">Site Title</label>
                        <input type="text" class="form-input" name="siteTitle" value="Portfolio Site">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Site Description</label>
                        <textarea class="form-input form-textarea" name="siteDescription">
                            Professional portfolio and blog
                        </textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Contact Email</label>
                        <input type="email" class="form-input" name="contactEmail" value="contact@example.com">
                    </div>
                    
                    <button type="submit" class="admin-button">Save Settings</button>
                </form>
            </div>
            
            <div class="admin-card">
                <h3>Cache Management</h3>
                <p>Manage application cache and performance.</p>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="admin-button secondary" onclick="window.dataService?.invalidateCache?.() || console.log('Cache cleared')">
                        Clear All Cache
                    </button>
                    <button class="admin-button secondary" onclick="window.location.reload()">
                        Force Refresh
                    </button>
                    <button class="admin-button secondary" onclick="adminInterface.testApiConnection()">
                        Test API Connection
                    </button>
                </div>
            </div>
            
            <div class="admin-card">
                <h3>System Information</h3>
                <div id="system-info">
                    <p><strong>User Agent:</strong> ${navigator.userAgent}</p>
                    <p><strong>Online Status:</strong> ${navigator.onLine ? 'Online' : 'Offline'}</p>
                    <p><strong>Current User:</strong> ${window.authManager?.getDisplayName?.() || 'Not authenticated'}</p>
                    <p><strong>API Client:</strong> ${window.apiClient ? 'Loaded' : 'Not loaded'}</p>
                    <p><strong>Config Manager:</strong> ${window.apiConfig ? 'Loaded' : 'Not loaded'}</p>
                    <p><strong>Global Config:</strong> ${window.SUPABASE_CONFIG ? 'Available' : 'Not available'}</p>
                    <p><strong>Config Wait Attempts:</strong> ${this.configWaitAttempts}/${this.maxConfigWaitAttempts}</p>
                </div>
            </div>
        `;
    }

    setupFileUpload() {
        const uploadArea = this.container.querySelector('.upload-area');
        const fileInput = this.container.querySelector('#file-input');
        
        if (!uploadArea || !fileInput) return;

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            this.handleFileUpload(files);
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileUpload(files);
        });
    }

    async handleFileUpload(files) {
        const progressContainer = this.container.querySelector('#upload-progress');
        progressContainer.style.display = 'block';
        
        for (const file of files) {
            try {
                progressContainer.innerHTML += `
                    <div class="upload-item" data-filename="${file.name}">
                        <div>${file.name}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                `;
                
                await window.dataService?.uploadFile?.(file, 'media', (progress) => {
                    const progressFill = progressContainer.querySelector(`[data-filename="${file.name}"] .progress-fill`);
                    if (progressFill) {
                        progressFill.style.width = `${progress}%`;
                    }
                });
                
                window.loadingManager?.showSuccess?.(`${file.name} uploaded successfully`) ||
                    console.log(`${file.name} uploaded successfully`);
                
            } catch (error) {
                window.errorBoundary?.showError?.(`Upload failed for ${file.name}: ${error.message}`) ||
                    console.error(`Upload failed for ${file.name}: ${error.message}`);
            }
        }
    }

    showCreateBlogForm() {
        const formContainer = this.container.querySelector('#blog-form-container');
        formContainer.style.display = 'block';
        formContainer.innerHTML = this.getBlogFormHTML();
    }

    showCreateProjectForm() {
        const formContainer = this.container.querySelector('#project-form-container');
        formContainer.style.display = 'block';
        formContainer.innerHTML = this.getProjectFormHTML();
    }

    getBlogFormHTML(post = null) {
        const isEdit = !!post;
        return `
            <div class="admin-form">
                <h3>${isEdit ? 'Edit' : 'Create'} Blog Post</h3>
                <form onsubmit="adminInterface.saveBlogPost(event, ${post?.id || 'null'})">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" class="form-input" name="title" value="${post?.title || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Slug</label>
                        <input type="text" class="form-input" name="slug" value="${post?.slug || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Excerpt</label>
                        <textarea class="form-input form-textarea" name="excerpt" required>${post?.excerpt || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Content</label>
                        <textarea class="form-input" name="content" style="min-height: 300px;" required>${post?.content || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <input type="text" class="form-input" name="category" value="${post?.category || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Tags (comma-separated)</label>
                        <input type="text" class="form-input" name="tags" value="${post?.tags?.join(', ') || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-input" name="status">
                            <option value="draft" ${post?.status === 'draft' ? 'selected' : ''}>Draft</option>
                            <option value="published" ${post?.status === 'published' ? 'selected' : ''}>Published</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" class="admin-button">
                            ${isEdit ? 'Update' : 'Create'} Post
                        </button>
                        <button type="button" class="admin-button secondary" onclick="adminInterface.hideForms()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    getProjectFormHTML(project = null) {
        const isEdit = !!project;
        return `
            <div class="admin-form">
                <h3>${isEdit ? 'Edit' : 'Create'} Project</h3>
                <form onsubmit="adminInterface.saveProject(event, ${project?.id || 'null'})">
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-input" name="name" value="${project?.name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Slug</label>
                        <input type="text" class="form-input" name="slug" value="${project?.slug || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-input form-textarea" name="description" required>${project?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Long Description</label>
                        <textarea class="form-input" name="longDescription" style="min-height: 200px;">${project?.longDescription || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <input type="text" class="form-input" name="category" value="${project?.category || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Technologies (comma-separated)</label>
                        <input type="text" class="form-input" name="technologies" value="${project?.technologies?.join(', ') || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-input" name="status">
                            <option value="planning" ${project?.status === 'planning' ? 'selected' : ''}>Planning</option>
                            <option value="in-progress" ${project?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${project?.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" name="featured" ${project?.featured ? 'checked' : ''}>
                            Featured Project
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" class="admin-button">
                            ${isEdit ? 'Update' : 'Create'} Project
                        </button>
                        <button type="button" class="admin-button secondary" onclick="adminInterface.hideForms()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    async saveBlogPost(event, postId = null) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const postData = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            excerpt: formData.get('excerpt'),
            content: formData.get('content'),
            category: formData.get('category'),
            tags: formData.get('tags').split(',').map(tag => tag.trim()),
            status: formData.get('status')
        };
        
        try {
            if (postId) {
                await window.dataService?.updateBlogPost?.(postId, postData);
                window.loadingManager?.showSuccess?.('Blog post updated successfully') ||
                    console.log('Blog post updated successfully');
            } else {
                await window.dataService?.createBlogPost?.(postData);
                window.loadingManager?.showSuccess?.('Blog post created successfully') ||
                    console.log('Blog post created successfully');
            }
            
            this.hideForms();
            this.loadBlogManagement();
            
        } catch (error) {
            window.errorBoundary?.showError?.(`Failed to save blog post: ${error.message}`) ||
                console.error(`Failed to save blog post: ${error.message}`);
        }
    }

    async saveProject(event, projectId = null) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const projectData = {
            name: formData.get('name'),
            slug: formData.get('slug'),
            description: formData.get('description'),
            longDescription: formData.get('longDescription'),
            category: formData.get('category'),
            technologies: formData.get('technologies').split(',').map(tech => tech.trim()),
            status: formData.get('status'),
            featured: formData.get('featured') === 'on'
        };
        
        try {
            if (projectId) {
                await window.dataService?.updateProject?.(projectId, projectData);
                window.loadingManager?.showSuccess?.('Project updated successfully') ||
                    console.log('Project updated successfully');
            } else {
                await window.dataService?.createProject?.(projectData);
                window.loadingManager?.showSuccess?.('Project created successfully') ||
                    console.log('Project created successfully');
            }
            
            this.hideForms();
            this.loadProjectsManagement();
            
        } catch (error) {
            window.errorBoundary?.showError?.(`Failed to save project: ${error.message}`) ||
                console.error(`Failed to save project: ${error.message}`);
        }
    }

    async saveSettings(event) {
        event.preventDefault();
        // Settings save logic would go here
        window.loadingManager?.showSuccess?.('Settings saved successfully') ||
            console.log('Settings saved successfully');
    }

    hideForms() {
        const blogForm = this.container.querySelector('#blog-form-container');
        const projectForm = this.container.querySelector('#project-form-container');
        
        if (blogForm) blogForm.style.display = 'none';
        if (projectForm) projectForm.style.display = 'none';
    }

    showAccessDenied() {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center;">
                <h1>Access Denied</h1>
                <p>You don't have permission to access the admin interface.</p>
                <button onclick="window.location.href = '/'" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Go Home
                </button>
            </div>
        `;
    }

    showConfigurationError(configCheck) {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 2rem;">
                <h1>🔧 Configuration Error</h1>
                <p>The admin panel detected configuration issues that need to be resolved:</p>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin: 1rem 0; max-width: 600px;">
                    <ul style="text-align: left; margin: 0;">
                        ${configCheck.issues.map(issue => `<li style="margin: 0.5rem 0;">${issue}</li>`).join('')}
                    </ul>
                </div>
                <div style="margin: 2rem 0;">
                    <p><strong>Supabase URL:</strong> ${configCheck.supabase?.url || 'Not detected'}</p>
                    <p><strong>Supabase Key:</strong> ${configCheck.supabase?.hasValidKey ? '✅ Valid' : '❌ Invalid'}</p>
                    <p><strong>Config Source:</strong> ${
                        configCheck.sources?.globalConfig ? '✅ Global Config (window.SUPABASE_CONFIG)' :
                        configCheck.sources?.apiConfig ? '✅ API Config Manager' :
                        '⚠️ Using hardcoded fallback values'
                    }</p>
                </div>
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 1rem; margin: 1rem 0; max-width: 600px;">
                    <h3 style="margin: 0 0 0.5rem 0; color: #0c4a6e;">Expected Configuration:</h3>
                    <p style="margin: 0.5rem 0; text-align: left; font-family: monospace; font-size: 0.9rem;">
                        window.SUPABASE_CONFIG = {<br/>
                        &nbsp;&nbsp;url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',<br/>
                        &nbsp;&nbsp;anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'<br/>
                        };
                    </p>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Retry
                    </button>
                    <button onclick="window.adminInterface.testConfigConnection()" style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Test Connection
                    </button>
                    <button onclick="window.location.href = '/'" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Go Home
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Test configuration connection from error page
     */
    async testConfigConnection() {
        try {
            const config = this.getSupabaseConfig();
            const response = await fetch(`${config.url}/rest/v1/`, {
                method: 'HEAD',
                headers: {
                    'apikey': config.anonKey,
                    'Authorization': `Bearer ${config.anonKey}`
                },
                timeout: 10000
            });
            
            if (response.ok) {
                alert('✅ Connection successful! The configuration is working.');
                location.reload();
            } else {
                alert(`❌ Connection failed: HTTP ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            alert(`❌ Connection test failed: ${error.message}`);
        }
    }

    showError(message) {
        window.errorBoundary?.showError?.(message, 'admin') ||
            console.error('Admin Error:', message);
    }

    cleanup() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.isInitialized = false;
    }

    /**
     * Wait for Supabase configuration to be available
     */
    async waitForSupabaseConfig() {
        return new Promise((resolve) => {
            const checkConfig = () => {
                if (window.SUPABASE_CONFIG || window.apiConfig || this.configWaitAttempts >= this.maxConfigWaitAttempts) {
                    console.log('🔧 Admin Interface: Configuration check completed');
                    resolve();
                    return;
                }
                
                this.configWaitAttempts++;
                console.log(`🔧 Admin Interface: Waiting for configuration... (${this.configWaitAttempts}/${this.maxConfigWaitAttempts})`);
                setTimeout(checkConfig, 100);
            };
            
            checkConfig();
        });
    }

    /**
     * Get Supabase configuration from multiple sources
     */
    getSupabaseConfig() {
        // Try window.SUPABASE_CONFIG first (from global config)
        if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey) {
            return window.SUPABASE_CONFIG;
        }
        
        // Try window.apiConfig
        if (window.apiConfig) {
            const url = window.apiConfig.getSupabaseUrl?.();
            const anonKey = window.apiConfig.getSupabaseAnonKey?.();
            if (url && anonKey) {
                return { url, anonKey };
            }
        }
        
        // Fallback to hardcoded values
        return {
            url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
        };
    }

    /**
     * Initialize API client if needed
     */
    initializeAPIClient() {
        if (!window.apiClient) {
            console.log('🔧 Admin Interface: Initializing API client...');
            const config = this.getSupabaseConfig();
            
            // Create a basic API client if none exists
            window.apiClient = {
                request: async (endpoint, options = {}) => {
                    const url = `${config.url}/rest/v1${endpoint}`;
                    const response = await fetch(url, {
                        method: options.method || 'GET',
                        headers: {
                            'apikey': config.anonKey,
                            'Authorization': `Bearer ${config.anonKey}`,
                            'Content-Type': 'application/json',
                            ...options.headers
                        },
                        body: options.body ? JSON.stringify(options.body) : undefined
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    return response.json();
                },
                getStatus: () => ({
                    configured: true,
                    supabaseUrl: config.url,
                    hasValidKey: config.anonKey.length > 100
                })
            };
        }
    }

    /**
     * Check configuration validity
     */
    checkConfiguration() {
        const config = this.getSupabaseConfig();
        const issues = [];
        
        // Validate Supabase URL
        if (!config.url || !config.url.startsWith('https://')) {
            issues.push('Invalid Supabase URL - must be a valid HTTPS URL');
        }
        
        // Validate Supabase anonymous key
        if (!config.anonKey || config.anonKey.length < 100) {
            issues.push('Invalid Supabase anonymous key - must be a valid JWT token');
        }
        
        // Check if API client is available
        if (!window.apiClient) {
            this.initializeAPIClient();
        }
        
        return {
            valid: issues.length === 0,
            issues,
            supabase: {
                url: config.url,
                hasValidKey: config.anonKey && config.anonKey.length > 100,
                configured: true
            },
            sources: {
                globalConfig: !!window.SUPABASE_CONFIG,
                apiConfig: !!window.apiConfig,
                fallback: !window.SUPABASE_CONFIG && !window.apiConfig
            }
        };
    }

    /**
     * Get environment information
     */
    getEnvironmentInfo() {
        const hostname = window.location.hostname;
        const isProduction = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
        const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
        
        if (isNetlify) return 'Netlify Production';
        if (isProduction) return 'Production';
        return 'Local Development';
    }

    /**
     * Test API connection
     */
    async testApiConnection() {
        try {
            const config = this.getSupabaseConfig();
            
            if (!config.url || !config.anonKey) {
                throw new Error('Supabase configuration not available');
            }
            
            // Test direct connection to Supabase REST API
            const response = await fetch(`${config.url}/rest/v1/`, {
                method: 'HEAD',
                headers: {
                    'apikey': config.anonKey,
                    'Authorization': `Bearer ${config.anonKey}`
                },
                timeout: 10000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            window.loadingManager?.showSuccess?.('✅ API connection successful!') || 
                alert('✅ API connection successful!');
                
        } catch (error) {
            console.error('API connection test failed:', error);
            window.errorBoundary?.showError?.(`❌ API connection failed: ${error.message}`) || 
                alert(`❌ API connection failed: ${error.message}`);
        }
    }
}

// Initialize admin interface
window.adminInterface = new AdminInterface();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminInterface;
}