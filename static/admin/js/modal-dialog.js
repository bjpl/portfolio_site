/**
 * Modal Dialog System
 * Replaces native alert, confirm, and prompt dialogs with custom modals
 */

class ModalDialog {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modal-container')) {
            const container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }

        // Add styles if not already present
        if (!document.getElementById('modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'modal-styles';
            styles.textContent = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.2s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-dialog {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    max-width: 500px;
                    width: 90%;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #e5e5e5;
                }

                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #333;
                }

                .modal-body {
                    padding: 20px;
                }

                .modal-message {
                    color: #666;
                    line-height: 1.5;
                    margin: 0 0 15px 0;
                }

                .modal-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .modal-input:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
                }

                .modal-footer {
                    padding: 15px 20px;
                    border-top: 1px solid #e5e5e5;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                .modal-btn {
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .modal-btn-primary {
                    background: #007bff;
                    color: white;
                }

                .modal-btn-primary:hover {
                    background: #0056b3;
                }

                .modal-btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .modal-btn-secondary:hover {
                    background: #545b62;
                }

                .modal-btn-danger {
                    background: #dc3545;
                    color: white;
                }

                .modal-btn-danger:hover {
                    background: #c82333;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    /**
     * Show confirmation dialog
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @returns {Promise<boolean>} - Resolves with true if confirmed, false otherwise
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const config = {
                title: 'Confirm',
                confirmText: 'OK',
                cancelText: 'Cancel',
                confirmClass: 'modal-btn-primary',
                ...options
            };

            const modalHtml = `
                <div class="modal-overlay" id="confirm-modal">
                    <div class="modal-dialog">
                        <div class="modal-header">
                            <h3 class="modal-title">${this.escapeHtml(config.title)}</h3>
                        </div>
                        <div class="modal-body">
                            <p class="modal-message">${this.escapeHtml(message)}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="modal-btn modal-btn-secondary" data-action="cancel">
                                ${this.escapeHtml(config.cancelText)}
                            </button>
                            <button class="modal-btn ${config.confirmClass}" data-action="confirm">
                                ${this.escapeHtml(config.confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, (action) => {
                resolve(action === 'confirm');
            });
        });
    }

    /**
     * Show prompt dialog
     * @param {string} message - The message to display
     * @param {string} defaultValue - Default value for the input
     * @param {Object} options - Configuration options
     * @returns {Promise<string|null>} - Resolves with input value or null if cancelled
     */
    prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const config = {
                title: 'Input Required',
                placeholder: '',
                confirmText: 'OK',
                cancelText: 'Cancel',
                type: 'text',
                ...options
            };

            const modalHtml = `
                <div class="modal-overlay" id="prompt-modal">
                    <div class="modal-dialog">
                        <div class="modal-header">
                            <h3 class="modal-title">${this.escapeHtml(config.title)}</h3>
                        </div>
                        <div class="modal-body">
                            <p class="modal-message">${this.escapeHtml(message)}</p>
                            <input 
                                type="${config.type}" 
                                class="modal-input" 
                                id="modal-input" 
                                value="${this.escapeHtml(defaultValue)}"
                                placeholder="${this.escapeHtml(config.placeholder)}"
                            />
                        </div>
                        <div class="modal-footer">
                            <button class="modal-btn modal-btn-secondary" data-action="cancel">
                                ${this.escapeHtml(config.cancelText)}
                            </button>
                            <button class="modal-btn modal-btn-primary" data-action="confirm">
                                ${this.escapeHtml(config.confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, (action) => {
                if (action === 'confirm') {
                    const input = document.getElementById('modal-input');
                    resolve(input ? input.value : null);
                } else {
                    resolve(null);
                }
            });

            // Focus input after modal is shown
            setTimeout(() => {
                const input = document.getElementById('modal-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        });
    }

    /**
     * Show alert dialog
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @returns {Promise<void>}
     */
    alert(message, options = {}) {
        return new Promise((resolve) => {
            const config = {
                title: 'Alert',
                confirmText: 'OK',
                ...options
            };

            const modalHtml = `
                <div class="modal-overlay" id="alert-modal">
                    <div class="modal-dialog">
                        <div class="modal-header">
                            <h3 class="modal-title">${this.escapeHtml(config.title)}</h3>
                        </div>
                        <div class="modal-body">
                            <p class="modal-message">${this.escapeHtml(message)}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="modal-btn modal-btn-primary" data-action="confirm">
                                ${this.escapeHtml(config.confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showModal(modalHtml, () => {
                resolve();
            });
        });
    }

    /**
     * Show modal and handle interactions
     */
    showModal(html, callback) {
        // Remove any existing modal
        this.closeModal();

        // Add modal to container
        const container = document.getElementById('modal-container');
        container.innerHTML = html;

        this.activeModal = container.firstElementChild;

        // Handle clicks
        const handleClick = (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.closeModal();
                callback(action);
            } else if (e.target === this.activeModal) {
                // Click on overlay
                this.closeModal();
                callback('cancel');
            }
        };

        // Handle keyboard
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                callback('cancel');
            } else if (e.key === 'Enter' && !e.shiftKey) {
                const input = document.getElementById('modal-input');
                if (!input || document.activeElement !== input) {
                    this.closeModal();
                    callback('confirm');
                }
            }
        };

        this.activeModal.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeydown);

        // Store cleanup function
        this.activeModal.cleanup = () => {
            this.activeModal.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeydown);
        };
    }

    /**
     * Close active modal
     */
    closeModal() {
        if (this.activeModal) {
            if (this.activeModal.cleanup) {
                this.activeModal.cleanup();
            }
            this.activeModal.remove();
            this.activeModal = null;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
}

// Create global instance
window.Modal = new ModalDialog();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalDialog;
}