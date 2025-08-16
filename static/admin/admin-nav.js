// Admin Navigation Component with Breadcrumbs
class AdminNavigation {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        return filename || 'dashboard.html';
    }

    getPageTitle(page) {
        const titles = {
            'dashboard.html': 'Dashboard',
            'bulk-upload.html': 'Bulk Upload',
            'review.html': 'Review Tool',
            'file-manager.html': 'Media Manager',
            'login.html': 'Login'
        };
        return titles[page] || 'Admin';
    }

    getBreadcrumbs() {
        const crumbs = [
            { text: 'Home', href: '/', icon: '🏠' },
            { text: 'Admin', href: '/admin', icon: '⚙️' }
        ];

        if (this.currentPage !== 'dashboard.html' && this.currentPage !== 'login.html') {
            crumbs.push({ text: 'Dashboard', href: 'dashboard.html', icon: '📊' });
        }

        if (this.currentPage !== 'login.html') {
            crumbs.push({ 
                text: this.getPageTitle(this.currentPage), 
                href: this.currentPage,
                icon: this.getPageIcon(this.currentPage),
                active: true 
            });
        }

        return crumbs;
    }

    getPageIcon(page) {
        const icons = {
            'dashboard.html': '📊',
            'bulk-upload.html': '📦',
            'review.html': '✅',
            'file-manager.html': '🖼️',
            'login.html': '🔐'
        };
        return icons[page] || '📄';
    }

    renderBreadcrumbs() {
        const breadcrumbs = this.getBreadcrumbs();
        return `
            <nav class="breadcrumbs">
                ${breadcrumbs.map((crumb, index) => `
                    ${index > 0 ? '<span class="breadcrumb-separator">›</span>' : ''}
                    ${crumb.active ? 
                        `<span class="breadcrumb-item active">${crumb.icon} ${crumb.text}</span>` : 
                        `<a href="${crumb.href}" class="breadcrumb-item">${crumb.icon} ${crumb.text}</a>`
                    }
                `).join('')}
            </nav>
        `;
    }

    renderQuickNav() {
        return `
            <div class="quick-nav">
                <a href="dashboard.html" class="quick-nav-item ${this.currentPage === 'dashboard.html' ? 'active' : ''}">
                    <span class="icon">📊</span>
                    <span class="text">Dashboard</span>
                </a>
                <a href="bulk-upload.html" class="quick-nav-item ${this.currentPage === 'bulk-upload.html' ? 'active' : ''}">
                    <span class="icon">📦</span>
                    <span class="text">Bulk Upload</span>
                </a>
                <a href="review.html" class="quick-nav-item ${this.currentPage === 'review.html' ? 'active' : ''}">
                    <span class="icon">✅</span>
                    <span class="text">Review</span>
                </a>
                <a href="file-manager.html" class="quick-nav-item ${this.currentPage === 'file-manager.html' ? 'active' : ''}">
                    <span class="icon">🖼️</span>
                    <span class="text">Media</span>
                </a>
                <a href="/" class="quick-nav-item">
                    <span class="icon">🌐</span>
                    <span class="text">View Site</span>
                </a>
            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('admin-nav-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'admin-nav-styles';
        styles.innerHTML = `
            .breadcrumbs {
                padding: 1rem 0;
                margin-bottom: 1rem;
                border-bottom: 1px solid rgba(102, 126, 234, 0.1);
            }

            .breadcrumb-item {
                color: #667eea;
                text-decoration: none;
                font-size: 0.9rem;
                transition: all 0.3s ease;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
            }

            .breadcrumb-item:hover {
                background: rgba(102, 126, 234, 0.1);
                transform: translateY(-1px);
            }

            .breadcrumb-item.active {
                color: var(--text-primary);
                font-weight: 600;
            }

            .breadcrumb-separator {
                margin: 0 0.5rem;
                color: rgba(102, 126, 234, 0.4);
            }

            .quick-nav {
                display: flex;
                gap: 1rem;
                padding: 1rem 0;
                margin-bottom: 2rem;
                flex-wrap: wrap;
            }

            .quick-nav-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.25rem;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                text-decoration: none;
                color: #4b5563;
                font-weight: 500;
                transition: all 0.3s ease;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .quick-nav-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
                border-color: #667eea;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
            }

            .quick-nav-item.active {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-color: transparent;
            }

            .quick-nav-item .icon {
                font-size: 1.2rem;
            }

            .quick-nav-item .text {
                font-size: 0.95rem;
            }

            .back-button {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                color: #4b5563;
                text-decoration: none;
                font-weight: 500;
                transition: all 0.3s ease;
                margin-bottom: 1rem;
            }

            .back-button:hover {
                transform: translateX(-5px);
                border-color: #667eea;
                color: #667eea;
            }
        `;
        document.head.appendChild(styles);
    }

    insertNavigation() {
        // Find the main content area
        const mainContent = document.querySelector('.main-content');
        const header = document.querySelector('.header');
        
        if (mainContent && !document.querySelector('.breadcrumbs')) {
            const navContainer = document.createElement('div');
            navContainer.className = 'admin-navigation';
            navContainer.innerHTML = this.renderBreadcrumbs() + this.renderQuickNav();
            
            // Insert after header or at the beginning
            if (header) {
                header.insertAdjacentElement('afterend', navContainer);
            } else {
                mainContent.insertAdjacentElement('afterbegin', navContainer);
            }
        }
    }

    addBackButton() {
        if (this.currentPage === 'dashboard.html' || this.currentPage === 'login.html') return;
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !document.querySelector('.back-button')) {
            const backButton = document.createElement('a');
            backButton.href = 'dashboard.html';
            backButton.className = 'back-button';
            backButton.innerHTML = '← Back to Dashboard';
            mainContent.insertAdjacentElement('afterbegin', backButton);
        }
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.injectStyles();
        this.insertNavigation();
        this.addBackButton();
    }
}

// Initialize navigation
const adminNav = new AdminNavigation();