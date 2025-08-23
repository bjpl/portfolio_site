/**
 * Enhanced Content Editor - Version History Module
 * Handles version management, comparison, and rollback functionality
 */

class EditorVersions {
    constructor(editor) {
        this.editor = editor;
        this.isVisible = false;
        this.currentVersions = [];
        this.selectedVersion = null;
        this.comparisonMode = false;
        this.versionStorage = new VersionStorage();
        this.differ = new ContentDiffer();
        
        this.init();
    }

    /**
     * Initialize version management
     */
    init() {
        this.setupEventHandlers();
        this.loadVersionHistory();
        
        console.log('Version management initialized');
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Listen for document saves to create versions
        document.addEventListener('document-saved', (e) => {
            this.createVersion(e.detail);
        });

        // Listen for auto-saves to create backup versions
        document.addEventListener('auto-saved', (e) => {
            this.createBackupVersion(e.detail);
        });
    }

    /**
     * Toggle version history panel
     */
    toggle() {
        this.isVisible = !this.isVisible;
        const panel = document.getElementById('versionPanel');
        
        if (this.isVisible) {
            panel.classList.add('active');
            this.refreshVersionList();
        } else {
            panel.classList.remove('active');
            this.exitComparisonMode();
        }
    }

    /**
     * Load version history for current document
     */
    async loadVersionHistory() {
        if (!this.editor.currentDocument?.id) {
            return;
        }

        try {
            const versions = await this.fetchVersionsFromServer();
            this.currentVersions = versions;
            
            if (this.isVisible) {
                this.renderVersionList();
            }
            
        } catch (error) {
            console.error('Failed to load version history:', error);
            this.showVersionError('Failed to load version history');
        }
    }

    /**
     * Fetch versions from server
     */
    async fetchVersionsFromServer() {
        const documentId = this.editor.currentDocument.id;
        
        const response = await fetch(`/api/documents/${documentId}/versions`, {
            headers: {
                'Authorization': `Bearer ${this.editor.getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.versions || [];
    }

    /**
     * Create a new version
     */
    async createVersion(documentData) {
        try {
            const version = {
                id: this.generateVersionId(),
                documentId: this.editor.currentDocument?.id,
                content: documentData.content,
                metadata: {
                    title: documentData.title,
                    description: documentData.description,
                    tags: documentData.tags,
                    category: documentData.category
                },
                author: {
                    id: this.getUserId(),
                    name: this.getUserName()
                },
                timestamp: Date.now(),
                type: 'save',
                message: this.generateVersionMessage(documentData),
                hash: await this.calculateContentHash(documentData.content)
            };

            await this.saveVersionToServer(version);
            await this.versionStorage.saveVersion(version);
            
            this.currentVersions.unshift(version);
            
            if (this.isVisible) {
                this.renderVersionList();
            }
            
            console.log('Version created:', version.id);
            
        } catch (error) {
            console.error('Failed to create version:', error);
        }
    }

    /**
     * Create backup version (auto-save)
     */
    async createBackupVersion(documentData) {
        try {
            const version = {
                id: this.generateVersionId(),
                documentId: this.editor.currentDocument?.id,
                content: documentData.content,
                metadata: {
                    title: documentData.title,
                    description: documentData.description,
                    tags: documentData.tags,
                    category: documentData.category
                },
                author: {
                    id: this.getUserId(),
                    name: this.getUserName()
                },
                timestamp: Date.now(),
                type: 'auto-save',
                message: 'Auto-saved version',
                hash: await this.calculateContentHash(documentData.content)
            };

            // Only store backup versions locally
            await this.versionStorage.saveVersion(version);
            
            // Add to current versions but limit backup versions
            this.currentVersions = this.currentVersions.filter(v => v.type !== 'auto-save');
            this.currentVersions.unshift(version);
            
            console.log('Backup version created:', version.id);
            
        } catch (error) {
            console.error('Failed to create backup version:', error);
        }
    }

    /**
     * Save version to server
     */
    async saveVersionToServer(version) {
        const response = await fetch('/api/versions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.editor.getAuthToken()}`
            },
            body: JSON.stringify(version)
        });

        if (!response.ok) {
            throw new Error('Failed to save version to server');
        }

        return response.json();
    }

