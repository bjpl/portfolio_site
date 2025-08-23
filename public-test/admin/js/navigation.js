// Unified Navigation Component
class Navigation {
    constructor() {
        this.menuItems = [
            { title: 'Dashboard', path: 'dashboard.html', icon: '📊' },
            { 
                title: 'Content', 
                icon: '📝',
                submenu: [
                    { title: 'Content Editor', path: 'content-editor.html', icon: '✏️' },
                    { title: 'Content Manager', path: 'content-manager.html', icon: '📄' },
                    { title: 'Pages', path: 'pages.html', icon: '📑' },
                    { title: 'Blog Posts', path: 'blog-posts.html', icon: '📰' },
                    { title: 'Portfolio', path: 'portfolio-items.html', icon: '💼' }
                ]
            },
            {
                title: 'Media',
                icon: '🖼️',
                submenu: [
                    { title: 'File Manager', path: 'file-manager.html', icon: '📁' },
                    { title: 'Image Optimizer', path: 'image-optimizer.html', icon: '🎨' },
                    { title: 'Backup', path: 'backup.html', icon: '💾' }
                ]
            },
            {
                title: 'Tools',
                icon: '🛠️',
                submenu: [
                    { title: 'Build & Deploy', path: 'build-deploy.html', icon: '🚀' },
                    { title: 'Analytics', path: 'analytics.html', icon: '📈' },
                    { title: 'SEO Manager', path: 'seo-manager.html', icon: '🔍' },
                    { title: 'Logs', path: 'logs.html', icon: '📋' }
                ]
            },
            {
                title: 'Settings',
                icon: '⚙️',
                submenu: [
                    { title: 'Site Settings', path: 'site-settings.html', icon: '🌐' },
                    { title: 'User Management', path: 'user-management.html', icon: '👥' },
                    { title: 'Review System', path: 'review.html', icon: '⭐' }
                ]
            }
        ];
        
        this.currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    }
    
