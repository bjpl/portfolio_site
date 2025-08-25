// Global Toast Notification System
(function() {
    'use strict';
    
    // Create styles for toast notifications
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }
            
            .toast {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 16px 20px;
                margin-bottom: 10px;
                min-width: 300px;
                max-width: 500px;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease;
                pointer-events: auto;
                cursor: pointer;
                transition: opacity 0.3s, transform 0.3s;
            }
            
            .toast:hover {
                transform: translateX(-5px);
            }
            
            .toast.hiding {
                animation: slideOut 0.3s ease;
            }
            
            .toast-icon {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 14px;
            }
            
            .toast-content {
                flex: 1;
            }
            
            .toast-title {
                font-weight: 600;
                margin-bottom: 2px;
                color: #2d3748;
            }
            
            .toast-message {
                color: #4a5568;
                font-size: 14px;
            }
            
            .toast-close {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                cursor: pointer;
                color: #a0aec0;
                transition: background 0.2s, color 0.2s;
            }
            
            .toast-close:hover {
                background: #f7fafc;
                color: #4a5568;
            }
            
            /* Toast types */
            .toast.toast-success {
                border-left: 4px solid #48bb78;
            }
            
            .toast.toast-success .toast-icon {
                background: #c6f6d5;
                color: #22543d;
            }
            
            .toast.toast-error {
                border-left: 4px solid #f56565;
            }
            
            .toast.toast-error .toast-icon {
                background: #fed7d7;
                color: #9b2c2c;
            }
            
            .toast.toast-warning {
                border-left: 4px solid #ed8936;
            }
            
            .toast.toast-warning .toast-icon {
                background: #feebc8;
                color: #7c2d12;
            }
            
            .toast.toast-info {
                border-left: 4px solid #4299e1;
            }
            
            .toast.toast-info .toast-icon {
                background: #bee3f8;
                color: #2c5282;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            
            /* Alert compatibility styles */
            .alert {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 500px;
            }
            
            .alert.alert-success {
                background: #c6f6d5;
                color: #22543d;
                border-left: 4px solid #48bb78;
            }
            
            .alert.alert-error,
            .alert.alert-danger {
                background: #fed7d7;
                color: #9b2c2c;
                border-left: 4px solid #f56565;
            }
            
            .alert.alert-warning {
                background: #feebc8;
                color: #7c2d12;
                border-left: 4px solid #ed8936;
            }
            
            .alert.alert-info {
                background: #bee3f8;
                color: #2c5282;
                border-left: 4px solid #4299e1;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create toast container
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Toast function
    function showToast(message, type = 'info', title = null, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const iconHtml = `<div class="toast-icon">${icons[type] || icons.info}</div>`;
        
        const contentHtml = `
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        const closeHtml = `<div class="toast-close" onclick="this.parentElement.remove()">✕</div>`;
        
        toast.innerHTML = iconHtml + contentHtml + closeHtml;
        
        // Add click to dismiss
        toast.addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        });
        
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.classList.add('hiding');
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
        
        return toast;
    }
    
    // Compatibility function for showAlert
    function showAlert(message, type = 'info') {
        // Map alert types to toast types
        const typeMap = {
            'danger': 'error',
            'primary': 'info',
            'secondary': 'info'
        };
        
        const toastType = typeMap[type] || type;
        return showToast(message, toastType);
    }
    
    // Export to global scope
    window.showToast = showToast;
    window.showAlert = showAlert;
    
    // Create Toast object for easier usage
    window.Toast = {
        success: (message, title) => showToast(message, 'success', title),
        error: (message, title) => showToast(message, 'error', title),
        warning: (message, title) => showToast(message, 'warning', title),
        info: (message, title) => showToast(message, 'info', title),
        show: showToast
    };
    
    // Override alert() for modern notifications
    const originalAlert = window.alert;
    window.alert = function(message) {
        // Check if it's a placeholder alert
        if (message.includes('coming soon') || message.includes('Coming soon')) {
            showToast(message.replace(' - Coming soon!', ''), 'info', 'Feature In Development');
        } else if (message.includes('functionality')) {
            showToast(message, 'warning');
        } else {
            showToast(message, 'info');
        }
    };
    
    // Restore original alert on demand
    window.restoreAlert = function() {
        window.alert = originalAlert;
    };
    
    console.log('Toast notification system loaded');
})();