/**
 * Enhanced Content Editor - Auto-save Module
 * Handles automatic saving with conflict resolution and draft management
 */

class EditorAutoSave {
    constructor(editor) {
        this.editor = editor;
        this.autoSaveInterval = null;
        this.saveTimeout = null;
        this.conflictResolver = new AutoSaveConflictResolver();
        this.draftManager = new DraftManager();
        this.isEnabled = editor.settings.autoSave !== false;
        this.saveDelay = 2000; // 2 seconds
        this.backupInterval = 30000; // 30 seconds
        this.maxBackups = 10;
        
        this.init();
    }

    /**
     * Initialize auto-save system
     */
    init() {
        if (!this.isEnabled) return;

        this.setupAutoSave();
        this.setupBackupSystem();
        this.setupConflictDetection();
        this.loadExistingDrafts();
        
        console.log('Auto-save system initialized');
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        // Start periodic backup saves
        this.autoSaveInterval = setInterval(() => {
            this.performBackupSave();
        }, this.backupInterval);

        // Setup visibility change handler to save when tab loses focus
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.editor.hasUnsavedChanges()) {
                this.performImmediateSave();
            }
        });

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            if (this.editor.hasUnsavedChanges()) {
                this.performImmediateSave();
            }
        });
    }

    /**
     * Setup backup system
     */
    setupBackupSystem() {
        this.backupStorage = new BackupStorage(this.maxBackups);
    }

    /**
     * Setup conflict detection
     */
    setupConflictDetection() {
        // Listen for external changes to the document
        this.conflictDetector = new ConflictDetector(this.editor);
        
        this.conflictDetector.onConflictDetected = (conflict) => {
            this.handleConflict(conflict);
        };
    }

    /**
     * Load existing drafts
     */
    loadExistingDrafts() {
        const drafts = this.draftManager.getDrafts();
        
        if (drafts.length > 0) {
            this.showDraftRecoveryDialog(drafts);
        }
    }

    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (!this.isEnabled || !this.editor.hasUnsavedChanges()) {
            return;
        }

        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Schedule new save
        this.saveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, this.saveDelay);

        // Update UI to show pending save
        this.editor.updateSaveStatus('pending');
    }

    /**
     * Perform auto-save
     */
    async performAutoSave() {
        if (!this.editor.hasUnsavedChanges()) {
            return;
        }

        try {
            this.editor.updateSaveStatus('saving');
            
            const documentData = this.editor.getDocumentData();
            const saveResult = await this.saveDocument(documentData);
            
            if (saveResult.success) {
                this.editor.updateSaveStatus('saved');
                this.editor.markAsSaved();
                this.updateLastSaveTime();
                
                // Create backup
                await this.createBackup(documentData);
                
                // Clean up old drafts
                this.draftManager.cleanupOldDrafts();
                
            } else {
                throw new Error(saveResult.error || 'Save failed');
            }
            
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.editor.updateSaveStatus('error');
            
            // Save as draft instead
            await this.saveDraft();
            
            this.showAutoSaveError(error);
        }
    }

    /**
     * Perform immediate save
     */
    async performImmediateSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        await this.performAutoSave();
    }

    /**
     * Perform backup save
     */
    async performBackupSave() {
        if (!this.editor.hasUnsavedChanges()) {
            return;
        }

        try {
            const documentData = this.editor.getDocumentData();
            await this.createBackup(documentData);
            
            console.log('Backup created successfully');
        } catch (error) {
            console.error('Backup failed:', error);
        }
    }

    /**
     * Save document to server
     */
    async saveDocument(documentData) {
        const documentId = this.editor.currentDocument?.id;
        const endpoint = documentId ? `/api/documents/${documentId}` : '/api/documents';
        const method = documentId ? 'PUT' : 'POST';

        try {
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.editor.getAuthToken()}`,
                    'X-Version': this.editor.currentDocument?.version || '1'
                },
                body: JSON.stringify({
                    ...documentData,
                    autoSaved: true,
                    timestamp: Date.now()
                })
            });

            if (response.status === 409) {
                // Conflict detected
                const conflictData = await response.json();
                throw new ConflictError('Document conflict detected', conflictData);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Update document version
            if (this.editor.currentDocument) {
                this.editor.currentDocument.version = result.version;
            }
            
            return { success: true, data: result };
            
        } catch (error) {
            if (error instanceof ConflictError) {
                return this.handleSaveConflict(error);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle save conflict
     */
    async handleSaveConflict(conflictError) {
        const resolution = await this.conflictResolver.resolveConflict(
            conflictError.conflictData,
            this.editor.getDocumentData()
        );

        if (resolution.requiresUserInput) {
            this.showConflictDialog(resolution);
            return { success: false, error: 'Conflict requires user input' };
        }

        // Apply automatic resolution
        try {
            await this.applyConflictResolution(resolution);
            return { success: true, resolved: true };
        } catch (error) {
            return { success: false, error: 'Conflict resolution failed' };
        }
    }

    /**
     * Save as draft
     */
    async saveDraft() {
        try {
            const draftData = {
                ...this.editor.getDocumentData(),
                isDraft: true,
                draftId: this.generateDraftId(),
                timestamp: Date.now()
            };

            await this.draftManager.saveDraft(draftData);
            
            this.editor.showNotification('Saved as draft', 'info');
            
        } catch (error) {
            console.error('Draft save failed:', error);
            this.editor.showNotification('Failed to save draft', 'error');
        }
    }

    /**
     * Create backup
     */
    async createBackup(documentData) {
        const backup = {
            ...documentData,
            backupId: this.generateBackupId(),
            timestamp: Date.now(),
            version: this.editor.currentDocument?.version || 1
        };

        await this.backupStorage.saveBackup(backup);
    }

    /**
     * Show draft recovery dialog
     */
    showDraftRecoveryDialog(drafts) {
        const dialog = document.createElement('div');
        dialog.className = 'draft-recovery-dialog modal active';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Recover Drafts</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>We found ${drafts.length} unsaved draft(s). Would you like to recover them?</p>
                    <div class="draft-list">
                        ${drafts.map(draft => `
                            <div class="draft-item" data-draft-id="${draft.id}">
                                <div class="draft-info">
                                    <div class="draft-title">${draft.title || 'Untitled'}</div>
                                    <div class="draft-meta">
                                        ${this.formatTime(draft.timestamp)} · ${draft.wordCount || 0} words
                                    </div>
                                </div>
                                <div class="draft-actions">
                                    <button class="btn btn-small btn-primary" onclick="autoSaveInstance.recoverDraft('${draft.id}')">
                                        Recover
                                    </button>
                                    <button class="btn btn-small btn-ghost" onclick="autoSaveInstance.deleteDraft('${draft.id}')">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                    <button class="btn btn-danger" onclick="autoSaveInstance.deleteAllDrafts()">
                        Delete All
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    /**
     * Recover draft
     */
    async recoverDraft(draftId) {
        try {
            const draft = await this.draftManager.getDraft(draftId);
            if (!draft) {
                throw new Error('Draft not found');
            }

            // Load draft into editor
            this.editor.loadDocument(draft);
            
            // Remove draft recovery dialog
            const dialog = document.querySelector('.draft-recovery-dialog');
            if (dialog) {
                dialog.remove();
            }
            
            this.editor.showNotification('Draft recovered successfully', 'success');
            
        } catch (error) {
            console.error('Draft recovery failed:', error);
            this.editor.showNotification('Failed to recover draft', 'error');
        }
    }

    /**
     * Delete draft
     */
    async deleteDraft(draftId) {
        try {
            await this.draftManager.deleteDraft(draftId);
            
            // Remove from UI
            const draftItem = document.querySelector(`[data-draft-id="${draftId}"]`);
            if (draftItem) {
                draftItem.remove();
            }
            
        } catch (error) {
            console.error('Draft deletion failed:', error);
            this.editor.showNotification('Failed to delete draft', 'error');
        }
    }

    /**
     * Delete all drafts
     */
    async deleteAllDrafts() {
        try {
            await this.draftManager.deleteAllDrafts();
            
            // Close dialog
            const dialog = document.querySelector('.draft-recovery-dialog');
            if (dialog) {
                dialog.remove();
            }
            
            this.editor.showNotification('All drafts deleted', 'info');
            
        } catch (error) {
            console.error('Failed to delete drafts:', error);
            this.editor.showNotification('Failed to delete drafts', 'error');
        }
    }

    /**
     * Show auto-save error
     */
    showAutoSaveError(error) {
        const errorMsg = error.message || 'Unknown error';
        this.editor.showNotification(`Auto-save failed: ${errorMsg}`, 'error');
    }

    /**
     * Update last save time
     */
    updateLastSaveTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        
        const lastSavedEl = document.querySelector('.status-text');
        if (lastSavedEl) {
            lastSavedEl.textContent = `Saved at ${timeString}`;
        }
    }

    /**
     * Generate draft ID
     */
    generateDraftId() {
        return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate backup ID
     */
    generateBackupId() {
        return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Enable auto-save
     */
    enable() {
        this.isEnabled = true;
        this.setupAutoSave();
    }

    /**
     * Disable auto-save
     */
    disable() {
        this.isEnabled = false;
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.disable();
        
        if (this.conflictDetector) {
            this.conflictDetector.destroy();
        }
    }
}

/**
 * Auto-save Conflict Resolver
 */
class AutoSaveConflictResolver {
    constructor() {
        this.strategies = {
            'merge': this.mergeChanges.bind(this),
            'overwrite': this.overwriteRemote.bind(this),
            'user-choice': this.requireUserChoice.bind(this)
        };
    }

    async resolveConflict(conflictData, localData) {
        const strategy = this.determineStrategy(conflictData, localData);
        return await this.strategies[strategy](conflictData, localData);
    }

    determineStrategy(conflictData, localData) {
        const timeDiff = Date.now() - conflictData.remoteTimestamp;
        const hasSignificantChanges = this.hasSignificantChanges(conflictData.remote, localData);

        // If remote changes are very recent (< 5 minutes) and significant, require user choice
        if (timeDiff < 300000 && hasSignificantChanges) {
            return 'user-choice';
        }

        // If changes don't conflict significantly, try to merge
        if (this.canAutoMerge(conflictData.remote, localData)) {
            return 'merge';
        }

        // Default to user choice for safety
        return 'user-choice';
    }

    async mergeChanges(conflictData, localData) {
        // Simple merge strategy - combine non-overlapping changes
        const merged = {
            ...localData,
            title: localData.title || conflictData.remote.title,
            description: localData.description || conflictData.remote.description,
            content: this.mergeContent(conflictData.remote.content, localData.content),
            tags: [...new Set([...conflictData.remote.tags, ...localData.tags])],
            timestamp: Date.now()
        };

        return {
            strategy: 'merge',
            data: merged,
            requiresUserInput: false
        };
    }

    async overwriteRemote(conflictData, localData) {
        return {
            strategy: 'overwrite',
            data: localData,
            requiresUserInput: false
        };
    }

    async requireUserChoice(conflictData, localData) {
        return {
            strategy: 'user-choice',
            remote: conflictData.remote,
            local: localData,
            requiresUserInput: true
        };
    }

    hasSignificantChanges(remote, local) {
        const remoteWordCount = (remote.content || '').split(/\s+/).length;
        const localWordCount = (local.content || '').split(/\s+/).length;
        
        return Math.abs(remoteWordCount - localWordCount) > 10;
    }

    canAutoMerge(remote, local) {
        // Simple heuristic - if one version is clearly newer and longer, merge
        const remoteLength = (remote.content || '').length;
        const localLength = (local.content || '').length;
        
        return Math.abs(remoteLength - localLength) < 100;
    }

    mergeContent(remoteContent, localContent) {
        // Simple merge - if local is longer, keep local, otherwise keep remote
        return localContent.length > remoteContent.length ? localContent : remoteContent;
    }
}

/**
 * Draft Manager
 */
class DraftManager {
    constructor() {
        this.storageKey = 'editor-drafts';
        this.maxDrafts = 50;
    }

    async saveDraft(draftData) {
        const drafts = this.getDrafts();
        
        // Add new draft
        drafts.unshift(draftData);
        
        // Limit number of drafts
        if (drafts.length > this.maxDrafts) {
            drafts.splice(this.maxDrafts);
        }
        
        this.saveDrafts(drafts);
    }

    getDrafts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load drafts:', error);
            return [];
        }
    }

    async getDraft(draftId) {
        const drafts = this.getDrafts();
        return drafts.find(draft => draft.draftId === draftId);
    }

    async deleteDraft(draftId) {
        const drafts = this.getDrafts().filter(draft => draft.draftId !== draftId);
        this.saveDrafts(drafts);
    }

    async deleteAllDrafts() {
        localStorage.removeItem(this.storageKey);
    }

    cleanupOldDrafts() {
        const drafts = this.getDrafts();
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
        
        const filtered = drafts.filter(draft => draft.timestamp > cutoff);
        
        if (filtered.length !== drafts.length) {
            this.saveDrafts(filtered);
        }
    }

    saveDrafts(drafts) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(drafts));
        } catch (error) {
            console.error('Failed to save drafts:', error);
        }
    }
}