    render() {
        const nav = document.createElement('nav');
        nav.className = 'admin-nav';
        nav.innerHTML = `
            <div class="nav-brand">
                <a href="dashboard.html" class="brand-link">
                    <span class="brand-icon">🎨</span>
                    <span class="brand-text">Portfolio Admin</span>
                </a>
                <button class="nav-toggle" onclick="navigation.toggleMobileMenu()">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
            <ul class="nav-menu">
                ${this.renderMenuItems()}
            </ul>
            <div class="nav-footer">
                <button class="nav-btn theme-toggle" onclick="navigation.toggleTheme()">
                    <span class="theme-icon">🌓</span>
                </button>
                <button class="nav-btn logout-btn" onclick="navigation.logout()">
                    <span>Logout</span>
                </button>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#navigation-styles')) {
            const styles = document.createElement('style');
            styles.id = 'navigation-styles';
            styles.textContent = this.getStyles();
            document.head.appendChild(styles);
        }
        
        return nav;
    }
    
    renderMenuItems() {
        return this.menuItems.map(item => {
            const isActive = this.isActive(item);
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            
            let html = `<li class="nav-item ${isActive ? 'active' : ''} ${hasSubmenu ? 'has-submenu' : ''}">`;
            
            if (hasSubmenu) {
                html += `
                    <a href="#" class="nav-link" onclick="navigation.toggleSubmenu(event, this)">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.title}</span>
                        <span class="nav-arrow">▼</span>
                    </a>
                    <ul class="nav-submenu ${isActive ? 'open' : ''}">
                        ${item.submenu.map(subitem => `
                            <li class="nav-subitem ${this.currentPath === subitem.path ? 'active' : ''}">
                                <a href="${subitem.path}" class="nav-sublink">
                                    <span class="nav-icon">${subitem.icon}</span>
                                    <span class="nav-text">${subitem.title}</span>
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                `;
            } else {
                html += `
                    <a href="${item.path}" class="nav-link">
                        <span class="nav-icon">${item.icon}</span>
                        <span class="nav-text">${item.title}</span>
                    </a>
                `;
            }
            
            html += '</li>';
            return html;
        }).join('');
    }
    
    isActive(item) {
        if (item.path === this.currentPath) return true;
        if (item.submenu) {
            return item.submenu.some(subitem => subitem.path === this.currentPath);
        }
        return false;
    }
    
    toggleSubmenu(event, element) {
        event.preventDefault();
        const submenu = element.nextElementSibling;
        const parent = element.parentElement;
        
        // Close other submenus
        document.querySelectorAll('.nav-submenu.open').forEach(menu => {
            if (menu !== submenu) {
                menu.classList.remove('open');
                menu.parentElement.classList.remove('open');
            }
        });
        
        // Toggle current submenu
        submenu.classList.toggle('open');
        parent.classList.toggle('open');
    }
    
    toggleMobileMenu() {
        document.querySelector('.admin-nav').classList.toggle('mobile-open');
    }
    
    toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        }
    }
    
    getStyles() {
        return `
            .admin-nav {
                position: fixed;
                left: 0;
                top: 0;
                bottom: 0;
                width: 260px;
                background: var(--bg-primary, #ffffff);
                border-right: 1px solid var(--border, #e2e8f0);
                display: flex;
                flex-direction: column;
                z-index: 1000;
                transition: transform 0.3s ease;
            }
            
            .nav-brand {
                padding: 20px;
                border-bottom: 1px solid var(--border, #e2e8f0);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .brand-link {
                display: flex;
                align-items: center;
                gap: 12px;
                text-decoration: none;
                color: var(--text-primary, #1a202c);
            }
            
            .brand-icon {
                font-size: 1.5rem;
            }
            
            .brand-text {
                font-size: 1.125rem;
                font-weight: 600;
            }
            
            .nav-toggle {
                display: none;
                flex-direction: column;
                gap: 4px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
            }
            
            .nav-toggle span {
                width: 24px;
                height: 2px;
                background: var(--text-primary, #1a202c);
                transition: all 0.3s;
            }
            
            .nav-menu {
                flex: 1;
                overflow-y: auto;
                padding: 20px 0;
                list-style: none;
                margin: 0;
            }
            
            .nav-item {
                margin-bottom: 4px;
            }
            
            .nav-link, .nav-sublink {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 20px;
                text-decoration: none;
                color: var(--text-secondary, #4a5568);
                transition: all 0.2s;
                position: relative;
            }
            
            .nav-link:hover, .nav-sublink:hover {
                background: var(--bg-secondary, #f7fafc);
                color: var(--primary, #667eea);
            }
            
            .nav-item.active > .nav-link,
            .nav-subitem.active > .nav-sublink {
                background: var(--primary-light, rgba(102, 126, 234, 0.1));
                color: var(--primary, #667eea);
            }
            
            .nav-item.active > .nav-link::before,
            .nav-subitem.active > .nav-sublink::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--primary, #667eea);
            }
            
            .nav-icon {
                font-size: 1.25rem;
                width: 24px;
                text-align: center;
            }
            
            .nav-text {
                flex: 1;
            }
            
            .nav-arrow {
                font-size: 0.75rem;
                transition: transform 0.2s;
            }
            
            .nav-item.open .nav-arrow {
                transform: rotate(180deg);
            }
            
            .nav-submenu {
                display: none;
                list-style: none;
                margin: 0;
                padding: 0;
                background: var(--bg-tertiary, #f1f5f9);
            }
            
            .nav-submenu.open {
                display: block;
            }
            
            .nav-sublink {
                padding-left: 56px;
                font-size: 0.875rem;
            }
            
            .nav-footer {
                padding: 20px;
                border-top: 1px solid var(--border, #e2e8f0);
                display: flex;
                gap: 12px;
            }
            
            .nav-btn {
                flex: 1;
                padding: 10px;
                border: 1px solid var(--border, #e2e8f0);
                background: var(--bg-secondary, #f7fafc);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.875rem;
                color: var(--text-primary, #1a202c);
            }
            
            .nav-btn:hover {
                background: var(--primary, #667eea);
                color: white;
                border-color: var(--primary, #667eea);
            }
            
            .theme-icon {
                font-size: 1.125rem;
            }
            
            /* Main content adjustment */
            body.has-navigation {
                margin-left: 260px;
            }
            
            .main-content {
                padding: 20px;
                min-height: 100vh;
            }
            
            /* Mobile styles */
            @media (max-width: 768px) {
                .admin-nav {
                    transform: translateX(-100%);
                }
                
                .admin-nav.mobile-open {
                    transform: translateX(0);
                }
                
                .nav-toggle {
                    display: flex;
                }
                
                body.has-navigation {
                    margin-left: 0;
                }
                
                .mobile-open + .main-content::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 999;
                }
            }
        `;
    }
    
    init() {
        // Apply saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Insert navigation
        const nav = this.render();
        document.body.insertBefore(nav, document.body.firstChild);
        document.body.classList.add('has-navigation');
        
        // Wrap existing content in main-content div if needed
        if (!document.querySelector('.main-content')) {
            const content = Array.from(document.body.children).filter(child => 
                !child.classList.contains('admin-nav')
            );
            const mainContent = document.createElement('div');
            mainContent.className = 'main-content';
            content.forEach(child => mainContent.appendChild(child));
            document.body.appendChild(mainContent);
        }
    }
}

// Initialize navigation
const navigation = new Navigation();

// Auto-init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => navigation.init());
} else {
    navigation.init();
}