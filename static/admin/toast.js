// Toast Notification System for Admin Panel
class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
            this.injectStyles();
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    injectStyles() {
        if (document.getElementById('toast-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.innerHTML = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }

            .toast {
                min-width: 300px;
                max-width: 500px;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease;
                pointer-events: all;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .toast:hover {
                transform: translateX(-10px);
            }

            .toast.removing {
                animation: slideOut 0.3s ease;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }

            .toast-icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .toast-content {
                flex: 1;
            }

            .toast-title {
                font-weight: 600;
                margin-bottom: 2px;
                font-size: 14px;
            }

            .toast-message {
                font-size: 13px;
                opacity: 0.9;
            }

            .toast-close {
                flex-shrink: 0;
                background: none;
                border: none;
                color: inherit;
                opacity: 0.6;
                cursor: pointer;
                font-size: 20px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.2s;
            }

            .toast-close:hover {
                opacity: 1;
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 0 0 12px 12px;
                animation: progress linear;
            }

            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }

            /* Toast Types */
            .toast.success {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
            }

            .toast.error {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
            }

            .toast.warning {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
            }

            .toast.info {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
            }

            .toast.loading {
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                color: white;
            }

            .toast-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            @media (max-width: 768px) {
                .toast-container {
                    left: 10px;
                    right: 10px;
                    top: 10px;
                }

                .toast {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    show(message, type = 'info', duration = 5000, title = null) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '<div class="toast-spinner"></div>'
        };

        const defaultTitles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info',
            loading: 'Loading'
        };

        const icon = type === 'loading' ? icons[type] : `<span>${icons[type]}</span>`;
        const toastTitle = title || defaultTitles[type];

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${toastTitle}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">×</button>
            ${type !== 'loading' && duration > 0 ? `<div class="toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
        `;

        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => this.remove(toast);

        // Add to container
        this.container.appendChild(toast);

        // Auto remove after duration (except for loading toasts)
        if (type !== 'loading' && duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        // Return toast element for manual control (useful for loading states)
        return toast;
    }

    remove(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }

    success(message, duration = 5000, title = null) {
        return this.show(message, 'success', duration, title);
    }

    error(message, duration = 7000, title = null) {
        return this.show(message, 'error', duration, title);
    }

    warning(message, duration = 6000, title = null) {
        return this.show(message, 'warning', duration, title);
    }

    info(message, duration = 5000, title = null) {
        return this.show(message, 'info', duration, title);
    }

    loading(message, title = null) {
        return this.show(message, 'loading', 0, title);
    }

    // Helper for async operations
    async promise(promise, loadingMsg = 'Processing...', successMsg = 'Operation completed!', errorMsg = 'Operation failed') {
        const loadingToast = this.loading(loadingMsg);
        
        try {
            const result = await promise;
            this.remove(loadingToast);
            this.success(successMsg);
            return result;
        } catch (error) {
            this.remove(loadingToast);
            this.error(errorMsg + ': ' + (error.message || error));
            throw error;
        }
    }

    clear() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.remove(toast));
    }
}

// Create global instance
window.Toast = new ToastNotification();

// Example usage:
// Toast.success('File uploaded successfully!');
// Toast.error('Failed to save changes');
// Toast.warning('Please fill all required fields');
// Toast.info('New update available');
// const loader = Toast.loading('Uploading files...');
// setTimeout(() => Toast.remove(loader), 3000);

// For async operations:
// await Toast.promise(
//     fetch('/api/save'),
//     'Saving changes...',
//     'Changes saved successfully!',
//     'Failed to save changes'
// );