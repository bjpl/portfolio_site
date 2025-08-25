/**
 * Admin Panel Navigation Component
 * Handles navigation menu, authentication checks, and logout functionality
 */

class AdminNavigation {
    constructor() {
        this.currentPage = this.getCurrentPageName();
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.renderNavigation();
        this.bindEvents();
        this.highlightActivePage();
    }

    checkAuthentication() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.redirectToLogin();
            return false;
        }

        // Verify token is still valid
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (Date.now() >= payload.exp * 1000) {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Invalid token:', error);
            this.logout();
            return false;
        }

        return true;
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        
        if (filename === 'index.html' || filename === '') return 'dashboard';
        if (filename === 'content-manager.html') return 'content';
        if (filename === 'settings.html') return 'settings';
        
        return 'dashboard';
    }

    renderNavigation() {
        const navHTML = `
            <nav class="admin-nav">
                <div class="admin-nav-header">
                    <h2>Admin Panel</h2>
                    <div class="admin-user-info">
                        <span id="admin-username">Administrator</span>
                        <button id="logout-btn" class="logout-btn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
                <ul class="admin-nav-menu">
                    <li class="nav-item" data-page="dashboard">
                        <a href="/admin/" class="nav-link">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>Dashboard</span>
                        </a>
                    </li>
                    <li class="nav-item" data-page="content">
                        <a href="/admin/content-manager.html" class="nav-link">
                            <i class="fas fa-file-alt"></i>
                            <span>Content Manager</span>
                        </a>
                    </li>
                    <li class="nav-item" data-page="settings">
                        <a href="/admin/settings.html" class="nav-link">
                            <i class="fas fa-cog"></i>
                            <span>Settings</span>
                        </a>
                    </li>
                </ul>
            </nav>
        `;

        // Insert navigation at the beginning of body or replace existing nav
        const existingNav = document.querySelector('.admin-nav');
        if (existingNav) {
            existingNav.outerHTML = navHTML;
        } else {
            document.body.insertAdjacentHTML('afterbegin', navHTML);
        }
    }

    highlightActivePage() {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current page
        const activeItem = document.querySelector(`[data-page="${this.currentPage}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    bindEvents() {
        // Logout button event
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Navigation link events (for SPA-like behavior if needed)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                // Allow normal navigation but update active state
                const href = e.currentTarget.getAttribute('href');
                const pageName = this.getPageNameFromHref(href);
                this.setActivePage(pageName);
            });
        });
    }

    getPageNameFromHref(href) {
        if (href === '/admin/' || href.endsWith('index.html')) return 'dashboard';
        if (href.includes('content-manager')) return 'content';
        if (href.includes('settings')) return 'settings';
        return 'dashboard';
    }

    setActivePage(pageName) {
        this.currentPage = pageName;
        this.highlightActivePage();
    }

    logout() {
        // Clear authentication data
        localStorage.removeItem('adminToken');
        sessionStorage.clear();

        // Show logout message
        this.showMessage('Logging out...', 'info');

        // Redirect to login after short delay
        setTimeout(() => {
            this.redirectToLogin();
        }, 1000);
    }

    redirectToLogin() {
        window.location.href = '/admin/login.html';
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('admin-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'admin-message';
            messageEl.className = 'admin-message';
            document.body.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.className = `admin-message ${type}`;
        messageEl.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    // Method to update user info display
    updateUserInfo(username) {
        const userElement = document.getElementById('admin-username');
        if (userElement && username) {
            userElement.textContent = username;
        }
    }

    // Method to add custom navigation items
    addNavItem(item) {
        const navMenu = document.querySelector('.admin-nav-menu');
        if (navMenu && item) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.setAttribute('data-page', item.page);
            li.innerHTML = `
                <a href="${item.href}" class="nav-link">
                    <i class="${item.icon}"></i>
                    <span>${item.label}</span>
                </a>
            `;
            navMenu.appendChild(li);
        }
    }
}

// CSS Styles for Navigation
const adminNavStyles = `
    .admin-nav {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        margin: 0 0 30px 0;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        color: white;
    }

    .admin-nav-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255,255,255,0.2);
    }

    .admin-nav-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 300;
    }

    .admin-user-info {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    #admin-username {
        font-size: 14px;
        opacity: 0.9;
    }

    .logout-btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .logout-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-1px);
    }

    .admin-nav-menu {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
    }

    .nav-item {
        margin: 0;
    }

    .nav-link {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        color: white;
        text-decoration: none;
        transition: all 0.3s ease;
        font-size: 14px;
        min-width: 140px;
    }

    .nav-link:hover {
        background: rgba(255,255,255,0.2);
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        color: white;
    }

    .nav-item.active .nav-link {
        background: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.4);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .nav-link i {
        font-size: 16px;
        width: 20px;
        text-align: center;
    }

    .admin-message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        display: none;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }

    .admin-message.info {
        background: #3498db;
    }

    .admin-message.success {
        background: #2ecc71;
    }

    .admin-message.error {
        background: #e74c3c;
    }

    .admin-message.warning {
        background: #f39c12;
    }

    @media (max-width: 768px) {
        .admin-nav-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
        }

        .admin-nav-menu {
            flex-direction: column;
        }

        .nav-link {
            justify-content: center;
        }
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = adminNavStyles;
document.head.appendChild(styleSheet);

// Initialize navigation when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adminNav = new AdminNavigation();
    });
} else {
    window.adminNav = new AdminNavigation();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminNavigation;
}