    /**
     * Refresh version list
     */
    async refreshVersionList() {
        await this.loadVersionHistory();
        this.renderVersionList();
    }

    /**
     * Render version list in UI
     */
    renderVersionList() {
        const container = document.getElementById('versionList');
        if (!container) return;

        if (this.currentVersions.length === 0) {
            container.innerHTML = `
                <div class="version-empty">
                    <p>No versions available</p>
                    <small>Versions will appear here as you save your document</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.currentVersions.map(version => 
            this.renderVersionItem(version)
        ).join('');
    }

    /**
     * Render individual version item
     */
    renderVersionItem(version) {
        const isSelected = this.selectedVersion?.id === version.id;
        const typeIcon = this.getVersionTypeIcon(version.type);
        const timeAgo = this.formatTimeAgo(version.timestamp);
        
        return `
            <div class="version-item ${isSelected ? 'active' : ''}" data-version-id="${version.id}">
                <div class="version-info" onclick="versionsInstance.selectVersion('${version.id}')">
                    <div class="version-header">
                        <span class="version-type">${typeIcon}</span>
                        <span class="version-time">${timeAgo}</span>
                    </div>
                    <div class="version-author">${version.author.name}</div>
                    <div class="version-message">${version.message}</div>
                </div>
                
                <div class="version-actions">
                    <button class="btn btn-small btn-ghost" onclick="versionsInstance.previewVersion('${version.id}')" 
                            title="Preview">
                        👁️
                    </button>
                    <button class="btn btn-small btn-ghost" onclick="versionsInstance.compareVersion('${version.id}')" 
                            title="Compare">
                        🔍
                    </button>
                    <button class="btn btn-small btn-primary" onclick="versionsInstance.restoreVersion('${version.id}')" 
                            title="Restore">
                        ↶
                    </button>
                    ${version.type !== 'auto-save' ? `
                        <button class="btn btn-small btn-danger" onclick="versionsInstance.deleteVersion('${version.id}')" 
                                title="Delete">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Select version for detailed view
     */
    selectVersion(versionId) {
        this.selectedVersion = this.currentVersions.find(v => v.id === versionId);
        
        // Update UI
        document.querySelectorAll('.version-item').forEach(item => {
            item.classList.toggle('active', item.dataset.versionId === versionId);
        });
        
        if (this.selectedVersion) {
            this.showVersionDetails(this.selectedVersion);
        }
    }

    /**
     * Show version details
     */
    showVersionDetails(version) {
        const modal = document.createElement('div');
        modal.className = 'modal active version-details-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Version Details</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="version-meta">
                        <div class="meta-row">
                            <span class="meta-label">Created:</span>
                            <span class="meta-value">${new Date(version.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Author:</span>
                            <span class="meta-value">${version.author.name}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Type:</span>
                            <span class="meta-value">${version.type}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Message:</span>
                            <span class="meta-value">${version.message}</span>
                        </div>
                    </div>
                    
                    <div class="version-content">
                        <div class="content-section">
                            <h4>Title</h4>
                            <p>${version.metadata.title || 'Untitled'}</p>
                        </div>
                        
                        <div class="content-section">
                            <h4>Description</h4>
                            <p>${version.metadata.description || 'No description'}</p>
                        </div>
                        
                        <div class="content-section">
                            <h4>Content Preview</h4>
                            <div class="content-preview">
                                ${this.generateContentPreview(version.content)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                    <button class="btn btn-secondary" onclick="versionsInstance.compareWithCurrent('${version.id}')">
                        Compare with Current
                    </button>
                    <button class="btn btn-primary" onclick="versionsInstance.restoreVersion('${version.id}')">
                        Restore This Version
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Preview version content
     */
    async previewVersion(versionId) {
        const version = this.currentVersions.find(v => v.id === versionId);
        if (!version) return;

        const modal = document.createElement('div');
        modal.className = 'modal active version-preview-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Version Preview - ${this.formatTimeAgo(version.timestamp)}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="preview-container">
                        <div class="preview-metadata">
                            <h2>${version.metadata.title || 'Untitled'}</h2>
                            <p class="preview-description">${version.metadata.description || ''}</p>
                            <div class="preview-tags">
                                ${(version.metadata.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                        <div class="preview-content">
                            ${marked(version.content || '')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                    <button class="btn btn-primary" onclick="versionsInstance.restoreVersion('${versionId}')">
                        Restore This Version
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Compare version with current content
     */
    async compareWithCurrent(versionId) {
        const version = this.currentVersions.find(v => v.id === versionId);
        if (!version) return;

        const currentContent = this.editor.getDocumentData();
        this.showComparison(version, currentContent);
    }

    /**
     * Compare two versions
     */
    async compareVersion(versionId) {
        if (this.comparisonMode) {
            // If already in comparison mode, compare with selected version
            const version = this.currentVersions.find(v => v.id === versionId);
            if (version && this.selectedVersion) {
                this.showComparison(this.selectedVersion, version);
            }
        } else {
            // Enter comparison mode
            this.enterComparisonMode(versionId);
        }
    }

    /**
     * Enter comparison mode
     */
    enterComparisonMode(versionId) {
        this.comparisonMode = true;
        this.selectVersion(versionId);
        
        // Update UI to show comparison mode
        const panel = document.getElementById('versionPanel');
        panel.classList.add('comparison-mode');
        
        // Show instructions
        const instructions = document.createElement('div');
        instructions.className = 'comparison-instructions';
        instructions.innerHTML = `
            <div class="instruction-text">
                📊 Comparison Mode: Select another version to compare
            </div>
            <button class="btn btn-small btn-ghost" onclick="versionsInstance.exitComparisonMode()">
                Exit
            </button>
        `;
        
        panel.querySelector('.version-header').appendChild(instructions);
    }

    /**
     * Exit comparison mode
     */
    exitComparisonMode() {
        this.comparisonMode = false;
        
        const panel = document.getElementById('versionPanel');
        panel.classList.remove('comparison-mode');
        
        // Remove instructions
        const instructions = panel.querySelector('.comparison-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    /**
     * Show comparison between two versions
     */
    showComparison(version1, version2) {
        const diff = this.differ.generateDiff(version1.content || '', version2.content || '');
        
        const modal = document.createElement('div');
        modal.className = 'modal active version-comparison-modal';
        modal.innerHTML = `
            <div class="modal-content extra-large">
                <div class="modal-header">
                    <h3>Version Comparison</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="comparison-header">
                        <div class="comparison-side">
                            <h4>${version1.metadata?.title || 'Version 1'}</h4>
                            <p>${this.formatTimeAgo(version1.timestamp)} by ${version1.author.name}</p>
                        </div>
                        <div class="comparison-divider">vs</div>
                        <div class="comparison-side">
                            <h4>${version2.metadata?.title || version2.title || 'Version 2'}</h4>
                            <p>${version2.timestamp ? this.formatTimeAgo(version2.timestamp) : 'Current'}</p>
                        </div>
                    </div>
                    
                    <div class="comparison-content">
                        ${this.renderDiffView(diff)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                    <button class="btn btn-primary" onclick="versionsInstance.restoreVersion('${version1.id}')">
                        Restore Left Version
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.exitComparisonMode();
    }

    /**
     * Render diff view
     */
    renderDiffView(diff) {
        return `
            <div class="diff-container">
                <div class="diff-stats">
                    <span class="additions">+${diff.additions}</span>
                    <span class="deletions">-${diff.deletions}</span>
                    <span class="total">${diff.total} lines</span>
                </div>
                <div class="diff-content">
                    ${diff.lines.map(line => this.renderDiffLine(line)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render individual diff line
     */
    renderDiffLine(line) {
        const typeClass = line.type === 'add' ? 'addition' : 
                         line.type === 'remove' ? 'deletion' : 'unchanged';
        const prefix = line.type === 'add' ? '+' : 
                      line.type === 'remove' ? '-' : ' ';
        
        return `
            <div class="diff-line ${typeClass}">
                <span class="line-number">${line.number || ''}</span>
                <span class="line-prefix">${prefix}</span>
                <span class="line-content">${this.escapeHtml(line.content)}</span>
            </div>
        `;
    }

    /**
     * Restore version
     */
    async restoreVersion(versionId) {
        const version = this.currentVersions.find(v => v.id === versionId);
        if (!version) return;

        const confirmed = confirm(`Are you sure you want to restore the version from ${this.formatTimeAgo(version.timestamp)}? This will replace your current content.`);
        if (!confirmed) return;

        try {
            // Load version content into editor
            this.editor.loadDocument({
                title: version.metadata.title,
                description: version.metadata.description,
                content: version.content,
                tags: version.metadata.tags,
                category: version.metadata.category
            });

            // Create a new version for the restore action
            await this.createVersion({
                ...this.editor.getDocumentData(),
                message: `Restored from version ${this.formatTimeAgo(version.timestamp)}`
            });

            this.editor.showNotification('Version restored successfully', 'success');
            
            // Close any open modals
            document.querySelectorAll('.version-comparison-modal, .version-preview-modal, .version-details-modal')
                .forEach(modal => modal.remove());
            
        } catch (error) {
            console.error('Failed to restore version:', error);
            this.editor.showNotification('Failed to restore version', 'error');
        }
    }

    /**
     * Delete version
     */
    async deleteVersion(versionId) {
        const version = this.currentVersions.find(v => v.id === versionId);
        if (!version) return;

        const confirmed = confirm(`Are you sure you want to delete the version from ${this.formatTimeAgo(version.timestamp)}? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            // Delete from server if it's a saved version
            if (version.type === 'save') {
                await this.deleteVersionFromServer(versionId);
            }
            
            // Delete from local storage
            await this.versionStorage.deleteVersion(versionId);
            
            // Remove from current versions
            this.currentVersions = this.currentVersions.filter(v => v.id !== versionId);
            
            // Update UI
            this.renderVersionList();
            
            this.editor.showNotification('Version deleted successfully', 'success');
            
        } catch (error) {
            console.error('Failed to delete version:', error);
            this.editor.showNotification('Failed to delete version', 'error');
        }
    }

    /**
     * Delete version from server
     */
    async deleteVersionFromServer(versionId) {
        const response = await fetch(`/api/versions/${versionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.editor.getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete version from server');
        }
    }

    /**
     * Generate version message
     */
    generateVersionMessage(documentData) {
        const title = documentData.title || 'Untitled';
        return `Updated "${title}"`;
    }

    /**
     * Calculate content hash for deduplication
     */
    async calculateContentHash(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate content preview
     */
    generateContentPreview(content) {
        const preview = content.substring(0, 500);
        const html = marked(preview);
        return html + (content.length > 500 ? '<p><em>... (truncated)</em></p>' : '');
    }

    /**
     * Get version type icon
     */
    getVersionTypeIcon(type) {
        switch (type) {
            case 'save': return '💾';
            case 'auto-save': return '⚡';
            case 'restore': return '↶';
            default: return '📄';
        }
    }

    /**
     * Format time ago
     */
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Generate version ID
     */
    generateVersionId() {
        return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get user ID
     */
    getUserId() {
        return localStorage.getItem('user-id') || 'anonymous';
    }

    /**
     * Get user name
     */
    getUserName() {
        return localStorage.getItem('user-name') || 'Anonymous User';
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show version error
     */
    showVersionError(message) {
        this.editor.showNotification(message, 'error');
    }

    /**
     * Cleanup
     */
    destroy() {
        this.currentVersions = [];
        this.selectedVersion = null;
        this.exitComparisonMode();
    }
}

/**
 * Version Storage Handler
 */
class VersionStorage {
    constructor() {
        this.storageKey = 'editor-versions';
        this.maxVersions = 100;
    }

    async saveVersion(version) {
        try {
            const versions = await this.getVersions();
            versions.unshift(version);
            
            // Limit number of stored versions
            if (versions.length > this.maxVersions) {
                versions.splice(this.maxVersions);
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(versions));
            
        } catch (error) {
            console.error('Failed to save version to storage:', error);
        }
    }

    async getVersions() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load versions from storage:', error);
            return [];
        }
    }

    async deleteVersion(versionId) {
        try {
            const versions = await this.getVersions();
            const filtered = versions.filter(v => v.id !== versionId);
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        } catch (error) {
            console.error('Failed to delete version from storage:', error);
        }
    }

    async clearVersions() {
        localStorage.removeItem(this.storageKey);
    }
}

/**
 * Content Differ
 */
class ContentDiffer {
    generateDiff(content1, content2) {
        const lines1 = content1.split('\n');
        const lines2 = content2.split('\n');
        
        const diff = this.calculateDiff(lines1, lines2);
        
        return {
            lines: diff,
            additions: diff.filter(line => line.type === 'add').length,
            deletions: diff.filter(line => line.type === 'remove').length,
            total: diff.length
        };
    }

    calculateDiff(lines1, lines2) {
        // Simple line-based diff algorithm
        const result = [];
        let i1 = 0, i2 = 0;
        
        while (i1 < lines1.length || i2 < lines2.length) {
            if (i1 < lines1.length && i2 < lines2.length) {
                if (lines1[i1] === lines2[i2]) {
                    // Lines are the same
                    result.push({
                        type: 'same',
                        content: lines1[i1],
                        number: i1 + 1
                    });
                    i1++;
                    i2++;
                } else {
                    // Lines are different - look ahead to see if we can find matches
                    const match1 = this.findNextMatch(lines1, i1, lines2, i2);
                    const match2 = this.findNextMatch(lines2, i2, lines1, i1);
                    
                    if (match1 !== -1 && (match2 === -1 || match1 < match2)) {
                        // Found match in lines2, so lines1[i1] was deleted
                        result.push({
                            type: 'remove',
                            content: lines1[i1],
                            number: i1 + 1
                        });
                        i1++;
                    } else if (match2 !== -1) {
                        // Found match in lines1, so lines2[i2] was added
                        result.push({
                            type: 'add',
                            content: lines2[i2],
                            number: null
                        });
                        i2++;
                    } else {
                        // No matches found, treat as replacement
                        result.push({
                            type: 'remove',
                            content: lines1[i1],
                            number: i1 + 1
                        });
                        result.push({
                            type: 'add',
                            content: lines2[i2],
                            number: null
                        });
                        i1++;
                        i2++;
                    }
                }
            } else if (i1 < lines1.length) {
                // Remaining lines in lines1 were deleted
                result.push({
                    type: 'remove',
                    content: lines1[i1],
                    number: i1 + 1
                });
                i1++;
            } else {
                // Remaining lines in lines2 were added
                result.push({
                    type: 'add',
                    content: lines2[i2],
                    number: null
                });
                i2++;
            }
        }
        
        return result;
    }

    findNextMatch(haystack, startPos, needle, needlePos, maxLookAhead = 10) {
        for (let i = 0; i < maxLookAhead && needlePos + i < needle.length; i++) {
            for (let j = 0; j < maxLookAhead && startPos + j < haystack.length; j++) {
                if (haystack[startPos + j] === needle[needlePos + i]) {
                    return j;
                }
            }
        }
        return -1;
    }
}

// Global reference for inline handlers
window.versionsInstance = null;

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditorVersions;
}

// Make available globally
window.EditorVersions = EditorVersions;