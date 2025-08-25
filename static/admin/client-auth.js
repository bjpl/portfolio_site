/**
 * Enhanced Client Authentication System
 * Integrates with Supabase backend while maintaining emergency fallback
 * Version: 2.0 - Supabase Integration
 */

const ClientAuth = {
    initialized: false,
    supabaseAvailable: false,
    // Default credentials (for production emergency access)
    defaultCredentials: {
        'admin': 'portfolio2024!',
        'demo': 'demo123',
        'guest': 'guest123',
        'user': 'user123'
    },

    // Initialize the authentication system
    async init() {
        if (this.initialized) return;
        
        // Check for build-time configuration first (preferred)
        if (window.CONFIG) {
            this.supabaseAvailable = !!(window.CONFIG.SUPABASE_URL && window.CONFIG.SUPABASE_ANON_KEY);
            console.log('✅ ClientAuth: Using build-time configuration from window.CONFIG');
        } else {
            // Fallback to legacy Supabase config
            this.supabaseAvailable = !!(window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey);
            console.log('⚠️ ClientAuth: Using legacy SUPABASE_CONFIG fallback');
        }
        
        if (this.supabaseAvailable) {
            console.log('✅ ClientAuth: Supabase configuration detected and validated');
        } else {
            console.log('⚠️ ClientAuth: No valid Supabase config - using emergency fallback mode');
        }
        
        this.initialized = true;
    },

    // Authenticate with Supabase or fallback
    async authenticate(username, password) {
        await this.init();
        
        // Try Supabase authentication first
        if (this.supabaseAvailable) {
            try {
                const result = await this.authenticateWithSupabase(username, password);
                if (result.success) {
                    return result;
                }
            } catch (error) {
                console.warn('Supabase auth failed, trying fallback:', error.message);
            }
        }
        
        // Fallback to client-side authentication
        return this.authenticateWithFallback(username, password);
    },

    // Authenticate with Supabase
    async authenticateWithSupabase(email, password) {
        // Use build-time configuration if available, fallback to legacy
        const supabaseURL = window.CONFIG?.SUPABASE_URL || window.SUPABASE_CONFIG?.url;
        const supabaseKey = window.CONFIG?.SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey;
        
        if (!supabaseURL || !supabaseKey) {
            throw new Error('Supabase configuration not available');
        }
        
        const authUrl = `${supabaseURL}/auth/v1/token?grant_type=password`;
        
        try {
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                    email: email.includes('@') ? email : `${email}@portfolio.com`,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error_description || errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Store Supabase session data
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('refreshToken', data.refresh_token);
            localStorage.setItem('authMethod', 'supabase');
            localStorage.setItem('loginTime', new Date().toISOString());
            localStorage.setItem('supabase-session', JSON.stringify(data));
            
            // Store user data
            if (data.user) {
                localStorage.setItem('currentUser', JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.user_metadata?.username || data.user.email.split('@')[0],
                    role: data.user.app_metadata?.role || 'user',
                    profile: data.user.user_metadata || {}
                }));
            }

            return {
                success: true,
                token: data.access_token,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.user_metadata?.username || data.user.email.split('@')[0],
                    role: data.user.app_metadata?.role || 'user'
                },
                method: 'supabase'
            };
        } catch (error) {
            console.error('Supabase authentication failed:', error);
            throw error;
        }
    },

    // Fallback client-side authentication
    authenticateWithFallback(username, password) {
        // Check against default credentials
        if (this.defaultCredentials[username] === password) {
            const token = this.generateFallbackToken(username);
            
            // Store authentication data
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('authMethod', 'client-side');
            localStorage.setItem('loginTime', new Date().toISOString());
            
            const user = {
                username: username,
                email: `${username}@portfolio.com`,
                role: username === 'admin' ? 'admin' : 'user'
            };
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            return {
                success: true,
                token: token,
                user: user,
                method: 'fallback'
            };
        }
        
        return {
            success: false,
            error: 'Invalid credentials'
        };
    },

    // Generate a fallback JWT token for client-side use
    generateFallbackToken(username) {
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


    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('token');
        const authMethod = localStorage.getItem('authMethod');
        
        if (!token) return false;
        
        // Validate token if it's a JWT
        if (authMethod === 'supabase' || authMethod === 'client-side') {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const now = Math.floor(Date.now() / 1000);
                
                // Check if token is expired
                if (payload.exp && payload.exp < now) {
                    this.logout();
                    return false;
                }
                
                return true;
            } catch (error) {
                // Invalid token format
                this.logout();
                return false;
            }
        }
        
        return !!(token && authMethod);
    },

    // Get current user info
    getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        
        // Try to get stored user data first
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (error) {
                console.warn('Failed to parse stored user data');
            }
        }
        
        // Fallback to token parsing
        const token = localStorage.getItem('token');
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.sub || payload.user_id,
                username: payload.username || payload.email?.split('@')[0],
                email: payload.email,
                role: payload.role || 'user'
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
    async logout() {
        const authMethod = localStorage.getItem('authMethod');
        
        // If Supabase session, try to logout from Supabase
        if (authMethod === 'supabase' && this.supabaseAvailable) {
            try {
                const supabaseConfig = window.SUPABASE_CONFIG;
                const token = localStorage.getItem('token');
                
                await fetch(`${supabaseConfig.url}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseConfig.anonKey,
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.warn('Supabase logout failed:', error);
            }
        }
        
        // Clear all local storage
        const keysToRemove = [
            'token', 'refreshToken', 'username', 'authMethod', 'loginTime',
            'currentUser', 'supabase-session'
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear any Supabase session keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        });
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
    async performEmergencyLogin(username) {
        const password = this.defaultCredentials[username];
        
        try {
            const result = await this.authenticate(username, password);
            
            if (result.success) {
                // Show success message
                this.showMessage(`${result.method === 'supabase' ? 'Supabase' : 'Emergency'} login successful! Redirecting...`, 'success');
                
                // Redirect after delay
                setTimeout(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirect = urlParams.get('redirect') || '/admin/dashboard.html';
                    window.location.href = redirect;
                }, 1000);
            } else {
                this.showMessage('Login failed: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.showMessage('Login error: ' + error.message, 'error');
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
    document.addEventListener('DOMContentLoaded', async () => {
        await ClientAuth.init();
        ClientAuth.initEmergencyBypass();
    });
} else {
    ClientAuth.init().then(() => ClientAuth.initEmergencyBypass());
}

// Make globally available
window.ClientAuth = ClientAuth;