/**
 * Backup Storage
 */
class BackupStorage {
    constructor(maxBackups = 10) {
        this.storageKey = 'editor-backups';
        this.maxBackups = maxBackups;
    }

    async saveBackup(backupData) {
        const backups = this.getBackups();
        
        backups.unshift(backupData);
        
        if (backups.length > this.maxBackups) {
            backups.splice(this.maxBackups);
        }
        
        this.saveBackups(backups);
    }

    getBackups() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load backups:', error);
            return [];
        }
    }

    saveBackups(backups) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(backups));
        } catch (error) {
            console.error('Failed to save backups:', error);
        }
    }
}

/**
 * Conflict Detector
 */
class ConflictDetector {
    constructor(editor) {
        this.editor = editor;
        this.lastKnownVersion = null;
        this.checkInterval = null;
        this.onConflictDetected = null;
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            this.checkForConflicts();
        }, 30000); // Check every 30 seconds
    }

    async checkForConflicts() {
        if (!this.editor.currentDocument) return;

        try {
            const response = await fetch(`/api/documents/${this.editor.currentDocument.id}/version`, {
                headers: {
                    'Authorization': `Bearer ${this.editor.getAuthToken()}`
                }
            });

            if (response.ok) {
                const versionInfo = await response.json();
                
                if (this.lastKnownVersion && versionInfo.version > this.lastKnownVersion) {
                    // Conflict detected
                    const conflictData = await this.fetchConflictData(versionInfo);
                    
                    if (this.onConflictDetected) {
                        this.onConflictDetected(conflictData);
                    }
                }
                
                this.lastKnownVersion = versionInfo.version;
            }
        } catch (error) {
            console.error('Conflict detection failed:', error);
        }
    }

    async fetchConflictData(versionInfo) {
        const response = await fetch(`/api/documents/${this.editor.currentDocument.id}`, {
            headers: {
                'Authorization': `Bearer ${this.editor.getAuthToken()}`
            }
        });

        const remoteDocument = await response.json();
        
        return {
            remote: remoteDocument,
            remoteVersion: versionInfo.version,
            remoteTimestamp: versionInfo.timestamp,
            local: this.editor.getDocumentData()
        };
    }

    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

/**
 * Custom Error Classes
 */
class ConflictError extends Error {
    constructor(message, conflictData) {
        super(message);
        this.name = 'ConflictError';
        this.conflictData = conflictData;
    }
}

// Global reference for inline handlers
window.autoSaveInstance = null;

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditorAutoSave;
}

// Make available globally
window.EditorAutoSave = EditorAutoSave;