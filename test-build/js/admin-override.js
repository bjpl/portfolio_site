(function() {
    'use strict';
    
    // Admin Override System - Forcefully fixes broken admin pages
    console.log('🔧 Admin Override System Loading...');
    
    // Configuration
    const SUPABASE_URL = 'https://tdmzayzkqyegvfgxlolj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';
    
    // Paths that should trigger admin override
    const ADMIN_PATHS = ['/admin', '/admin/', '/admin/index.html', '/admin/dashboard.html'];
    
    // Detection patterns for broken admin pages
    const BROKEN_PATTERNS = [
        'API not configured',
        'Configuration error',
        'Failed to load',
        'Authentication failed',
        'Supabase error',
        'Network error',
        'Unable to connect',
        'Service unavailable'
    ];
    
    /**
     * Check if the current page is an admin route
     */
    function isAdminRoute() {
        const path = window.location.pathname;
        return ADMIN_PATHS.some(adminPath => 
            path === adminPath || path.startsWith('/admin/')
        );
    }
    
    /**
     * Check if the page content indicates a broken admin page
     */
    function isPageBroken() {
        const bodyText = document.body.textContent || document.body.innerText || '';
        const htmlContent = document.documentElement.innerHTML;
        
        // Check for broken patterns in visible text and HTML
        return BROKEN_PATTERNS.some(pattern => 
            bodyText.includes(pattern) || htmlContent.includes(pattern)
        );
    }
    
    /**
     * Check if the page is mostly empty or has loading issues
     */
    function isPageEmpty() {
        const content = document.body.textContent?.trim() || '';
        const scripts = document.querySelectorAll('script');
        const links = document.querySelectorAll('link');
        
        // Consider page broken if:
        // - Very little content
        // - No scripts loaded
        // - No stylesheets
        // - Only contains basic navigation
        return (
            content.length < 100 || 
            scripts.length < 2 || 
            links.length < 2 ||
            content.includes('Redirecting') ||
            content.includes('Loading')
        );
    }
    
    /**
     * Load Supabase client dynamically
     */
    async function loadSupabase() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                resolve(window.supabase);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => {
                if (window.supabase) {
                    resolve(window.supabase);
                } else {
                    reject(new Error('Supabase failed to load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load Supabase script'));
            document.head.appendChild(script);
        });
    }
    
    /**
     * Create working admin login page
     */
    function createWorkingAdminLogin() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Portfolio (Override Active)</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .login-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            width: 100%;
            max-width: 400px;
            position: relative;
        }
        
        .override-badge {
            position: absolute;
            top: -10px;
            right: -10px;
            background: #e74c3c;
            color: white;
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 2px 10px rgba(231, 76, 60, 0.3);
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
            font-size: 14px;
        }
        
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        
        button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }
        
        .status {
            margin-top: 20px;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            text-align: center;
        }
        
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .config-status {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 12px;
        }
        
        .config-item {
            margin: 5px 0;
            display: flex;
            align-items: center;
        }
        
        .indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .indicator.success { background: #28a745; }
        .indicator.error { background: #dc3545; }
        .indicator.loading { 
            background: #ffc107; 
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
        }
        
        .test-link {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
        }
        
        .test-link a {
            color: #667eea;
            text-decoration: none;
        }
        
        .test-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="override-badge">OVERRIDE</div>
        <h1>Admin Login</h1>
        <p class="subtitle">Portfolio Content Management System (Auto-Fixed)</p>
        
        <div class="config-status" id="configStatus">
            <div class="config-item">
                <span class="indicator loading" id="supabaseIndicator"></span>
                <span>Supabase Connection: <span id="supabaseStatus">Connecting...</span></span>
            </div>
            <div class="config-item">
                <span class="indicator loading" id="configIndicator"></span>
                <span>Configuration: <span id="configStatus">Loading...</span></span>
            </div>
        </div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="brandon.lambert87@gmail.com">
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
            </div>
            
            <button type="submit" id="loginBtn" disabled>Initializing...</button>
        </form>
        
        <div id="status" class="status" style="display: none;"></div>
        
        <div class="test-link">
            <a href="javascript:void(0)" onclick="testConnection()">Test Connection</a> | 
            <a href="/admin-login.html" target="_blank">Original Login</a> |
            <a href="/" >Back to Site</a>
        </div>
    </div>
</body>
</html>
        `;
    }
    
    /**
     * Initialize the working admin interface
     */
    async function initializeWorkingAdmin() {
        console.log('🚀 Initializing working admin interface...');
        
        try {
            // Load Supabase
            console.log('📦 Loading Supabase...');
            const supabase = await loadSupabase();
            
            // Create Supabase client
            window.adminSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Update status indicators
            const supabaseIndicator = document.getElementById('supabaseIndicator');
            const supabaseStatus = document.getElementById('supabaseStatus');
            const configIndicator = document.getElementById('configIndicator');
            const configStatus = document.getElementById('configStatus');
            const loginBtn = document.getElementById('loginBtn');
            
            if (supabaseIndicator && supabaseStatus && configIndicator && configStatus) {
                // Test connection
                console.log('🔌 Testing Supabase connection...');
                const { data, error } = await window.adminSupabase
                    .from('profiles')
                    .select('count')
                    .limit(1);
                
                if (!error || error.code === 'PGRST116') { // Table doesn't exist is OK
                    supabaseIndicator.className = 'indicator success';
                    supabaseStatus.textContent = 'Connected';
                    configIndicator.className = 'indicator success';
                    configStatus.textContent = 'Ready';
                    
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Sign In';
                    }
                    
                    console.log('✅ Admin override ready');
                    
                    // Set up login form
                    setupLoginForm();
                    
                } else {
                    throw error;
                }
            }
            
        } catch (err) {
            console.error('❌ Admin override initialization failed:', err);
            
            const supabaseIndicator = document.getElementById('supabaseIndicator');
            const supabaseStatus = document.getElementById('supabaseStatus');
            const configIndicator = document.getElementById('configIndicator');
            const configStatus = document.getElementById('configStatus');
            
            if (supabaseIndicator && supabaseStatus && configIndicator && configStatus) {
                supabaseIndicator.className = 'indicator error';
                supabaseStatus.textContent = 'Failed';
                configIndicator.className = 'indicator error';
                configStatus.textContent = 'Error';
            }
            
            showStatus('Failed to initialize admin system. Check console for details.', 'error');
        }
    }
    
    /**
     * Set up the login form functionality
     */
    function setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
        
        // Check if already authenticated
        checkExistingAuth();
    }
    
    /**
     * Handle login submission
     */
    async function handleLogin() {
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const loginBtn = document.getElementById('loginBtn');
        
        if (!email || !password) {
            showStatus('Please enter both email and password', 'error');
            return;
        }
        
        if (!window.adminSupabase) {
            showStatus('Admin system not initialized. Please refresh the page.', 'error');
            return;
        }
        
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
        }
        
        showStatus('Authenticating...', 'info');
        
        try {
            console.log('🔐 Attempting login...');
            
            const { data, error } = await window.adminSupabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (data.user) {
                console.log('✅ Login successful');
                showStatus('Login successful! Redirecting...', 'success');
                
                // Store auth token
                if (data.session) {
                    localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
                }
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/admin-dashboard.html';
                }, 1000);
                
            } else {
                throw new Error('No user data returned');
            }
            
        } catch (err) {
            console.error('❌ Login error:', err);
            showStatus(err.message || 'Login failed. Please check your credentials.', 'error');
            
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        }
    }
    
    /**
     * Check for existing authentication
     */
    async function checkExistingAuth() {
        if (!window.adminSupabase) return;
        
        try {
            const { data: { user } } = await window.adminSupabase.auth.getUser();
            if (user) {
                console.log('👤 Already authenticated, redirecting...');
                showStatus('Already logged in. Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/admin-dashboard.html';
                }, 1000);
            }
        } catch (err) {
            console.log('ℹ️ Not previously authenticated');
        }
    }
    
    /**
     * Show status message
     */
    function showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = 'status ' + type;
        statusEl.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * Test connection function (for the link)
     */
    window.testConnection = async function() {
        if (!window.adminSupabase) {
            showStatus('Admin system not initialized', 'error');
            return;
        }
        
        try {
            showStatus('Testing connection...', 'info');
            const { data, error } = await window.adminSupabase
                .from('profiles')
                .select('count')
                .limit(1);
            
            if (!error || error.code === 'PGRST116') {
                showStatus('Connection successful!', 'success');
            } else {
                throw error;
            }
        } catch (err) {
            showStatus('Connection failed: ' + err.message, 'error');
        }
    };
    
    /**
     * Replace the current page with working admin interface
     */
    function replaceWithWorkingAdmin() {
        console.log('🔄 Replacing broken admin page with working version...');
        
        // Replace entire document
        document.open();
        document.write(createWorkingAdminLogin());
        document.close();
        
        // Initialize after DOM is ready
        setTimeout(() => {
            initializeWorkingAdmin();
        }, 100);
    }
    
    /**
     * Main override logic
     */
    function executeAdminOverride() {
        console.log('🔍 Checking if admin override is needed...');
        console.log('Current path:', window.location.pathname);
        console.log('Is admin route:', isAdminRoute());
        
        // Only run on admin routes
        if (!isAdminRoute()) {
            console.log('ℹ️ Not an admin route, skipping override');
            return;
        }
        
        // Wait a moment for page to load
        setTimeout(() => {
            const isBroken = isPageBroken();
            const isEmpty = isPageEmpty();
            
            console.log('Page broken:', isBroken);
            console.log('Page empty:', isEmpty);
            
            if (isBroken || isEmpty) {
                console.log('🚨 Broken admin page detected - activating override!');
                replaceWithWorkingAdmin();
            } else {
                console.log('✅ Admin page appears to be working correctly');
            }
        }, 1000);
    }
    
    // Execute when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executeAdminOverride);
    } else {
        executeAdminOverride();
    }
    
    console.log('🔧 Admin Override System Loaded');
    
})();