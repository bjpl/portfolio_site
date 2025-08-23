/**
 * Emergency Client-Only Authentication System
 * Works immediately without any backend dependencies
 */

const ClientAuth = {
    // Default credentials (for production emergency access)
    defaultCredentials: {
        'admin': 'portfolio2024!',
        'demo': 'demo123',
        'guest': 'guest123',
        'user': 'user123'
    },

    // Generate a fake JWT token for client-side use
    generateToken(username) {
        const header = btoa(JSON.stringify({
            "alg": "HS256",
            "typ": "JWT"
        }));
        
        const payload = btoa(JSON.stringify({
            "username": username,
            "email": `${username}@portfolio.com`,
            "role": username === 'admin' ? 'admin' : 'user',
            "iat": Math.floor(Date.now() / 1000),
            "exp": Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
            "iss": "portfolio-cms-client"
        }));
        
        const signature = btoa("client-side-signature");
        
        return `${header}.${payload}.${signature}`;
    },

    // Authenticate user with client-side validation
    authenticate(username, password) {
        // Check against default credentials
        if (this.defaultCredentials[username] === password) {
            const token = this.generateToken(username);
            
            // Store authentication data
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('authMethod', 'client-side');
            localStorage.setItem('loginTime', new Date().toISOString());
            
            return {
                success: true,
                token: token,
                user: {
                    username: username,
                    email: `${username}@portfolio.com`,
                    role: username === 'admin' ? 'admin' : 'user'
                }
            };
        }
        
        return {
            success: false,
            error: 'Invalid credentials'
        };
    },

    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('token');
        const authMethod = localStorage.getItem('authMethod');
        
        return token && authMethod === 'client-side';
    },

    // Get current user info
    getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        
        const token = localStorage.getItem('token');
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                username: payload.username,
                email: payload.email,
                role: payload.role
            };
        } catch (e) {
            return {
                username: localStorage.getItem('username') || 'admin',
                email: 'admin@portfolio.com',
                role: 'admin'
            };
        }
    },

    // Logout
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('authMethod');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('refreshToken');
    },

    // Initialize emergency bypass
    initEmergencyBypass() {
        // Show emergency access notice
        console.log('🚨 CLIENT-SIDE AUTHENTICATION ACTIVE');
        console.log('📋 Available credentials:');
        Object.keys(this.defaultCredentials).forEach(username => {
            console.log(`   ${username}: ${this.defaultCredentials[username]}`);
        });
        
        // Add emergency bypass button to login forms
        this.addEmergencyBypass();
    },

    // Add emergency bypass button
    addEmergencyBypass() {
        setTimeout(() => {
            const loginForm = document.getElementById('loginForm') || document.querySelector('form');
            if (loginForm) {
                const bypassDiv = document.createElement('div');
                bypassDiv.style.cssText = `
                    margin-top: 15px;
                    padding: 10px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    text-align: center;
                    font-size: 12px;
                `;
                
                bypassDiv.innerHTML = `
                    <div style="margin-bottom: 8px; color: #6c757d;">
                        <strong>🚨 Emergency Access</strong>
                    </div>
                    <button type="button" id="adminBypass" style="margin: 2px; padding: 4px 8px; font-size: 11px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                        Admin Login
                    </button>
                    <button type="button" id="demoBypass" style="margin: 2px; padding: 4px 8px; font-size: 11px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">
                        Demo Login
                    </button>
                `;
                
                loginForm.appendChild(bypassDiv);
                
                // Add event listeners
                document.getElementById('adminBypass').addEventListener('click', () => {
                    this.performEmergencyLogin('admin');
                });
                
                document.getElementById('demoBypass').addEventListener('click', () => {
                    this.performEmergencyLogin('demo');
                });
            }
        }, 500);
    },

    // Perform emergency login
    performEmergencyLogin(username) {
        const password = this.defaultCredentials[username];
        const result = this.authenticate(username, password);
        
        if (result.success) {
            // Show success message
            this.showMessage('Emergency login successful! Redirecting...', 'success');
            
            // Redirect after delay
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect') || '/admin/dashboard.html';
                window.location.href = redirect;
            }, 1000);
        } else {
            this.showMessage('Emergency login failed', 'error');
        }
    },

    // Show message helper
    showMessage(message, type = 'info') {
        // Try to use existing alert system
        if (window.showAlert) {
            window.showAlert(message, type === 'error' ? 'danger' : type);
            return;
        }
        
        // Fallback to creating our own alert
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        `;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 3000);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ClientAuth.initEmergencyBypass());
} else {
    ClientAuth.initEmergencyBypass();
}

// Make globally available
window.ClientAuth = ClientAuth;