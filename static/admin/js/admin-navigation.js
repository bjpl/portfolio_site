// Unified Admin Navigation System
(function() {
    'use strict';
    
    // Define all admin tools with their metadata
    const adminTools = {
        dashboard: {
            title: '📊 Dashboard',
            path: '/admin/dashboard.html',
            description: 'Overview and quick actions',
            category: 'main',
            icon: '📊'
        },
        contentManager: {
            title: '📝 Content Manager',
            path: '/admin/content-manager.html',
            description: 'Manage all site content',
            category: 'content',
            icon: '📝'
        },
        contentEditor: {
            title: '✏️ Content Editor',
            path: '/admin/content-editor.html',
            description: 'Edit markdown files',
            category: 'content',
            icon: '✏️'
        },
        review: {
            title: '🔍 Review Tool',
            path: '/admin/review.html',
            description: 'Content review and quality checks',
            category: 'content',
            icon: '🔍'
        },
        bulkUpload: {
            title: '📤 Bulk Upload',
            path: '/admin/bulk-upload.html',
            description: 'Upload multiple files at once',
            category: 'content',
            icon: '📤'
        },
        fileManager: {
            title: '📁 File Manager',
            path: '/admin/file-manager.html',
            description: 'Browse and manage files',
            category: 'files',
            icon: '📁'
        },
        imageOptimizer: {
            title: '🖼️ Image Optimizer',
            path: '/admin/image-optimizer.html',
            description: 'Optimize and resize images',
            category: 'files',
            icon: '🖼️'
        },
        buildDeploy: {
            title: '🚀 Build & Deploy',
            path: '/admin/build-deploy.html',
            description: 'Build and deploy your site',
            category: 'deployment',
            icon: '🚀'
        },
        analytics: {
            title: '📈 Analytics',
            path: '/admin/analytics-dashboard.html',
            description: 'Site analytics and metrics',
            category: 'monitoring',
            icon: '📈'
        },
        seoManager: {
            title: '🔎 SEO Manager',
            path: '/admin/seo-manager.html',
            description: 'SEO optimization tools',
            category: 'optimization',
            icon: '🔎'
        },
        systemStatus: {
            title: '⚙️ System Status',
            path: '/admin/system-status.html',
            description: 'Server health and logs',
            category: 'monitoring',
            icon: '⚙️'
        }
    };
    
    // Categories for grouping tools
    const categories = {
        main: 'Main',
        content: 'Content Management',
        files: 'File Management',
        deployment: 'Deployment',
        monitoring: 'Monitoring',
        optimization: 'Optimization'
    };
    
    // Create navigation menu
    function createNavigationMenu() {
        const nav = document.createElement('nav');
        nav.className = 'admin-quick-nav';
        nav.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        
        // Group tools by category
        const toolsByCategory = {};
        Object.entries(adminTools).forEach(([key, tool]) => {
            if (!toolsByCategory[tool.category]) {
                toolsByCategory[tool.category] = [];
            }
            toolsByCategory[tool.category].push({ key, ...tool });
        });
        
        // Create menu content
        let menuHTML = '<h3 style="margin: 0 0 15px 0; font-size: 18px;">🧭 Admin Tools</h3>';
        
        Object.entries(toolsByCategory).forEach(([category, tools]) => {
            menuHTML += `
                <div class="nav-category" style="margin-bottom: 15px;">
                    <h4 style="font-size: 12px; color: #718096; text-transform: uppercase; margin: 10px 0 8px 0;">
                        ${categories[category]}
                    </h4>
                    <div class="nav-tools">
            `;
            
            tools.forEach(tool => {
                const isActive = window.location.pathname.includes(tool.path.split('/').pop());
                menuHTML += `
                    <a href="${tool.path}" 
                       class="nav-tool-link ${isActive ? 'active' : ''}"
                       style="
                           display: flex;
                           align-items: center;
                           padding: 8px 12px;
                           margin: 2px 0;
                           border-radius: 6px;
                           text-decoration: none;
                           color: ${isActive ? '#667eea' : '#2d3748'};
                           background: ${isActive ? 'rgba(102, 126, 234, 0.1)' : 'transparent'};
                           transition: all 0.2s;
                       "
                       onmouseover="this.style.background='rgba(102, 126, 234, 0.1)'"
                       onmouseout="this.style.background='${isActive ? 'rgba(102, 126, 234, 0.1)' : 'transparent'}'">
                        <span style="margin-right: 8px;">${tool.icon}</span>
                        <div style="flex: 1;">
                            <div style="font-size: 14px; font-weight: 500;">${tool.title.replace(tool.icon, '').trim()}</div>
                            <div style="font-size: 11px; color: #718096;">${tool.description}</div>
                        </div>
                    </a>
                `;
            });
            
            menuHTML += `
                    </div>
                </div>
            `;
        });
        
        nav.innerHTML = menuHTML;
        return nav;
    }
    
    // Create toggle button
    function createToggleButton() {
        const button = document.createElement('button');
        button.className = 'admin-nav-toggle';
        button.innerHTML = '🧭';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #667eea;
            color: white;
            border: none;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            z-index: 1001;
            transition: all 0.3s;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        
        return button;
    }
    
    // Create breadcrumb navigation
    function createBreadcrumbs() {
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'admin-breadcrumb';
        breadcrumb.style.cssText = `
            padding: 10px 20px;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
            color: #718096;
        `;
        
        const currentPath = window.location.pathname;
        const currentTool = Object.values(adminTools).find(tool => 
            currentPath.includes(tool.path.split('/').pop())
        );
        
        let breadcrumbHTML = `
            <a href="/admin/dashboard.html" style="color: #667eea; text-decoration: none;">Admin</a>
        `;
        
        if (currentTool) {
            breadcrumbHTML += ` / <span>${currentTool.title}</span>`;
        }
        
        breadcrumb.innerHTML = breadcrumbHTML;
        return breadcrumb;
    }
    
    // Quick search functionality
    function createQuickSearch() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'admin-quick-search';
        searchContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            width: 500px;
            max-width: 90%;
            z-index: 2000;
            display: none;
        `;
        
        searchContainer.innerHTML = `
            <input type="text" 
                   id="adminQuickSearch" 
                   placeholder="Search admin tools..." 
                   style="
                       width: 100%;
                       padding: 12px;
                       border: 1px solid #e2e8f0;
                       border-radius: 6px;
                       font-size: 16px;
                   ">
            <div id="searchResults" style="margin-top: 15px;"></div>
        `;
        
        return searchContainer;
    }
    
    // Initialize navigation
    function initializeNavigation() {
        // Don't initialize on login page
        if (window.location.pathname.includes('login')) {
            return;
        }
        
        // Create and append navigation elements
        const nav = createNavigationMenu();
        const toggle = createToggleButton();
        const breadcrumb = createBreadcrumbs();
        const search = createQuickSearch();
        
        document.body.appendChild(nav);
        document.body.appendChild(toggle);
        document.body.appendChild(search);
        
        // Insert breadcrumb at the top of the page
        const firstElement = document.body.firstElementChild;
        if (firstElement && !window.location.pathname.includes('dashboard')) {
            document.body.insertBefore(breadcrumb, firstElement);
        }
        
        // Toggle menu visibility
        toggle.addEventListener('click', () => {
            const isVisible = nav.style.display === 'block';
            nav.style.display = isVisible ? 'none' : 'block';
            toggle.innerHTML = isVisible ? '🧭' : '✕';
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !toggle.contains(e.target)) {
                nav.style.display = 'none';
                toggle.innerHTML = '🧭';
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + N to toggle navigation
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                toggle.click();
            }
            
            // Ctrl/Cmd + K for quick search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                search.style.display = search.style.display === 'block' ? 'none' : 'block';
                if (search.style.display === 'block') {
                    document.getElementById('adminQuickSearch').focus();
                }
            }
            
            // Escape to close search
            if (e.key === 'Escape') {
                search.style.display = 'none';
                nav.style.display = 'none';
                toggle.innerHTML = '🧭';
            }
        });
        
        // Quick search functionality
        const searchInput = document.getElementById('adminQuickSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const results = document.getElementById('searchResults');
                
                if (query.length < 2) {
                    results.innerHTML = '';
                    return;
                }
                
                const matches = Object.entries(adminTools).filter(([key, tool]) => 
                    tool.title.toLowerCase().includes(query) || 
                    tool.description.toLowerCase().includes(query)
                );
                
                if (matches.length === 0) {
                    results.innerHTML = '<p style="color: #718096;">No tools found</p>';
                } else {
                    results.innerHTML = matches.map(([key, tool]) => `
                        <a href="${tool.path}" 
                           style="
                               display: block;
                               padding: 10px;
                               margin: 5px 0;
                               border-radius: 6px;
                               text-decoration: none;
                               color: #2d3748;
                               background: #f7fafc;
                               transition: all 0.2s;
                           "
                           onmouseover="this.style.background='#e2e8f0'"
                           onmouseout="this.style.background='#f7fafc'">
                            ${tool.icon} <strong>${tool.title.replace(tool.icon, '').trim()}</strong>
                            <br>
                            <small style="color: #718096;">${tool.description}</small>
                        </a>
                    `).join('');
                }
            });
        }
    }
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    } else {
        initializeNavigation();
    }
    
    // Export for global access
    window.adminNavigation = {
        tools: adminTools,
        categories: categories,
        refresh: initializeNavigation
    };
    
    console.log('Admin navigation system loaded');
})();