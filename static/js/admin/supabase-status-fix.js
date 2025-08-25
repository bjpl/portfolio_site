/**
 * Supabase Admin Status Fix
 * Fixes the "API not configured" issue by properly initializing and testing Supabase connection
 */

class SupabaseStatusManager {
    constructor() {
        this.initialized = false;
        this.supabaseClient = null;
        this.config = {
            url: 'https://tdmzayzkqyegvfgxlolj.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM'
        };
    }

    /**
     * Initialize Supabase client and test connection
     */
    async initialize() {
        try {
            // Initialize Supabase client
            if (window.supabase && window.supabase.createClient) {
                this.supabaseClient = window.supabase.createClient(
                    this.config.url, 
                    this.config.anonKey
                );
            } else {
                throw new Error('Supabase library not loaded');
            }

            // Test connection
            const isConnected = await this.testConnection();
            
            this.initialized = true;
            this.updateStatusIndicators(isConnected);
            
            console.log('✅ Supabase Status Manager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Supabase Status Manager initialization failed:', error);
            this.updateStatusIndicators(false, error.message);
            return false;
        }
    }

    /**
     * Test Supabase connection
     */
    async testConnection() {
        try {
            if (!this.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }

            // Simple connectivity test - try to access auth
            const { data, error } = await this.supabaseClient.auth.getSession();
            
            // Even if no session, if we get a response without network error, connection is good
            return true;
            
        } catch (error) {
            console.error('Supabase connection test failed:', error);
            return false;
        }
    }

    /**
     * Update status indicators in the admin panel
     */
    updateStatusIndicators(isConnected, errorMessage = null) {
        // Update Supabase status
        this.updateIndicator('supabaseIndicator', 'supabaseStatus', isConnected, 
            isConnected ? 'Connected' : 'Failed');
        
        // Update general configuration status
        this.updateIndicator('configIndicator', 'configStatus', isConnected, 
            isConnected ? 'Loaded' : 'Error');

        // Update any other status elements
        this.updateStatusItems(isConnected, errorMessage);
    }

    /**
     * Update individual indicator
     */
    updateIndicator(indicatorId, statusId, isSuccess, statusText) {
        const indicator = document.getElementById(indicatorId);
        const status = document.getElementById(statusId);
        
        if (indicator) {
            indicator.className = `indicator ${isSuccess ? 'success' : 'error'}`;
        }
        
        if (status) {
            status.textContent = statusText;
        }
    }

    /**
     * Update status items in dashboard
     */
    updateStatusItems(isConnected, errorMessage) {
        // Find all status items and update them
        const statusItems = document.querySelectorAll('.status-item');
        
        statusItems.forEach(item => {
            const text = item.textContent || '';
            
            if (text.includes('Supabase:')) {
                this.updateStatusItem(item, 'Supabase', isConnected);
            } else if (text.includes('Config:')) {
                this.updateStatusItem(item, 'Config', isConnected);
            } else if (text.includes('API:')) {
                this.updateStatusItem(item, 'API', isConnected);
            }
        });

        // Show detailed error if connection failed
        if (!isConnected && errorMessage) {
            console.error('Supabase connection details:', errorMessage);
        }
    }

    /**
     * Update individual status item
     */
    updateStatusItem(item, label, isSuccess) {
        const dot = item.querySelector('.status-dot');
        const strong = item.querySelector('strong');
        
        if (dot) {
            dot.style.background = isSuccess ? '#28a745' : '#dc3545';
        }
        
        if (strong) {
            strong.textContent = isSuccess ? 'CONNECTED ✅' : 'FAILED ❌';
            strong.style.color = isSuccess ? '#28a745' : '#dc3545';
        }
        
        // Update the full text
        const statusText = isSuccess ? 'CONNECTED ✅' : 'NOT CONFIGURED ❌';
        item.innerHTML = `
            <span class="status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: ${isSuccess ? '#28a745' : '#dc3545'}; margin-right: 8px;"></span>
            <span>${label}: <strong style="color: ${isSuccess ? '#28a745' : '#dc3545'};">${statusText}</strong></span>
        `;
    }

    /**
     * Force refresh of status indicators
     */
    async refreshStatus() {
        if (!this.initialized) {
            await this.initialize();
        } else {
            const isConnected = await this.testConnection();
            this.updateStatusIndicators(isConnected);
        }
    }
}

// Create global instance
window.SupabaseStatusManager = new SupabaseStatusManager();

// Auto-initialize when Supabase library is ready
function initializeSupabaseStatus() {
    if (window.supabase && window.supabase.createClient) {
        window.SupabaseStatusManager.initialize();
    } else {
        // Try again after a short delay
        setTimeout(initializeSupabaseStatus, 500);
    }
}

// Start initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeSupabaseStatus();
});

// Also initialize when Supabase config is ready
window.addEventListener('supabaseConfigReady', () => {
    window.SupabaseStatusManager.initialize();
});

// Expose refresh function globally
window.refreshSupabaseStatus = () => {
    return window.SupabaseStatusManager.refreshStatus();
};