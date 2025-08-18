// Admin Sidebar Navigation - Hugo Dev Portfolio Management
(function() {
    'use strict';
    
    // Navigation structure matching Hugo Dev requirements
    const navigationStructure = {
        title: '🚀 Hugo Dev',
        subtitle: 'Portfolio Management',
        sections: [
            {
                name: 'Dashboard',
                items: [
                    { icon: '📊', title: 'Overview', path: '/admin/dashboard.html' }
                ]
            },
            {
                name: 'Content',
                items: [
                    { icon: '📝', title: 'Content Manager', path: '/admin/content-manager.html' },
                    { icon: '✏️', title: 'Content Editor', path: '/admin/content-editor.html' },
                    { icon: '📄', title: 'Pages', path: '/admin/pages.html' },
                    { icon: '📝', title: 'Blog Posts', path: '/admin/blog-posts.html' },
                    { icon: '🎨', title: 'Portfolio Items', path: '/admin/portfolio-items.html' }
                ]
            },
            {
                name: 'Media',
                items: [
                    { icon: '🖼️', title: 'File Manager', path: '/admin/file-manager.html' },
                    { icon: '📦', title: 'Bulk Upload', path: '/admin/bulk-upload.html' },
                    { icon: '🖼️', title: 'Image Optimizer', path: '/admin/image-optimizer.html' }
                ]
            },
            {
                name: 'Development',
                items: [
                    { icon: '✅', title: 'Review Tool', path: '/admin/review.html' },
                    { icon: '⚡', title: 'Build & Deploy', path: '/admin/build-deploy.html' },
                    { icon: '🔌', title: 'API Explorer', path: '/admin/api-explorer.html' },
                    { icon: '📋', title: 'Logs', path: '/admin/logs.html' }
                ]
            },
            {
                name: 'Settings',
                items: [
                    { icon: '⚙️', title: 'Site Settings', path: '/admin/site-settings.html' },
                    { icon: '👥', title: 'Users', path: '/admin/user-management.html' },
                    { icon: '📈', title: 'Analytics', path: '/admin/analytics-dashboard.html' },
                    { icon: '💾', title: 'Backup', path: '/admin/backup.html' }
                ]
            }
        ]
    };
    
    // Create sidebar HTML
    function createSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'adminSidebar';
        sidebar.className = 'admin-sidebar';
        
        // Sidebar styles
        sidebar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 260px;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        `;
        
        // Build sidebar content
        let sidebarHTML = `
            <div class="sidebar-header" style="padding: 25px 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <h2 style="margin: 0; font-size: 24px; font-weight: 700; display: flex; align-items: center;">
                    ${navigationStructure.title}
                </h2>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">
                    ${navigationStructure.subtitle}
                </p>
            </div>
            <nav class="sidebar-nav" style="padding: 20px 0;">
        `;
        
        // Add navigation sections
        navigationStructure.sections.forEach(section => {
            sidebarHTML += `
                <div class="nav-section" style="margin-bottom: 25px;">
                    <h3 style="
                        padding: 0 20px;
                        margin: 0 0 10px 0;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        opacity: 0.7;
                        font-weight: 600;
                    ">${section.name}</h3>
                    <ul style="list-style: none; margin: 0; padding: 0;">
            `;
            
            section.items.forEach(item => {
                const isActive = window.location.pathname.endsWith(item.path.split('/').pop());
                sidebarHTML += `
                    <li>
                        <a href="${item.path}" 
                           class="nav-item ${isActive ? 'active' : ''}"
                           style="
                               display: flex;
                               align-items: center;
                               padding: 10px 20px;
                               color: ${isActive ? '#fff' : 'rgba(255,255,255,0.8)'};
                               text-decoration: none;
                               transition: all 0.2s;
                               background: ${isActive ? 'rgba(255,255,255,0.1)' : 'transparent'};
                               border-left: 3px solid ${isActive ? '#fff' : 'transparent'};
                               font-size: 14px;
                           "
                           onmouseover="if(!this.classList.contains('active')){this.style.background='rgba(255,255,255,0.05)';this.style.color='#fff';}"
                           onmouseout="if(!this.classList.contains('active')){this.style.background='transparent';this.style.color='rgba(255,255,255,0.8)';}">
                            <span style="margin-right: 12px; font-size: 18px;">${item.icon}</span>
                            <span>${item.title}</span>
                        </a>
                    </li>
                `;
            });
            
            sidebarHTML += `
                    </ul>
                </div>
            `;
        });
        
        // Add logout button
        sidebarHTML += `
            <div class="sidebar-footer" style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 20px;
                border-top: 1px solid rgba(255,255,255,0.1);
            ">
                <button onclick="logout()" style="
                    width: 100%;
                    padding: 10px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                "
                onmouseover="this.style.background='rgba(255,255,255,0.2)'"
                onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                    🚪 Logout
                </button>
            </div>
        `;
        
        sidebarHTML += '</nav>';
        sidebar.innerHTML = sidebarHTML;
        
        return sidebar;
    }
    
    // Create main content wrapper
    function adjustMainContent() {
        // Find or create main content wrapper
        let mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            // Wrap existing body content
            const bodyChildren = Array.from(document.body.children);
            mainContent = document.createElement('div');
            mainContent.id = 'mainContent';
            mainContent.style.cssText = `
                margin-left: 260px;
                min-height: 100vh;
                transition: margin-left 0.3s ease;
                position: relative;
            `;
            
            bodyChildren.forEach(child => {
                if (child.id !== 'adminSidebar' && child.className !== 'admin-sidebar') {
                    mainContent.appendChild(child);
                }
            });
            
            document.body.appendChild(mainContent);
        }
    }
    
    // Create mobile menu toggle
    function createMobileToggle() {
        const toggle = document.createElement('button');
        toggle.id = 'sidebarToggle';
        toggle.innerHTML = '☰';
        toggle.style.cssText = `
            display: none;
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1001;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 15px;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        // Show on mobile
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        if (mediaQuery.matches) {
            toggle.style.display = 'block';
            document.getElementById('adminSidebar').style.transform = 'translateX(-100%)';
            document.getElementById('mainContent').style.marginLeft = '0';
        }
        
        toggle.addEventListener('click', () => {
            const sidebar = document.getElementById('adminSidebar');
            const mainContent = document.getElementById('mainContent');
            const isHidden = sidebar.style.transform === 'translateX(-100%)';
            
            sidebar.style.transform = isHidden ? 'translateX(0)' : 'translateX(-100%)';
            if (window.innerWidth > 768) {
                mainContent.style.marginLeft = isHidden ? '260px' : '0';
            }
        });
        
        return toggle;
    }
    
    // Logout function
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('adminToken');
            window.location.href = '/admin/login.html';
        }
    };
    
    // Initialize sidebar
    function initializeSidebar() {
        // Don't show on login page
        if (window.location.pathname.includes('login')) {
            return;
        }
        
        // Create and append sidebar
        const sidebar = createSidebar();
        document.body.appendChild(sidebar);
        
        // Adjust main content
        adjustMainContent();
        
        // Add mobile toggle
        const toggle = createMobileToggle();
        document.body.appendChild(toggle);
        
        // Handle responsive behavior
        window.addEventListener('resize', () => {
            const sidebar = document.getElementById('adminSidebar');
            const mainContent = document.getElementById('mainContent');
            const toggle = document.getElementById('sidebarToggle');
            
            if (window.innerWidth <= 768) {
                toggle.style.display = 'block';
                sidebar.style.transform = 'translateX(-100%)';
                mainContent.style.marginLeft = '0';
            } else {
                toggle.style.display = 'none';
                sidebar.style.transform = 'translateX(0)';
                mainContent.style.marginLeft = '260px';
            }
        });
        
        // Add keyboard shortcuts info
        document.addEventListener('keydown', (e) => {
            // Alt + S to toggle sidebar
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                const toggle = document.getElementById('sidebarToggle');
                if (toggle) {
                    toggle.click();
                }
            }
        });
    }
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSidebar);
    } else {
        initializeSidebar();
    }
    
    // Export for global access
    window.adminSidebar = {
        navigation: navigationStructure,
        refresh: initializeSidebar
    };
    
    console.log('Admin sidebar navigation loaded');
})();